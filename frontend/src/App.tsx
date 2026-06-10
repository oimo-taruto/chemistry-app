import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import PracticePage from "./pages/PracticePage";
import ReviewPage from "./pages/ReviewPage";
import MyPage from "./pages/MyPage";

const tabs = [
  { path: "/", label: "ホーム" },
  { path: "/mypage", label: "分析" },
];

function TabBar() {
  const location = useLocation();
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        borderTop: "1px solid #ddd",
        background: "#fff",
      }}
    >
      {tabs.map((t) => (
        <Link
          key={t.path}
          to={t.path}
          style={{
            flex: 1,
            padding: "10px 4px",
            textAlign: "center",
            fontSize: 13,
            textDecoration: "none",
            color: location.pathname === t.path ? "#2b7a4b" : "#888",
            fontWeight: location.pathname === t.path ? "bold" : "normal",
          }}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export default function App() {
  return (
    <div style={{ paddingBottom: 60 }}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/mypage" element={<MyPage />} />
      </Routes>
      <TabBar />
    </div>
  );
}
