import os
import random
import string
from datetime import datetime, timezone
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client
from typing import Optional, Literal

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Helpers ---

def generate_sync_id():
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=4)) + '-' + ''.join(random.choices(chars, k=4))


# --- Models ---

class StudentCreate(BaseModel):
    nickname: Optional[str] = None

class StudentRestore(BaseModel):
    sync_id: str

class AnswerCreate(BaseModel):
    student_id: str
    problem_id: str
    mode: Literal["practice", "review"]
    is_correct: bool
    reason_tag: Optional[Literal["覚えてない", "混乱", "読み違い"]] = None
    memo: Optional[str] = None


# --- Endpoints ---

@app.get("/health")
def health_check():
    return {"status": "ok"}


# ユーザー作成
@app.post("/api/students")
def create_student(body: StudentCreate):
    for _ in range(10):
        sync_id = generate_sync_id()
        existing = supabase.table("students").select("id").eq("sync_id", sync_id).execute()
        if not existing.data:
            break
    result = supabase.table("students").insert({
        "sync_id": sync_id,
        "nickname": body.nickname
    }).execute()
    student = result.data[0]
    return {
        "student_id": student["id"],
        "sync_id": student["sync_id"],
        "nickname": student["nickname"]
    }


# ユーザー復元
@app.post("/api/students/restore")
def restore_student(body: StudentRestore):
    result = supabase.table("students").select("*").eq("sync_id", body.sync_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="sync_id not found")
    student = result.data[0]
    return {
        "student_id": student["id"],
        "sync_id": student["sync_id"],
        "nickname": student["nickname"]
    }


# 演習モード：全範囲インターリーブ（完全ランダム・全問題から）
@app.get("/api/problems/practice")
def get_practice_problems():
    all_problems = supabase.table("problems").select("*").execute().data
    if not all_problems:
        raise HTTPException(status_code=404, detail="No problems found")
    random.shuffle(all_problems)
    return all_problems


# 復習モード：is_understood=false の問題を絞り込んでランダムに返す
@app.get("/api/problems/review")
def get_review_problems(
    student_id: str,
    unit: Optional[str] = None,
    sub_unit: Optional[str] = None,
    question_type: Optional[str] = None,
):
    # is_understood=false の problem_id を取得
    query = supabase.table("student_problem_status") \
        .select("problem_id") \
        .eq("student_id", student_id) \
        .eq("is_understood", False)
    status_rows = query.execute().data

    if not status_rows:
        return []

    target_ids = [r["problem_id"] for r in status_rows]

    # problems テーブルから該当問題を取得
    problems_query = supabase.table("problems").select("*").in_("id", target_ids)
    if unit:
        problems_query = problems_query.eq("unit", unit)
    if sub_unit:
        problems_query = problems_query.eq("sub_unit", sub_unit)
    if question_type:
        problems_query = problems_query.eq("question_type", question_type)

    problems = problems_query.execute().data
    if not problems:
        return []

    random.shuffle(problems)
    return problems


# 回答保存：answer_records に記録 + student_problem_status を更新
@app.post("/api/answers")
def post_answer(body: AnswerCreate):
    now = datetime.now(timezone.utc).isoformat()

    # 1. answer_records に追記
    supabase.table("answer_records").insert({
        "student_id": body.student_id,
        "problem_id": body.problem_id,
        "mode": body.mode,
        "is_correct": body.is_correct,
        "reason_tag": body.reason_tag,
        "memo": body.memo,
        "answered_at": now,
    }).execute()

    # 2. student_problem_status を取得
    status_res = supabase.table("student_problem_status") \
        .select("*") \
        .eq("student_id", body.student_id) \
        .eq("problem_id", body.problem_id) \
        .execute()
    status_row = status_res.data[0] if status_res.data else None

    if status_row is None:
        # 初回解答：INSERT
        supabase.table("student_problem_status").insert({
            "student_id": body.student_id,
            "problem_id": body.problem_id,
            "has_been_answered": True,
            "first_answer_correct": body.is_correct,
            "is_understood": body.is_correct,
            "updated_at": now,
        }).execute()
        updated = {
            "has_been_answered": True,
            "first_answer_correct": body.is_correct,
            "is_understood": body.is_correct,
        }
    else:
        # 2回目以降：is_understood だけ更新（first_answer_correct は触らない）
        supabase.table("student_problem_status").update({
            "is_understood": body.is_correct,
            "updated_at": now,
        }).eq("id", status_row["id"]).execute()
        updated = {
            "has_been_answered": True,
            "first_answer_correct": status_row["first_answer_correct"],
            "is_understood": body.is_correct,
        }

    return {"status": "ok", "updated_status": updated}


