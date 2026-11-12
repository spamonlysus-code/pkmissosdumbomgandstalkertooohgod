import io
import csv
import json
import asyncio
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from typing import Optional, List, Dict, Any
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

from backend.database import (
    get_all_students, get_student_by_id, get_latest_results_for_student,
    get_all_results_for_student, get_marks_history_for_student,
    get_db_connection
)
from backend.models import DashboardOverview, StudentCardData
from backend.automation.browser_manager import browser_manager

router = APIRouter(prefix="/api/marks", tags=["marks"])

# In-memory queue / broadcast bus for live SSE progress
_active_subscribers: List[asyncio.Queue] = []

async def broadcast_progress(student_id: int, status: str, message: str):
    data = json.dumps({
        "type": "progress",
        "student_id": student_id,
        "status": status,
        "message": message,
        "timestamp": datetime.utcnow().isoformat()
    })
    for queue in _active_subscribers:
        await queue.put(data)

@router.get("/overview", response_model=DashboardOverview)
def get_dashboard_overview():
    """
    Returns high-level statistics and the 5 student cards with latest Maths & Phy+Chem marks.
    """
    students = get_all_students()
    card_data: List[StudentCardData] = []
    
    checked_count = 0
    available_count = 0
    pending_count = 0
    attention_count = 0
    latest_sync_time = None

    for s in students:
        s_id = s["id"]
        latest = get_latest_results_for_student(s_id)
        maths = latest["maths"]
        phy_chem = latest["phy_chem"]

        if s["last_checked_at"]:
            checked_count += 1
            sync_str = str(s["last_checked_at"])
            if not latest_sync_time or sync_str > str(latest_sync_time):
                latest_sync_time = sync_str

        # Check marks status
        has_pending = False
        has_available = False

        for res in [maths, phy_chem]:
            if res:
                if res["result_status"] == "Available":
                    available_count += 1
                    has_available = True
                elif res["result_status"] == "Pending":
                    pending_count += 1
                    has_pending = True

        status = s["last_login_status"]
        if status in ["Login Failed", "Error", "Missing User ID", "Missing Password"]:
            attention_count += 1
        elif status in ["Result Pending", "Partial"]:
            attention_count += 1

        card_data.append(StudentCardData(
            id=s["id"],
            slot_number=s["slot_number"],
            display_name=s["display_name"],
            user_id="",  # Protected: never expose raw user ID
            has_custom_password=bool(s.get("has_custom_password")),
            is_active=bool(s["is_active"]),
            last_login_status=s["last_login_status"],
            last_checked_at=s["last_checked_at"],
            maths=maths,
            phy_chem=phy_chem
        ))

    return DashboardOverview(
        total_students=len(students),
        checked_accounts=checked_count,
        available_results=available_count,
        pending_results=pending_count,
        attention_required=attention_count,
        last_sync_time=latest_sync_time,
        students=card_data
    )

