import React, { createContext, useContext, useState } from "react";

// 1️⃣ Tạo Context
const InfoContext = createContext();

// 2️⃣ Provider
export const InfoProvider = ({ children }) => {
  const [info, setInfo] = useState({});

  /**
   * Lưu thông tin phiếu tiền ăn
   * @param {Object} data - Dữ liệu như { hieuTruong, keToan, lyDo, ... }
   */
  const saveInfo = (data) => {
    setInfo(prev => ({
      ...prev,
      ...data,
      updatedAt: new Date().toISOString(), // tự động cập nhật thời gian
    }));
  };

  /**
   * Xóa toàn bộ thông tin
   */
  const clearInfo = () => setInfo({});

  return (
    <InfoContext.Provider value={{ info, saveInfo, clearInfo }}>
      {children}
    </InfoContext.Provider>
  );
};

// 3️⃣ Hook tiện lợi
export const useInfo = () => useContext(InfoContext);
