from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

from backend.database import (
    get_all_students, get_student_by_id, update_student,
    get_setting, set_setting
)
from backend.encryption import encrypt_text, decrypt_text
from backend.models import StudentUpdateReq, SharedPasswordReq, TestLoginReq
from backend.automation.browser_manager import browser_manager

router = APIRouter(prefix="/api/students", tags=["students"])

@router.get("", response_model=List[Dict[str, Any]])
def list_students():
    """Returns all configured student slots with protected masked user IDs."""
    students = get_all_students()
    result = []
    for s in students:
        item = dict(s)
        item["has_user_id"] = bool(item.get("user_id"))
        item["user_id"] = "••••••••" if item.get("user_id") else ""
        result.append(item)
    return result

@router.get("/{student_id}")
def get_student(student_id: int):
    student = get_student_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    # Hide password details and mask user ID
    return {
        "id": student["id"],
        "slot_number": student["slot_number"],
        "display_name": student["display_name"],
        "user_id": "••••••••" if student.get("user_id") else "",
        "has_user_id": bool(student.get("user_id")),
        "has_custom_password": bool(student.get("custom_password")),
        "is_active": bool(student["is_active"]),
        "last_login_status": student["last_login_status"],
        "last_checked_at": student["last_checked_at"]
    }

@router.put("/{student_id}")
def update_student_endpoint(student_id: int, req: StudentUpdateReq):
    student = get_student_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    encrypted_pwd = None
    if req.custom_password is not None:
        if req.custom_password.strip():
            encrypted_pwd = encrypt_text(req.custom_password.strip())
        else:
            encrypted_pwd = "" # clear custom password to revert to shared

    # Preserve existing user_id if masked or blank
    req_uid = (req.user_id or "").strip()
    if not req_uid or "••" in req_uid or req_uid == "Configured":
        final_user_id = student["user_id"]
    else:
        final_user_id = req_uid

    update_student(
        student_id=student_id,
        display_name=req.display_name.strip(),
        user_id=final_user_id,
        custom_password_encrypted=encrypted_pwd
    )
    return {"success": True, "message": "Student settings updated successfully"}

@router.post("/{student_id}/test-login")
async def test_student_login_endpoint(student_id: int, req: TestLoginReq):
    """
    Tests logging into the VRaZ portal for this student account.
    """
    student = get_student_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    user_id = req.user_id or student["user_id"]
    if not user_id:
        return {"success": False, "message": "User ID is required"}

    success, message = await browser_manager.test_student_login(
        student_id=student_id,
        user_id=user_id,
        password=req.password
    )
    return {"success": success, "message": message}

# Settings router for shared password
settings_router = APIRouter(prefix="/api/settings", tags=["settings"])

@settings_router.get("/shared-password")
def get_shared_password_status():
    return {
        "is_configured": True,
        "is_fixed": True,
        "note": "Portal password is permanently fixed in code (abc@123)"
    }

@settings_router.post("/shared-password")
def set_shared_password_endpoint(req: SharedPasswordReq):
    return {"success": True, "message": "Portal password is permanently fixed in code (abc@123)"}
