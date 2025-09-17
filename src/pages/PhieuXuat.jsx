import React, { useState, useEffect } from "react";
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Card, CardContent, Stack, Button,
  TextField, Divider, LinearProgress, IconButton, Tooltip, Alert 
} from "@mui/material";

import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import viLocale from "date-fns/locale/vi";

import { numberToVietnameseText } from "../utils/numberToText";
import { getStoredDate, setStoredDate } from "../utils/dateStorage";
import { useDataContext, useSaveDataToContext } from "../context/DataContext"; 
import { doc, getDoc, setDoc, getFirestore } from "firebase/firestore";
import { initializeApp, getApps, getApp } from "firebase/app";

import { format } from "date-fns";
import { exportPhieuXuatKho } from "../utils/exportPhieuXuatKho";

import UpdateIcon from "@mui/icons-material/Update";         
import FileDownloadIcon from "@mui/icons-material/FileDownload"; 
import SyncIcon from '@mui/icons-material/Sync';

// Firestore mặc định
const firebaseConfig = {
  apiKey: "AIzaSyDABUgzEzkd02WfAFU-hUuol_ZFRVo97YI",
  authDomain: "diemdanh-bantru.firebaseapp.com",
  projectId: "diemdanh-bantru",
  storageBucket: "diemdanh-bantru.firebasestorage.app",
  messagingSenderId: "64783667725",
  appId: "1:64783667725:web:953a812eb9324429d67b44",
  measurementId: "G-QWRBNFD2T5",
};
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firestore 2 chỉ dùng cho handleSync
const firebaseConfigSync = {
  apiKey: "AIzaSyDAcbzsDsK0vg0tn8PvLM5JoUVABDenB70",
  authDomain: "diemdanh-bantru-17d03.firebaseapp.com",
  projectId: "diemdanh-bantru-17d03",
  storageBucket: "diemdanh-bantru-17d03.firebasestorage.app",
  messagingSenderId: "639395884521",
  appId: "1:639395884521:web:ed052133d1c9ef8d1d6f78"
};
const appSync = getApps().some(a => a.name === "syncApp") 
  ? getApp("syncApp") 
  : initializeApp(firebaseConfigSync, "syncApp");
const dbSync = getFirestore(appSync);

