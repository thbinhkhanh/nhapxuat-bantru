import React, { useState, useEffect } from "react";
import {
  Box, Stack, Typography, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  TextField, Paper, IconButton,
  LinearProgress, Alert, Autocomplete
} from "@mui/material";
import { DeleteOutline } from "@mui/icons-material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { vi } from "date-fns/locale";
import { format } from "date-fns";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { app } from "../firebase";
import UpdateIcon from '@mui/icons-material/Update';

// ✅ Import context
import { useDanhMuc } from "../context/DanhMucContext";

const db = getFirestore(app);

export default function UpdateData() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [danhMucSource, setDanhMucSource] = useState("Chưa tải");

  // ✅ Lấy danh mục từ context
  const { danhMuc, fetchDanhMuc } = useDanhMuc();

  // ✅ Khởi tạo bảng 8 dòng rỗng khi mount
  useEffect(() => {
    setRows(Array.from({ length: 8 }, (_, i) => ({
      stt: i + 1,
      maHang: "",
      tenHang: "",
      dvt: "",
      sl: "",
      donGia: "",
      thanhTien: 0,
      loai: "",
    })));

    // Nếu context rỗng thì fetch danh mục từ Firestore
    if (!danhMuc || danhMuc.length === 0) {
      //console.log("[UpdateData] Context rỗng → gọi fetchDanhMuc từ Firestore");
      setDanhMucSource("Firestore (fetch mới)");
      fetchDanhMuc();
    } else {
      //console.log("[UpdateData] ✅ Danh mục lấy từ context:", danhMuc.length, "mục");
      setDanhMucSource("Context (cache)");
    }
  }, [danhMuc, fetchDanhMuc]);

  const formatDVT = (dvt) => {
    if (!dvt) return "";
    return dvt.charAt(0).toUpperCase() + dvt.slice(1).toLowerCase();
  };

  // xử lý thay đổi dữ liệu ô
  const handleChange = (index, field, value) => {
    const newRows = [...rows];

    if (field === "maHang") {
      const found = danhMuc.find(item => item.id === value);
      if (found) {
        //console.log("[UpdateData] ✅ Match sản phẩm:", found);
        newRows[index].maHang = found.id;
        newRows[index].tenHang = found.name;
        newRows[index].dvt = found.unit;
        newRows[index].loai = found.group;
      } else {
        newRows[index].maHang = value;
      }
    } else {
      newRows[index][field] = value;
    }

    if (field === "sl" || field === "donGia") {
      const slNum = parseFloat(newRows[index].sl) || 0;
      const donGiaNum = parseFloat(newRows[index].donGia) || 0;
      newRows[index].thanhTien = slNum * donGiaNum;
    }

    setRows(newRows);
  };

  const handleUpdate = async () => {
    setLoading(true);
    setProgress(1); // 👉 bắt đầu từ 1% thay vì 0
    setMessage("");
    setSuccess(false);
    setShowAlert(false);

    const filledRows = rows.filter(r => r.tenHang || r.dvt || r.sl || r.donGia);
    const rowsWithMissingData = filledRows.filter(r =>
      !r.tenHang || !r.maHang || !r.dvt || !r.sl || !r.donGia
    );

    if (filledRows.length === 0) {
      setMessage("⚠️ Bảng chưa có dữ liệu!");
      setSuccess(false);
      setLoading(false);
      setShowAlert(true);
      return;
    }

    if (rowsWithMissingData.length > 0) {
      setMessage("⚠️ Một số hàng còn thiếu dữ liệu. Vui lòng nhập đầy đủ các cột!");
      setSuccess(false);
      setLoading(false);
      setShowAlert(true);
      return;
    }

    const docId = format(selectedDate, "yyyy-MM-dd");

    // 🔹 chuẩn hoá dữ liệu mới (KHÔNG có trường loai)
    const matHangData = filledRows.map(r => ({
      maSP: r.maHang,
      ten: r.tenHang,
      dvt: formatDVT(r.dvt),
      soLuong: parseFloat(r.sl) || 0,
      donGia: parseFloat(r.donGia) || 0,
      thanhTien:
        r.thanhTien ??
        (parseFloat(r.sl) || 0) * (parseFloat(r.donGia) || 0),
    }));

    try {
      for (let i = 0; i < matHangData.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        // 👉 luôn đảm bảo hiển thị >=1% cho đến khi đủ 100%
        setProgress(Math.max(1, Math.round(((i + 1) / matHangData.length) * 100)));

        const item = matHangData[i];

        // 🔹 Kiểm tra DANHMUC và thêm mới nếu cần (có loai ở đây)
        const danhMucRef = doc(db, "DANHMUC", item.maSP);
        const danhMucSnap = await getDoc(danhMucRef);
        if (!danhMucSnap.exists()) {
          const originalRow = filledRows.find(r => r.maHang === item.maSP);
          await setDoc(danhMucRef, {
            id: item.maSP,
            name: item.ten,
            unit: item.dvt,
            group: originalRow?.loai || "Loại khác",
          });
        }
      }

      // 🔹 Cập nhật DATA (merge thay vì ghi đè)
      const docRef = doc(db, "DATA", docId);
      const docSnap = await getDoc(docRef);

      let mergedMatHang = [];

      if (docSnap.exists()) {
        const oldData = docSnap.data().matHang || [];

        const preserved = [];
        const matHangMap = new Map();

        oldData.forEach(item => {
          if (item.maSP) {
            matHangMap.set(item.maSP, item);
          } else {
            preserved.push(item);
          }
        });

        matHangData.forEach(item => {
          const existing = matHangMap.get(item.maSP);
          if (existing) {
            matHangMap.set(item.maSP, { ...existing, ...item });
          } else {
            matHangMap.set(item.maSP, item);
          }
        });

        mergedMatHang = [...preserved, ...Array.from(matHangMap.values())];

        await updateDoc(docRef, {
          matHang: mergedMatHang,
          updatedAt: new Date().toISOString(),
        });
      } else {
        mergedMatHang = matHangData;
        await setDoc(docRef, {
          matHang: mergedMatHang,
          updatedAt: new Date().toISOString(),
        });
      }

      // 🔹 Cập nhật context DANHMUC sau khi thêm mới
      if (typeof fetchDanhMuc === "function") {
        await fetchDanhMuc();
      }

      setMessage("✅ Cập nhật dữ liệu thành công!");
      setSuccess(true);
    } catch (err) {
      console.error("[UpdateData] ❌ Lỗi khi cập nhật:", err);
      setMessage("❌ Có lỗi xảy ra khi cập nhật dữ liệu!");
      setSuccess(false);
    } finally {
      setLoading(false);
      setShowAlert(true);
    }
  };







  // Hàm chuẩn hóa chữ cái
  const formatText = (text) => {
    if (!text) return "";
    const lower = text.toLowerCase().trim();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  return (
    <Box sx={{ pt: "20px", pb: 6, px: { xs: 1, sm: 2 }, bgcolor: "#e3f2fd", minHeight: "100vh" }}>
      <Box sx={{ width: "100%", maxWidth: "90%", mx: "auto", p: 3, bgcolor: "#fff", borderRadius: 3, boxShadow: 3, overflowX: "auto" }}>
        <Typography variant="subtitle1" fontWeight="bold">TRƯỜNG TIỂU HỌC BÌNH KHÁNH</Typography>
        <Typography variant="h5" align="center" fontWeight="bold" sx={{ color: "#1976d2", mt: 2, pb: 2 }}>
          CẬP NHẬT DỮ LIỆU THỰC PHẨM
        </Typography>

        {/* ✅ Hiển thị trạng thái nguồn danh mục */}
        {/*<Typography variant="body2" align="center" sx={{ mb: 1, color: "gray" }}>
          Nguồn danh mục: <strong>{danhMucSource}</strong> ({danhMuc?.length || 0} sản phẩm)
        </Typography>*/}

        <Stack direction="row" spacing={2} justifyContent="center" sx={{ my: 1 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
            <DatePicker
              label="Chọn ngày"
              value={selectedDate}
              onChange={(newValue) => setSelectedDate(newValue)}
              slotProps={{ textField: { size: "small", sx: { width: 150 } } }}
            />
          </LocalizationProvider>
          <Button variant="contained" color="primary" onClick={handleUpdate} startIcon={<UpdateIcon />}>
            Cập nhật
          </Button>
        </Stack>

        <TableContainer component={Paper} sx={{ overflowX: "auto", mt: 3 }}>
          <Table size="small" sx={{ minWidth: 1000 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#1976d2", height: 45 }}>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 50 }}>STT</TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 80 }}>MÃ HÀNG</TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", minWidth: 150 }}>TÊN HÀNG</TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 90 }}>ĐVT</TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 90 }}>SỐ LƯỢNG</TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 90 }}>ĐƠN GIÁ</TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 90 }}>THÀNH TIỀN</TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 200 }}>LOẠI THỰC PHẨM</TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 50 }}></TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={index}>
                  <TableCell align="center">{row.stt}</TableCell>

                  {/* MÃ HÀNG */}
                  <TableCell>
                    <Autocomplete
                      freeSolo
                      options={danhMuc.map(item => item.id)}
                      value={row.maHang || ""}
                      onChange={(_, newValue) => handleChange(index, "maHang", newValue)}
                      onInputChange={(_, newInputValue) => handleChange(index, "maHang", newInputValue)}
                      renderInput={(params) => <TextField {...params} variant="standard" />}
                    />
                  </TableCell>

                  {/* TÊN HÀNG */}
                  <TableCell>
                    <Autocomplete
                      freeSolo
                      options={danhMuc.map(item => item.name)}
                      value={row.tenHang || ""}
                      onChange={(_, newValue) => handleChange(index, "tenHang", newValue)}
                      onInputChange={(_, newInputValue) => handleChange(index, "tenHang", newInputValue)}
                      renderInput={(params) => <TextField {...params} variant="standard" />}
                    />
                  </TableCell>

                  {/* ĐVT */}
                  <TableCell>
                    <Autocomplete
                      freeSolo  // cho phép nhập tự do
                      options={[...new Set(danhMuc.map(item => item.unit))]} // lấy danh sách ĐVT duy nhất từ danh mục
                      value={row.dvt || ""}
                      onChange={(_, newValue) => handleChange(index, "dvt", newValue)}
                      onInputChange={(_, newInputValue) => handleChange(index, "dvt", newInputValue)}
                      renderInput={(params) => <TextField {...params} variant="standard" />}
                    />
                  </TableCell>


                  {/* SỐ LƯỢNG */}
                  <TableCell>
                    <TextField
                      variant="standard"
                      type="number"
                      value={row.sl}
                      onChange={(e) => handleChange(index, "sl", e.target.value)}
                    />
                  </TableCell>

                  {/* ĐƠN GIÁ */}
                  <TableCell>
                    <TextField
                      variant="standard"
                      value={row.donGia ? Number(row.donGia).toLocaleString() : ""}
                      onChange={(e) => handleChange(index, "donGia", e.target.value.replace(/,/g, ""))}
                    />
                  </TableCell>

                  {/* THÀNH TIỀN */}
                  <TableCell align="right">
                    {row.thanhTien !== 0 ? row.thanhTien.toLocaleString() : ""}
                  </TableCell>

                  {/* LOẠI */}
                  <TableCell sx={{ maxWidth: 250 }}>
                    <Autocomplete
                      freeSolo  // cho phép nhập tự do
                      options={[...new Set(danhMuc.map(item => item.group)), "Loại khác"]} // lấy danh sách nhóm duy nhất từ danh mục
                      value={row.loai || ""}
                      onChange={(_, newValue) => handleChange(index, "loai", newValue)}
                      onInputChange={(_, newInputValue) => handleChange(index, "loai", newInputValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          variant="standard"
                          sx={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          }}
                        />
                      )}
                      ListboxProps={{
                        style: {
                          maxHeight: 250,
                          overflowY: "auto",
                          whiteSpace: "nowrap",
                          overflowX: "auto"  // cho phép cuộn ngang khi tên dài
                        }
                      }}
                      sx={{
                        minWidth: 250,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                    />
                  </TableCell>

                  {/* XÓA */}
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => {
                        const newRows = [...rows];
                        newRows[index] = { ...newRows[index], maHang: "", tenHang: "", dvt: "", sl: "", donGia: "", thanhTien: 0, loai: "" };
                        setRows(newRows);
                      }}
                      sx={{ "&:hover": { color: "red" } }}
                    >
                      <DeleteOutline />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {loading && (
          <Box sx={{ width: "100%", maxWidth: 300, mt: 2, mx: "auto" }}>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ height: 3, borderRadius: 2 }}
            />
            <Typography 
              variant="caption" 
              color="text.secondary" 
              align="center" 
              sx={{ mt: 0.5 }}
            >
              Đang cập nhật dữ liệu... ({progress}%)
            </Typography>
          </Box>
        )}

        {showAlert && (
          <Alert severity={success ? "success" : "error"} sx={{ mt: 2 }}>
            {message}
          </Alert>
        )}
      </Box>
    </Box>
  );
}
