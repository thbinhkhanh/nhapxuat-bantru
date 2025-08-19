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
  MenuItem,
  Select,
  Button,
  LinearProgress,
  Alert,
} from "@mui/material";
import { useUpdateType } from "../context/UpdateTypeContext";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { arrayUnion } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import UpdateIcon from '@mui/icons-material/Update';

export default function UpdateType() {
  const { unmatchedItems } = useUpdateType();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  //const [showBackButton, setShowBackButton] = useState(false);
  const navigate = useNavigate();

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
              tenHang: item.ten?.trim() || "",
              dvt: item.dvt || "",
              sl: item.soLuong || "",
              donGia: item.donGia || "",
              thanhTien: item.thanhTien || 0,
              loai: "",
            }
          : {
              stt: i + 1,
              ngay: "",
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

  const handleLoaiChange = (index, value) => {
    const newRows = [...rows];
    newRows[index] = {
      ...newRows[index],
      loai: value,
    };
    setRows(newRows);
  };

  const formatDate = (dateStr) => {
    const [day, month, year] = dateStr.split("/");
    return `${year}-${month.toString().padStart(2, "0")}-${day
      .toString()
      .padStart(2, "0")}`;
  };

  const handleUpdate = async () => {
    setLoading(true);
    setProgress(0);
    setMessage("");
    setSuccess(false);

    const updatedNames = [];
    const totalRows = rows.length;

    for (let i = 0; i < totalRows; i++) {
      const row = rows[i];

      if (!row.tenHang) continue;

      if (!row.loai) {
        setMessage(`⚠️ Vui lòng chọn loại thực phẩm cho mặt hàng "${row.tenHang}"`);
        setSuccess(false);
        setLoading(false);
        return;
      }

      const docId = formatDate(row.ngay);
      const docRef = doc(db, "DATA", docId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) continue;

      const data = docSnap.data();
      const matHang = data.matHang || {};
      let isUpdated = false;

      const updatedEntries = Object.entries(matHang).map(([key, item]) => {
        if (item.ten === row.tenHang) {
          const newLoai = loaiMap[row.loai];
          if (newLoai) {
            updatedNames.push(`${item.ten} → ${newLoai}`);
            isUpdated = true;
            return [key, { ...item, loai: newLoai }];
          }
        }
        return [key, item];
      });

      if (isUpdated) {
        await setDoc(docRef, {
          ...data,
          matHang: Object.fromEntries(updatedEntries),
          updatedAt: new Date().toISOString(),
        });

        // ✅ Cập nhật KEYWORD_RULES kèm log kiểm tra
        const maHang = loaiMap[row.loai];
        const tenHang = row.tenHang;

        if (maHang && tenHang) {
          //console.log("🔎 Kiểm tra maHang và tenHang:", maHang, tenHang);

          const keywordRef = doc(db, "KEYWORD_RULES", maHang);
          const keywordSnap = await getDoc(keywordRef);

          if (keywordSnap.exists()) {
            //console.log(`✅ Tìm thấy mã hàng (loại): ${maHang}`);
          } else {
            //console.log(`❌ Không tìm thấy mã hàng (loại): ${maHang}`);
          }

          await setDoc(
            keywordRef,
            {
              keywords: arrayUnion(tenHang),
              updatedAt: new Date(),
            },
            { merge: true }
          );

          //console.log(`📌 Đã thêm từ khóa "${tenHang}" vào KEYWORD_RULES/${maHang}`);
        }
      }

      setProgress(Math.round(((i + 1) / totalRows) * 100));
    }

    setLoading(false);

    if (updatedNames.length) {
      setMessage("✅ Đã cập nhật thành công dữ liệu.");
      setSuccess(true);
    } else {
      setMessage("⚠️ Bảng chưa có dữ liệu!");
      setSuccess(false);
    }
  };

  useEffect(() => {
    if (message) {
      //setShowBackButton(false); // ẩn nút lúc đầu
      setShowAlert(true);
      //setShowBackButton(false);

      const timer = setTimeout(() => {
        setShowAlert(false);
        //setShowBackButton(true);
      }, 5000); // 5 giây

      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <Box sx={{ pt: "20px", pb: 6, px: { xs: 1, sm: 2 }, bgcolor: "#e3f2fd", minHeight: "100vh" }}>
      <Box
        sx={{
          width: "100%",
          maxWidth: "75%",
          mx: "auto",
          p: 3,
          bgcolor: "#fff",
          borderRadius: 3,
          boxShadow: 3,
          overflowX: "auto",
        }}
      >
        <Typography variant="subtitle1" fontWeight="bold">
          TRƯỜNG TIỂU HỌC BÌNH KHÁNH
        </Typography>
        <Typography
          variant="h5"
          align="center"
          fontWeight="bold"
          sx={{ color: "#1976d2", pb: 2, mt: 2 }}
        >
          CẬP NHẬT LOẠI THỰC PHẨM
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "center", mb: 2, mt: 1 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpdate}
            startIcon={<UpdateIcon />}
            sx={{ 
              height: 33, 
              px: 2.5, 
              fontWeight: "bold", 
              fontSize: "0.80rem",
              whiteSpace: "nowrap" // chữ không xuống hàng
            }}
          >
            Cập nhật
          </Button>
        </Box>

        <TableContainer component={Paper} sx={{ overflowX: "auto", mt: 4 }}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#1976d2", height: 45 }}> {/* tăng chiều cao tại đây */}
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 50 }}>
                  STT
                </TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 100 }}>
                  NGÀY
                </TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", minWidth: 100 }}>
                  TÊN HÀNG
                </TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 90 }}>
                  ĐVT
                </TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 90 }}>
                  SỐ LƯỢNG
                </TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 90 }}>
                  ĐƠN GIÁ
                </TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 90 }}>
                  THÀNH TIỀN
                </TableCell>
                <TableCell align="center" sx={{ color: "#fff", fontWeight: "bold", width: 150 }}>
                  LOẠI THỰC PHẨM
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row, index) => (
                <TableRow
                  key={index}
                  sx={{ "&:hover": { backgroundColor: "#f5f5f5" } }}
                >
                  <TableCell align="center">{row.stt}</TableCell>
                  <TableCell align="center">{row.ngay}</TableCell>
                  <TableCell>{row.tenHang}</TableCell>
                  <TableCell align="center">{row.dvt}</TableCell>
                  <TableCell align="right">{row.sl}</TableCell>
                  <TableCell align="right">{row.donGia}</TableCell>
                  <TableCell align="right">
                    {row.thanhTien !== 0 ? row.thanhTien : ""}
                  </TableCell>
                  <TableCell>
                    <Select
                      variant="standard"
                      value={row.loai}
                      onChange={(e) => handleLoaiChange(index, e.target.value)}
                      fullWidth
                      displayEmpty   // ✅ cho phép giá trị rỗng hiển thị
                    >
                      {loaiOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>

          </Table>
        </TableContainer>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 3 }}>
          {loading && (
            <Box sx={{ width: "100%", maxWidth: 300, mt: 1 }}>
              <LinearProgress variant="determinate" value={progress} />
              <Typography
                variant="caption"
                color="text.secondary"
                align="center"
                sx={{ mt: 1 }}
              >
                Đang cập nhật dữ liệu... ({progress}%)
              </Typography>
            </Box>
          )}

          {showAlert && (
            <Box sx={{ display: "inline-block", mt: 0 }}>
              <Alert
                severity={success ? "success" : loading ? "info" : "error"}
                sx={{ px: 2 }}
              >
                {message}
              </Alert>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}