// src/contexts/UpdateTypeContext.js
import React, { createContext, useState, useContext } from 'react';

// Tạo context
const UpdateTypeContext = createContext();

// Provider bao quanh các component cần dùng
export const UpdateTypeProvider = ({ children }) => {
  const [unmatchedItems, setUnmatchedItems] = useState([]); // lưu các obj chưa phân loại

  return (
    <UpdateTypeContext.Provider value={{ unmatchedItems, setUnmatchedItems }}>
      {children}
    </UpdateTypeContext.Provider>
  );
};

// Hook tiện lợi để dùng context trong component
export const useUpdateType = () => useContext(UpdateTypeContext);
