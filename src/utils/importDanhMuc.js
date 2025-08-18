import * as XLSX from "xlsx";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

/**
 * Import keyword rules từ file Excel lên Firestore
 * @param {File} file - file Excel (.xlsx)
 * @param {Function} onProgress - callback cập nhật % tiến trình
 */
export async function importDanhMuc(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const buffer = e.target.result;
        const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

        // Bỏ dòng tiêu đề
        const rows = rawData.slice(1);

        // Gom keywords theo loại (giữ nguyên tên, không lowercase)
        const keywordRules = {};
        for (const row of rows) {
          const keyword = row[0]?.toString().trim(); // ✅ giữ nguyên chữ và dấu
          const loai = row[1]?.toString().trim();
          if (!keyword || !loai) continue;

          if (!keywordRules[loai]) keywordRules[loai] = [];
          if (!keywordRules[loai].includes(keyword)) {
            keywordRules[loai].push(keyword);
          }
        }

        console.log("📦 KEYWORD_RULES parse:", keywordRules);

        // Ghi Firestore
        const loaiList = Object.keys(keywordRules);
        let index = 0;
        for (const loai of loaiList) {
          await setDoc(doc(db, "KEYWORD_RULES", loai), {
            keywords: keywordRules[loai],
            updatedAt: new Date(),
          });

          index++;
          if (onProgress) {
            onProgress(Math.round((index / loaiList.length) * 100));
          }
        }

        resolve(`✅ Đã import ${loaiList.length} loại vào KEYWORD_RULES`);
      } catch (err) {
        console.error("🔥 Lỗi import KEYWORD_RULES:", err);
        reject(err);
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
