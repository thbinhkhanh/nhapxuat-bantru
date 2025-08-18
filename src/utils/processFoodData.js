import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { formatExcelDate } from "./excelUtils";

export const processFoodData = async (
  rawData,
  setProgress,
  setCurrentIndex,
  setMessage,
  setSuccess,
  setShowAlert,
  mode = 'flat' // 'flat' hoặc 'classic'
) => {
  let groupedByDate = {};
  let allDates = [];

  if (mode === 'flat') {
    //console.log('📦 Dữ liệu kiểu phẳng:', rawData);

    rawData.forEach((row, index) => {
      const ngayRaw = row['Ngày giao']?.toString().trim() || row['Ngày']?.toString().trim();
      const ngay = formatExcelDate(ngayRaw);

      //console.log(`🔍 [${index}] Ngày raw: "${ngayRaw}" → Chuẩn hóa: "${ngay}"`);

      if (!ngay) return;

      const ten = row['Tên hàng']?.toString().trim() || row['Tên thực phẩm']?.toString().trim();
      const dvtRaw = String(row['Đơn vị tính'] || row['ĐVT'] || '').trim();
      const dvt = dvtRaw.charAt(0).toUpperCase() + dvtRaw.slice(1).toLowerCase();
      const soLuong = parseFloat(row['Số lượng']?.toString().replace(/,/g, '')) || 0;
      const donGia = parseFloat(row['Đơn giá']?.toString().replace(/,/g, '')) || 0;
      const thanhTien = parseFloat(row['Thành tiền']?.toString().replace(/,/g, '')) || (soLuong * donGia);
      const ghiChu = row['Ghi chú']?.toString().trim() || '';

      const matHang = {
        //stt: row['STT'] || '',
        ten,
        dvt,
        soLuong,
        donGia,
        thanhTien,
        //ghiChu
      };

      if (!groupedByDate[ngay]) {
        groupedByDate[ngay] = [];
        allDates.push(ngay);
      }
      groupedByDate[ngay].push(matHang);
    });

    //console.log('📅 Các ngày đã nhóm:', allDates);
  } else if (mode === 'classic') {
    groupedByDate = rawData;
    allDates = Object.keys(groupedByDate);
    //console.log('📅 Dữ liệu kiểu nhóm:', allDates);
  }

  setProgress(0);
  setCurrentIndex(0);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < allDates.length; i++) {
    const dateKey = allDates[i];
    const matHangList = groupedByDate[dateKey];

    const docRef = doc(db, 'DATA', dateKey);
    try {
      await setDoc(docRef, {
        ngay: dateKey,
        matHang: matHangList,
        tongMatHang: matHangList.length,
        updatedAt: new Date().toISOString()
      });
      successCount++;
    } catch (err) {
      console.error(`❌ Lỗi khi ghi dữ liệu ngày ${dateKey}:`, err.message);
      errorCount++;
    }

    setCurrentIndex(i + 1);
    setProgress(Math.round(((i + 1) / allDates.length) * 100));
  }

  const finalMessage = errorCount === 0
    ? `✅ Đã thêm thành công ${successCount} ngày dữ liệu thực phẩm.`
    : `⚠️ Có ${errorCount} lỗi khi thêm dữ liệu thực phẩm.`;

  setMessage(finalMessage);
  setSuccess(errorCount === 0);
  setShowAlert(true);
  setTimeout(() => setShowAlert(false), 5000);
};