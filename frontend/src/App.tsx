import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import PracticePage from "./pages/PracticePage";
import CollectionPage from "./pages/CollectionPage";
import MyPage from "./pages/MyPage";

const tabs = [
  { path: "/", label: "ホーム" },
  { path: "/practice", label: "問題演習" },
  { path: "/collection", label: "コレクション" },
  { path: "/mypage", label: "マイページ" },
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
            padding: "8px 4px",
            textAlign: "center",
            fontSize: 12,
            textDecoration: "none",
            color: location.pathname === t.path ? "#2b7a4b" : "#666",
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
    <div style={{ paddingBottom: 56 }}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/collection" element={<CollectionPage />} />
        <Route path="/mypage" element={<MyPage />} />
      </Routes>
      <TabBar />
    </div>
  );
}
