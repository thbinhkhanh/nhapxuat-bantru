import * as XLSX from "xlsx";
import { getFirestore, doc, getDoc, writeBatch } from "firebase/firestore";
import { app } from "../firebase";

const db = getFirestore(app);

export async function importGreenFood(file, setProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const buffer = e.target.result;
        const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });

        const visibleSheets = workbook.Workbook?.Sheets
          ? workbook.Workbook.Sheets
              .map((s, i) => ({ ...s, name: workbook.SheetNames[i] }))
              .filter((s) => !s.Hidden || s.Hidden === 0)
          : workbook.SheetNames.map((name) => ({ name }));

        if (visibleSheets.length === 0) {
          return resolve("❌ Không tìm thấy sheet hiển thị trong file!");
        }

        const batch = writeBatch(db);
        let totalItems = 0;
        let updatedDocs = 0;
        let newDocs = 0;

        for (const s of visibleSheets) {
          const sheet = workbook.Sheets[s.name];
          const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

          // Kiểm tra công ty
          const companyCell = (rawData[0]?.[0] || "").toString().trim();
          if (companyCell !== "CÔNG TY TNHH DỊCH VỤ - THỰC PHẨM - SÀI GÒN GREENFOOD") continue;

          // Lấy ngày
          const rawDate = rawData[8]?.[0] || "";
          const match = rawDate.toString().match(/- Ngày:\s*(\d{2}\/\d{2}\/\d{4})/);
          if (!match) continue;
          const [d, m, y] = match[1].split("/");
          const dateId = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;

          // Kiểm tra xem document đã tồn tại chưa
          const docRef = doc(db, "DATA", dateId);
          const docSnap = await getDoc(docRef);

          // Tìm dòng header
          const headerIndex = rawData.findIndex((row) =>
            row.some((cell) => cell.toString().trim() === "Mã SP") &&
            row.some((cell) => cell.toString().trim() === "Tên sản phẩm") &&
            row.some((cell) => cell.toString().trim() === "ĐVT")
          );
          if (headerIndex === -1) continue;

          const headerRow = rawData[headerIndex].map((cell) => cell.toString().trim());
          const colIndex = {
            maSP: headerRow.indexOf("Mã SP"),
            ten: headerRow.indexOf("Tên sản phẩm"),
            dvt: headerRow.indexOf("ĐVT"),
            soLuong: headerRow.findIndex((h) => h.includes("Số")),
            donGia: headerRow.indexOf("Đơn giá"),
            thanhTien: headerRow.indexOf("Thành tiền"),
          };

          const items = [];
          for (let i = headerIndex + 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row[colIndex.maSP] || !row[colIndex.ten]) continue;

            items.push({
              maSP: row[colIndex.maSP]?.toString().trim() || "",
              ten: row[colIndex.ten]?.toString().trim() || "",
              dvt: row[colIndex.dvt]?.toString().trim() || "",
              soLuong: parseFloat(row[colIndex.soLuong]) || 0,
              donGia: parseFloat(row[colIndex.donGia]?.toString().replace(/,/g, "")) || 0,
              thanhTien: parseFloat(row[colIndex.thanhTien]?.toString().replace(/,/g, "")) || 0,
            });
          }

          if (items.length === 0) continue;

          // 🔥 Nếu trùng ngày => ghi đè, nếu mới => thêm mới
          batch.set(docRef, { matHang: items, updatedAt: new Date().toISOString() });
          totalItems += items.length;

          if (docSnap.exists()) {
            updatedDocs++;
          } else {
            newDocs++;
          }

          if (setProgress) setProgress(Math.round((totalItems / 1000) * 100));
        }

        await batch.commit();

        if (newDocs === 0 && updatedDocs === 0) {
          resolve("⚠️ Không có dữ liệu hợp lệ để ghi!");
        } else {
          resolve(
            `✅ Đã ghi đè ${updatedDocs} ngày cũ và thêm mới ${newDocs} ngày mới!`
          );
        }
      } catch (err) {
        reject(err);
      }
    };

    reader.readAsArrayBuffer(file);
  });
}
