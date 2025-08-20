import React, { createContext, useState, useContext } from "react";

// Tạo context
const DataContext = createContext();

// Provider
export const DataProvider = ({ children }) => {
  const [dataByDate, setDataByDate] = useState({}); // lưu dữ liệu theo ngày

  //console.log("🔄 [DataProvider] Đã render. Dữ liệu hiện tại theo ngày:", dataByDate);

  return (
    <DataContext.Provider value={{ dataByDate, setDataByDate }}>
      {children}
    </DataContext.Provider>
  );
};

// Custom hook tiện lợi để sử dụng context
export const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) {
    console.error("❌ [useDataContext] Hook này phải được dùng bên trong <DataProvider>");
    return null;
  }
  return context;
};

// Custom hook để lưu dữ liệu vào context theo ngày
export const useSaveDataToContext = () => {
  const context = useDataContext();
  if (!context) return;

  const { setDataByDate } = context;

  /**
   * Lưu dữ liệu vào context theo ngày.
   * Nếu ngày đó đã có dữ liệu, merge với dữ liệu mới (không ghi đè hoàn toàn)
   * @param {Date} date - ngày cần lưu
   * @param {object} data - dữ liệu cần lưu
   */
  const saveDataToContext = (date, data) => {
    if (!(date instanceof Date)) {
      console.error("❌ [saveDataToContext] Tham số 'date' phải là kiểu Date");
      return;
    }

    const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD

    // --- Thêm log số lượng học sinh ---
    if (data.soLuongHocSinh !== undefined) {
      //console.log(`📊 [Context] Ngày ${dateStr} có số lượng học sinh:`, data.soLuongHocSinh);
    } else {
      //console.log(`📊 [Context] Ngày ${dateStr} chưa có số lượng học sinh`);
    }

    setDataByDate(prev => ({
      ...prev,
      [dateStr]: {
        ...(prev[dateStr] || {}), // giữ lại dữ liệu cũ nếu có
        ...data,                  // thêm dữ liệu mới
      },
    }));
  };

  return saveDataToContext;
};
