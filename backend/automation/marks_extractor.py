import re
from typing import Dict, Any, Optional, List
from bs4 import BeautifulSoup

MONTH_MAP = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
    'sept': 9, 'september': 9
}

def identify_paper_type(test_name: str) -> str:
    """
    Identifies whether the test is Mathematics, Physics+Chemistry, or Other.
    Supports variations in case, spaces, symbols, and abbreviations.
    """
    if not test_name:
        return "OTHER"
    
    clean_name = test_name.upper().replace("-", " ").replace("_", " ")

    # Check for Mathematics indicators: MATH, MATHS, MATHEMATICS (even if followed by number/symbol like Maths31st)
    has_math = bool(re.search(r"\b(MATH|MATHS|MATHEMATICS)\b|MATHS?\d|MATHS?[^A-Z\s]", clean_name))

    # Check for Physics + Chemistry indicators: PHY, PHYS, PHYSICS, CHEM, CHEMISTRY, PHY CHEM, PCM, PHY & CHEM, PHY + CHEM
    has_phy_chem = bool(re.search(
        r"\b(PHY\s*CHEM|PHYSICS\s*(?:AND|&|\+)?\s*CHEMISTRY|PHYSICS|CHEMISTRY|PHY|CHEM|PCM)\b|PHY\s*&\s*CHEM|PHY\s*\+\s*CHEM|PHYCHEM",
        clean_name
    ))

    # Specificity logic
    if has_math and not has_phy_chem:
        return "MATHEMATICS"
    elif has_phy_chem and not has_math:
        return "PHYSICS_CHEMISTRY"
    elif has_math and has_phy_chem:
        # If both appear, check suffix priority
        if re.search(r"MATHS?\s*$", clean_name.strip()):
            return "MATHEMATICS"
        elif re.search(r"(?:PHY\s*CHEM|CHEMISTRY|PHYSICS)\s*$", clean_name.strip()):
            return "PHYSICS_CHEMISTRY"
        return "OTHER"
    else:
        return "OTHER"

def compute_sort_date(date_str: str, time_str: str, test_name: str) -> tuple[str, str]:
    """
    Converts various portal date representations into a clean formatted date (DD-Mon-YYYY)
    and an ISO sortable timestamp (YYYY-MM-DD HH:MM:SS) for accurate chronological sorting.
    """
    day, month, year = None, None, 2026

    # 1. Try extracting date from date_str
    if date_str:
        # Match e.g. '07-Nov-26', '07-Nov-2026', '7th-Nov', '31-May-2602'
        m = re.search(r"(\d{1,2})(?:st|nd|rd|th)?[-/\s]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-/\s]*(\d{2,4})?", date_str, re.I)
        if m:
            day = int(m.group(1))
            month = MONTH_MAP.get(m.group(2).lower()[:3], 1)
            raw_yr = m.group(3)
            if raw_yr:
                raw_yr_str = str(raw_yr)
                if raw_yr_str.startswith("202"):
                    year = int(raw_yr_str[:4])
                elif len(raw_yr_str) >= 2 and raw_yr_str[:2] in ["24", "25", "26", "27"]:
                    year = 2000 + int(raw_yr_str[:2])
                else:
                    yr_val = int(raw_yr_str)
                    year = 2000 + yr_val if yr_val < 100 else yr_val

    # 2. Fallback: extract date from test_name (e.g. '7 NOV', '01 NOV', '25 OCT', '27TH SEPT')
    if not day or not month:
        m2 = re.search(r"(\d{1,2})(?:st|nd|rd|th)?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)", test_name, re.I)
        if m2:
            day = int(m2.group(1))
            month = MONTH_MAP.get(m2.group(2).lower()[:3], 1)

    # 3. Parse time into HH:MM:SS
    hour, minute = 0, 0
    if time_str:
        tm = re.search(r"(\d{1,2}):(\d{2})\s*(AM|PM)?", time_str, re.I)
        if tm:
            h = int(tm.group(1))
            minute = int(tm.group(2))
            meridiem = (tm.group(3) or "").upper()
            if meridiem == "PM" and h < 12:
                hour = h + 12
            elif meridiem == "AM" and h == 12:
                hour = 0
            else:
                hour = h

    if day and month:
        # Month name abbreviation
        inv_months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        clean_date = f"{day:02d}-{inv_months[month-1]}-{year}"
        sort_date = f"{year:04d}-{month:02d}-{day:02d} {hour:02d}:{minute:02d}:00"
    else:
        clean_date = date_str or "-"
        sort_date = "2000-01-01 00:00:00"

    return clean_date, sort_date

