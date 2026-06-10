import React, { useState } from "react";
import { useStudentId } from "../hooks/useStudentId";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

type UnitStat = {
  unit: string;
  total: number;
  understood: number;
  rate: number;
};

type TypeStat = {
  question_type: string;
  total: number;
  understood: number;
  rate: number;
};

type StatsResponse = {
  by_unit: UnitStat[];
  by_type: TypeStat[];
};

export default function MyPage() {
  const studentId = useStudentId();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchStats() {
    if (!API_BASE) {
      setError("VITE_API_BASE_URL が設定されていません");
      return;
    }
    if (!studentId) {
      setError("student_id を取得中です。少し待ってから再度お試しください。");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/stats/${studentId}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as StatsResponse;
      setStats(data);
    } catch (e: any) {
      setError(e.message ?? "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 16 }}>
      <h2>マイページ</h2>

      <section
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 12,
          background: "#f5f5f5",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16 }}>
          振り返り
        </h3>
        <p style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
          この端末で解いた問題の結果を集計して表示します。
        </p>
        <button
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "none",
            background: "#2b7a4b",
            color: "#fff",
            fontSize: 14,
          }}
          onClick={fetchStats}
        >
          進捗を読み込む
        </button>

        {loading && (
          <p style={{ marginTop: 12, fontSize: 14 }}>読み込み中...</p>
        )}
        {error && (
          <p style={{ marginTop: 12, fontSize: 14, color: "red" }}>
            エラー: {error}
          </p>
        )}

        {stats && !loading && (
          <>
            <div style={{ marginTop: 16 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>単元別</h4>
              {stats.by_unit.length === 0 && (
                <p style={{ fontSize: 12, color: "#666" }}>
                  まだ記録がありません。
                </p>
              )}
              {stats.by_unit.map((u) => (
                <div
                  key={u.unit}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "#fff",
                    marginBottom: 6,
                    fontSize: 13,
                  }}
                >
                  <div>{u.unit}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    解いた数: {u.total} / わかった: {u.understood}（
                    {Math.round(u.rate * 100)}%）
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>問題タイプ別</h4>
              {stats.by_type.length === 0 && (
                <p style={{ fontSize: 12, color: "#666" }}>
                  まだ記録がありません。
                </p>
              )}
              {stats.by_type.map((t) => (
                <div
                  key={t.question_type}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "#fff",
                    marginBottom: 6,
                    fontSize: 13,
                  }}
                >
                  <div>{t.question_type}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    解いた数: {t.total} / わかった: {t.understood}（
                    {Math.round(t.rate * 100)}%）
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