# 分析：unit / sub_unit / question_type ごとに3指標を返す
@app.get("/api/stats/{student_id}")
def get_stats(student_id: str):
    # student_problem_status と problems を JOIN して取得
    rows = supabase.table("student_problem_status") \
        .select("has_been_answered, first_answer_correct, is_understood, problems(unit, sub_unit, question_type)") \
        .eq("student_id", student_id) \
        .eq("has_been_answered", True) \
        .execute().data

    # 全問題数（カバー率の分母用）
    all_problems = supabase.table("problems").select("id, unit, sub_unit, question_type").execute().data

    def make_stats(groups: dict) -> list:
        result = []
        for key, v in groups.items():
            total_answered = v["answered"]
            total_all = v["total"]
            understood = v["understood"]
            first_correct = v["first_correct"]
            result.append({
                "label": key,
                "total_problems": total_all,               # 全問題数
                "answered": total_answered,                # 解いた問題数
                "cover_rate": round(total_answered / total_all, 2) if total_all else 0,         # カバー率
                "understanding_rate": round(understood / total_answered, 2) if total_answered else 0,  # 理解度
                "first_answer_rate": round(first_correct / total_answered, 2) if total_answered else 0, # 初回正答率
            })
        return result

    # unit 別
    by_unit: dict = {}
    for p in all_problems:
        u = p["unit"]
        if u not in by_unit:
            by_unit[u] = {"total": 0, "answered": 0, "understood": 0, "first_correct": 0}
        by_unit[u]["total"] += 1

    for r in rows:
        u = r["problems"]["unit"]
        if u not in by_unit:
            continue
        by_unit[u]["answered"] += 1
        if r["is_understood"]:
            by_unit[u]["understood"] += 1
        if r["first_answer_correct"]:
            by_unit[u]["first_correct"] += 1

    # sub_unit 別
    by_sub_unit: dict = {}
    for p in all_problems:
        su = p["sub_unit"] or "未分類"
        if su not in by_sub_unit:
            by_sub_unit[su] = {"total": 0, "answered": 0, "understood": 0, "first_correct": 0}
        by_sub_unit[su]["total"] += 1

    for r in rows:
        su = r["problems"]["sub_unit"] or "未分類"
        if su not in by_sub_unit:
            continue
        by_sub_unit[su]["answered"] += 1
        if r["is_understood"]:
            by_sub_unit[su]["understood"] += 1
        if r["first_answer_correct"]:
            by_sub_unit[su]["first_correct"] += 1

    # question_type 別
    by_type: dict = {}
    for p in all_problems:
        qt = p["question_type"]
        if qt not in by_type:
            by_type[qt] = {"total": 0, "answered": 0, "understood": 0, "first_correct": 0}
        by_type[qt]["total"] += 1

    for r in rows:
        qt = r["problems"]["question_type"]
        if qt not in by_type:
            continue
        by_type[qt]["answered"] += 1
        if r["is_understood"]:
            by_type[qt]["understood"] += 1
        if r["first_answer_correct"]:
            by_type[qt]["first_correct"] += 1

    return {
        "by_unit": make_stats(by_unit),
        "by_sub_unit": make_stats(by_sub_unit),
        "by_type": make_stats(by_type),
    }
