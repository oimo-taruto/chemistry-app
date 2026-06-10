import React, { useEffect, useState } from "react";
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
  const studentId = useStudentId();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchProblem() {
    if (!API_BASE) {
      setError("VITE_API_BASE_URL が設定されていません");
      return;
    }
    setLoading(true);
    setError(null);
    setShowAnswer(false);
    try {
      const res = await fetch(`${API_BASE}/api/problems/random${studentId ? `?student_id=${studentId}` : ""}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as Problem;
      setProblem(data);
    } catch (e: any) {
      setError(e.message ?? "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function sendAnswer(isUnderstood: boolean) {
    if (!API_BASE) return;
    if (!studentId || !problem) return;

    try {
      await fetch(`${API_BASE}/api/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          problem_id: problem.id,
          is_understood: isUnderstood,
          reason_tag: null,
          memo: null,
        }),
      });
    } catch {
      // 今は失敗しても無視（あとでトーストなどを足してもよい）
    }
  }

  useEffect(() => {
    fetchProblem();
  }, [studentId]);

  return (
    <main style={{ padding: 16 }}>
      <h2>問題演習</h2>

      {!studentId && (
        <p style={{ fontSize: 12, color: "#666" }}>
          学習者IDを準備しています…
        </p>
      )}

      {loading && <p>読み込み中...</p>}

      {error && (
        <p style={{ color: "red", fontSize: 14 }}>
          エラー: {error}
        </p>
      )}

      {problem && !loading && (
        <>
          <p style={{ marginTop: 16, fontSize: 12, color: "#666" }}>
            {problem.unit} / {problem.sub_unit ?? "-"} / {problem.question_type}
          </p>
          <p style={{ marginTop: 12, fontSize: 16 }}>{problem.question}</p>

          {!showAnswer ? (
            <button
              style={{
                marginTop: 24,
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #2b7a4b",
                background: "#fff",
                color: "#2b7a4b",
                fontSize: 16,
              }}
              onClick={() => setShowAnswer(true)}
            >
              答えを見る
            </button>
          ) : (
            <>
              <p
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 8,
                  background: "#f5f5f5",
                }}
              >
                {problem.answer}
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 16,
                }}
              >
                <button
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 8,
                    border: "none",
                    background: "#2b7a4b",
                    color: "#fff",
                  }}
                  onClick={async () => {
                    await sendAnswer(true);
                    fetchProblem();
                  }}
                >
                  わかった → 次へ
                </button>
                <button
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 8,
                    border: "none",
                    background: "#e57373",
                    color: "#fff",
                  }}
                  onClick={async () => {
                    await sendAnswer(false);
                    fetchProblem();
                  }}
                >
                  わからなかった → 次へ
                </button>
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
