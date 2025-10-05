// utils/importDanhMuc.js
import * as XLSX from "xlsx";
import { db } from "../firebase"; // Firestore instance
import { writeBatch, doc, getDocs, collection } from "firebase/firestore";

/**
 * @param {File} file - file excel tải lên
 * @param {Function} setProgress - callback cập nhật % progress
 * @param {Array} existingDanhMuc - dữ liệu context (nếu có). Nếu null thì lấy Firestore
 */
export async function importDanhMuc(file, setProgress, existingDanhMuc = null) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        let DANHMUC = [];
        let currentGroup = "";

        rows.forEach((row, idx) => {
          if (idx === 0) return; // bỏ tiêu đề
          if (!row[1] && row[0]) {
            currentGroup = row[0].trim();
          } else if (row[1]) {
            DANHMUC.push({
              id: String(row[1]).trim(),
              name: row[2],
              unit: row[3],
              group: currentGroup
            });
          }
        });

        let existingIds;

        if (existingDanhMuc && existingDanhMuc.length > 0) {
          //console.log("✅ Đang so sánh với dữ liệu từ CONTEXT (cache/localStorage)");
          existingIds = new Set(existingDanhMuc.map(item => item.id));
        } else {
          //console.log("🌐 Đang so sánh với dữ liệu từ FIRESTORE");
          const snapshot = await getDocs(collection(db, "DANHMUC"));
          existingIds = new Set(snapshot.docs.map(doc => doc.id));
        }

        // --- Lọc ra những sản phẩm mới ---
        const newItems = DANHMUC.filter(item => !existingIds.has(item.id));

        // Log kết quả
        //console.log(`📦 Tổng số sản phẩm trong file Excel: ${DANHMUC.length}`);
        //console.log(`⚡ Đã tồn tại: ${DANHMUC.length - newItems.length}`);
        //console.log(`🆕 Sản phẩm mới sẽ thêm: ${newItems.length}`);
        console.table(newItems.map(item => ({
          id: item.id,
          name: item.name,
          unit: item.unit,
          group: item.group
        })));

        if (newItems.length === 0) {
          resolve("⚡ Không có sản phẩm mới để import!");
          return;
        }

        // --- Batch commit ---
        const BATCH_SIZE = 500;
        let total = newItems.length;
        let done = 0;

        for (let i = 0; i < newItems.length; i += BATCH_SIZE) {
          const batch = writeBatch(db);
          const chunk = newItems.slice(i, i + BATCH_SIZE);

          chunk.forEach(item => {
            const ref = doc(db, "DANHMUC", item.id);
            batch.set(ref, item);
          });

          await batch.commit();
          done += chunk.length;
          setProgress(Math.round((done / total) * 100));
        }

        resolve(`✅ Đã thêm ${newItems.length} sản phẩm mới vào Firestore!`);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
