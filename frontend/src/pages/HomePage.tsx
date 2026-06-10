import React from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <main style={{ padding: 16 }}>
      <h1>化学暗記チェック</h1>
      <p style={{ marginTop: 8, marginBottom: 24, fontSize: 14 }}>
        暗記事項の抜け漏れをサクッと確認しよう。
      </p>
      <button
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 8,
          border: "none",
          background: "#2b7a4b",
          color: "#fff",
          fontSize: 16,
        }}
        onClick={() => navigate("/practice")}
      >
        今日も確認する
      </button>
      <p style={{ marginTop: 16, fontSize: 12, color: "#666" }}>
        API: {API_BASE ?? "未設定"}
      </p>
    </main>
  );
}
