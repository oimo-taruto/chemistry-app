import { useEffect, useState } from "react";

const STORAGE_KEY = "chemistry_student_id";

function generateUuid() {
  // 簡易版。あとで必要ならちゃんとしたUUID生成に差し替え可。
  return crypto.randomUUID();
}

export function useStudentId() {
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) {
      setStudentId(existing);
    } else {
      const id = generateUuid();
      window.localStorage.setItem(STORAGE_KEY, id);
      setStudentId(id);
    }
  }, []);

  return studentId;
}
