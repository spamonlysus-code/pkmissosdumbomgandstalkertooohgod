from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime

class StudentUpdateReq(BaseModel):
    display_name: str
    user_id: str
    custom_password: Optional[str] = None

class SharedPasswordReq(BaseModel):
    shared_password: str

class TestLoginReq(BaseModel):
    student_id: int
    user_id: Optional[str] = None
    password: Optional[str] = None

class TestResultItem(BaseModel):
    id: Optional[int] = None
    student_id: int
    exam_category: str
    test_name: str
    paper_type: str
    exam_date: str
    exam_time: str
    marks_obtained: Optional[float] = None
    max_marks: Optional[float] = None
    percentage: Optional[float] = None
    duration: str
    result_status: str
    raw_score_text: str
    fetched_at: Optional[Any] = None

class StudentCardData(BaseModel):
    id: int
    slot_number: int
    display_name: str
    user_id: str
    has_custom_password: bool
    is_active: bool
    last_login_status: str
    last_checked_at: Optional[Any] = None
    maths: Optional[Dict[str, Any]] = None
    phy_chem: Optional[Dict[str, Any]] = None

class DashboardOverview(BaseModel):
    total_students: int
    checked_accounts: int
    available_results: int
    pending_results: int
    attention_required: int
    last_sync_time: Optional[str] = None
    students: List[StudentCardData]