def parse_score_string(score_str: str) -> Dict[str, Any]:
    """
    Parses score strings such as '54/100', 'Score : 54/100', 'Score : -', 'Result Pending', etc.
    """
    if not score_str:
        return {
            "marks_obtained": None,
            "max_marks": None,
            "percentage": None,
            "status": "Pending"
        }
    
    cleaned = score_str.strip()
    
    # Check for pending indicators
    if "pending" in cleaned.lower() or cleaned == "-" or "not declared" in cleaned.lower() or "awaited" in cleaned.lower():
        if not re.search(r"\d+\s*/\s*\d+", cleaned):
            return {
                "marks_obtained": None,
                "max_marks": None,
                "percentage": None,
                "status": "Pending"
            }

    # Match fraction format: X / Y or X/Y (e.g., 54/100 or 54.5/100)
    match_frac = re.search(r"(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)", cleaned)
    if match_frac:
        obtained = float(match_frac.group(1))
        maximum = float(match_frac.group(2))
        percentage = round((obtained / maximum) * 100, 2) if maximum > 0 else 0.0
        return {
            "marks_obtained": obtained,
            "max_marks": maximum,
            "percentage": percentage,
            "status": "Available"
        }
    
    # Match single number
    match_single = re.search(r"^(\d+(?:\.\d+)?)$", cleaned)
    if match_single:
        val = float(match_single.group(1))
        return {
            "marks_obtained": val,
            "max_marks": 100.0,
            "percentage": val,
            "status": "Available"
        }

    return {
        "marks_obtained": None,
        "max_marks": None,
        "percentage": None,
        "status": "Pending"
    }

