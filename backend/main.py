import os
import random
import string
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client
from typing import Optional

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
    is_understood: bool
    reason_tag: Optional[str] = None
    memo: Optional[str] = None


# --- Endpoints ---

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
    return {"student_id": student["id"], "sync_id": student["sync_id"], "nickname": student["nickname"]}


@app.post("/api/students/restore")
def restore_student(body: StudentRestore):
    result = supabase.table("students").select("*").eq("sync_id", body.sync_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="sync_id not found")
    student = result.data[0]
    return {"student_id": student["id"], "sync_id": student["sync_id"], "nickname": student["nickname"]}


@app.get("/api/problems/random")
def get_random_problem(student_id: Optional[str] = None):
    all_problems = supabase.table("problems").select("*").execute().data
    if not all_problems:
        raise HTTPException(status_code=404, detail="No problems found")

    if student_id:
        three_days_ago = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
        recent = supabase.table("answer_records") \
            .select("problem_id") \
            .eq("student_id", student_id) \
            .gte("created_at", three_days_ago) \
            .execute().data
        recent_ids = {r["problem_id"] for r in recent}
        candidates = [p for p in all_problems if p["id"] not in recent_ids]
        if not candidates:
            candidates = all_problems
    else:
        candidates = all_problems

    problem = random.choice(candidates)
    return problem


@app.post("/api/answers")
def post_answer(body: AnswerCreate):
    supabase.table("answer_records").insert({
        "student_id": body.student_id,
        "problem_id": body.problem_id,
        "is_understood": body.is_understood,
        "reason_tag": body.reason_tag,
        "memo": body.memo,
    }).execute()
    return {"status": "ok"}


@app.get("/api/stats/{student_id}")
def get_stats(student_id: str):
    records = supabase.table("answer_records") \
        .select("is_understood, problem_id, problems(unit, question_type)") \
        .eq("student_id", student_id) \
        .execute().data

    by_unit = {}
    by_type = {}

    for r in records:
        unit = r["problems"]["unit"]
        qtype = r["problems"]["question_type"]
        understood = r["is_understood"]

        if unit not in by_unit:
            by_unit[unit] = {"total": 0, "understood": 0}
        by_unit[unit]["total"] += 1
        if understood:
            by_unit[unit]["understood"] += 1

        if qtype not in by_type:
            by_type[qtype] = {"total": 0, "understood": 0}
        by_type[qtype]["total"] += 1
        if understood:
            by_type[qtype]["understood"] += 1

    return {
        "by_unit": [
            {"unit": k, "total": v["total"], "understood": v["understood"],
             "rate": round(v["understood"] / v["total"], 2)}
            for k, v in by_unit.items()
        ],
        "by_type": [
            {"question_type": k, "total": v["total"], "understood": v["understood"],
             "rate": round(v["understood"] / v["total"], 2)}
            for k, v in by_type.items()
        ]
    }
