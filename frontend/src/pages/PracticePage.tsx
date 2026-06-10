import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStudentId } from "../hooks/useStudentId";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

type Problem = {
  id: string;
  question: string;
  answer: string;
  unit: string;
  sub_unit: string | null;
  question_type: string;
  difficulty: number;
};

export default function PracticePage() {
  const navigate = useNavigate();
  const studentId = useStudentId();

  const [queue, setQueue] = useState<Problem[]>([]);
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProblems() {
      if (!API_BASE) { setError("VITE_API_BASE_URL が設定されていません"); return; }
      try {
        const res = await fetch(`${API_BASE}/api/problems/practice`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Problem[];
        setQueue(data);
      } catch (e: any) {
        setError(e.message ?? "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    }
    fetchProblems();
  }, []);

  async function sendAnswer(isCorrect: boolean) {
    if (!API_BASE || !studentId || !queue[index]) return;
    try {
      await fetch(`${API_BASE}/api/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          problem_id: queue[index].id,
          mode: "practice",
          is_correct: isCorrect,
          reason_tag: null,
          memo: null,
        }),
      });
    } catch {
      // 失敗は今は無視
    }
  }

  function next(isCorrect: boolean) {
    sendAnswer(isCorrect);
    setShowAnswer(false);
    setIndex((i) => i + 1);
  }

  const problem = queue[index] ?? null;
  const finished = !loading && queue.length > 0 && index >= queue.length;

  return (
    <main style={{ padding: 20 }}>
      {/* 上部ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>問題演習</h2>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid #ccc",
            background: "#fff",
            color: "#444",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          演習を終わる
        </button>
      </div>

      {loading && <p style={{ color: "#666" }}>読み込み中...</p>}
      {error && <p style={{ color: "red", fontSize: 14 }}>エラー: {error}</p>}

      {/* 1周完了 */}
      {finished && (
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <p style={{ fontSize: 18, marginBottom: 16 }}>🎉 1周完了！</p>
          <button
            style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "#2b7a4b", color: "#fff", fontSize: 15, cursor: "pointer", marginRight: 8 }}
            onClick={() => { setIndex(0); setShowAnswer(false); }}
          >
            もう一周する
          </button>
          <button
            style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "#555", color: "#fff", fontSize: 15, cursor: "pointer" }}
            onClick={() => navigate("/")}
          >
            ホームに戻る
          </button>
        </div>
      )}

      {/* 問題表示 */}
      {problem && !loading && !finished && (
        <>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>
            {index + 1} / {queue.length} 問 ·{" "}
            {problem.unit}{problem.sub_unit ? ` / ${problem.sub_unit}` : ""} · {problem.question_type}
          </p>

          <div style={{ padding: 16, borderRadius: 10, background: "#f5f5f5", fontSize: 16, lineHeight: 1.7 }}>
            {problem.question}
          </div>

          {!showAnswer ? (
            <button
              style={{ marginTop: 20, width: "100%", padding: 13, borderRadius: 8, border: "1px solid #2b7a4b", background: "#fff", color: "#2b7a4b", fontSize: 15, cursor: "pointer" }}
              onClick={() => setShowAnswer(true)}
            >
              答えを見る
            </button>
          ) : (
            <>
              <div style={{ marginTop: 12, padding: 14, borderRadius: 10, background: "#e8f5e9", fontSize: 15, lineHeight: 1.7 }}>
                {problem.answer}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button
                  style={{ flex: 1, padding: 12, borderRadius: 8, border: "none", background: "#2b7a4b", color: "#fff", fontSize: 15, cursor: "pointer" }}
                  onClick={() => next(true)}
                >
                  わかった ✓
                </button>
                <button
                  style={{ flex: 1, padding: 12, borderRadius: 8, border: "none", background: "#e57373", color: "#fff", fontSize: 15, cursor: "pointer" }}
                  onClick={() => next(false)}
                >
                  わからなかった ✗
                </button>
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