def extract_cards_from_html(html_content: str) -> List[Dict[str, Any]]:
    """
    Parses the results page HTML (cdmypage.php) and extracts all examination cards/rows.
    Supports both desktop DataTables/HTML tables and mobile/card layouts.
    """
    soup = BeautifulSoup(html_content, "html.parser")
    extracted_cards: List[Dict[str, Any]] = []

    # Strategy 1: Check DataTables / Table rows (#report_table tr or table tr)
    table_rows = soup.select("#report_table tr, table tr")
    for tr in table_rows:
        cols = tr.find_all("td")
        if len(cols) >= 6:
            row_text = " ".join(td.get_text(strip=True) for td in cols)
            if "test session" in row_text.lower() or ("score" in row_text.lower() and len(cols) <= 2):
                continue

            # Standard portal table structure:
            # 0: SessionId, 1: Mode, 2: DateTime, 3: ExamType, 4: TestName, 5: Score, 6: Time
            category = "MHTCET"
            test_name = ""
            raw_date_str = ""
            exam_time = ""
            score_text = ""
            duration = ""

            # Test Name (col 4)
            col4_text = cols[4].get_text(strip=True) if len(cols) > 4 else ""
            if col4_text and len(col4_text) > 3:
                test_name = col4_text

            # Date & Time (col 2)
            col2_text = cols[2].get_text(strip=True) if len(cols) > 2 else ""
            dt_match = re.search(r"(\d{1,2}[-/](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2})[-/]?\d*)", col2_text, re.I)
            if dt_match:
                raw_date_str = dt_match.group(1)
            tm_match = re.search(r"(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)", col2_text, re.I)
            if tm_match:
                exam_time = tm_match.group(1)

            # Category (col 3)
            col3_text = cols[3].get_text(strip=True) if len(cols) > 3 else ""
            if col3_text:
                category = col3_text.upper()

            # Score (col 5 - strictly Score, never overwritten by col 6!)
            col5_text = cols[5].get_text(strip=True) if len(cols) > 5 else ""
            if col5_text:
                score_text = col5_text
                if re.match(r"^\d+(?:\.\d+)?$", col5_text):
                    score_text = f"{col5_text}/100"

            # Duration / Time (col 6 - strictly time spent)
            if len(cols) > 6:
                col6_text = cols[6].get_text(strip=True)
                if col6_text:
                    duration = f"{col6_text} mins" if col6_text.isdigit() else col6_text

            # Fallback if col 4 wasn't test name
            if not test_name:
                for idx, col in enumerate(cols):
                    text = col.get_text(strip=True)
                    if any(k in text.upper() for k in ["VRT", "CET", "JEE", "MATH", "PHY", "CHEM", "TEST", "VPT"]) and len(text) > 8:
                        test_name = text
                    elif not score_text and (re.search(r"\d+\s*/\s*\d+", text) or text in ["-", "Pending", "Result Pending"]):
                        score_text = text

            if test_name:
                paper_type = identify_paper_type(test_name)
                clean_date, sort_date = compute_sort_date(raw_date_str, exam_time, test_name)
                score_info = parse_score_string(score_text)

                extracted_cards.append({
                    "exam_category": category,
                    "test_name": test_name,
                    "paper_type": paper_type,
                    "exam_date": clean_date,
                    "sort_date": sort_date,
                    "exam_time": exam_time,
                    "marks_obtained": score_info["marks_obtained"],
                    "max_marks": score_info["max_marks"],
                    "percentage": score_info["percentage"],
                    "duration": duration,
                    "result_status": score_info["status"],
                    "raw_score_text": score_text or "-"
                })

    # Strategy 2: If no table rows matched, parse Card-based / Mobile layouts
    if not extracted_cards:
        cards = soup.select(".card, .panel, .box, .test-card, div[class*='card']")
        if not cards:
            potential_tags = soup.find_all(
                lambda t: t.name in ["div", "section", "article", "li"] and
                          "test name" in t.text.lower() and
                          ("score" in t.text.lower() or "pending" in t.text.lower())
            )
            cards = []
            for tag in potential_tags:
                occurrences = len(re.findall(r"test\s*name", tag.text, re.IGNORECASE))
                if occurrences == 1 and not any(tag in p.descendants for p in cards):
                    cards.append(tag)

        for card in cards:
            card_text = card.get_text(separator="\n", strip=True)
            if not card_text:
                continue

            tn_match = re.search(r"Test\s*Name\s*[:\-]?\s*([^\n\r]+)", card_text, re.IGNORECASE)
            if not tn_match:
                continue
            
            test_name = tn_match.group(1).strip()
            if not test_name:
                continue

            category = "MHTCET"
            cat_match = re.search(r"\b(MHTCET|MHT-CET|CET|JEE|NEET)\b", card_text, re.IGNORECASE)
            if cat_match:
                category = cat_match.group(1).upper()

            paper_type = identify_paper_type(test_name)

            raw_date_str = ""
            date_match = re.search(r"(\d{1,2}[-/](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2})[-/]?\d*)", card_text, re.IGNORECASE)
            if date_match:
                raw_date_str = date_match.group(1).strip()

            exam_time = ""
            time_match = re.search(r"(\d{1,2}:\d{2}\s*(?:AM|PM)?)", card_text, re.IGNORECASE)
            if time_match:
                exam_time = time_match.group(1).strip()

            clean_date, sort_date = compute_sort_date(raw_date_str, exam_time, test_name)

            duration = ""
            dur_match = re.search(r"Time\s*[:\-]?\s*(\d+)", card_text, re.IGNORECASE)
            if dur_match:
                duration = f"{dur_match.group(1)} mins"

            raw_score = ""
            score_match = re.search(r"Score\s*[:\-]?\s*([^\n\r]+)", card_text, re.IGNORECASE)
            if score_match:
                raw_score = score_match.group(1).strip()
            
            is_explicit_pending = "result pending" in card_text.lower() or "pending" in card_text.lower()

            score_info = parse_score_string(raw_score)
            if is_explicit_pending and score_info["marks_obtained"] is None:
                score_info["status"] = "Pending"

            extracted_cards.append({
                "exam_category": category,
                "test_name": test_name,
                "paper_type": paper_type,
                "exam_date": clean_date,
                "sort_date": sort_date,
                "exam_time": exam_time,
                "marks_obtained": score_info["marks_obtained"],
                "max_marks": score_info["max_marks"],
                "percentage": score_info["percentage"],
                "duration": duration,
                "result_status": score_info["status"],
                "raw_score_text": raw_score or ("Pending" if is_explicit_pending else "-")
            })

    return extracted_cards