export default function PhieuXuat() {
  // Context
  const { dataByDate } = useDataContext();
  const saveDataToContext = useSaveDataToContext();

  // Local state
  const [selectedDate, setSelectedDate] = useState(getStoredDate());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const [soPhieu, setSoPhieu] = useState("02/01");
  const [nguoiNhan, setNguoiNhan] = useState("Đặng Thị Tuyết Nga");
  const [lyDoXuat, setLyDoXuat] = useState("Chế biến thực phẩm cho trẻ");
  const [xuatTaiKho, setXuatTaiKho] = useState("Tiểu học Bình Khánh");
  const [soLuongHocSinh, setSoLuongHocSinh] = useState(0);

  const [thuKho, setThuKho] = useState("Nguyễn Văn Tám");
  const [keToan, setKeToan] = useState("Lê Thị Thu Hương");
  const [hieuTruong, setHieuTruong] = useState("Đặng Thái Bình");

  const [totalText, setTotalText] = useState("");

  const inputWidth = 200;

  const nguoiKy = [
    { label: "Người nhận hàng", value: nguoiNhan, setter: setNguoiNhan },
    { label: "Thủ kho", value: thuKho, setter: setThuKho },
    { label: "Kế toán", value: keToan, setter: setKeToan },
    { label: "Thủ trưởng đơn vị", value: hieuTruong, setter: setHieuTruong },
  ];

  const handleSync = async () => {
    if (!selectedDate) {
      setMessage("Chọn ngày trước khi đồng bộ");
      setSuccess(false);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 4000);
      return;
    }

    try {
      const docRef = doc(dbSync, "BANTRU_2024-2025", selectedDate.toISOString().split("T")[0]);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        const day = selectedDate.getDate().toString().padStart(2, "0");
        const month = (selectedDate.getMonth() + 1).toString().padStart(2, "0");
        const year = selectedDate.getFullYear();
        setMessage(`Không tìm thấy số lượng học sinh bán trú ngày ${day}/${month}/${year}`);
        setSuccess(false);
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 4000);
        return;
      }

      const danhSachAn = docSnap.data().danhSachAn || [];
      const soLuong = danhSachAn.length;

      setSoLuongHocSinh(soLuong);
      saveDataToContext(selectedDate, { soLuongHocSinh: soLuong });

      const docId = format(selectedDate, "yyyy-MM-dd");
      await setDoc(
        doc(db, "INFO", docId),
        { suatAn: soLuong, updatedAt: new Date().toISOString() },
        { merge: true }
      );

      //setMessage(`✅ Đã đồng bộ số lượng học sinh với dữ liệu bán trú: ${soLuong}`);
      setMessage(`✅ Đã đồng bộ số lượng học sinh với dữ liệu bán trú.`);
      setSuccess(true);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 4000);
    } catch (error) {
      console.error("Lỗi khi đồng bộ:", error);
      setMessage("❌ Lỗi khi đồng bộ dữ liệu");
      setSuccess(false);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 4000);
    }
  };

  // Cập nhật Firestore với số lượng học sinh truyền vào
  const UpdateSoLuongHS = async (soLuong) => {
    if (!selectedDate) return;
    try {
      const docId = format(selectedDate, "yyyy-MM-dd");
      await setDoc(
        doc(db, "INFO", docId),
        { suatAn: soLuong, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      //console.log(`✅ Đã cập nhật số lượng học sinh: ${soLuong}`);
    } catch (err) {
      console.error("❌ Lỗi khi cập nhật số lượng học sinh:", err);
    }
  };


  const textFieldStyle = {
    width: 250,
    "& .MuiInput-underline:before": {
      borderBottom: "1px solid transparent",
    },
    "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
      borderBottom: "1px solid #ccc",
    },
    "& .MuiInput-underline:after": {
      borderBottom: "none",
    },
  };

  const resetInfoToDefault = () => {
    setSoPhieu("02/01");
    setNguoiNhan("Đặng Thị Tuyết Nga");
    setLyDoXuat("Chế biến thực phẩm cho trẻ");
    setXuatTaiKho("Tiểu học Bình Khánh");
    setSoLuongHocSinh(0);
    setThuKho("Nguyễn Văn Tám");
    setKeToan("Lê Thị Thu Hương");
    setHieuTruong("Đặng Thái Bình");
  };

  // Hàm fetchRows dùng context
  const fetchData = async (date) => {
    setLoading(true);
    try {
      const dateStr = date.toISOString().split("T")[0];

      const dataRef = doc(db, "DATA", dateStr);
      const dataSnap = await getDoc(dataRef);

      let formattedRows = [];
      if (dataSnap.exists()) {
        const docData = dataSnap.data();
        const matHang = Array.isArray(docData.matHang) ? docData.matHang : [];

        const allowedKeywords = ["Đường cát", "Gạo", "Dầu ăn", "Hạt nêm", "Nước mắm"];
        const filteredData = matHang.filter(item =>
          allowedKeywords.some(keyword => item.ten.includes(keyword))
        );

        formattedRows = filteredData.map((item, index) => ({
          stt: index + 1,
          name: item.ten,
          unit: item.dvt,
          yeuCau: item.soLuong,
          thucXuat: item.thucXuat !== undefined ? item.thucXuat : item.soLuong,
          donGia: item.donGia,
          thanhTien: item.thanhTien,
        }));

        setRows(formattedRows);
        saveDataToContext(date, { ...docData, phieuXuat: formattedRows });
      } else {
        setRows([]);
        saveDataToContext(date, { phieuXuat: [] });
      }

      const infoRef = doc(db, "INFO", dateStr);
      const infoSnap = await getDoc(infoRef);

      if (infoSnap.exists()) {
        const infoData = infoSnap.data();
        //console.log("✅ INFO data:", infoData);

        setSoPhieu(infoData.soPhieu || "02/01");
        setNguoiNhan(infoData.nguoiNhan || "Đặng Thị Tuyết Nga");
        setLyDoXuat(infoData.lyDo || "Chế biến thực phẩm cho trẻ");
        setXuatTaiKho(infoData.xuatTai || "Tiểu học Bình Khánh");
        setSoLuongHocSinh(infoData.suatAn || 0);
        setThuKho(infoData.thuKho || "Nguyễn Văn Tám");
        setKeToan(infoData.keToan || "Lê Thị Thu Hương");
        setHieuTruong(infoData.hieuTruong || "Đặng Thái Bình");
      } else {
        console.warn("⚠️ Không tìm thấy INFO cho ngày:", dateStr);
        resetInfoToDefault();
      }
    } catch (err) {
      console.error("[PhieuXuat] Lỗi khi fetch dữ liệu:", err);
      setRows([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  const total = rows.reduce((s, r) => s + r.thanhTien, 0);

  const headCell = {
    backgroundColor: "#1976d2 !important",
    color: "#fff !important",
    fontWeight: 700,
    textTransform: "uppercase",
    fontSize: 13,
    py: 1.2,
    borderRight: "1px solid rgba(255,255,255,0.2)",
  };

  const handleThucXuatChange = (index, value) => {
    const newRows = [...rows];
    const newThucXuat = Number(value);

    newRows[index].thucXuat = newThucXuat;
    newRows[index].thanhTien = newThucXuat * newRows[index].donGia;

    setRows(newRows);
    saveDataToContext(selectedDate, newRows);

    const newTotal = newRows.reduce((sum, row) => sum + row.thanhTien, 0);
    setTotalText(numberToVietnameseText(newTotal));
  };

  const handleUpdateData = async () => {
    setLoadingSave(true);
    setSuccess(false);
    setProgress(0);
    setMessage("");

    try {
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((r) => setTimeout(r, 80));
        setProgress(i);
      }

      const docId = format(selectedDate, "yyyy-MM-dd");

      // Lưu INFO
      await setDoc(doc(db, "INFO", docId), {
        soPhieu,
        nguoiNhan,
        lyDo: lyDoXuat,
        xuatTai: xuatTaiKho,
        suatAn: soLuongHocSinh,
        thuKho,
        keToan,
        hieuTruong,
        updatedAt: new Date().toISOString(),
      });

      // Lưu DATA (matHang)
      const dataRef = doc(db, "DATA", docId);
      const dataSnap = await getDoc(dataRef);

      if (dataSnap.exists()) {
        const docData = dataSnap.data();
        const matHang = Array.isArray(docData.matHang) ? [...docData.matHang] : [];

        const updatedMatHang = matHang.map((item) => {
          const matchedRow = rows.find((r) => r.name === item.ten);
          return matchedRow
            ? {
                ...item,
                thucXuat: matchedRow.thucXuat,
                thanhTien: matchedRow.thanhTien,
              }
            : item;
        });

        await setDoc(dataRef, { matHang: updatedMatHang }, { merge: true });
      }

      // ✅ Lưu số lượng học sinh vào context
      saveDataToContext(selectedDate, { soLuongHocSinh });

      setMessage("✅ Đã lưu thông tin học sinh và cập nhật số lượng thành tiền!");
      setSuccess(true);
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      setMessage("❌ Lỗi khi lưu dữ liệu!");
      setSuccess(false);
    } finally {
      setLoadingSave(false);
    }
  };

  const keywordOrder = ["gạo", "đường", "dầu ăn", "nước mắm", "hạt nêm" ];
  const sortedRows = [...rows]
  .sort((a, b) => {
    const aIndex = keywordOrder.findIndex(keyword => a.name.toLowerCase().includes(keyword));
    const bIndex = keywordOrder.findIndex(keyword => b.name.toLowerCase().includes(keyword));
    return aIndex - bIndex;
  })
  .map((item, index) => ({
    ...item,
    stt: index + 1,
  }));

  return (
    <Box sx={{ pt: "20px", pb: 6, px: { xs: 1, sm: 2 }, bgcolor: "#e3f2fd", minHeight: "100vh" }}>
      <Card elevation={8} sx={{ maxWidth: 1100, mx: "auto", borderRadius: 3, overflow: "hidden" }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          {/* Header */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">TRƯỜNG TIỂU HỌC BÌNH KHÁNH</Typography>
              <Typography variant="subtitle2"></Typography>
            </Box>
            <Typography variant="subtitle1" fontWeight="bold">Mẫu số  C 21 - HD</Typography>
          </Box>

          {/* Tiêu đề */}
          <Typography
            variant="h5"
            align="center"
            fontWeight="bold"
            sx={{ color: "#1976d2", mt: 2 }}
          >
            PHIẾU XUẤT KHO
          </Typography>

          {/* DatePicker & Cập nhật */}
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            justifyContent="center"
            sx={{ mb: 2, mt: 2 }}
          >
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={viLocale}>
              <DatePicker
                label="Chọn ngày"
                value={selectedDate}
                onChange={(newValue) => {
                  if (newValue) {
                    setSelectedDate(newValue);
                    setStoredDate(newValue); // ✅ lưu vào localStorage
                    fetchData(newValue); // ✅ đổi tên ở đây
                  }
                }}
                slotProps={{
                  textField: {
                    size: "small",
                    sx: {
                      width: 150,
                      "& input": {
                        textAlign: "center",
                        fontSize: "0.80rem"
                      },
                      "& .MuiInputBase-root": {
                        height: 33
                      }
                    },
                  },
                }}
              />
            </LocalizationProvider>

            <Box display="flex" alignItems="center" gap={1}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpdateData}
                startIcon={<UpdateIcon />}
                sx={{
                  height: 36,
                  px: 2,
                  fontWeight: "bold",
                  fontSize: "0.75rem",
                  whiteSpace: "nowrap",
                }}
              >
                CẬP NHẬT
              </Button>

              <Tooltip title="Xuất Excel">
                <IconButton
                  color="success"
                  sx={{ height: 36 }}
                  onClick={async () => {
                    // Kiểm tra thiết bị di động
                    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
                    if (isMobile) {
                      alert("Chức năng xuất Excel không khả dụng trên điện thoại. Vui lòng sử dụng máy tính để xuất file.");
                      return;
                    }

                    //console.log("rows:", rows);
                    await exportPhieuXuatKho({
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
                    });
                  }}
                >
                  <FileDownloadIcon />
                </IconButton>
              </Tooltip>

            </Box>
          </Stack>
          
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 3 }}>
            {loadingSave && (
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 300,
                  mt: 1,
                  mb: 3, // ✅ thêm khoảng cách dưới đây
                  textAlign: "center",
                  mx: "auto",
                }}
              >
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: 3, // giảm độ cao xuống 3px
                    borderRadius: 2,
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, width: "100%" }}
                >
                  Đang cập nhật dữ liệu... ({progress}%)
                </Typography>
              </Box>
            )}
          </Box>

          {loading && (
            <Box sx={{ 
              width: "100%", 
              maxWidth: 300, 
              mt: 1, 
              mb: 3,          // ✅ thêm khoảng cách dưới
              textAlign: "center", 
              mx: "auto" 
            }}>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 3,
                  borderRadius: 2,
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


          <Box sx={{ borderBottom: "3px solid #1976d2", width: "100%", mt: 0 }} />

          {/* Thông tin phiếu */}
          <Box
              sx={{
                mt: 2,
                display: "grid",
                rowGap: 1.5,
                columnGap: 2,
                gridTemplateColumns: "max-content auto",
                alignItems: "center",
              }}
            >
              <Typography component="span">Ngày: </Typography>
                <TextField
                  size="small"
                  value={new Intl.DateTimeFormat("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                  }).format(selectedDate)}
                  variant="standard"
                  InputProps={{
                    readOnly: true,
                    sx: { fontWeight: 'bold' }  // in đậm nội dung
                  }}
                  sx={{
                    width: 100,
                    "& .MuiInputBase-root": {
                      color: "black",
                    },
                    "& .MuiInput-underline:before": {
                      borderBottom: "1px solid transparent",
                    },
                    "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
                      borderBottom: "1px solid #ccc",
                    },
                    "& .MuiInput-underline:after": {
                      borderBottom: "none",
                    },
                  }}
                />
                <Typography component="span">Số: </Typography>
                <TextField
                  size="small"
                  value={soPhieu}
                  onChange={(e) => setSoPhieu(e.target.value)}
                  variant="standard"
                  InputProps={{
                    sx: { fontWeight: 'bold' }  // in đậm nội dung
                  }}
                  sx={{
                    width: 100,
                    "& .MuiInput-underline:before": { borderBottom: "1px solid transparent" },
                    "& .MuiInput-underline:hover:not(.Mui-disabled):before": { borderBottom: "1px solid #ccc" },
                    "& .MuiInput-underline:after": { borderBottom: "none" },
                  }}
                />
              <Typography component="span">Họ tên người nhận hàng: </Typography>
              <TextField
                size="small"
                value={nguoiNhan}
                onChange={(e) => setNguoiNhan(e.target.value)}
                variant="standard"
                sx={textFieldStyle}
              />

              <Typography component="span">Lý do xuất kho: </Typography>
              <TextField
                size="small"
                value={lyDoXuat}
                onChange={(e) => setLyDoXuat(e.target.value)}
                variant="standard"
                sx={textFieldStyle}
              />

              <Typography component="span">Xuất tại kho: </Typography>
              <TextField
                size="small"
                value={xuatTaiKho}
                onChange={(e) => setXuatTaiKho(e.target.value)}
                variant="standard"
                sx={textFieldStyle}
              />

              <Typography component="span">Số lượng học sinh: </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    size="small"
                    type="number"
                    value={soLuongHocSinh}
                    onChange={(e) => setSoLuongHocSinh(Number(e.target.value))}
                    variant="standard"
                    InputProps={{
                      sx: { fontWeight: 'bold' } // in đậm nội dung
                    }}
                    sx={{
                      width: 70, // độ rộng cố định
                      "& .MuiInputBase-root": {
                        color: "red", // màu chữ
                      },
                      "& .MuiInput-underline:before": {
                        borderBottom: "1px solid transparent",
                      },
                      "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
                        borderBottom: "1px solid #ccc",
                      },
                      "& .MuiInput-underline:after": {
                        borderBottom: "none",
                      },
                    }}
                  />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Tooltip title="Đồng bộ số liệu bán trú">
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSync}
                        sx={{ fontSize: "0.75rem", minWidth: "40px", padding: "6px" }} // tuỳ chỉnh size button
                      >
                        <SyncIcon />
                      </Button>
                    </Tooltip>

                    {showAlert && (
                      <Box sx={{ display: "inline-block", mt: 0 }}>
                        <Alert severity={success ? "success" : "error"} sx={{ px: 2 }}>
                          {message}
                        </Alert>
                      </Box>
                    )}
                  </Box>

                </Stack>
            </Box>

          {/* Bảng chi tiết */}
          <TableContainer component={Paper} sx={{ mt: 3, borderRadius: 2, boxShadow: 3 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ minHeight: 35 }}>
                  <TableCell align="center" sx={headCell}>Số TT</TableCell>
                  <TableCell align="center" sx={headCell}>Tên thực phẩm</TableCell>
                  <TableCell align="center" sx={headCell}>Đơn vị tính</TableCell>
                  <TableCell align="center" sx={headCell}>Số lượng Yêu cầu</TableCell>
                  <TableCell align="center" sx={headCell}>Số lượng Thực xuất</TableCell>
                  <TableCell align="center" sx={headCell}>Đơn giá</TableCell>
                  <TableCell align="center" sx={{ ...headCell, borderRight: 0 }}>Thành tiền</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {sortedRows.map((row, index) => (
                  <TableRow key={row.stt} hover sx={{ minHeight: 35 }}>
                    <TableCell align="center">{row.stt}</TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>{row.name}</TableCell>
                    <TableCell align="center">{row.unit}</TableCell>
                    <TableCell align="center">{row.yeuCau}</TableCell>
                    <TableCell align="center">
                      <TextField
                        size="small"
                        type="number"
                        value={row.thucXuat}
                        onChange={(e) => {
                          const newThucXuat = Number(e.target.value);

                          const newRows = rows.map((r) => {
                            if (r.name === row.name) {
                              const thanhTien = newThucXuat * r.donGia;
                              return { ...r, thucXuat: newThucXuat, thanhTien };
                            }
                            return r;
                          });

                          setRows(newRows);
                          saveDataToContext(selectedDate, newRows);

                          const newTotal = newRows.reduce((sum, r) => sum + r.thanhTien, 0);
                          const newTotalText = numberToVietnameseText(newTotal);

                          //console.log("Tổng tiền:", newTotal);
                          //console.log("Bằng chữ:", newTotalText);
                        }}
                        inputProps={{
                          min: 0,
                          style: {
                            textAlign: "center",
                            padding: "4px 8px",
                            fontSize: "0.85rem",
                          },
                        }}
                        sx={{
                          width: 150,
                          "@media (max-width:600px)": {
                            width: "75px", // 👈 giảm 50% khi màn hình nhỏ
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">{row.donGia.toLocaleString()}</TableCell>
                    <TableCell align="right">
                      {typeof row.thanhTien === "number" ? row.thanhTien.toLocaleString() : ""}
                    </TableCell>
                  </TableRow>
                ))}

                <TableRow sx={{ backgroundColor: "#ffe0b2" }}>
                  <TableCell colSpan={3} align="center" sx={{ fontWeight: 'bold' }}>Tổng cộng</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {total.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Tổng tiền bằng chữ */}
          <Typography sx={{ mt: 2, fontStyle: "italic" }}>
            Tổng số tiền viết bằng chữ:{" "}
            <Box component="span" sx={{ color: "#1976d2", fontWeight: "bold" }}>
              {numberToVietnameseText(total)}
            </Box>
          </Typography>

          {/* Chức danh */}
          <Box sx={{ mt: 5, overflowX: 'auto' }}>
            <Box
              sx={{
                minWidth: 600,
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gridTemplateRows: "auto auto",
                textAlign: "center",
                columnGap: 2,
                rowGap: 12, // 👈 khoảng cách giữa chức vụ và tên
              }}
            >
              {/* Hàng chức vụ */}
              <Typography fontWeight="bold">Người nhận hàng</Typography>
              <Typography fontWeight="bold">Thủ kho</Typography>
              <Typography fontWeight="bold">Kế toán</Typography>
              <Typography fontWeight="bold">Thủ trưởng đơn vị</Typography>

              {/* Hàng tên người ký */}
              <TextField
                variant="standard"
                value={nguoiNhan}
                onChange={(e) => setNguoiNhan(e.target.value)}
                placeholder="Người nhận hàng"
                inputProps={{ style: { textAlign: "center", fontWeight: "bold" } }}
                sx={textFieldStyle}
              />
              <TextField
                variant="standard"
                value={thuKho}
                onChange={(e) => setThuKho(e.target.value)}
                placeholder="Thủ kho"
                inputProps={{ style: { textAlign: "center", fontWeight: "bold" } }}
                sx={textFieldStyle}
              />
              <TextField
                variant="standard"
                value={keToan}
                onChange={(e) => setKeToan(e.target.value)}
                placeholder="Kế toán"
                inputProps={{ style: { textAlign: "center", fontWeight: "bold" } }}
                sx={textFieldStyle}
              />
              <TextField
                variant="standard"
                value={hieuTruong}
                onChange={(e) => setHieuTruong(e.target.value)}
                placeholder="Thủ trưởng đơn vị"
                inputProps={{ style: { textAlign: "center", fontWeight: "bold" } }}
                sx={textFieldStyle}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
