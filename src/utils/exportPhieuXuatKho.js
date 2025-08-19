import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { numberToVietnameseText } from "./numberToText";

export async function exportPhieuXuatKho({
  selectedDate,
  soPhieu,
  nguoiNhan,
  lyDoXuat,
  xuatTaiKho,
  soLuongHocSinh,
  thuKho,
  keToan,
  hieuTruong,
  rows,
}) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Phiếu Xuất Kho");

  const total = rows.reduce((sum, r) => sum + r.thucXuat * r.donGia, 0);
  const totalText = numberToVietnameseText(total);

  // TIÊU ĐỀ
  sheet.mergeCells("A1:C1");
  sheet.getCell("A1").value = "Đơn vị: Trường Tiểu học  Bình Khánh";
  sheet.getCell("A1").font = { bold: true, size: 12 };
  sheet.getCell("A1").alignment = { horizontal: "left" };

  sheet.mergeCells("A2:C2");
  sheet.getCell("A2").value = "Địa chỉ: Xã Bình Khánh";
  sheet.getCell("A2").font = { size: 11 };
  sheet.getCell("A2").alignment = { horizontal: "left" };

  sheet.mergeCells("G1:H1");
  sheet.getCell("G1").value = "Mẫu số C 21 - HD";
  sheet.getCell("G1").alignment = { horizontal: "right" };
  sheet.getCell("G1").font = { bold: true };

  sheet.mergeCells("A4:H4");
  sheet.getCell("A4").value = "PHIẾU XUẤT KHO";
  sheet.getCell("A4").font = { bold: true, size: 14, color: { argb: "1F4E78" } };
  sheet.getCell("A4").alignment = { horizontal: "center" };

  // THÔNG TIN PHIẾU
  const infoRows = [
    [`Ngày: ${format(selectedDate, "dd/MM/yyyy")}`],
    [`Số: ${soPhieu}`],
    [`Người nhận: ${nguoiNhan}`],
    [`Lý do xuất kho: ${lyDoXuat}`],
    [`Xuất tại kho: ${xuatTaiKho}`],
    [`Số lượng học sinh: ${soLuongHocSinh}`],
  ];
  infoRows.forEach((row, i) => {
    sheet.mergeCells(`A${6 + i}:H${6 + i}`);
    const cell = sheet.getCell(`A${6 + i}`);
    cell.value = row[0];
    cell.font = { size: 11 };
    cell.alignment = { horizontal: "left" };
  });

  // HEADER BẢNG 2 DÒNG
  sheet.addRow([]);
  const headerRow1 = sheet.addRow([
    "STT", "Tên hàng", "", "Mã số", "Số lượng", "", "Đơn giá", "Thành tiền",
  ]);
  const headerRow2 = sheet.addRow([
    "", "", "", "", "Yêu cầu", "Thực xuất", "", "",
  ]);

  sheet.mergeCells(`A${headerRow1.number}:A${headerRow2.number}`);
  sheet.mergeCells(`B${headerRow1.number}:C${headerRow2.number}`);
  sheet.mergeCells(`D${headerRow1.number}:D${headerRow2.number}`);
  sheet.mergeCells(`E${headerRow1.number}:F${headerRow1.number}`);
  sheet.mergeCells(`G${headerRow1.number}:G${headerRow2.number}`);
  sheet.mergeCells(`H${headerRow1.number}:H${headerRow2.number}`);

  [headerRow1, headerRow2].forEach((row) => {
    row.font = { bold: true };
    row.alignment = { horizontal: "center", vertical: "middle" };
    for (let col = 1; col <= 8; col++) {
      const cell = row.getCell(col);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "D9E1F2" }, // Màu nền xanh nhạt
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    }
  });

  // DỮ LIỆU BẢNG
  rows.forEach((r, i) => {
    const row = sheet.addRow([
      i + 1,
      r.name, "", r.unit, r.yeuCau, r.thucXuat, r.donGia, r.thucXuat * r.donGia,
    ]);
    sheet.mergeCells(`B${row.number}:C${row.number}`);
    row.eachCell((cell, colNumber) => {
      cell.alignment = {
        horizontal: [1, 4, 5, 6, 7, 8].includes(colNumber) ? "center" : "left",
        vertical: "middle",
      };
      cell.font = { size: 11 };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      if ([7, 8].includes(colNumber)) {
        cell.numFmt = "#,##0";
      }
    });
  });

  // TỔNG CỘNG
  const totalRow = sheet.addRow(["", "Cộng", "", "", "", "", "", total]);
  sheet.mergeCells(`B${totalRow.number}:C${totalRow.number}`);
  totalRow.getCell(2).alignment = { horizontal: "center" };
  totalRow.getCell(8).alignment = { horizontal: "center" };

  totalRow.getCell(2).font = { bold: true };
  totalRow.getCell(8).font = { bold: true };
  totalRow.getCell(8).numFmt = "#,##0";
  totalRow.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // TỔNG TIỀN BẰNG CHỮ
  sheet.addRow([]);
  const totalTextRow = sheet.addRow([`Tổng số tiền viết bằng chữ: ${totalText}`]);
  sheet.mergeCells(`A${totalTextRow.number}:H${totalTextRow.number}`);
  totalTextRow.getCell(1).font = { size: 11, italic: true };
  totalTextRow.getCell(1).alignment = { horizontal: "left" };

  // CHỮ KÝ
  sheet.addRow([]);
  const signHeaderRow = sheet.addRow([
    "Người nhận hàng", "", "Thủ kho", "", "Kế toán", "", "Thủ trưởng đơn vị", "",
  ]);
  sheet.mergeCells(`A${signHeaderRow.number}:B${signHeaderRow.number}`);
  sheet.mergeCells(`C${signHeaderRow.number}:D${signHeaderRow.number}`);
  sheet.mergeCells(`E${signHeaderRow.number}:F${signHeaderRow.number}`);
  sheet.mergeCells(`G${signHeaderRow.number}:H${signHeaderRow.number}`);
  signHeaderRow.font = { bold: true };
  signHeaderRow.alignment = { horizontal: "center" };

  const signNamesRow = signHeaderRow.number + 6;
  sheet.mergeCells(`A${signNamesRow}:B${signNamesRow}`);
  sheet.mergeCells(`C${signNamesRow}:D${signNamesRow}`);
  sheet.mergeCells(`E${signNamesRow}:F${signNamesRow}`);
  sheet.mergeCells(`G${signNamesRow}:H${signNamesRow}`);

  sheet.getCell(`A${signNamesRow}`).value = nguoiNhan;
  sheet.getCell(`C${signNamesRow}`).value = thuKho;
  sheet.getCell(`E${signNamesRow}`).value = keToan;
  sheet.getCell(`G${signNamesRow}`).value = hieuTruong;

  ["A", "C", "E", "G"].forEach((col) => {
    const cell = sheet.getCell(`${col}${signNamesRow}`);
    cell.alignment = { horizontal: "center" };
    cell.font = { bold: true };
  });

  // ĐỘ RỘNG CỘT
  const colWidths = [6, 20, 13, 13, 13, 13, 13, 13];
  colWidths.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });

  // XUẤT FILE
  const filename = `Phieu_Xuat_Kho_${format(selectedDate, "yyyyMMdd")}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), filename);
}
