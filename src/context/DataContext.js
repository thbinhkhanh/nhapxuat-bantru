import React, { createContext, useState, useContext } from "react";

// Tạo context
const DataContext = createContext();

// Provider
export const DataProvider = ({ children }) => {
  const [dataByDate, setDataByDate] = useState({}); // lưu tất cả theo ngày

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

  const saveDataToContext = (date, data) => {
    if (!(date instanceof Date)) {
      console.error("❌ [saveDataToContext] Tham số 'date' phải là kiểu Date");
      return;
    }

    const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD

    setDataByDate(prev => ({
      ...prev,
      [dateStr]: {
        ...(prev[dateStr] || {}),
        ...data, // merge dữ liệu mới (tienAn, danhMucMap, suatAn, v.v.)
      },
    }));
  };

  return saveDataToContext;
};

// Custom hook để lấy dữ liệu theo ngày
export const useGetDataByDate = (date) => {
  const context = useDataContext();
  if (!context || !(date instanceof Date)) return null;

  const { dataByDate } = context;
  const dateStr = date.toISOString().split("T")[0];

  return dataByDate[dateStr] || null;
};