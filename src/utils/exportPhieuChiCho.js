import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { format } from "date-fns";

export async function exportPhieuChiCho({
  selectedDate,
  rows,
  nguoiDiCho = "Phan Thị Tuyết Minh"
}) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Phiếu Chi Chợ");

  // TIÊU ĐỀ
  sheet.mergeCells("A1:C1");
  sheet.getCell("A1").value = "Đơn vị: Trường Tiểu học  Bình Khánh";
  sheet.getCell("A1").font = { bold: true, size: 12 };
  sheet.getCell("A1").alignment = { horizontal: "left" };

  sheet.mergeCells("A2:C2");
  sheet.getCell("A2").value = "Địa chỉ: Xã Bình Khánh";
  sheet.getCell("A2").font = { size: 11 };
  sheet.getCell("A2").alignment = { horizontal: "left" };

  sheet.mergeCells("A4:J4");
  sheet.getCell("A4").value = "BẢNG TỔNG HỢP CHI CHỢ";
  sheet.getCell("A4").font = { bold: true, size: 14, color: { argb: "1F4E78" } };
  sheet.getCell("A4").alignment = { horizontal: "center" };

  sheet.mergeCells("A5:J5");
  sheet.getCell("A5").value = `Ngày ${format(selectedDate, "dd 'tháng' MM 'năm' yyyy")}`;
  sheet.getCell("A5").alignment = { horizontal: "center" };
  sheet.getCell("A5").font = { bold: true, italic: true, size: 11, name: "Arial" };

  // ✅ Thêm dòng trống sau ngày
  sheet.addRow([]);

  // HEADER DÒNG 1 (dòng 7)
const headerRow1 = sheet.addRow([
  "STT", "DIỄN GIẢI", "ĐVT", "SỐ TIỀN", "", "", "TRÍCH 5%", "THỰC NHẬN", "GHI CHÚ"
]);

// Merge dọc các cột đơn
sheet.mergeCells(`A${headerRow1.number}:A${headerRow1.number + 1}`);
sheet.mergeCells(`B${headerRow1.number}:B${headerRow1.number + 1}`);
sheet.mergeCells(`C${headerRow1.number}:C${headerRow1.number + 1}`);
sheet.mergeCells(`G${headerRow1.number}:G${headerRow1.number + 1}`);
sheet.mergeCells(`H${headerRow1.number}:H${headerRow1.number + 1}`);
sheet.mergeCells(`I${headerRow1.number}:I${headerRow1.number + 1}`);

// Merge ngang nhóm "Số tiền"
sheet.mergeCells(`D${headerRow1.number}:F${headerRow1.number}`);

const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5CC" } };
headerRow1.font = { bold: true };
headerRow1.alignment = { horizontal: "center", vertical: "middle" };
headerRow1.eachCell((cell) => {
  cell.fill = headerFill;
  cell.border = {
    top: { style: "thin" }, left: { style: "thin" },
    bottom: { style: "thin" }, right: { style: "thin" }
  };
});

// ✅ HEADER DÒNG 2 (dòng 8)
// Ghi trực tiếp vào dòng 8, cột D, E, F
sheet.getCell("D8").value = "SỐ LƯỢNG";
sheet.getCell("E8").value = "ĐƠN GIÁ";
sheet.getCell("F8").value = "THÀNH TIỀN";

