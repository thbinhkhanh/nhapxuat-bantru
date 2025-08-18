// Khóa lưu trữ ngày dùng chung cho toàn bộ ứng dụng
const DATE_KEY = "selectedDate";

/**
 * Lấy ngày đã lưu trong localStorage.
 * Trả về Date object, nếu chưa lưu thì trả về ngày hôm nay.
 */
export function getStoredDate() {
  const stored = localStorage.getItem(DATE_KEY);
  return stored ? new Date(stored) : new Date();
}

/**
 * Lưu ngày vào localStorage.
 * @param {Date} date - Ngày cần lưu
 */
export function setStoredDate(date) {
  if (!(date instanceof Date) || isNaN(date)) return;
  localStorage.setItem(DATE_KEY, date.toISOString());
}

/**
 * Xóa ngày trong localStorage (nếu cần reset)
 */
export function clearStoredDate() {
  localStorage.removeItem(DATE_KEY);
}
