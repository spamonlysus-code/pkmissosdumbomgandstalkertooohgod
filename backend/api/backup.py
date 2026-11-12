import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse

from backend.database import get_db_connection

router = APIRouter(prefix="/api/backup", tags=["backup"])

@router.get("/export")
def export_database_backup():
    """
    Exports a clean local database backup snapshot.
    Never includes sensitive credentials or passwords.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Students (exclude custom_password)
    cursor.execute("SELECT id, slot_number, display_name, user_id, is_active FROM students")
    students = [dict(r) for r in cursor.fetchall()]

    # Test results
    cursor.execute("SELECT * FROM test_results")
    test_results = [dict(r) for r in cursor.fetchall()]

    # Marks history
    cursor.execute("SELECT * FROM marks_history")
    marks_history = [dict(r) for r in cursor.fetchall()]

    conn.close()

    backup_payload = {
        "app": "VRaZ Marks Manager",
        "version": "1.0.0",
        "exported_at": datetime.utcnow().isoformat(),
        "students": students,
        "test_results": test_results,
        "marks_history": marks_history
    }

    return JSONResponse(
        content=backup_payload,
        headers={"Content-Disposition": f"attachment; filename=vraz_marks_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"}
    )

@router.post("/restore")
async def restore_database_backup(file: UploadFile = File(...)):
    """
    Restores student metadata and historical marks from a backup JSON file.
    """
    try:
        content = await file.read()
        data = json.loads(content.decode("utf-8"))

        if data.get("app") != "VRaZ Marks Manager":
            raise HTTPException(status_code=400, detail="Invalid backup file format")

        conn = get_db_connection()
        cursor = conn.cursor()

        # Update student names / user IDs
        for s in data.get("students", []):
            cursor.execute("""
            UPDATE students
            SET display_name = ?, user_id = ?, is_active = ?
            WHERE slot_number = ?
            """, (s["display_name"], s.get("user_id", ""), s.get("is_active", 1), s["slot_number"]))

        # Restore test results
        for r in data.get("test_results", []):
            cursor.execute("""
            INSERT INTO test_results (
                student_id, exam_category, test_name, paper_type, exam_date,
                exam_time, marks_obtained, max_marks, percentage, duration,
                result_status, raw_score_text, fetched_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(student_id, test_name, exam_date) DO UPDATE SET
                marks_obtained = excluded.marks_obtained,
                max_marks = excluded.max_marks,
                percentage = excluded.percentage,
                result_status = excluded.result_status
            """, (
                r["student_id"], r.get("exam_category", "MHTCET"), r["test_name"],
                r["paper_type"], r.get("exam_date", ""), r.get("exam_time", ""),
                r.get("marks_obtained"), r.get("max_marks"), r.get("percentage"),
                r.get("duration", ""), r.get("result_status", "Available"),
                r.get("raw_score_text", ""), r.get("fetched_at", datetime.utcnow().isoformat())
            ))

        conn.commit()
        conn.close()

        return {"success": True, "message": "Database backup restored successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to restore backup: {str(e)}")
