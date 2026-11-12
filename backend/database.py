import sqlite3
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "vraz_marks.db"

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = get_db_connection()
    cursor = conn.cursor()

    # Settings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Students table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slot_number INTEGER UNIQUE,
        display_name TEXT NOT NULL,
        user_id TEXT DEFAULT '',
        custom_password TEXT DEFAULT '',
        is_active INTEGER DEFAULT 1,
        last_login_status TEXT DEFAULT 'Not Checked',
        last_checked_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Test results table with sort_date for true chronological sorting
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS test_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        exam_category TEXT DEFAULT 'MHTCET',
        test_name TEXT NOT NULL,
        paper_type TEXT NOT NULL,  -- 'MATHEMATICS', 'PHYSICS_CHEMISTRY', 'OTHER'
        exam_date TEXT DEFAULT '',
        sort_date TEXT DEFAULT '', -- 'YYYY-MM-DD HH:MM:SS' for real-life date sorting
        exam_time TEXT DEFAULT '',
        marks_obtained REAL NULL,
        max_marks REAL NULL,
        percentage REAL NULL,
        duration TEXT DEFAULT '',
        result_status TEXT NOT NULL,  -- 'Available', 'Pending', 'Error'
        raw_score_text TEXT DEFAULT '',
        fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        UNIQUE(student_id, test_name, exam_date)
    );
    """)

    # Auto-migrate sort_date column if missing in older schema
    try:
        cursor.execute("ALTER TABLE test_results ADD COLUMN sort_date TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass # Column already exists

    # Marks change history table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS marks_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_result_id INTEGER,
        student_id INTEGER NOT NULL,
        test_name TEXT NOT NULL,
        exam_date TEXT DEFAULT '',
        old_status TEXT,
        new_status TEXT,
        old_score REAL NULL,
        new_score REAL NULL,
        old_max REAL NULL,
        new_max REAL NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );
    """)

    # Sync sessions log table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sync_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE,
        total_accounts INTEGER DEFAULT 11,
        successful_accounts INTEGER DEFAULT 0,
        failed_accounts INTEGER DEFAULT 0,
        available_scores INTEGER DEFAULT 0,
        pending_scores INTEGER DEFAULT 0,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        summary_notes TEXT DEFAULT ''
    );
    """)

    conn.commit()
    conn.close()

def get_setting(key: str, default: Optional[str] = None) -> Optional[str]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM app_settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return row[0]
    return default

def set_setting(key: str, value: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    """, (key, value, datetime.utcnow()))
    conn.commit()
    conn.close()

def get_all_students() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, slot_number, display_name, user_id, 
           CASE WHEN custom_password != '' THEN 1 ELSE 0 END as has_custom_password,
           is_active, last_login_status, last_checked_at
    FROM students
    ORDER BY slot_number ASC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_student_by_id(student_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM students WHERE id = ?", (student_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def update_student(student_id: int, display_name: str, user_id: str, custom_password_encrypted: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if custom_password_encrypted is not None:
        cursor.execute("""
        UPDATE students
        SET display_name = ?, user_id = ?, custom_password = ?
        WHERE id = ?
        """, (display_name, user_id.strip(), custom_password_encrypted, student_id))
    else:
        cursor.execute("""
        UPDATE students
        SET display_name = ?, user_id = ?
        WHERE id = ?
        """, (display_name, user_id.strip(), student_id))
    conn.commit()
    conn.close()

def update_student_status(student_id: int, status: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE students
    SET last_login_status = ?, last_checked_at = ?
    WHERE id = ?
    """, (status, datetime.utcnow(), student_id))
    conn.commit()
    conn.close()

def save_or_update_test_result(
    student_id: int,
    exam_category: str,
    test_name: str,
    paper_type: str,
    exam_date: str,
    exam_time: str,
    marks_obtained: Optional[float],
    max_marks: Optional[float],
    percentage: Optional[float],
    duration: str,
    result_status: str,
    raw_score_text: str,
    sort_date: Optional[str] = None
) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()

    # Calculate fallback sort_date if not provided
    if not sort_date:
        from backend.automation.marks_extractor import compute_sort_date
        _, sort_date = compute_sort_date(exam_date, exam_time, test_name)

    # Check if record already exists
    cursor.execute("""
    SELECT id, marks_obtained, max_marks, result_status
    FROM test_results
    WHERE student_id = ? AND test_name = ? AND exam_date = ?
    """, (student_id, test_name, exam_date))
    existing = cursor.fetchone()

    is_updated = False
    result_id = None

    if existing:
        result_id = existing["id"]
        old_obtained = existing["marks_obtained"]
        old_max = existing["max_marks"]
        old_status = existing["result_status"]

        # If status or marks changed, record history
        if old_status != result_status or old_obtained != marks_obtained:
            cursor.execute("""
            INSERT INTO marks_history (
                test_result_id, student_id, test_name, exam_date,
                old_status, new_status, old_score, new_score, old_max, new_max
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                result_id, student_id, test_name, exam_date,
                old_status, result_status, old_obtained, marks_obtained, old_max, max_marks
            ))
            is_updated = True

        cursor.execute("""
        UPDATE test_results
        SET exam_category = ?, paper_type = ?, exam_time = ?,
            sort_date = ?, marks_obtained = ?, max_marks = ?, percentage = ?,
            duration = ?, result_status = ?, raw_score_text = ?,
            fetched_at = ?
        WHERE id = ?
        """, (
            exam_category, paper_type, exam_time,
            sort_date, marks_obtained, max_marks, percentage,
            duration, result_status, raw_score_text,
            datetime.utcnow(), result_id
        ))
    else:
        cursor.execute("""
        INSERT INTO test_results (
            student_id, exam_category, test_name, paper_type,
            exam_date, sort_date, exam_time, marks_obtained, max_marks,
            percentage, duration, result_status, raw_score_text, fetched_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            student_id, exam_category, test_name, paper_type,
            exam_date, sort_date, exam_time, marks_obtained, max_marks,
            percentage, duration, result_status, raw_score_text, datetime.utcnow()
        ))
        result_id = cursor.lastrowid

    conn.commit()
    conn.close()
    return {"id": result_id, "is_updated": is_updated}

def get_latest_results_for_student(student_id: int) -> Dict[str, Any]:
    """
    Retrieves the latest Mathematics and latest Physics + Chemistry results for a student,
    STRICTLY SORTED BY REAL-LIFE CALENDAR DATE (sort_date DESC), so today's / latest exam is always returned!
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT * FROM test_results
    WHERE student_id = ? AND paper_type = 'MATHEMATICS'
    ORDER BY sort_date DESC, id DESC
    LIMIT 1
    """, (student_id,))
    math_row = cursor.fetchone()

    cursor.execute("""
    SELECT * FROM test_results
    WHERE student_id = ? AND paper_type = 'PHYSICS_CHEMISTRY'
    ORDER BY sort_date DESC, id DESC
    LIMIT 1
    """, (student_id,))
    phy_chem_row = cursor.fetchone()

    conn.close()

    return {
        "maths": dict(math_row) if math_row else None,
        "phy_chem": dict(phy_chem_row) if phy_chem_row else None
    }

def get_all_results_for_student(student_id: int) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM test_results
    WHERE student_id = ?
    ORDER BY sort_date DESC, id DESC
    """, (student_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_marks_history_for_student(student_id: int) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM marks_history
    WHERE student_id = ?
    ORDER BY updated_at DESC
    """, (student_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

init_db()
