import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { format } from "date-fns";

export async function exportPhieuTienAn({ selectedDate, rows }) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Phiếu Tiền Ăn");

  // TIÊU ĐỀ
    sheet.getCell("A1").value = "Đơn vị: Trường Tiểu học Bình Khánh";
    sheet.getCell("A1").font = { bold: true, size: 12 };
    sheet.getCell("A1").alignment = { horizontal: "left" };

    sheet.getCell("A2").value = "Địa chỉ: Xã Bình Khánh";
    sheet.getCell("A2").font = { size: 11 };
    sheet.getCell("A2").alignment = { horizontal: "left" };

    sheet.mergeCells("A4:F4");
    sheet.getCell("A4").value = "BẢNG TÍNH TIỀN ĂN";
    sheet.getCell("A4").font = { bold: true, size: 14, color: { argb: "1F4E78" } };
    sheet.getCell("A4").alignment = { horizontal: "center" };

    sheet.mergeCells("A5:F5");
    sheet.getCell("A5").value = `Ngày ${format(selectedDate, "dd 'tháng' MM 'năm' yyyy")}`;
    sheet.getCell("A5").alignment = { horizontal: "center" };
    sheet.getCell("A5").font = { bold: true, italic: true, size: 11, name: "Arial" };


  sheet.addRow([]);

  // HEADER
  const headerRow = sheet.addRow(["STT", "Nội dung", "ĐVT", "Số lượng", "Đơn giá", "Thành tiền"]);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5CC" } };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });

  // DỮ LIỆU + ĐÁNH SỐ THỨ TỰ
  let loaiRowCounter = 1;

rows.forEach((item, index) => {
  const isLoaiRow = item.isLoaiRow === true;
  const isSpecialLoaiRow = [
    "Chênh lệch đầu ngày",
    "Xuất ăn và tiêu chuẩn trong ngày",
    "Được chi trong ngày",
    "Đã chi trong ngày",
    "Chênh lệch cuối ngày"
  ].includes(item.dienGiai);

  const stt = isSpecialLoaiRow ? loaiRowCounter++ : item.stt || "";

  const row = sheet.addRow([
    stt,
    item.dienGiai ?? "",
    item.dvt ?? "",
    item.soLuong ?? "",
    item.donGia ?? "",
    item.thanhTien ?? ((item.soLuong * item.donGia) || 0)
  ]);

  row.eachCell((cell, colNumber) => {
    cell.alignment = {
      horizontal: colNumber === 2 ? "left" : "center",
      vertical: "middle"
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
    if ([5, 6].includes(colNumber)) cell.numFmt = "#,##0";

    if (item.isLoaiRow) {
        const isGroupLoai = !item.stt;
        const isRedLoai = isGroupLoai && !["Chi chợ", "Xuất kho"].includes(item.dienGiai);

        cell.font = {
            bold: true,
            color: { argb: isRedLoai ? "FF0000" : "000000" } // 🔴 đỏ cho dòng loại nhóm, ⚫ đen cho Chi chợ & Xuất kho
        };
        }
  });
});

    // Dòng trống phía trên
sheet.addRow(["", "", "", "", "", ""]);

// Dòng ngày ký — in nghiêng
const ngayStr = format(selectedDate, "dd 'tháng' MM 'năm' yyyy");
const dateRow = sheet.addRow(["", "", "", `BÌnh Khánh, ngày ${ngayStr}`, "", ""]);
sheet.mergeCells(`D${dateRow.number}:F${dateRow.number}`);
dateRow.getCell(4).alignment = { horizontal: "center" };
dateRow.getCell(4).font = { italic: true };

// Dòng chức vụ
const signRow = sheet.addRow(["", "Người lập biểu", "", "Hiệu trưởng", "", ""]);
signRow.font = { bold: true };

// Người lập biểu (cột B)
signRow.getCell(2).alignment = { horizontal: "center" };

// Hiệu trưởng (merge D:F)
sheet.mergeCells(`D${signRow.number}:F${signRow.number}`);
signRow.getCell(4).alignment = { horizontal: "center" };

// Dòng trống để cách chữ ký
sheet.addRow(["", "", "", "", "", ""]);
sheet.addRow(["", "", "", "", "", ""]);
sheet.addRow(["", "", "", "", "", ""]);
sheet.addRow(["", "", "", "", "", ""]);
sheet.addRow(["", "", "", "", "", ""]);

// Dòng tên người ký
const nameRow = sheet.addRow(["", "Lê Thị Thu Hương", "", "Đặng Thái Bình", "", ""]);
nameRow.font = { bold: true };

// Tên người lập biểu (cột B)
nameRow.getCell(2).alignment = { horizontal: "center" };

// Tên hiệu trưởng (merge D:F)
sheet.mergeCells(`D${nameRow.number}:F${nameRow.number}`);
nameRow.getCell(4).alignment = { horizontal: "center" };


  // ĐỘ RỘNG CỘT
  [6, 35, 15, 15, 15, 15].forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });

  // XUẤT FILE
  const filename = `Phieu_Tien_An_${format(selectedDate, "yyyyMMdd")}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), filename);
}
