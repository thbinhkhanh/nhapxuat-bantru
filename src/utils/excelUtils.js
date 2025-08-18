import * as XLSX from 'xlsx';

import dayjs from 'dayjs';

/**
 * ✅ Chuẩn hóa ngày từ Excel: số serial, chuỗi, hoặc Date
 * Trả về định dạng YYYY-MM-DD, không bị lệch múi giờ
 */
export const formatExcelDate = (value) => {
  if (!value) return '';

  // 👉 Nếu là số serial Excel
  if (typeof value === 'number') {
    const jsDate = new Date((value - 25569) * 86400 * 1000);
    const year = jsDate.getFullYear();
    if (year < 2020 || year > 2100) return '';
    return dayjs(jsDate).format('YYYY-MM-DD');
  }

  // 👉 Nếu là chuỗi số (ví dụ: "45123")
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const num = Number(value);
    const jsDate = new Date((num - 25569) * 86400 * 1000);
    const year = jsDate.getFullYear();
    if (year < 2020 || year > 2100) return '';
    return dayjs(jsDate).format('YYYY-MM-DD');
  }

  // 👉 Nếu là chuỗi ngày (ví dụ: "30/09/2024" hoặc "2024-09-30")
  const str = value.toString().trim();
  const parts = str.includes('/') ? str.split('/') : str.includes('-') ? str.split('-') : [];

  if (parts.length === 3) {
    let day, month, year;

    // Xác định thứ tự ngày/tháng/năm
    if (parseInt(parts[0]) > 1900) {
      // "YYYY-MM-DD"
      year = parseInt(parts[0]);
      month = parseInt(parts[1]);
      day = parseInt(parts[2]);
    } else {
      // "DD/MM/YYYY"
      day = parseInt(parts[0]);
      month = parseInt(parts[1]);
      year = parseInt(parts[2]);
    }

    if (!day || !month || !year || year < 2020 || year > 2100) return '';
    const jsDate = new Date(year, month - 1, day);
    if (isNaN(jsDate)) return '';
    return dayjs(jsDate).format('YYYY-MM-DD');
  }

  // 👉 Nếu là chuỗi hợp lệ khác (ví dụ: "Sep 30, 2024")
  const jsDate = new Date(str);
  const year = jsDate.getFullYear();
  if (!isNaN(jsDate) && year >= 2020 && year <= 2100) {
    return dayjs(jsDate).format('YYYY-MM-DD');
  }

  return '';
};
/**
 * ✅ Hàm phân tích định dạng Excel
 */
export const detectExcelFormat = (fileBuffer) => {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (!jsonData || jsonData.length === 0) {
      return { error: '❌ Sheet trống hoặc không có dữ liệu.' };
    }

    const headers = jsonData[0].map(h => h?.toString().trim());
    const columnCount = headers.length;

    return {
      sheetName: firstSheetName,
      headers,
      columnCount,
      formatType: classifyFormat(headers, columnCount)
    };
  } catch (error) {
    return { error: `❌ Lỗi khi đọc file Excel: ${error.message}` };
  }
};

const classifyFormat = (headers, columnCount) => {
  const normalizedHeaders = headers.map(h => h?.toLowerCase());

  if (normalizedHeaders.includes('student name') && normalizedHeaders.includes('class')) {
    return 'StudentList';
  }

  if (normalizedHeaders.includes('supplier') && normalizedHeaders.includes('product')) {
    return 'SupplierData';
  }

  if (columnCount >= 10) {
    return 'DetailedReport';
  }

  return 'Unknown';
};