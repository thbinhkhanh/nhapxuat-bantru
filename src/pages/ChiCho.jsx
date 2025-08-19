import React, { useState, useEffect } from "react";
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Card, CardContent, Divider, Stack
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { vi } from "date-fns/locale";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getStoredDate, setStoredDate } from "../utils/dateStorage"; // dùng dateStorage
import { useDataContext, useSaveDataToContext } from "../context/DataContext";
import LinearProgress from '@mui/material/LinearProgress';
import { exportPhieuChiCho } from "../utils/exportPhieuChiCho";


import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { Tooltip, IconButton } from "@mui/material";


export default function ChiCho() {
  const [data, setData] = useState([]);
  const [tongCong, setTongCong] = useState({ tongTien: 0, trich: 0, thucNhan: 0 });
  const [selectedDate, setSelectedDate] = useState(getStoredDate() || new Date());
  const { dataByDate } = useDataContext();
  const saveDataToContext = useSaveDataToContext();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (selectedDate) {
      setStoredDate(selectedDate); // lưu vào localStorage khi thay đổi
    }
  }, [selectedDate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedDate) {
        console.warn("[ChiCho] selectedDate null/undefined → bỏ qua fetch");
        return;
      }

      setLoading(true);       // 🔹 Bắt đầu loading
      setProgress(10);        // 🔹 Set progress khởi đầu

      console.log("[ChiCho] selectedDate =", selectedDate, "instanceof Date?", selectedDate instanceof Date);

      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const dd = String(selectedDate.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      console.log(`[ChiCho] Đang xử lý ngày: ${dateStr}`);

      if (dataByDate[dateStr]?.chiCho) {
        console.log(`[ChiCho] ✅ Dữ liệu ngày ${dateStr} lấy từ context:`, dataByDate[dateStr].chiCho);
        setData(dataByDate[dateStr].chiCho.tableData);
        setTongCong(dataByDate[dateStr].chiCho.tongCong);
        setProgress(100);    // 🔹 Hoàn tất
        setLoading(false);   // 🔹 Kết thúc loading
        return;
      }

      try {
        console.log(`[ChiCho] 🔄 Fetch Firestore: DATA/${dateStr}`);
        const docRef = doc(db, "DATA", dateStr);
        const docSnap = await getDoc(docRef);
        setProgress(50);      // 🔹 Fetch xong, đang xử lý dữ liệu

        if (docSnap.exists()) {
          const docData = docSnap.data();
          console.log(`[ChiCho] ✅ Firestore trả về DATA/${dateStr}:`, docData);

          const matHang = Array.isArray(docData.matHang) ? docData.matHang : [];
          console.log("[ChiCho] Danh sách mặt hàng:", matHang);

          saveDataToContext(selectedDate, { ...docData });
          console.log("[ChiCho] 👉 Đã save toàn bộ docData vào context");

          const allowedKeywords = ["Đường cát", "Gạo", "Dầu ăn", "Hạt nêm", "Nước mắm"];

          const loaiMap = {};
          matHang.forEach((m) => {
            const l = m.loai || "Khác";
            if (!loaiMap[l]) loaiMap[l] = [];
            loaiMap[l].push(m);
          });
          console.log("[ChiCho] loaiMap sau khi group:", loaiMap);

          const filteredLoaiMap = Object.fromEntries(
            Object.entries(loaiMap).filter(([_, items]) =>
              !items.some(m => allowedKeywords.some(keyword => m.ten.includes(keyword)))
            )
          );
          console.log("[ChiCho] filteredLoaiMap sau khi loại keyword:", filteredLoaiMap);

          const sortedLoaiEntries = Object.entries(filteredLoaiMap).sort((a, b) => {
            const loaiA = a[0].toUpperCase();
            const loaiB = b[0].toUpperCase();
            return loaiA.localeCompare(loaiB, undefined, { numeric: true });
          });

          let sttCounter = 1;
          const tableData = [];
          const loaiNames = {
            L2: "Rau củ, gia vị",
            L3: "Trái cây + tráng miệng",
            L4: "Trứng",
            L5: "Thịt heo",
            L6: "Thịt bò",
            L7: "Cá",
            L8: "Tôm",
            L9: "Thịt gà",
            L10: "Cua",
            L11: "Loại khác"
          };

          sortedLoaiEntries.forEach(([loai, items]) => {
            const tongTien = items.reduce((acc, m) => acc + (m.thanhTien || 0), 0);
            const trich = tongTien * 0.05;
            const thucNhan = tongTien - trich;

            tableData.push({
              stt: sttCounter++,
              dienGiai: loaiNames[loai] || loai,
              isLoaiRow: true,
              tongTien,
              trich,
              thucNhan
            });

            items.forEach(m => {
              tableData.push({
                stt: "",
                dienGiai: m.ten,
                dvt: m.dvt,
                soLuong: m.soLuong,
                donGia: m.donGia,
                thanhTien: m.thanhTien,
                trich: m.thanhTien ? m.thanhTien * 0.05 : 0,
                thucNhan: m.thanhTien ? m.thanhTien * 0.95 : 0,
                isLoaiRow: false
              });
            });
          });

          const tongTien = Object.values(filteredLoaiMap).flat().reduce((acc, m) => acc + (m.thanhTien || 0), 0);
          const trich = tongTien * 0.05;
          const thucNhan = tongTien - trich;
          const tongCongData = { tongTien, trich, thucNhan };

          console.log("[ChiCho] ✅ Kết quả cuối cùng tableData:", tableData);
          console.log("[ChiCho] ✅ Tổng cộng:", tongCongData);

          setData(tableData);
          setTongCong(tongCongData);

          saveDataToContext(selectedDate, {
            chiCho: {
              tableData,
              tongCong: tongCongData
            }
          });
          console.log("[ChiCho] 👉 Đã save chiCho vào context");
        } else {
          console.warn(`[ChiCho] ❌ Không tìm thấy document DATA/${dateStr}`);
          setData([]);
          setTongCong({ tongTien: 0, trich: 0, thucNhan: 0 });
          saveDataToContext(selectedDate, {
            chiCho: {
              tableData: [],
              tongCong: { tongTien: 0, trich: 0, thucNhan: 0 }
            }
          });
        }
        setProgress(100);     // 🔹 Hoàn tất
      } catch (error) {
        console.error("[ChiCho] ❌ Firestore fetch failed:", error);
      } finally {
        setLoading(false);    // 🔹 Kết thúc loading
      }
    };

    fetchData();
  }, [selectedDate]);



  const headCell = {
    backgroundColor: "#1976d2 !important",
    color: "#fff !important",
    fontWeight: 700,
    textTransform: "uppercase",
    fontSize: 13,
    py: 1.2,
    borderRight: "1px solid rgba(255,255,255,0.2)",
  };

  return (
    <Box sx={{ pt: "20px", pb: 6, px: { xs: 1, sm: 2 }, bgcolor: "#e3f2fd", minHeight: "100vh" }}>
      <Card elevation={8} sx={{ maxWidth: 1100, mx: "auto", borderRadius: 3, overflow: "hidden" }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="subtitle1" fontWeight="bold">TRƯỜNG TIỂU HỌC BÌNH KHÁNH</Typography>
          <Typography variant="h5" align="center" fontWeight="bold" sx={{ color: "#1976d2", mt: 2 }}>
            BẢNG TỔNG HỢP CHI CHỢ
          </Typography>

          {/* DatePicker tiếng Việt */}
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ my: 3 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
              <DatePicker
                label="Chọn ngày"
                value={selectedDate}
                onChange={(newValue) => {
                  if (newValue) setSelectedDate(newValue);
                }}
                slotProps={{
                  textField: {
                    size: "small",
                    sx: {
                      width: 150,
                      "& input": {
                        textAlign: "center",
                        fontFamily: "Arial, sans-serif",
                        fontSize: "0.80rem" // ✅ giảm cỡ chữ
                      },
                      "& .MuiInputBase-root": {
                        height: 33 // ✅ giảm chiều cao ô lịch
                      }
                    },
                  },
                }}
              />
            </LocalizationProvider>

            {/* Nút xuất Excel */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Tooltip title="Xuất Excel">
                <IconButton
                  color="success"
                  onClick={async () => {
                    // Kiểm tra thiết bị di động
                    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
                    if (isMobile) {
                      alert("Chức năng xuất Excel không khả dụng trên điện thoại. Vui lòng sử dụng máy tính để xuất file.");
                      return;
                    }
                    console.log("rows:", data);
                    await exportPhieuChiCho({
                      selectedDate,
                      rows: data,
                      tongCong,
                    });
                  }}
                >
                  <FileDownloadIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Stack>

          {loading && (
            <Box sx={{ width: "100%", maxWidth: 300, mt: 4, textAlign: "center", mx: "auto" }}>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 3,           // 👈 độ cao mỏng
                  borderRadius: 2,     // 👈 bo góc nhẹ
                }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, fontWeight: 400 }}
              >
                Đang tải dữ liệu... ({progress}%)
              </Typography>
            </Box>
          )}

          {/* Table */}
          <TableContainer component={Paper} sx={{ mt: 3, borderRadius: 2, boxShadow: 3 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={headCell}>STT</TableCell>
                  <TableCell align="center" sx={headCell}>Diễn giải</TableCell>
                  <TableCell align="center" sx={headCell}>ĐVT</TableCell>
                  <TableCell align="center" sx={headCell}>Số lượng</TableCell>
                  <TableCell align="center" sx={headCell}>Đơn giá</TableCell>
                  <TableCell align="center" sx={headCell}>Thành tiền</TableCell>
                  <TableCell align="center" sx={headCell}>Trích 5%</TableCell>
                  <TableCell align="center" sx={headCell}>Thực nhận</TableCell>
                  <TableCell align="center" sx={{ ...headCell, borderRight: 0 }}>Ghi chú</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row, idx) => (
                  <TableRow
                    key={idx}
                    sx={{ backgroundColor: row.isLoaiRow ? "#d9e1f2" : "transparent" }}
                    hover={!row.isLoaiRow}
                  >
                    <TableCell align="center" sx={{ fontWeight: row.isLoaiRow ? 600 : "normal" }}>
                      {row.stt}
                    </TableCell>
                    <TableCell sx={{ fontWeight: row.isLoaiRow ? 600 : "normal" }}>
                      {row.dienGiai}
                    </TableCell>
                    <TableCell align="center">{row.dvt || ""}</TableCell>
                    <TableCell align="center">{row.soLuong || ""}</TableCell>
                    <TableCell align="right">{row.donGia?.toLocaleString() || ""}</TableCell>
                    <TableCell align="right">{row.thanhTien?.toLocaleString() || ""}</TableCell>

                    {/* Cột Trích 5% in đậm nếu là dòng loại */}
                    <TableCell
                      align="right"
                      sx={{ fontWeight: row.isLoaiRow ? 700 : "normal" }}
                    >
                      {row.trich?.toLocaleString() || ""}
                    </TableCell>

                    {/* Cột Thực nhận in đậm nếu là dòng loại */}
                    <TableCell
                      align="right"
                      sx={{ fontWeight: row.isLoaiRow ? 700 : "normal" }}
                    >
                      {row.thucNhan?.toLocaleString() || ""}
                    </TableCell>

                    <TableCell></TableCell>
                  </TableRow>
                ))}

                {/* Hàng cộng */}
                <TableRow sx={{ backgroundColor: "#ffe0b2" }}>
                  <TableCell colSpan={5} align="center" sx={{ fontWeight: 700 }}>CỘNG</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{tongCong.tongTien.toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{tongCong.trich.toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{tongCong.thucNhan.toLocaleString()}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>

            </Table>
          </TableContainer>

          {/* Ký tên */}
          <Box sx={{ mt: 4 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", textAlign: "center", gap: 2, mt: 1 }}>
              <Typography fontWeight="bold">Người đi chợ</Typography>
            </Box>
            <Divider sx={{ my: 6, opacity: 0 }} />
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", textAlign: "center", gap: 2 }}>
              <Typography fontWeight="bold">Phan Thị Tuyết Minh</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
