import { formatExcelDate } from './excelUtils';

// ✅ Kiểu dữ liệu phẳng: mỗi dòng là một món ăn, có ngày riêng
export const parseFlatStructure = (rawData) => {
  const groupedByDate = {};

  rawData.forEach(row => {
    const ngayRaw = row['Ngày giao']?.toString().trim() || row['Ngày']?.toString().trim();
    const ngay = formatExcelDate(ngayRaw);
    if (!ngay) return;

    const ten = row['Tên hàng']?.toString().trim() || row['Tên thực phẩm']?.toString().trim();
    //const dvt = row['Đơn vị tính']?.toString().trim() || row['ĐVT']?.toString().trim();
    const dvtRaw = row['Đơn vị tính']?.toString().trim() || row['ĐVT']?.toString().trim() || '';
    const dvt = dvtRaw.charAt(0).toUpperCase() + dvtRaw.slice(1).toLowerCase();
    const soLuong = parseFloat(row['Số lượng']?.toString().replace(/,/g, '')) || 0;
    const donGia = parseFloat(row['Đơn giá']?.toString().replace(/,/g, '')) || 0;
    const thanhTien = parseFloat(row['Thành tiền']?.toString().replace(/,/g, '')) || (soLuong * donGia);
    const ghiChu = row['Ghi chú']?.toString().trim() || '';

    const matHang = { ten, dvt, soLuong, donGia, thanhTien, ghiChu };

    if (!groupedByDate[ngay]) groupedByDate[ngay] = [];
    groupedByDate[ngay].push(matHang);
  });

  return groupedByDate;
};

// ✅ Kiểu dữ liệu nhóm: có dòng ngày, dòng bữa, rồi danh sách món ăn
export const parseClassicStructure = (rawData) => {
  const groupedByDate = {};
  let currentDate = '';
  let currentMeal = '';

  rawData.forEach(row => {
    const firstCell = row[0]?.toString().trim();
    const secondCell = row[1]?.toString().trim();

    // ✅ Dòng chứa ngày
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(firstCell)) {
      currentDate = formatExcelDate(firstCell);
      if (!groupedByDate[currentDate]) groupedByDate[currentDate] = {};
      return;
    }

    // ✅ Dòng chứa tên bữa ăn
    if (['TRƯA', 'CHIỀU', 'SÁNG'].includes(firstCell)) {
      currentMeal = firstCell;
      if (!groupedByDate[currentDate][currentMeal]) {
        groupedByDate[currentDate][currentMeal] = [];
      }
      return;
    }

    // ✅ Dòng chứa món ăn
    if (currentDate && currentMeal && row.length >= 7) {
      const matHang = {
        //maHang: row[0],
        //maTruong: row[1],
        ten: row[2],
        dvt: row[3],
        soLuong: parseFloat(row[4]?.toString().replace(/,/g, '')) || 0,
        donGia: parseFloat(row[5]?.toString().replace(/,/g, '')) || 0,
        thanhTien: parseFloat(row[6]?.toString().replace(/,/g, '')) || 0
        };

      groupedByDate[currentDate][currentMeal].push(matHang);
    }
  });

  return groupedByDate;
};

// ✅ Hàm tổng: chọn parser theo kiểu dữ liệu
export const parseExcelData = (rawData, mode = 'flat') => {
  return mode === 'classic'
    ? parseClassicStructure(rawData)
    : parseFlatStructure(rawData);
};