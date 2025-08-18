import { useDataContext } from "./DataContext";

/**
 * Lưu dữ liệu vào context theo ngày
 * @param {Date} date - Ngày cần lưu dữ liệu
 * @param {Array} data - Dữ liệu của ngày đó
 */
export const useSaveDataToContext = () => {
  const { dataByDate, setDataByDate } = useDataContext();

  const saveDataToContext = (date, data) => {
    const dateStr = date.toISOString().split("T")[0]; // convert sang string YYYY-MM-DD
    setDataByDate({
      ...dataByDate,
      [dateStr]: data,
    });
  };

  return saveDataToContext;
};
