import React, { createContext, useContext, useState } from "react";

// 1️⃣ Tạo Context
const InfoContext = createContext();

// 2️⃣ Provider
export const InfoProvider = ({ children }) => {
  const [infoByDate, setInfoByDate] = useState({});

  /**
   * Lưu thông tin phiếu tiền ăn theo ngày
   * @param {Date|string} date - ngày dưới dạng Date hoặc "yyyy-MM-dd"
   * @param {Object} data - dữ liệu như { hieuTruong, keToan, lyDo, ... }
   */
  const saveInfoToContext = (date, data) => {
    const dateStr = typeof date === "string" ? date : date.toISOString().split("T")[0];
    setInfoByDate(prev => ({
      ...prev,
      [dateStr]: {
        ...prev[dateStr],
        ...data,
        updatedAt: new Date().toISOString(),
      }
    }));
  };

  /**
   * Xóa toàn bộ thông tin
   */
  const clearInfo = () => setInfoByDate({});

  return (
    <InfoContext.Provider value={{ infoByDate, saveInfoToContext, clearInfo }}>
      {children}
    </InfoContext.Provider>
  );
};

// 3️⃣ Hook tiện lợi
export const useInfo = () => useContext(InfoContext);
