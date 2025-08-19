import React, { useState, useEffect } from "react";
import {
  Box, Stack, Typography, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  TextField, Paper, MenuItem, Select, IconButton,
  LinearProgress, Alert, Autocomplete
} from "@mui/material";
import { DeleteOutline } from "@mui/icons-material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { vi } from "date-fns/locale";
import { format } from "date-fns";
import { getFirestore } from "firebase/firestore";
import { app } from "../firebase";
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import UpdateIcon from '@mui/icons-material/Update'; // import icon bạn muốn


const db = getFirestore(app);

export default function UpdateData() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const loaiOptions = [
    //"Chọn loại",
    "Rau củ, gia vị",
    "Trái cây + tráng miệng",
    "Trứng",
    "Thịt heo",
    "Thịt bò",
    "Cá",
    "Tôm",
    "Thịt gà",
    "Cua",
    "Nhóm Xuất kho",
    "Loại khác",
  ];

  const loaiMap = {
    "Rau củ, gia vị": "L2",
    "Trái cây + tráng miệng": "L3",
    "Trứng": "L4",
    "Thịt heo": "L5",
    "Thịt bò": "L6",
    "Cá": "L7",
    "Tôm": "L8",
    "Thịt gà": "L9",
    "Cua": "L10",
    "Nhóm Xuất kho": "L1",
    "Loại khác": "L11",
  };

  const dvtOptions = [
    "Kg", "Lít", "Chai", "Can", "Bình",
    "Trái", "Quả", "Củ", "Bó", "Nắm",
    "Cái", "Con", "Vỉ", "Hộp", "Gói", "Túi"
  ];


  const initialRows = Array.from({ length: 8 }, (_, i) => ({
    stt: i + 1,
    tenHang: "",
    dvt: "",
    sl: "",
    donGia: "",
    thanhTien: 0,
    loai: "",
  }));

  const [rows, setRows] = useState(initialRows);

  // trạng thái tiến trình & thông báo
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  // chuẩn hóa ĐVT: chữ cái đầu viết hoa
  const formatDVT = (dvt) => {
    if (!dvt) return "";
    return dvt.charAt(0).toUpperCase() + dvt.slice(1).toLowerCase();
  };

  const handleUpdate = async () => {
  setLoading(true);
  setProgress(0);
  setMessage("");
  setSuccess(false);
  setShowAlert(false);

  const filledRows = rows.filter(
    (r) => r.tenHang || r.dvt || r.sl || r.donGia
  );

  if (filledRows.length === 0) {
    setMessage("⚠️ Bảng chưa có dữ liệu!");
    setSuccess(false);
    setLoading(false);
    setShowAlert(true);
    return;
  }

  for (let r of filledRows) {
    if (r.loai === "Chọn loại" || r.loai === "") {
      setMessage(
        `⚠️ Cần chọn loại thực phẩm cho hàng: ${r.tenHang || "(chưa nhập tên)"}`
      );
      setSuccess(false);
      setLoading(false);
      setShowAlert(true);
      return;
    }
  }

  const docId = format(selectedDate, "yyyy-MM-dd");
  const matHangData = filledRows.map((r) => ({
    ten: r.tenHang,
    dvt: formatDVT(r.dvt), // ✅ chuẩn hóa ĐVT
    soLuong: parseFloat(r.sl) || 0,
    donGia: parseFloat(r.donGia) || 0,
    thanhTien: r.thanhTien,
    loai: loaiMap[r.loai] || r.loai,
  }));

  try {
    // ✅ giả lập tiến trình
    for (let i = 0; i < matHangData.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setProgress(Math.round(((i + 1) / matHangData.length) * 100));
    }

    const docRef = doc(db, "DATA", docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      // ✅ nếu document ngày đã có → nối thêm vào mảng matHang
      const data = docSnap.data();
      const oldMatHang = data.matHang || [];

      const newMatHang = [...oldMatHang, ...matHangData];

      await updateDoc(docRef, {
        matHang: newMatHang,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // ✅ nếu chưa có thì tạo mới
      await setDoc(docRef, {
        matHang: matHangData,
        updatedAt: new Date().toISOString(),
      });
    }

    // ✅ đồng bộ KEYWORD_RULES
    for (let item of matHangData) {
      const loaiCode = item.loai; // ví dụ: L1, L2
      if (!loaiCode) continue;

      const keywordRef = doc(db, "KEYWORD_RULES", loaiCode);
      const keywordSnap = await getDoc(keywordRef);

      if (keywordSnap.exists()) {
        const data = keywordSnap.data();
        const keywords = data.keywords || [];

        if (!keywords.includes(item.ten)) {
          await updateDoc(keywordRef, {
            keywords: arrayUnion(item.ten),
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        await setDoc(keywordRef, {
          keywords: [item.ten],
          updatedAt: new Date().toISOString(),
        });
      }
    }

    setMessage("✅ Cập nhật dữ liệu thành công!");
    setSuccess(true);
  } catch (err) {
    console.error("Lỗi khi cập nhật:", err);
    setMessage("❌ Có lỗi xảy ra khi cập nhật dữ liệu!");
    setSuccess(false);
  } finally {
    setLoading(false);
    setShowAlert(true);
  }
};


  const handleChange = (index, field, value) => {
    const newRows = [...rows];
    newRows[index][field] = value;

    if (field === "sl" || field === "donGia") {
      const slNum = parseFloat(newRows[index].sl) || 0;
      const donGiaNum = parseFloat(newRows[index].donGia) || 0;
      newRows[index].thanhTien = slNum * donGiaNum;
    }

    setRows(newRows);
  };

    // ẩn thông báo sau 5s
    useEffect(() => {
      if (showAlert) {
        const timer = setTimeout(() => {
          setShowAlert(false);
        }, 5000); // 5000ms = 5 giây
        return () => clearTimeout(timer);
      }
    }, [showAlert]);

  return (
    <Box sx={{ pt: "20px", pb: 6, px: { xs: 1, sm: 2 }, bgcolor: "#e3f2fd", minHeight: "100vh" }}>
      <Box sx={{ width: "100%", maxWidth: "75%", mx: "auto", p: 3, bgcolor: "#fff", borderRadius: 3, boxShadow: 3, overflowX: "auto" }}>
        <Typography variant="subtitle1" fontWeight="bold">TRƯỜNG TIỂU HỌC BÌNH KHÁNH</Typography>
        <Typography variant="h5" align="center" fontWeight="bold" sx={{ color: "#1976d2", pb: 2, mt: 2 }}>
          CẬP NHẬT DỮ LIỆU THỰC PHẨM
        </Typography>

        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ my: 1 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
            <DatePicker
              label="Chọn ngày"
              value={selectedDate}
              onChange={(newValue) => setSelectedDate(newValue)}
              slotProps={{
                textField: {
                  size: "small",
                  sx: { width: 150, "& input": { textAlign: "center", fontSize: "0.80rem" }, "& .MuiOutlinedInput-notchedOutline": { border: "none" } },
                },
              }}
            />
          </LocalizationProvider>

          <Button
            variant="contained"
            color="primary"
            onClick={handleUpdate}
            startIcon={<UpdateIcon />} // thêm icon vào đây
            sx={{ 
              height: 33, 
              px: 2.5, 
              fontWeight: 'bold', 
              fontSize: '0.80rem',
              whiteSpace: 'nowrap' // giữ chữ liền dòng
            }}
          >
            Cập nhật
          </Button>
        </Stack>

        <TableContainer component={Paper} sx={{ overflowX: "auto", mt: 3 }}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#1976d2", height: 45 }}> {/* tăng chiều cao tại đây */}
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 50 }}>STT</TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", minWidth: 100 }}>TÊN HÀNG</TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 90 }}>ĐVT</TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 90 }}>SỐ LƯỢNG</TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 90 }}>ĐƠN GIÁ</TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 90 }}>THÀNH TIỀN</TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 150 }}>LOẠI THỰC PHẨM</TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 50 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow
                  key={index}
                  sx={{
                    "&:hover": {
                      backgroundColor: "#f5f5f5",
                      "& .delete-btn": { visibility: "visible" }, // ✅ hiện nút xoá khi hover
                    },
                  }}
                >
                  <TableCell align="center">{row.stt}</TableCell>
                  <TableCell sx={{ minWidth: 200 }}>
                    <TextField
                      variant="standard"
                      value={row.tenHang}
                      onChange={(e) => handleChange(index, "tenHang", e.target.value)}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <Autocomplete
                      freeSolo
                      options={dvtOptions}
                      value={row.dvt || ""}
                      onChange={(_, newValue) => handleChange(index, "dvt", newValue)}
                      onInputChange={(_, newInputValue) => handleChange(index, "dvt", newInputValue)}
                      renderInput={(params) => (
                        <TextField {...params} variant="standard" fullWidth />
                      )}
                    />
                  </TableCell>

                  <TableCell>
                    <TextField
                      variant="standard"
                      type="number"
                      value={row.sl}
                      onChange={(e) => handleChange(index, "sl", e.target.value)}
                      sx={{ textAlign: "right", "& input": { textAlign: "right" } }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      variant="standard"
                      value={row.donGia ? Number(row.donGia).toLocaleString() : ""}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/,/g, ""); // bỏ dấu phẩy khi nhập
                        handleChange(index, "donGia", raw);
                      }}
                      sx={{ textAlign: "right", "& input": { textAlign: "right" } }}
                    />
                  </TableCell>

                  <TableCell align="right">
                    {row.thanhTien !== 0 ? row.thanhTien.toLocaleString() : ""}
                  </TableCell>
                  <TableCell>
                    <Select
                      variant="standard"
                      value={row.loai}
                      onChange={(e) => handleChange(index, "loai", e.target.value)}
                      fullWidth
                    >
                      {loaiOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => {
                        const newRows = [...rows];
                        newRows[index] = {
                          stt: newRows[index].stt,
                          tenHang: "",
                          dvt: "",
                          sl: "",
                          donGia: "",
                          thanhTien: 0,
                          loai: "Chọn loại",
                        };
                        setRows(newRows);
                      }}
                      sx={{ visibility: "hidden", "&:hover": { color: "red" } }}
                      className="delete-btn" // ✅ dùng class để điều khiển hover
                    >
                      <DeleteOutline />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>

          </Table>
        </TableContainer>

        {/* Thanh tiến trình + Thông báo */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 3 }}>
          {loading && (
            <Box sx={{ width: "100%", maxWidth: 300, mt: 1 }}>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 1 }}>
                Đang cập nhật dữ liệu... ({progress}%)
              </Typography>
            </Box>
          )}

          {showAlert && (
            <Box sx={{ display: "inline-block", mt: 0 }}>
              <Alert severity={success ? "success" : "error"} sx={{ px: 2 }}>
                {message}
              </Alert>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