@router.get("/fetch-all/stream")
async def stream_fetch_all():
    """
    Server-Sent Events endpoint streaming real-time progress for all 5 concurrent browser sessions.
    """
    queue: asyncio.Queue = asyncio.Queue()
    _active_subscribers.append(queue)

    async def event_generator():
        try:
            yield "data: {\"type\": \"connected\"}\n\n"
            while True:
                data = await queue.get()
                yield f"data: {data}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            if queue in _active_subscribers:
                _active_subscribers.remove(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/fetch-all")
async def trigger_fetch_all():
    """
    One-click FETCH ALL STUDENTS' MARKS.
    Runs 5 independent browser sessions concurrently.
    """
    async def on_prog(s_id: int, status: str, msg: str):
        await broadcast_progress(s_id, status, msg)

    summary = await browser_manager.fetch_all_students(on_progress=on_prog)
    
    # Broadcast final completion event
    summary_event = json.dumps({
        "type": "summary",
        "data": summary,
        "timestamp": datetime.utcnow().isoformat()
    })
    for queue in _active_subscribers:
        await queue.put(summary_event)

    return summary

@router.post("/refresh/{student_id}")
async def refresh_single_student_endpoint(student_id: int):
    """
    Refreshes marks for a single student account independently.
    """
    async def on_prog(s_id: int, status: str, msg: str):
        await broadcast_progress(s_id, status, msg)

    res = await browser_manager.refresh_single_student(student_id, on_progress=on_prog)
    return res

@router.get("/table")
def get_consolidated_table(
    sort_by: str = Query("slot_number", pattern="^(slot_number|name|maths|phy_chem|status)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    filter_status: Optional[str] = None
):
    """
    Consolidated table of all 5 students showing Maths & Phy+Chem marks with sorting and filtering.
    """
    students = get_all_students()
    rows = []

    for s in students:
        s_id = s["id"]
        latest = get_latest_results_for_student(s_id)
        m = latest["maths"]
        p = latest["phy_chem"]

        # Math display
        if m:
            if m["result_status"] == "Pending":
                math_display = "Pending"
                math_val = -1
            else:
                math_display = f"{m['marks_obtained']}/{m['max_marks']}"
                math_val = m["marks_obtained"] or 0
        else:
            math_display = "-"
            math_val = -2

        # Phy+Chem display
        if p:
            if p["result_status"] == "Pending":
                pc_display = "Pending"
                pc_val = -1
            else:
                pc_display = f"{p['marks_obtained']}/{p['max_marks']}"
                pc_val = p["marks_obtained"] or 0
        else:
            pc_display = "-"
            pc_val = -2

        row_status = s["last_login_status"]
        if filter_status and filter_status.lower() != "all":
            if filter_status.lower() not in row_status.lower():
                continue

        rows.append({
            "student_id": s["id"],
            "slot_number": s["slot_number"],
            "student_name": s["display_name"],
            "user_id": "",  # Protected
            "maths_score": math_display,
            "maths_val": math_val,
            "maths_percentage": m["percentage"] if m else None,
            "phy_chem_score": pc_display,
            "phy_chem_val": pc_val,
            "phy_chem_percentage": p["percentage"] if p else None,
            "status": row_status,
            "last_checked_at": s["last_checked_at"]
        })

    # Sort
    reverse = (sort_order == "desc")
    if sort_by == "name":
        rows.sort(key=lambda x: x["student_name"].lower(), reverse=reverse)
    elif sort_by == "maths":
        rows.sort(key=lambda x: x["maths_val"], reverse=reverse)
    elif sort_by == "phy_chem":
        rows.sort(key=lambda x: x["phy_chem_val"], reverse=reverse)
    elif sort_by == "status":
        rows.sort(key=lambda x: x["status"].lower(), reverse=reverse)
    else:
        rows.sort(key=lambda x: x["slot_number"], reverse=reverse)

    return rows

@router.get("/history/{student_id}")
def get_student_history(student_id: int):
    """
    Returns full examination history and marks changes log for a student.
    """
    student = get_student_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    results = get_all_results_for_student(student_id)
    changes = get_marks_history_for_student(student_id)

    return {
        "student": {
            "id": student["id"],
            "display_name": student["display_name"],
            "user_id": ""  # Protected
        },
        "examination_history": results,
        "marks_changes": changes
    }

@router.get("/export")
def export_marks(
    format: str = Query("xlsx", pattern="^(csv|xlsx)$"),
    scope: str = Query("all", pattern="^(all|student|history)$"),
    student_id: Optional[int] = None
):
    """
    Exports marks to CSV or Excel (.xlsx).
    Never includes passwords or credentials.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    if scope == "student" and student_id:
        cursor.execute("""
        SELECT s.display_name, r.exam_category, r.test_name, r.paper_type,
               r.exam_date, r.exam_time, r.marks_obtained, r.max_marks, r.percentage,
               r.duration, r.result_status, r.fetched_at
        FROM test_results r
        JOIN students s ON s.id = r.student_id
        WHERE s.id = ?
        ORDER BY r.exam_date DESC
        """, (student_id,))
    elif scope == "history":
        cursor.execute("""
        SELECT s.display_name, r.exam_category, r.test_name, r.paper_type,
               r.exam_date, r.exam_time, r.marks_obtained, r.max_marks, r.percentage,
               r.duration, r.result_status, r.fetched_at
        FROM test_results r
        JOIN students s ON s.id = r.student_id
        ORDER BY s.slot_number ASC, r.exam_date DESC
        """)
    else:
        # All students latest consolidated summary
        cursor.execute("""
        SELECT s.id, s.slot_number, s.display_name, s.last_login_status, s.last_checked_at
        FROM students s
        ORDER BY s.slot_number ASC
        """)
        students_base = cursor.fetchall()
        rows_data = []
        for sb in students_base:
            latest = get_latest_results_for_student(sb["id"])
            m = latest["maths"]
            p = latest["phy_chem"]
            rows_data.append({
                "Slot": sb["slot_number"],
                "Student": sb["display_name"],
                "Maths Score": f"{m['marks_obtained']}/{m['max_marks']}" if (m and m['result_status'] == 'Available') else (m['result_status'] if m else "-"),
                "Maths %": m['percentage'] if (m and m['result_status'] == 'Available') else "",
                "Phy+Chem Score": f"{p['marks_obtained']}/{p['max_marks']}" if (p and p['result_status'] == 'Available') else (p['result_status'] if p else "-"),
                "Phy+Chem %": p['percentage'] if (p and p['result_status'] == 'Available') else "",
                "Status": sb["last_login_status"],
                "Last Sync": sb["last_checked_at"] or "-"
            })

    if scope != "all":
        raw_rows = cursor.fetchall()
        headers = [col[0] for col in cursor.description]
        rows_data = [dict(zip(headers, r)) for r in raw_rows]

    conn.close()

    filename_prefix = f"vraz_marks_{scope}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"

    if format == "csv":
        output = io.StringIO()
        if rows_data:
            writer = csv.DictWriter(output, fieldnames=list(rows_data[0].keys()))
            writer.writeheader()
            writer.writerows(rows_data)
        content = output.getvalue().encode("utf-8")
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename_prefix}.csv"}
        )

    # Format Excel .xlsx
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "VRaZ Marks Report"

    # Styling
    header_fill = PatternFill(start_color="274C90", end_color="274C90", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")

    if rows_data:
        keys = list(rows_data[0].keys())
        ws.append(keys)
        for cell in ws[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")

        for row in rows_data:
            ws.append([row.get(k, "") for k in keys])

        # Auto fit column widths
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    excel_buffer = io.BytesIO()
    wb.save(excel_buffer)
    excel_buffer.seek(0)

    return Response(
        content=excel_buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename_prefix}.xlsx"}
    )
