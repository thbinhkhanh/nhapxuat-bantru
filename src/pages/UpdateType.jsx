import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  LinearProgress,
  Alert,
  Autocomplete,
  TextField,
  IconButton
} from "@mui/material";
import UpdateIcon from '@mui/icons-material/Update';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import { useUpdateType } from "../context/UpdateTypeContext";
import { db } from "../firebase";
import { doc, getDoc, setDoc, arrayUnion } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useDanhMuc } from "../context/DanhMucContext";

export default function UpdateType() {
  const { unmatchedItems } = useUpdateType();
  const { danhMuc, fetchDanhMuc } = useDanhMuc();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const initialRows = Array.from(
      { length: Math.max(8, unmatchedItems.length) },
      (_, i) => {
        const item = unmatchedItems[i];
        const formattedDate = item?.date
          ? new Date(item.date).toLocaleDateString("vi-VN")
          : "";

        return item
          ? {
              stt: i + 1,
              ngay: formattedDate,
              maHang: item.maHang || "",
              tenHang: item.ten?.trim() || "",
              dvt: item.dvt || "",
              sl: item.soLuong || "",
              donGia: item.donGia || "",
              thanhTien: item.thanhTien || 0,
              loai: "", // người dùng nhập
            }
          : {
              stt: i + 1,
              ngay: "",
              maHang: "",
              tenHang: "",
              dvt: "",
              sl: "",
              donGia: "",
              thanhTien: 0,
              loai: "",
            };
      }
    );
    setRows(initialRows);
  }, [unmatchedItems]);

  const handleChange = (index, field, value) => {
    const newRows = [...rows];

    if (field === "maHang") {
      newRows[index].maHang = value;
      const found = danhMuc.find(item => item.id === value);

      if (found) {
        // Nếu mã hợp lệ trong danh mục, tự động điền tên và ĐVT
        newRows[index].tenHang = found.name;
        newRows[index].dvt = found.unit;
      } else {
        // Nếu xóa mã hoặc không tìm thấy, xóa tên và ĐVT
        newRows[index].tenHang = "";
        newRows[index].dvt = "";
      }
    } else if (field === "tenHang") {
      newRows[index].tenHang = value;
      const found = danhMuc.find(item => item.name === value);

      if (found) {
        // Nếu tên hợp lệ, điền mã và ĐVT
        newRows[index].maHang = found.id;
        newRows[index].dvt = found.unit;
      }
    } else {
      newRows[index][field] = value;
    }

    // Tính thành tiền
    const slNum = parseFloat(newRows[index].sl) || 0;
    const donGiaNum = parseFloat(newRows[index].donGia) || 0;
    newRows[index].thanhTien = slNum * donGiaNum;

    setRows(newRows);
  };


  const formatDate = (dateStr) => {
    const [day, month, year] = dateStr.split("/");
    return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  };

  
  const handleUpdate = async () => {
    setLoading(true);
    setProgress(0);
    setMessage("");
    setSuccess(false);
    setShowAlert(false); // mặc định ẩn Alert

    const updatedNames = [];
    const newMaHangs = [];
    let hasMissingData = false; // flag nếu có hàng thiếu dữ liệu
    const totalRows = rows.length;

    // Kiểm tra bảng trống và hàng thiếu dữ liệu
    const filledRows = rows.filter(r => r.tenHang || r.maHang || r.loai || r.dvt || r.ngay);
    const rowsWithMissingData = rows.filter(r => r.tenHang && r.maHang && r.loai && r.dvt && r.ngay ? false : true);

    if (filledRows.length === 0) {
      setMessage("⚠️ Bảng chưa có dữ liệu!");
      setSuccess(false);
      setShowAlert(true);
      setLoading(false);
      return;
    }

    if (rowsWithMissingData.length > 0) {
      setMessage("⚠️ Một số hàng còn thiếu dữ liệu. Vui lòng nhập đầy đủ các cột!");
      setSuccess(false);
      setShowAlert(true);
      setLoading(false);
      return;
    }

    // Nếu đến đây, tất cả hàng đều có dữ liệu → tiếp tục cập nhật
    for (let i = 0; i < totalRows; i++) {
      const row = rows[i];
      const docId = formatDate(row.ngay);
      if (!docId) continue;

      const docRef = doc(db, "DATA", docId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) continue;

      const data = docSnap.data();
      const matHang = data.matHang || {};
      let isUpdated = false;

      const updatedEntries = Object.entries(matHang).map(([key, item]) => {
        if (item.ten === row.tenHang) {
          isUpdated = true;

          const updatedItem = { ...item, loai: row.loai };

          // Cập nhật DANHMUC
          const danhMucRef = doc(db, "DANHMUC", row.maHang);
          setDoc(danhMucRef, {
            group: row.loai,
            id: row.maHang,
            name: row.tenHang,
            unit: row.dvt || item.dvt || "",
          }, { merge: true });

          if (!danhMuc.some(dm => dm.id === row.maHang)) newMaHangs.push(row.maHang);

          updatedNames.push(`${item.ten} → ${row.loai}`);
          return [key, updatedItem];
        }
        return [key, item];
      });

      if (isUpdated) {
        await setDoc(docRef, {
          ...data,
          matHang: Object.fromEntries(updatedEntries),
          updatedAt: new Date().toISOString(),
        });
      }

      setProgress(Math.round(((i + 1) / totalRows) * 100));
    }

    if (newMaHangs.length > 0) await fetchDanhMuc();

    setLoading(false);

    if (updatedNames.length > 0) {
      setMessage("✅ Đã cập nhật thành công dữ liệu.");
      setSuccess(true);
    } else {
      setMessage("⚠️ Không có dữ liệu được cập nhật!");
      setSuccess(false);
    }

    setShowAlert(true); // hiện Alert
  };



  useEffect(() => {
    if (showAlert) {
      const timer = setTimeout(() => setShowAlert(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showAlert]);


  useEffect(() => {
    if (message) {
      setShowAlert(true);
      const timer = setTimeout(() => setShowAlert(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <Box sx={{ pt: "20px", pb: 6, px: { xs: 1, sm: 2 }, bgcolor: "#e3f2fd", minHeight: "100vh" }}>
      <Box sx={{ width: "100%", maxWidth: "90%", mx: "auto", p: 3, bgcolor: "#fff", borderRadius: 3, boxShadow: 3, overflowX: "auto" }}>
        <Typography variant="subtitle1" fontWeight="bold">TRƯỜNG TIỂU HỌC BÌNH KHÁNH</Typography>
        <Typography variant="h5" align="center" fontWeight="bold" sx={{ color: "#1976d2", pb: 2, mt: 2 }}>PHÂN LOẠI THỰC PHẨM</Typography>

        <Box sx={{ display: "flex", justifyContent: "center", mb: 2, mt: 1 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpdate}
            startIcon={<UpdateIcon />}
          >
            Cập nhật
          </Button>
        </Box>

        <TableContainer component={Paper} sx={{ overflowX: "auto", mt: 4 }}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#1976d2", height: 45 }}>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 50 }}>STT</TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 100 }}>NGÀY</TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 80 }}>MÃ HÀNG</TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", minWidth: 100 }}>TÊN HÀNG</TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 90 }}>ĐVT</TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 90 }}>SỐ LƯỢNG</TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 90 }}>ĐƠN GIÁ</TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 90 }}>THÀNH TIỀN</TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 200 }}>LOẠI THỰC PHẨM</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={index} sx={{ "&:hover": { backgroundColor: "#f5f5f5" } }}>
                  <TableCell align="center">{row.stt}</TableCell>
                  <TableCell align="center">{row.ngay}</TableCell>

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
                      options={[...new Set(danhMuc.map(item => item.unit))]} // lấy danh sách DVT duy nhất từ danh mục
                      value={row.dvt || ""}
                      onChange={(_, newValue) => handleChange(index, "dvt", newValue)}
                      onInputChange={(_, newInputValue) => handleChange(index, "dvt", newInputValue)}
                      renderInput={(params) => <TextField {...params} variant="standard" />}
                    />
                  </TableCell>


                  {/* SỐ LƯỢNG */}
                  <TableCell align="right">
                    <TextField variant="standard" type="number" value={row.sl} onChange={(e) => handleChange(index, "sl", e.target.value)} />
                  </TableCell>

                  {/* ĐƠN GIÁ */}
                  <TableCell align="right">
                    <TextField variant="standard" value={row.donGia} onChange={(e) => handleChange(index, "donGia", e.target.value)} />
                  </TableCell>

                  {/* THÀNH TIỀN */}
                  <TableCell align="right">{row.thanhTien !== 0 ? row.thanhTien : ""}</TableCell>

                  {/* LOẠI THỰC PHẨM */}
                  <TableCell>
                    <Autocomplete
                      freeSolo
                      options={[...new Set(danhMuc.map(item => item.group)), "Loại khác"]}
                      value={row.loai || ""}
                      onChange={(_, newValue) => handleChange(index, "loai", newValue)}
                      onInputChange={(_, newInputValue) => handleChange(index, "loai", newInputValue)}
                      renderInput={(params) => <TextField {...params} variant="standard" />}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: "flex", flexDirection: "column", mt: 3 }}>
          {loading && (
            <Box sx={{ width: "100%", maxWidth: 300, mt: 1, mx: "auto" }}>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 1 }}>
                Đang cập nhật dữ liệu... ({progress}%)
              </Typography>
            </Box>
          )}
          {showAlert && (
            <Box sx={{ width: "100%", mt: 2 }}>
              <Alert severity={success ? "success" : "error"} sx={{ width: "100%", px: 2 }}>
                {message}
              </Alert>
            </Box>
          )}
        </Box>

      </Box>
    </Box>
  );
}
