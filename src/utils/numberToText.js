export function numberToVietnameseText(soTien) {
  if (soTien === 0) return "Không đồng.";

  const dem = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const hang = ["", "mươi", "trăm"];
  const donvi = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"]; // đủ đến hàng tỷ

  let str = "";
  let isNegative = soTien < 0;
  soTien = Math.abs(Math.floor(soTien));

  // chia số thành nhóm 3 chữ số từ phải sang trái
  const arr = [];
  while (soTien > 0) {
    arr.push(soTien % 1000);
    soTien = Math.floor(soTien / 1000);
  }

  for (let i = arr.length - 1; i >= 0; i--) {
    const n = arr[i];
    if (n === 0 && i !== 0) continue; // bỏ qua nhóm 0 giữa các nhóm khác

    let nhom = "";
    const tr = Math.floor(n / 100);
    const ch = Math.floor((n % 100) / 10);
    const dv = n % 10;

    if (tr > 0) nhom += dem[tr] + " trăm";
    else if (n > 0 && i !== arr.length - 1) nhom += "không trăm";

    if (ch > 1) nhom += " " + dem[ch] + " mươi";
    else if (ch === 1) nhom += " mười";
    else if (ch === 0 && dv > 0 && tr > 0) nhom += " lẻ";

    if (dv > 0) {
      if (ch >= 1 && dv === 1) nhom += " mốt";
      else if (ch >= 1 && dv === 4) nhom += " tư";
      else if (ch >= 1 && dv === 5) nhom += " lăm";
      else if (!(ch >= 1 && dv === 5)) nhom += " " + dem[dv];
    }

    nhom = nhom.trim() + " " + donvi[i];
    str += nhom + " ";
  }

  str = str.replace(/\s+/g, " ").trim();
  if (isNegative) str = "Trừ " + str;
  str = str.charAt(0).toUpperCase() + str.slice(1) + " đồng.";

  return str;
}
