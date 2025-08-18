import React, { useState, useEffect } from "react";
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Card, CardContent, Stack, Button, TextField, Divider
} from "@mui/material";

import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import viLocale from "date-fns/locale/vi";

import { numberToVietnameseText } from "../utils/numberToText";
import { getStoredDate, setStoredDate } from "../utils/dateStorage";
import { useDataContext, useSaveDataToContext } from "../context/DataContext"; // ✅ context
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { format } from "date-fns";
import LinearProgress from "@mui/material/LinearProgress";

export default function PhieuXuat() {
  // Context
  const { dataByDate } = useDataContext();
  const saveDataToContext = useSaveDataToContext();

  // Local state (các state phiếu)
  const [selectedDate, setSelectedDate] = useState(getStoredDate());
  const [rows, setRows] = useState([]);

  // 👉 loading chỉ dùng cho fetch nếu cần
  const [loading, setLoading] = useState(false);

  // 👉 loadingSave dùng riêng cho tiến trình khi lưu
  const [loadingSave, setLoadingSave] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  // const [showAlert, setShowAlert] = useState(false);

  const [soPhieu, setSoPhieu] = useState("02/01");
  const [nguoiNhan, setNguoiNhan] = useState("Đặng Thị Tuyết Nga");
  const [lyDoXuat, setLyDoXuat] = useState("Chế biến thực phẩm cho trẻ");
  const [xuatTaiKho, setXuatTaiKho] = useState("Tiểu học Bình Khánh");
  const [soLuongHocSinh, setSoLuongHocSinh] = useState(250);

  const [thuKho, setThuKho] = useState("Nguyễn Văn Tám");
  const [keToan, setKeToan] = useState("Lê Thị Thu Hương");
  const [hieuTruong, setHieuTruong] = useState("Đặng Thái Bình");

  const inputWidth = 200;

  const nguoiKy = [
    { label: "Người nhận hàng", value: nguoiNhan, setter: setNguoiNhan },
    { label: "Thủ kho", value: thuKho, setter: setThuKho },
    { label: "Kế toán", value: keToan, setter: setKeToan },
    { label: "Thủ trưởng đơn vị", value: hieuTruong, setter: setHieuTruong },
  ];

  const textFieldStyle = {
    width: 250, // hoặc "120px"
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
    setSoLuongHocSinh(250);
    setThuKho("Nguyễn Văn Tám");
    setKeToan("Lê Thị Thu Hương");
    setHieuTruong("Đặng Thái Bình");
  };

  // Hàm fetchRows dùng context
  const fetchData = async (date) => {
    setLoading(true);
    try {
      const dateStr = date.toISOString().split("T")[0];

      const { db } = await import("../firebase");
      const { doc, getDoc } = await import("firebase/firestore");

      // 🔹 Fetch DATA
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
          thucXuat: item.soLuong,
          donGia: item.donGia,
          thanhTien: item.thanhTien,
        }));

        setRows(formattedRows);
        saveDataToContext(date, { ...docData, phieuXuat: formattedRows });
      } else {
        setRows([]);
        saveDataToContext(date, { phieuXuat: [] });
      }

      // 🔹 Fetch INFO
      const infoRef = doc(db, "INFO", dateStr);
      const infoSnap = await getDoc(infoRef);

      if (infoSnap.exists()) {
        const infoData = infoSnap.data();
        console.log("✅ INFO data:", infoData); // kiểm tra

        setSoPhieu(infoData.soPhieu || "02/01");
        setNguoiNhan(infoData.nguoiNhan || "Đặng Thị Tuyết Nga");
        setLyDoXuat(infoData.lyDo || "Chế biến thực phẩm cho trẻ");
        setXuatTaiKho(infoData.xuatTai || "Tiểu học Bình Khánh");
        setSoLuongHocSinh(infoData.suatAn || 250);
        setThuKho(infoData.thuKho || "Nguyễn Văn Tám");
        setKeToan(infoData.keToan || "Lê Thị Thu Hương");
        setHieuTruong(infoData.hieuTruong || "Đặng Thái Bình");
      } else {
        console.warn("⚠️ Không tìm thấy INFO cho ngày:", dateStr);
        resetInfoToDefault(); // ✅ Thêm dòng này là xong!
      }
    } catch (err) {
      console.error("[PhieuXuat] Lỗi khi fetch dữ liệu:", err);
      setRows([]);
    }
    setLoading(false);
  };

  // Auto fetch khi selectedDate thay đổi
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
    newRows[index].thucXuat = Number(value);
    setRows(newRows);
    saveDataToContext(selectedDate, newRows); // cập nhật context
  };

  // Hàm xử lý khi bấm Cập nhật
  const handleSaveInfo = async () => {
    setLoadingSave(true);       // Bắt đầu hiển thị tiến trình
    setSuccess(false);
    setProgress(0);
    setMessage("");

    try {
      // Giả lập tiến trình cập nhật (tăng dần từ 0 đến 100)
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((r) => setTimeout(r, 80)); // chờ 80ms mỗi bước
        setProgress(i);
      }

      const docId = format(selectedDate, "yyyy-MM-dd");
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

      setMessage("✅ Đã lưu thông tin học sinh thành công!");
      setSuccess(true);
    } catch (err) {
      console.error("Lỗi khi lưu HOCSINH:", err);
      setMessage("❌ Lỗi khi lưu dữ liệu!");
      setSuccess(false);
    } finally {
      setLoadingSave(false); // Ẩn tiến trình sau khi hoàn tất
    }
  };

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

            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveInfo} // ✅ lưu vào Firestore
              sx={{
                height: 33,
                px: 2.5,
                fontWeight: 'bold',
                fontSize: '0.80rem'
              }}
            >
              Cập nhật
            </Button>
          </Stack>
          
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 3 }}>
            {loadingSave && (
              <Box sx={{ width: "100%", maxWidth: 300, mt: 1, textAlign: "center" }}>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: 3, // 👈 giảm độ cao xuống 3px
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
                value={selectedDate.toLocaleDateString("vi-VN")}
                variant="standard"
                sx={textFieldStyle}
              />

              <Typography component="span">Số: </Typography>
              <TextField
                size="small"
                value={soPhieu}
                onChange={(e) => setSoPhieu(e.target.value)}
                variant="standard"
                sx={textFieldStyle}
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
              <TextField
                size="small"
                type="number"
                value={soLuongHocSinh}
                onChange={(e) => setSoLuongHocSinh(Number(e.target.value))}
                variant="standard"
                sx={{
                  ...textFieldStyle,
                  "& .MuiInputBase-root": {
                    ...textFieldStyle["& .MuiInputBase-root"],
                    color: "red",
                  },
                }}
              />
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
                {rows.map((row, index) => (
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
                          const newRows = [...rows];
                          newRows[index].thucXuat = Number(e.target.value);
                          setRows(newRows);
                        }}
                        inputProps={{ min: 0, style: { textAlign: 'center', padding: '4px 8px', fontSize: '0.85rem' } }}
                        sx={{ width: 150 }}
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
          <Box sx={{ mt: 5 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                textAlign: "center",
                gap: 2,
              }}
            >
              <Typography fontWeight="bold">Người nhận hàng</Typography>
              <Typography fontWeight="bold">Thủ kho</Typography>
              <Typography fontWeight="bold">Kế toán</Typography>
              <Typography fontWeight="bold">Thủ trưởng đơn vị</Typography>
            </Box>

            <Divider sx={{ my: 6, opacity: 0 }} />

            {/* Ô nhập tên người ký */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                textAlign: "center",
                gap: 2,
              }}
            >
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
