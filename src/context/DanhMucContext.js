import { createContext, useContext, useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

const DanhMucContext = createContext();

export function DanhMucProvider({ children }) {
  const [danhMuc, setDanhMuc] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Load từ localStorage trước ---
  useEffect(() => {
    const cached = localStorage.getItem("DANHMUC");
    if (cached) {
      setDanhMuc(JSON.parse(cached));
      setLoading(false);
    }
  }, []);

  // --- Hàm đồng bộ từ Firestore ---
  const fetchDanhMuc = async () => {
    setLoading(true);
    const snapshot = await getDocs(collection(db, "DANHMUC"));
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    setDanhMuc(data);
    localStorage.setItem("DANHMUC", JSON.stringify(data));
    setLoading(false);
  };

  // --- Hàm clear localStorage nếu cần ---
  const clearCache = () => {
    localStorage.removeItem("DANHMUC");
    setDanhMuc([]);
  };

  return (
    <DanhMucContext.Provider value={{ danhMuc, setDanhMuc, fetchDanhMuc, clearCache, loading }}>
      {children}
    </DanhMucContext.Provider>
  );
}

export function useDanhMuc() {
  return useContext(DanhMucContext);
}
