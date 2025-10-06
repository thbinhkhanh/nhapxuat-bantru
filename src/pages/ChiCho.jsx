import React, { useState, useEffect } from "react";
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Card, CardContent, Divider, Stack
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { vi } from "date-fns/locale";
//import { doc, getDoc } from "firebase/firestore";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";

import { db } from "../firebase";
import { getStoredDate, setStoredDate } from "../utils/dateStorage"; // dùng dateStorage
import { useDataContext, useSaveDataToContext } from "../context/DataContext";
import { useDanhMuc } from "../context/DanhMucContext";

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
  const { danhMuc, setDanhMuc, fetchDanhMuc } = useDanhMuc();

  useEffect(() => {
    if (selectedDate) {
      setStoredDate(selectedDate); // lưu vào localStorage khi thay đổi
    }
  }, [selectedDate]);

  useEffect(() => {
    const fetchChiCho = async () => {
      if (!selectedDate) return;

      setLoading(true);
      setProgress(0);

      const dateStr = selectedDate.toISOString().split("T")[0];

      try {
        let matHang = [];
        let danhMucMap = {};

        // ✅ Lấy danh mục từ context hoặc Firestore
        if (danhMuc && danhMuc.length > 0) {
          //console.log("[ChiCho] ✅ DANHMUC lấy từ Context:", danhMuc.length, "mục");
          danhMuc.forEach(dm => {
            danhMucMap[String(dm.id)] = dm.group || "Loại khác";
          });
        } else {
          //console.log("[ChiCho] ⚠ Context DANHMUC trống → Fetch Firestore");
          const danhMucSnap = await getDocs(collection(db, "DANHMUC"));
          const fetchedDanhMuc = danhMucSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          if (fetchedDanhMuc.length > 0) {
            //console.log("[ChiCho] ✅ Sau khi fetch, DANHMUC từ Firestore:", fetchedDanhMuc.length, "mục");
            fetchedDanhMuc.forEach(dm => {
              danhMucMap[String(dm.id)] = dm.group || "Loại khác";
            });
            setDanhMuc(fetchedDanhMuc); // ✅ cập nhật context
          } else {
            console.warn("[ChiCho] ⚠ Không có danh mục nào được tìm thấy trong Firestore");
          }
        }

        // ✅ Ưu tiên lấy từ DataContext nếu có
        const contextData = dataByDate?.[dateStr];
        if (contextData?.matHang && contextData?.danhMucMap) {
          //console.log("[ChiCho] ✅ Dùng matHang + danhMucMap từ DataContext:", dateStr);
          matHang = contextData.matHang;
          danhMucMap = contextData.danhMucMap;
          setProgress(70);
        } else {
          //console.log("[ChiCho] ⚠ Không có trong DataContext → Fetch Firestore DATA:", dateStr);
          const dataSnap = await getDoc(doc(db, "DATA", dateStr));
          if (dataSnap.exists()) {
            matHang = dataSnap.data().matHang || [];
            //console.log("[ChiCho] ✅ Fetch DATA từ Firestore:", matHang.length, "mặt hàng");
          }
          setProgress(50);
          setProgress(70);
        }

        // Lọc bỏ Xuất kho
        const keywordsXuatKho = ["đường biên hòa", "gạo", "dầu tường an", "hạt nêm", "nước mắm"];
        const chiChoItems = matHang.filter(
          m => !keywordsXuatKho.some(k => m.ten.toLowerCase().includes(k))
        );
        //console.log("[ChiCho] ✅ Chi chợ items:", chiChoItems.length);

        if (chiChoItems.length === 0) {
          //console.log("[ChiCho] ⚠ Không có mặt hàng chi chợ");
          setData([]);
          setTongCong({ tongTien: 0, trich: 0, thucNhan: 0 });
          setProgress(100);
          setLoading(false);
          return;
        }

        // Gom nhóm theo danh mục
        const chiChoGroups = {};
        chiChoItems.forEach(m => {
          const group = danhMucMap[String(m.maSP)] || "Loại khác";
          if (!chiChoGroups[group]) chiChoGroups[group] = [];
          chiChoGroups[group].push(m);
        });
        //console.log("[ChiCho] ✅ Gom nhóm chi chợ:", Object.keys(chiChoGroups));

        // Build tableData
        const tableData = [];
        let sttCounter = 1;
        let tongTien = 0;
        let tongTrich = 0;
        let tongThucNhan = 0;

        Object.keys(chiChoGroups).forEach(groupName => {
          const items = chiChoGroups[groupName];
          const groupTotal = items.reduce((acc, m) => acc + (m.thanhTien || 0), 0);
          const groupTrich = items.reduce((acc, m) => acc + ((m.thanhTien || 0) * 0.05), 0);
          const groupThucNhan = items.reduce((acc, m) => acc + ((m.thanhTien || 0) * 0.95), 0);

          tableData.push({
            stt: sttCounter++,
            dienGiai: groupName,
            isLoaiRow: true,
            thanhTien: groupTotal,
            trich: groupTrich,
            thucNhan: groupThucNhan
          });

          items.forEach(m => {
            const trich = m.thanhTien ? m.thanhTien * 0.05 : 0;
            const thucNhan = m.thanhTien ? m.thanhTien * 0.95 : 0;

            tableData.push({
              stt: "",
              dienGiai: m.ten,
              dvt: m.dvt,
              soLuong: m.soLuong,
              donGia: m.donGia,
              thanhTien: m.thanhTien,
              trich,
              thucNhan,
              isLoaiRow: false
            });
          });

          tongTien += groupTotal;
          tongTrich += groupTrich;
          tongThucNhan += groupThucNhan;
        });

        //console.log("[ChiCho] ✅ Tổng cộng:", { tongTien, tongTrich, tongThucNhan });

        setTongCong({ tongTien, trich: tongTrich, thucNhan: tongThucNhan });
        setData(tableData);

        // ✅ Chỉ lưu chiCho (tableData) vào DataContext
        saveDataToContext(selectedDate, { chiCho: tableData });
        setProgress(100);

      } catch (err) {
        console.error("[ChiCho] ❌ Lỗi fetch Chi chợ:", err);
        setProgress(100);
      } finally {
        setLoading(false);
      }
    };

    fetchChiCho();
  }, [selectedDate, danhMuc]); // ✅ danhMuc từ context, dùng để trigger khi cập nhật

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
                    //console.log("rows:", data);
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
                  <TableCell align="center" sx={{ ...headCell, whiteSpace: "nowrap" }}>STT</TableCell>
                  <TableCell align="center" sx={{ ...headCell, whiteSpace: "nowrap" }}>Diễn giải</TableCell>
                  <TableCell align="center" sx={{ ...headCell, whiteSpace: "nowrap" }}>ĐVT</TableCell>
                  <TableCell align="center" sx={{ ...headCell, whiteSpace: "nowrap" }}>Số lượng</TableCell>
                  <TableCell align="center" sx={{ ...headCell, whiteSpace: "nowrap" }}>Đơn giá</TableCell>
                  <TableCell align="center" sx={{ ...headCell, whiteSpace: "nowrap" }}>Thành tiền</TableCell>
                  <TableCell align="center" sx={{ ...headCell, whiteSpace: "nowrap" }}>Trích 5%</TableCell>
                  <TableCell align="center" sx={{ ...headCell, whiteSpace: "nowrap" }}>Thực nhận</TableCell>
                  <TableCell align="center" sx={{ ...headCell, borderRight: 0, whiteSpace: "nowrap" }}>Ghi chú</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.map((row, idx) => (
                  <TableRow
                    key={idx}
                    sx={{ backgroundColor: row.isLoaiRow ? "#d9e1f2" : "transparent" }}
                    hover={!row.isLoaiRow}
                  >
                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: row.isLoaiRow ? 600 : "normal",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.stt}
                    </TableCell>

                    {/* Cột “Diễn giải” – không xuống dòng, rút gọn khi quá dài */}
                    <TableCell
                      sx={{
                        fontWeight: row.isLoaiRow ? 600 : "normal",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: 250,
                        "@media (max-width:600px)": { maxWidth: 140 },
                      }}
                      title={row.dienGiai} // 👈 hiển thị tooltip khi hover
                    >
                      {row.dienGiai}
                    </TableCell>

                    <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                      {row.dvt || ""}
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                      {row.soLuong || ""}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      {row.donGia?.toLocaleString() || ""}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      {row.thanhTien?.toLocaleString() || ""}
                    </TableCell>

                    {/* Cột Trích 5% */}
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: row.isLoaiRow ? 700 : "normal",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.trich?.toLocaleString() || ""}
                    </TableCell>

                    {/* Cột Thực nhận */}
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: row.isLoaiRow ? 700 : "normal",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.thucNhan?.toLocaleString() || ""}
                    </TableCell>

                    <TableCell sx={{ whiteSpace: "nowrap" }}></TableCell>
                  </TableRow>
                ))}

                {/* Hàng cộng */}
                <TableRow sx={{ backgroundColor: "#ffe0b2" }}>
                  <TableCell colSpan={5} align="center" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                    CỘNG
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                    {tongCong.tongTien.toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                    {tongCong.trich.toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                    {tongCong.thucNhan.toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}></TableCell>
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
