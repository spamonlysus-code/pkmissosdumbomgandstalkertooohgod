import math
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional

from backend.database import (
    get_all_students, get_latest_results_for_student,
    get_all_results_for_student, get_student_by_id
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

def predict_mhtcet_percentile(total_pcm_marks: float) -> float:
    """
    Calibrated estimation of MHTCET Percentile from PCM Score (out of 200).
    Based on official Maharashtra State CET Cell score-to-percentile trends.
    """
    m = max(0.0, min(200.0, float(total_pcm_marks)))
    if m >= 180:
        pct = 99.85 + (m - 180) / 20 * 0.14
    elif m >= 165:
        pct = 99.20 + (m - 165) / 15 * 0.65
    elif m >= 150:
        pct = 98.20 + (m - 150) / 15 * 1.00
    elif m >= 135:
        pct = 96.50 + (m - 135) / 15 * 1.70
    elif m >= 120:
        pct = 93.50 + (m - 120) / 15 * 3.00
    elif m >= 105:
        pct = 89.00 + (m - 105) / 15 * 4.50
    elif m >= 90:
        pct = 82.50 + (m - 90) / 15 * 6.50
    elif m >= 75:
        pct = 74.00 + (m - 75) / 15 * 8.50
    elif m >= 60:
        pct = 62.00 + (m - 60) / 15 * 12.00
    elif m >= 45:
        pct = 48.00 + (m - 45) / 15 * 14.00
    else:
        pct = max(10.0, m / 45 * 48.0)
    return round(min(99.99, pct), 2)

def predict_target_colleges(percentile: float) -> Dict[str, Any]:
    """
    Returns eligible Maharashtra engineering college tiers and marquee institutes based on percentile.
    """
    if percentile >= 99.2:
        return {
            "tier": "Tier 1 (Premier)",
            "tier_label": "Top 1% Elite",
            "colleges": ["VJTI Mumbai (CS/IT)", "COEP Pune (CS/EnTC)", "SPIT Mumbai (CSE)"],
            "badge_color": "emerald"
        }
    elif percentile >= 98.0:
        return {
            "tier": "Tier 1.5 (High Repute)",
            "tier_label": "High Repute",
            "colleges": ["PICT Pune (CS/IT)", "D.J. Sanghvi Mumbai (CSE)", "SPIT Mumbai (Extc)"],
            "badge_color": "blue"
        }
    elif percentile >= 95.0:
        return {
            "tier": "Tier 2 (Top Regional)",
            "tier_label": "Top Regional",
            "colleges": ["Walchand Sangli", "Thadomal Shahani Mumbai", "VIT Pune", "Cummins Pune"],
            "badge_color": "indigo"
        }
    elif percentile >= 90.0:
        return {
            "tier": "Tier 2.5 (Established)",
            "tier_label": "Established",
            "colleges": ["VESIT Chembur", "Fr. CRCE Bandra", "PCCOE Pune", "Vidyalankar Wadala"],
            "badge_color": "teal"
        }
    elif percentile >= 80.0:
        return {
            "tier": "Tier 3 (Accredited)",
            "tier_label": "Accredited",
            "colleges": ["K.J. Somaiya Sion", "Thakur Kandivali", "SIES Nerul", "St. Francis Borivali"],
            "badge_color": "amber"
        }
    else:
        return {
            "tier": "Foundation Focus",
            "tier_label": "Foundation",
            "colleges": ["Rizvi Bandra", "Atharva Malad", "Pillai Panvel", "Don Bosco Kurla"],
            "badge_color": "slate"
        }

def diagnose_performance(
    m_score: Optional[float],
    p_score: Optional[float],
    avg_math: float,
    avg_phy_chem: float
) -> Dict[str, Any]:
    """
    Diagnoses subject strengths, weaknesses, and performance category.
    """
    m = m_score if m_score is not None else 0.0
    p = p_score if p_score is not None else 0.0
    total = m + p
    class_total_avg = avg_math + avg_phy_chem
    delta_avg = round(total - class_total_avg, 1)

    diff = m - p
    if m >= 60 and p >= 60:
        tag = "Top All-Rounder"
        badge_style = "emerald"
        strengths = "Consistently high scores across both Mathematics and Phy+Chem"
        focus_area = "Maintain speed and practice full-length 3-hour mocks"
    elif diff >= 15:
        tag = "Maths Specialist"
        badge_style = "blue"
        strengths = f"Maths ({m}/100) is significantly stronger than class average (+{round(m - avg_math, 1)})"
        focus_area = f"Target Chemistry NCERT & Physics numericals to boost Phy+Chem ({p}/100)"
    elif diff <= -15:
        tag = "Phy+Chem Powerhouse"
        badge_style = "indigo"
        strengths = f"Physics & Chemistry ({p}/100) leading significantly (+{round(p - avg_phy_chem, 1)} above avg)"
        focus_area = f"Strengthen Calculus & Vectors in Mathematics ({m}/100)"
    elif total >= class_total_avg:
        tag = "Balanced Performer"
        badge_style = "teal"
        strengths = "Equal scoring distribution between Mathematics and Sciences"
        focus_area = "Aim for +10 marks jump in both papers to breach Tier 1 cutoff"
    else:
        tag = "Rising Trajectory"
        badge_style = "amber"
        strengths = "Solid foundation across attempted question sets"
        focus_area = "Focus on high-weightage chapters and revision of error logs"

    return {
        "tag": tag,
        "badge_style": badge_style,
        "strengths": strengths,
        "focus_area": focus_area,
        "delta_from_class_avg": delta_avg,
        "is_above_avg": delta_avg >= 0
    }

@router.get("/summary")
def get_analytics_summary():
    """
    Computes key statistics across all students:
    - Highest scores for Maths and Phy+Chem
    - Averages strictly excluding pending or missing results
    - Full Leaderboard with MHTCET percentile and college predictions
    - Subject diagnosis and strengths/weaknesses for each student
    """
    students = get_all_students()

    math_scores: List[float] = []
    phy_chem_scores: List[float] = []

    highest_math = {"score": None, "max": None, "student": None, "test_name": None}
    highest_phy_chem = {"score": None, "max": None, "student": None, "test_name": None}

    available_count = 0
    pending_count = 0
    student_records = []

    for s in students:
        s_id = s["id"]
        latest = get_latest_results_for_student(s_id)
        m = latest["maths"]
        p = latest["phy_chem"]

        m_score = None
        p_score = None

        if m:
            if m["result_status"] == "Available" and m["marks_obtained"] is not None:
                available_count += 1
                val = float(m["marks_obtained"])
                math_scores.append(val)
                m_score = val
                if highest_math["score"] is None or val > highest_math["score"]:
                    highest_math = {
                        "score": val,
                        "max": m["max_marks"],
                        "student": s["display_name"],
                        "test_name": m["test_name"]
                    }
            elif m["result_status"] == "Pending":
                pending_count += 1

        if p:
            if p["result_status"] == "Available" and p["marks_obtained"] is not None:
                available_count += 1
                val = float(p["marks_obtained"])
                phy_chem_scores.append(val)
                p_score = val
                if highest_phy_chem["score"] is None or val > highest_phy_chem["score"]:
                    highest_phy_chem = {
                        "score": val,
                        "max": p["max_marks"],
                        "student": s["display_name"],
                        "test_name": p["test_name"]
                    }
            elif p["result_status"] == "Pending":
                pending_count += 1

        student_records.append({
            "student_id": s["id"],
            "slot_number": s["slot_number"],
            "student_name": s["display_name"],
            "maths": m_score,
            "maths_max": m["max_marks"] if m else 100,
            "maths_percentage": m["percentage"] if m else None,
            "phy_chem": p_score,
            "phy_chem_max": p["max_marks"] if p else 100,
            "phy_chem_percentage": p["percentage"] if p else None,
            "maths_status": m["result_status"] if m else "No Data",
            "phy_chem_status": p["result_status"] if p else "No Data"
        })

    avg_math = round(sum(math_scores) / len(math_scores), 2) if math_scores else 45.0
    avg_phy_chem = round(sum(phy_chem_scores) / len(phy_chem_scores), 2) if phy_chem_scores else 45.0
    avg_total = round(avg_math + avg_phy_chem, 2)
    avg_percentile = predict_mhtcet_percentile(avg_total)

    # Build Ranked Leaderboard
    leaderboard = []
    for sr in student_records:
        m_val = sr["maths"] if sr["maths"] is not None else 0.0
        p_val = sr["phy_chem"] if sr["phy_chem"] is not None else 0.0
        tot = m_val + p_val
        tot_pct = round((tot / 200.0) * 100, 1)
        pctile = predict_mhtcet_percentile(tot)
        colleges = predict_target_colleges(pctile)
        diag = diagnose_performance(sr["maths"], sr["phy_chem"], avg_math, avg_phy_chem)

        leaderboard.append({
            "student_id": sr["student_id"],
            "slot_number": sr["slot_number"],
            "student_name": sr["student_name"],
            "maths_score": sr["maths"],
            "maths_max": sr["maths_max"],
            "maths_percentage": sr["maths_percentage"],
            "phy_chem_score": sr["phy_chem"],
            "phy_chem_max": sr["phy_chem_max"],
            "phy_chem_percentage": sr["phy_chem_percentage"],
            "total_score": tot,
            "total_percentage": tot_pct,
            "estimated_percentile": pctile,
            "predicted_colleges": colleges,
            "diagnosis": diag
        })

    # Sort descending by total score
    leaderboard.sort(key=lambda x: x["total_score"], reverse=True)

    # Assign rank numbers & medal badges
    for idx, item in enumerate(leaderboard, 1):
        item["rank"] = idx
        if idx == 1:
            item["rank_badge"] = "🥇"
            item["rank_label"] = "Rank 1"
        elif idx == 2:
            item["rank_badge"] = "🥈"
            item["rank_label"] = "Rank 2"
        elif idx == 3:
            item["rank_badge"] = "🥉"
            item["rank_label"] = "Rank 3"
        else:
            item["rank_badge"] = f"#{idx:02d}"
            item["rank_label"] = f"Rank {idx}"

    return {
        "highest_math": highest_math,
        "highest_phy_chem": highest_phy_chem,
        "avg_math": avg_math,
        "avg_phy_chem": avg_phy_chem,
        "avg_total": avg_total,
        "avg_percentile": avg_percentile,
        "available_scores": available_count,
        "pending_scores": pending_count,
        "active_students": len(students),
        "leaderboard": leaderboard,
        "comparison": [
            {
                "student_id": item["student_id"],
                "student_name": item["student_name"],
                "maths_score": item["maths_score"],
                "phy_chem_score": item["phy_chem_score"],
                "total_score": item["total_score"],
                "percentile": item["estimated_percentile"],
                "rank": item["rank"]
            }
            for item in leaderboard
        ]
    }

@router.get("/compare/{student_a_id}/{student_b_id}")
def compare_students_endpoint(student_a_id: int, student_b_id: int):
    """
    Compares two students head-to-head across all common and past tests:
    - Direct win/loss/tie tally
    - Mathematics vs Physics+Chemistry performance
    - Consistency score (Standard Deviation)
    - Combined score and MHTCET percentile delta
    - Analytical comparison verdict
    """
    student_a = get_student_by_id(student_a_id)
    student_b = get_student_by_id(student_b_id)

    if not student_a or not student_b:
        raise HTTPException(status_code=404, detail="One or both students not found")

    tests_a = get_all_results_for_student(student_a_id)
    tests_b = get_all_results_for_student(student_b_id)

    # Index by unique test signature: test_name + paper_type
    dict_a = {f"{t['test_name'].strip().lower()}_{t['paper_type']}": t for t in tests_a}
    dict_b = {f"{t['test_name'].strip().lower()}_{t['paper_type']}": t for t in tests_b}

    common_keys = set(dict_a.keys()).intersection(set(dict_b.keys()))

    a_wins = 0
    b_wins = 0
    ties = 0

    matched_tests = []
    for k in sorted(common_keys):
        rec_a = dict_a[k]
        rec_b = dict_b[k]
        sc_a = rec_a.get("marks_obtained")
        sc_b = rec_b.get("marks_obtained")

        winner = None
        if sc_a is not None and sc_b is not None:
            if sc_a > sc_b:
                a_wins += 1
                winner = "A"
            elif sc_b > sc_a:
                b_wins += 1
                winner = "B"
            else:
                ties += 1
                winner = "Tie"

        matched_tests.append({
            "test_name": rec_a["test_name"],
            "paper_type": rec_a["paper_type"],
            "exam_date": rec_a["exam_date"],
            "score_a": sc_a,
            "score_b": sc_b,
            "max_marks": rec_a["max_marks"],
            "winner": winner
        })

    # Latest scores
    latest_a = get_latest_results_for_student(student_a_id)
    latest_b = get_latest_results_for_student(student_b_id)

    la_m = float(latest_a["maths"]["marks_obtained"]) if latest_a["maths"] and latest_a["maths"]["marks_obtained"] is not None else 0.0
    la_p = float(latest_a["phy_chem"]["marks_obtained"]) if latest_a["phy_chem"] and latest_a["phy_chem"]["marks_obtained"] is not None else 0.0
    tot_a = la_m + la_p
    pct_a = predict_mhtcet_percentile(tot_a)

    lb_m = float(latest_b["maths"]["marks_obtained"]) if latest_b["maths"] and latest_b["maths"]["marks_obtained"] is not None else 0.0
    lb_p = float(latest_b["phy_chem"]["marks_obtained"]) if latest_b["phy_chem"] and latest_b["phy_chem"]["marks_obtained"] is not None else 0.0
    tot_b = lb_m + lb_p
    pct_b = predict_mhtcet_percentile(tot_b)

    # Average scores across all tests
    scores_a_all = [float(t["marks_obtained"]) for t in tests_a if t.get("marks_obtained") is not None]
    scores_b_all = [float(t["marks_obtained"]) for t in tests_b if t.get("marks_obtained") is not None]

    mean_a = round(sum(scores_a_all) / len(scores_a_all), 1) if scores_a_all else 0.0
    mean_b = round(sum(scores_b_all) / len(scores_b_all), 1) if scores_b_all else 0.0

    # Consistency rating (Standard deviation: lower std dev = more consistent)
    def calc_std_dev(scores, mean):
        if len(scores) < 2:
            return 0.0
        variance = sum((x - mean) ** 2 for x in scores) / len(scores)
        return round(math.sqrt(variance), 1)

    std_a = calc_std_dev(scores_a_all, mean_a)
    std_b = calc_std_dev(scores_b_all, mean_b)

    # Verdict generation
    name_a = student_a["display_name"].split()[0]
    name_b = student_b["display_name"].split()[0]

    if a_wins > b_wins:
        verdict = f"{name_a} leads head-to-head ({a_wins} wins to {b_wins}), holding a +{round(tot_a - tot_b, 1)} mark edge in current PCM total."
    elif b_wins > a_wins:
        verdict = f"{name_b} leads head-to-head ({b_wins} wins to {a_wins}), holding a +{round(tot_b - tot_a, 1)} mark edge in current PCM total."
    else:
        verdict = f"{name_a} and {name_b} are perfectly level in head-to-head matchups ({a_wins} wins each)."

    return {
        "student_a": {
            "id": student_a["id"],
            "name": student_a["display_name"],
            "slot_number": student_a["slot_number"],
            "maths": la_m,
            "phy_chem": la_p,
            "total": tot_a,
            "percentile": pct_a,
            "colleges": predict_target_colleges(pct_a),
            "historical_mean": mean_a,
            "consistency_index": std_a
        },
        "student_b": {
            "id": student_b["id"],
            "name": student_b["display_name"],
            "slot_number": student_b["slot_number"],
            "maths": lb_m,
            "phy_chem": lb_p,
            "total": tot_b,
            "percentile": pct_b,
            "colleges": predict_target_colleges(pct_b),
            "historical_mean": mean_b,
            "consistency_index": std_b
        },
        "head_to_head": {
            "common_tests_count": len(common_keys),
            "student_a_wins": a_wins,
            "student_b_wins": b_wins,
            "ties": ties,
            "verdict": verdict,
            "matched_tests": matched_tests
        }
    }

@router.get("/student-trend/{student_id}")
def get_student_trend(student_id: int):
    """
    Returns chronological exam results for a student to visualize trends across examinations.
    """
    results = get_all_results_for_student(student_id)
    sorted_res = sorted(results, key=lambda x: (x.get("sort_date") or x.get("exam_date") or "", x["id"]))

    trend_points = []
    for r in sorted_res:
        trend_points.append({
            "test_name": r["test_name"],
            "paper_type": r["paper_type"],
            "exam_date": r["exam_date"],
            "sort_date": r.get("sort_date"),
            "marks_obtained": r["marks_obtained"],
            "max_marks": r["max_marks"],
            "percentage": r["percentage"],
            "status": r["result_status"]
        })

    return trend_points