// Định dạng từng ô
["D8", "E8", "F8"].forEach((cellRef) => {
  const cell = sheet.getCell(cellRef);
  cell.font = { bold: true }; // ✅ Chữ đứng, in đậm
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5CC" } };
  cell.border = {
    top: { style: "thin" }, left: { style: "thin" },
    bottom: { style: "thin" }, right: { style: "thin" }
  };
});


  // DỮ LIỆU
  let sttLoaiRow = 1;
  let currentLoaiRow = null;
  let loaiThanhTien = 0;
  let loaiTrich = 0;
  let loaiThucNhan = 0;

  const tongCong = rows
    .filter(r => !r.isLoaiRow)
    .reduce((acc, r) => {
      const thanhTien = r.thanhTien || ((r.soLuong || 0) * (r.donGia || 0));
      const trich = Math.round(thanhTien * 0.05);
      const thucNhan = thanhTien - trich;
      acc.tongThanhTien += thanhTien;
      acc.tongThucNhan += thucNhan;
      return acc;
    }, { tongThanhTien: 0, tongThucNhan: 0 });

  rows.forEach((r, index) => {
    const isLoaiRow = r.isLoaiRow;
    const thanhTien = r.thanhTien || ((r.soLuong || 0) * (r.donGia || 0));
    const trich = Math.round(thanhTien * 0.05);
    const thucNhan = thanhTien - trich;

    if (isLoaiRow) {
      if (currentLoaiRow) {
        currentLoaiRow.getCell(6).value = loaiThanhTien;
        currentLoaiRow.getCell(7).value = loaiTrich;
        currentLoaiRow.getCell(8).value = loaiThucNhan;
        loaiThanhTien = 0;
        loaiTrich = 0;
        loaiThucNhan = 0;
      }

      const row = sheet.addRow([
        sttLoaiRow++, r.loai ?? r.name ?? r.dienGiai ?? "", "", "", "", "", "", "", ""
      ]);
      currentLoaiRow = row;

      row.eachCell((cell, colNumber) => {
        cell.alignment = { horizontal: colNumber === 2 ? "left" : "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" }, left: { style: "thin" },
          bottom: { style: "thin" }, right: { style: "thin" }
        };
        cell.font = { bold: true, color: { argb: "C00000" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D9D9D9" } };
        if ([6, 7, 8].includes(colNumber)) {
          cell.numFmt = "#,##0";
        }
      });
    } else {
      const row = sheet.addRow([
        "", r.dienGiai ?? "", r.dvt || "", r.soLuong || "", r.donGia || "",
        thanhTien, trich, thucNhan, r.ghiChu || ""
      ]);
      loaiThanhTien += thanhTien;
      loaiTrich += trich;
      loaiThucNhan += thucNhan;

      row.eachCell((cell, colNumber) => {
        cell.alignment = { horizontal: colNumber === 2 ? "left" : "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" }, left: { style: "thin" },
          bottom: { style: "thin" }, right: { style: "thin" }
        };
        if ([5, 6, 7, 8].includes(colNumber) && cell.value !== "") {
          cell.numFmt = "#,##0";
        }
      });
    }

    if (index === rows.length - 1 && currentLoaiRow) {
      currentLoaiRow.getCell(6).value = loaiThanhTien;
      currentLoaiRow.getCell(7).value = loaiTrich;
      currentLoaiRow.getCell(8).value = loaiThucNhan;
    }
  });

  // ✅ KHÔNG thêm dòng trống phía trên dòng tổng cộng
  const tongRow = sheet.addRow([
    "", "CỘNG", "", "", "", tongCong.tongThanhTien,
    Math.round(tongCong.tongThanhTien * 0.05),
    tongCong.tongThucNhan, ""
  ]);
  tongRow.font = { bold: true };
  tongRow.alignment = { horizontal: "center" };
  const tongFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD966" } };
  tongRow.eachCell((cell, colNumber) => {
    cell.border = {
      top: { style: "thin" }, left: { style: "thin" },
      bottom: { style: "thin" }, right: { style: "thin" }
    };
    if (colNumber >= 1 && colNumber <= 9) cell.fill = tongFill;
    if ([6, 7, 8].includes(colNumber)) {
      cell.numFmt = "#,##0";
    }
  });


  // CHỮ KÝ
  sheet.addRow([]);
  const signHeader = sheet.addRow(["Người đi chợ"]);
  sheet.mergeCells(`A${signHeader.number}:C${signHeader.number}`);
  signHeader.font = { bold: true };
  signHeader.alignment = { horizontal: "center" };

  // ✅ Chèn 5 dòng trống
  for (let i = 0; i < 5; i++) {
    sheet.addRow([]);
  }

 const signNames = sheet.addRow([nguoiDiCho]);
  sheet.mergeCells(`A${signNames.number}:C${signNames.number}`);
  signNames.alignment = { horizontal: "center" };
  signNames.font = { bold: true }; // ✅ Tên sẽ được in đậm

  // ĐỘ RỘNG CỘT
  const colWidths = [5, 40, 10, 15, 15, 20, 15, 15, 15];
  colWidths.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });

  // XUẤT FILE
  const filename = `Phieu_Chi_Cho_${format(selectedDate, "yyyyMMdd")}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), filename);
}