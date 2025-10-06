import React, { useState, useEffect } from "react";
import {
  Box, Stack, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Card, CardContent, Divider, Button, TextField,
  LinearProgress, Tooltip, IconButton
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { vi } from "date-fns/locale";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { format } from "date-fns";
import { useDataContext, useSaveDataToContext, useGetDataByDate } from "../context/DataContext";
import { useDanhMuc } from "../context/DanhMucContext"; // thêm import
import { useContext } from "react";
import { useInfo } from "../context/InfoContext";

import UpdateIcon from "@mui/icons-material/Update";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { exportPhieuTienAn } from "../utils/exportPhieuTienAn";
import { getStoredDate, setStoredDate } from "../utils/dateStorage";
import { useNavigate } from "react-router-dom";

export default function TienAn() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getStoredDate());
  const { dataByDate } = useDataContext();
  const saveDataToContext = useSaveDataToContext();
  const [loading, setLoading] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const { danhMuc, setDanhMuc, fetchDanhMuc } = useDanhMuc();
  const { infoByDate, saveInfoToContext } = useInfo();



  // ✅ Lấy dữ liệu từ context
  const contextData = useGetDataByDate(selectedDate);

  const headCell = {
    backgroundColor: "#1976d2 !important",
    color: "#fff !important",
    fontWeight: 700,
    textTransform: "uppercase",
    fontSize: 13,
    py: 1.2,
    borderRight: "1px solid rgba(255,255,255,0.2)",
  };

  // Đồng bộ dateAcrossTabs
  useEffect(() => {
    const syncDateAcrossTabs = (e) => {
      if (e.key === "selectedDate") setSelectedDate(getStoredDate());
    };
    window.addEventListener("storage", syncDateAcrossTabs);
    return () => window.removeEventListener("storage", syncDateAcrossTabs);
  }, []);

  useEffect(() => {
    if (selectedDate) setStoredDate(selectedDate);
  }, [selectedDate]);

  // Hàm normalize
  const normalize = (str) =>
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Fetch data
const fetchData = async () => {
  if (!selectedDate) return;
  setLoading(true);
  setProgress(0);

  const dateStr = selectedDate.toISOString().split("T")[0];

  try {
    let matHang = [];
    let danhMucMap = {};
    let suatAn = 0;
    let chenhLechDauNgay = 0;

    // ✅ Lấy danh mục từ context useDanhMuc hoặc Firestore
    if (danhMuc && danhMuc.length > 0) {
      //console.log("✅ Sử dụng danh mục từ context");
      danhMuc.forEach(dm => {
        danhMucMap[dm.id] = dm.group || "Loại khác";
      });
    } else {
      //console.log("🌐 Fetch danh mục từ Firestore");
      const danhMucSnap = await getDocs(collection(db, "DANHMUC"));
      const fetchedDanhMuc = danhMucSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (fetchedDanhMuc.length > 0) {
        //console.log(`✅ Cập nhật ${fetchedDanhMuc.length} danh mục vào context`);
        fetchedDanhMuc.forEach(dm => {
          danhMucMap[dm.id] = dm.group || "Loại khác";
        });
        setDanhMuc(fetchedDanhMuc); // ✅ lưu vào context
      } else {
        console.warn("⚠️ Không có danh mục nào được tìm thấy trong Firestore");
      }
    }

    // ✅ Ưu tiên lấy data từ DataContext nếu có
    if (contextData?.matHang && contextData?.danhMucMap) {
      matHang = contextData.matHang;
      danhMucMap = contextData.danhMucMap;
      suatAn = contextData.suatAn || 0;
      chenhLechDauNgay = contextData.chenhLechDauNgay || 0;
      setProgress(70);
    } else {
      // Lấy suatAn từ InfoContext nếu có
      const infoData = infoByDate?.[dateStr];
      if (infoData?.suatAn !== undefined) {
        suatAn = infoData.suatAn;
      } else {
        const infoSnap = await getDoc(doc(db, "INFO", dateStr));
        if (infoSnap.exists()) {
          suatAn = infoSnap.data().suatAn || 0;
          saveInfoToContext(selectedDate, infoSnap.data());
        }
      }
      setProgress(20);

      // Fetch CHENHLECH
      const chenhSnap = await getDoc(doc(db, "CHENHLECH", dateStr));
      if (chenhSnap.exists()) chenhLechDauNgay = chenhSnap.data().chenhLechDauNgay || 0;
      setProgress(40);

      // Fetch DATA
      const dataSnap = await getDoc(doc(db, "DATA", dateStr));
      if (dataSnap.exists()) matHang = dataSnap.data().matHang || [];
      setProgress(60);

      saveDataToContext(selectedDate, { matHang, danhMucMap, suatAn, chenhLechDauNgay });
      setProgress(70);
    }

    // ✅ Build tableData (giữ nguyên)
    const keywordsXuatKho = ["đường biên hòa", "gạo", "dầu tường an", "hạt nêm", "nước mắm"];
    const tableData = [];
    let sttCounter = 1;

    tableData.push({ stt: sttCounter++, dienGiai: "Chênh lệch đầu ngày", isLoaiRow: true, thanhTien: chenhLechDauNgay });
    tableData.push({ stt: sttCounter++, dienGiai: "Xuất ăn và tiêu chuẩn trong ngày", isLoaiRow: true, soLuong: suatAn, thanhTien: suatAn * 27000 });
    tableData.push({ stt: sttCounter++, dienGiai: "Được chi trong ngày", isLoaiRow: true, thanhTien: suatAn * 27000 });

    const tongChiHang = matHang.reduce((acc, m) => acc + (m.thanhTien || 0), 0);
    tableData.push({ stt: sttCounter++, dienGiai: "Đã chi trong ngày", isLoaiRow: true, thanhTien: tongChiHang });

    const xuatKhoItems = matHang.filter(m => keywordsXuatKho.some(k => normalize(m.ten).includes(normalize(k))));
    if (xuatKhoItems.length > 0) {
      const xuatKhoTotal = xuatKhoItems.reduce((acc, m) => acc + (m.thanhTien || 0), 0);
      tableData.push({ stt: "", dienGiai: "Xuất kho", isLoaiRow: true, thanhTien: xuatKhoTotal });
      xuatKhoItems.forEach(m => tableData.push({ stt: "", dienGiai: m.ten, dvt: m.dvt, soLuong: m.soLuong, donGia: m.donGia, thanhTien: m.thanhTien, isLoaiRow: false }));
    }

    const chiChoItems = matHang.filter(m => !xuatKhoItems.includes(m));
    if (chiChoItems.length > 0) {
      const chiChoGroups = {};
      chiChoItems.forEach(m => {
        const group = danhMucMap[m.maSP] || "Loại khác";
        if (!chiChoGroups[group]) chiChoGroups[group] = [];
        chiChoGroups[group].push(m);
      });

      const chiChoTotal = chiChoItems.reduce((acc, m) => acc + (m.thanhTien || 0), 0);
      tableData.push({ stt: "", dienGiai: "Chi chợ", isLoaiRow: true, thanhTien: chiChoTotal });

      Object.keys(chiChoGroups).forEach(groupName => {
        const items = chiChoGroups[groupName];
        const groupTotal = items.reduce((acc, m) => acc + (m.thanhTien || 0), 0);
        tableData.push({ stt: "", dienGiai: groupName, isLoaiRow: true, thanhTien: groupTotal });

        items.forEach(m => tableData.push({ stt: "", dienGiai: m.ten, dvt: m.dvt, soLuong: m.soLuong, donGia: m.donGia, thanhTien: m.thanhTien, isLoaiRow: false }));
      });
    }

    tableData.push({ stt: sttCounter, dienGiai: "Chênh lệch cuối ngày", isLoaiRow: true, thanhTien: -tongChiHang });

    setData(tableData);
    saveDataToContext(selectedDate, { tienAn: tableData });
    setProgress(100);
  } catch (err) {
    console.error("❌ Lỗi fetchData:", err);
    setProgress(100);
  } finally {
    setLoading(false);
  }
};






  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const handleUpdateChenhLech = async () => {
    if (!selectedDate) return;
    setLoadingSave(true);
    setMessage("");
    setSuccess(false);
    setProgress(0);

    try {
      const docId = format(selectedDate, "yyyy-MM-dd");
      const chenhlechDau = data.find(item => item.dienGiai === "Chênh lệch đầu ngày")?.thanhTien || 0;
      await setDoc(doc(db, "CHENHLECH", docId), {
        chenhLechDauNgay: chenhlechDau,
        updatedAt: new Date().toISOString(),
      });
      setMessage("✅ Cập nhật thành công!");
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setMessage("❌ Lỗi khi cập nhật dữ liệu!");
      setSuccess(false);
    } finally {
      setLoadingSave(false);
    }
  };

  const goToOtherPage = () => {
    navigate("/other-page"); // <-- thay đường dẫn bạn muốn
  };
  
  return (
    <Box sx={{ pt: "20px", pb: 6, px: { xs: 1, sm: 2 }, bgcolor: "#e3f2fd", minHeight: "100vh" }}>
      <Card elevation={8} sx={{ maxWidth: 1100, mx: "auto", borderRadius: 3, overflow: "hidden" }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="subtitle1" fontWeight="bold">TRƯỜNG TIỂU HỌC BÌNH KHÁNH</Typography>
          <Typography variant="h5" align="center" fontWeight="bold" sx={{ color: "#1976d2", pb: 1, mt: 2 }}>
            BẢNG TÍNH TIỀN ĂN
          </Typography>
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            justifyContent="center"
            sx={{ my: 2 }}
          >
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
              <DatePicker
                label="Chọn ngày"
                value={selectedDate}
                onChange={(newValue) => {
                  setSelectedDate(newValue);       // cập nhật ngày
                  fetchData(newValue);             // ✅ fetch dữ liệu ngay khi chọn ngày
                }}
                slotProps={{
                  textField: {
                    size: "small",
                    sx: {
                      width: 150,
                      "& input": {
                        textAlign: "center",
                        fontFamily: "Arial, sans-serif",
                        fontSize: "0.80rem"
                      },
                      "& .MuiOutlinedInput-notchedOutline": {
                        border: "none"
                      },
                      "& .MuiInputBase-root": {
                        height: 33
                      }
                    },
                  },
                }}
              />
            </LocalizationProvider>

            <Box display="flex" alignItems="center" gap={1} mt={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpdateChenhLech} // ✅ lưu vào Firestore
                startIcon={<UpdateIcon />}       // ✅ icon cập nhật
                sx={{
                  height: 36,
                  px: 2.5,
                  fontWeight: "bold",
                  fontSize: "0.80rem",
                  whiteSpace: "nowrap",
                }}
              >
                Cập nhật
              </Button>

              <Tooltip title="Xuất Excel">
                <IconButton
                  color="success"
                  sx={{ height: 36 }} // ✅ đồng bộ chiều cao với nút cập nhật
                  onClick={async () => {
                    // Kiểm tra thiết bị di động
                    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
                    if (isMobile) {
                      alert("Chức năng xuất Excel không khả dụng trên điện thoại. Vui lòng sử dụng máy tính để xuất file.");
                      return;
                    }
                    //console.log("rows:", data); // ✅ log đúng biến
                    await exportPhieuTienAn({
                      selectedDate,
                      rows: data, // ✅ truyền đúng tên prop như hàm gốc
                    });
                  }}
                >
                  <FileDownloadIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Stack>

          {/* Thanh tiến trình */}
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
                mb: 2,          // ✅ thêm khoảng cách dưới cả khối
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

          {/* PHẦN BẢNG */}
          <TableContainer component={Paper} sx={{ mt: 0, borderRadius: 2, boxShadow: 3 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ minHeight: 35 }}>
                  <TableCell align="center" sx={{ ...headCell, whiteSpace: "nowrap" }}>STT</TableCell>
                  <TableCell align="center" sx={{ ...headCell, whiteSpace: "nowrap" }}>Nội dung</TableCell>
                  <TableCell align="center" sx={{ ...headCell, whiteSpace: "nowrap" }}>ĐVT</TableCell>
                  <TableCell align="center" sx={{ ...headCell, whiteSpace: "nowrap" }}>Số lượng</TableCell>
                  <TableCell align="center" sx={{ ...headCell, whiteSpace: "nowrap" }}>Đơn giá</TableCell>
                  <TableCell align="center" sx={{ ...headCell, borderRight: 0, whiteSpace: "nowrap" }}>Thành tiền</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">Không có dữ liệu</TableCell>
                  </TableRow>
                ) : (
                  data.map((item, index) => {
                    const isSpecialRow =
                      ["Chênh lệch đầu ngày", "Xuất ăn và tiêu chuẩn trong ngày", "Được chi trong ngày", "Đã chi trong ngày", "Xuất kho", "Chi chợ", "Chênh lệch cuối ngày"]
                        .includes(item.dienGiai);

                    return (
                      <TableRow
                        key={index}
                        hover
                        sx={{
                          minHeight: 35,
                          backgroundColor:
                            (item.dienGiai === "Xuất kho" || item.dienGiai === "Chi chợ")
                              ? "#ffe0b2"
                              : item.isLoaiRow
                              ? "#f5f5f5"
                              : undefined,
                        }}
                      >
                        <TableCell
                          align="center"
                          sx={{
                            py: 0.5,
                            px: 1,
                            fontWeight: item.isLoaiRow ? "bold" : "normal",
                            color: isSpecialRow ? "#1976d2" : undefined,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.stt}
                        </TableCell>

                        {/* Cột NỘI DUNG – không xuống dòng, rút gọn, hiển thị tooltip khi hover */}
                        <TableCell
                          sx={{
                            py: 0.5,
                            px: 1,
                            fontWeight: item.isLoaiRow ? "bold" : "normal",
                            color: isSpecialRow ? "#1976d2" : undefined,
                            fontSize: "0.85rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 250,
                            "@media (max-width:600px)": { maxWidth: 150 },
                          }}
                          title={item.dienGiai}
                        >
                          {item.dienGiai}
                        </TableCell>

                        <TableCell
                          align="center"
                          sx={{
                            py: 0.5,
                            px: 1,
                            fontWeight: item.isLoaiRow ? "bold" : "normal",
                            color: isSpecialRow ? "#1976d2" : undefined,
                            fontSize: "0.85rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.dvt || ""}
                        </TableCell>

                        <TableCell align="center" sx={{ py: 0.5, px: 1, whiteSpace: "nowrap" }}>
                          {item.dienGiai === "Xuất ăn và tiêu chuẩn trong ngày" ? (
                            <TextField
                              size="small"
                              type="number"
                              value={item.soLuong || ""}
                              InputProps={{
                                readOnly: true,
                                disableUnderline: true,
                              }}
                              inputProps={{
                                style: {
                                  textAlign: "center",
                                  padding: "0 8px",
                                  fontSize: "0.85rem",
                                  height: 23,
                                  fontWeight: "bold",
                                  color: "#1976d2",
                                  border: "none",
                                  backgroundColor: "transparent",
                                },
                              }}
                              variant="standard"
                              sx={{ width: 100 }}
                            />
                          ) : (
                            item.soLuong || ""
                          )}
                        </TableCell>

                        <TableCell align="right" sx={{ py: 0.5, px: 1, fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                          {item.donGia ? item.donGia.toLocaleString() : ""}
                        </TableCell>

                        <TableCell
                          align="right"
                          sx={{
                            py: 0.5,
                            px: 1,
                            fontWeight: item.isLoaiRow ? "bold" : "normal",
                            fontSize: "0.85rem",
                            color: isSpecialRow ? "#1976d2" : undefined,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.dienGiai === "Chênh lệch đầu ngày" ? (
                            <TextField
                              size="small"
                              type="text"
                              value={
                                item.thanhTien !== undefined && item.thanhTien !== null && item.thanhTien !== ""
                                  ? item.thanhTien.toLocaleString()
                                  : ""
                              }
                              onChange={(e) => {
                                const rawValue = e.target.value.replace(/,/g, "");
                                const newData = [...data];
                                newData[index].thanhTien = Number(rawValue) || 0;
                                setData(newData);
                              }}
                              inputProps={{
                                min: 0,
                                style: {
                                  textAlign: "right",
                                  padding: "0 8px",
                                  fontSize: "0.85rem",
                                  height: 23,
                                  fontWeight: "bold",
                                  color: "red",
                                },
                              }}
                              sx={{ width: 100 }}
                            />
                          ) : (
                            (item.dienGiai === "Xuất ăn và tiêu chuẩn trong ngày" || item.dienGiai === "Được chi trong ngày")
                              ? (item.thanhTien ? item.thanhTien.toLocaleString() : "")
                              : item.thanhTien ? item.thanhTien.toLocaleString() : ""
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>


          {/* Ký tên */}
          <Box sx={{ mt: 4, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", textAlign: "center", gap: 2 }}>
            <Box />
            <Typography sx={{ fontStyle: "italic" }}>
              {(() => {
                const selected = getStoredDate();
                const day = String(selected.getDate()).padStart(2, "0");
                const month = String(selected.getMonth() + 1).padStart(2, "0");
                const year = selected.getFullYear();
                return `Bình Khánh, ngày ${day} tháng ${month} năm ${year}`;
              })()}
            </Typography>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", textAlign: "center", gap: 2, mt: 1 }}>
            <Typography fontWeight="bold">Người lập</Typography>
            <Typography fontWeight="bold">Thủ trưởng đơn vị</Typography>
          </Box>
          <Divider sx={{ my: 6, opacity: 0 }} />
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", textAlign: "center", gap: 2 }}>
            <Typography fontWeight="bold">Lê Thị Thu Hương</Typography>
            <Typography fontWeight="bold">Đặng Thái Bình</Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
