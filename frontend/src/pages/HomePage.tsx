import React from "react";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();

  const btnStyle = (color: string): React.CSSProperties => ({
    width: "100%",
    padding: 14,
    borderRadius: 10,
    border: "none",
    background: color,
    color: "#fff",
    fontSize: 16,
    cursor: "pointer",
    marginBottom: 12,
    textAlign: "left",
  });

  return (
    <main style={{ padding: 20 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>化学暗記チェック</h1>
      <p style={{ fontSize: 14, color: "#666", marginBottom: 28 }}>
        暗記事項の抜け漏れをサクッと確認しよう。
      </p>

      <button style={btnStyle("#2b7a4b")} onClick={() => navigate("/practice")}>
        📚 全範囲から演習する
      </button>

      <button style={btnStyle("#1565c0")} onClick={() => navigate("/review")}>
        🔁 間違えた問題を復習する
      </button>

      <button style={btnStyle("#555")} onClick={() => navigate("/mypage")}>
        📊 弱点を分析する
      </button>
    </main>
  );
}
