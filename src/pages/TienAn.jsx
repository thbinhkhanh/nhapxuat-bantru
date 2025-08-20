import React, { useState, useEffect } from "react";
import {
  Box, Stack, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Card, CardContent, Divider, Button, TextField
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { vi } from "date-fns/locale";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { format } from "date-fns";
import { useDataContext, useSaveDataToContext } from "../context/DataContext";
import { LinearProgress } from "@mui/material";
import { exportPhieuTienAn } from "../utils/exportPhieuTienAn";


import UpdateIcon from "@mui/icons-material/Update";         // ✅ icon cập nhật
import FileDownloadIcon from "@mui/icons-material/FileDownload"; // ✅ icon excel/download
import { Tooltip, IconButton } from "@mui/material";



// ✅ Dùng chung dateStorage
import { getStoredDate, setStoredDate } from "../utils/dateStorage";

export default function TienAn() {
  const [data, setData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getStoredDate());
  const { dataByDate } = useDataContext();
  const saveDataToContext = useSaveDataToContext(); 
  const [suatAn, setSuatAn] = useState(0);
  const [loadingSave, setLoadingSave] = useState(false);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false); 
  
  const headCell = {
    backgroundColor: "#1976d2 !important",
    color: "#fff !important",
    fontWeight: 700,
    textTransform: "uppercase",
    fontSize: 13,
    py: 1.2,
    borderRight: "1px solid rgba(255,255,255,0.2)",
  };

  // ✅ Đồng bộ giữa các tab
  useEffect(() => {
    const syncDateAcrossTabs = (e) => {
      if (e.key === "selectedDate") {
        setSelectedDate(getStoredDate());
      }
    };
    window.addEventListener("storage", syncDateAcrossTabs);
    return () => {
      window.removeEventListener("storage", syncDateAcrossTabs);
    };
  }, []);

  // ✅ Lưu vào localStorage khi ngày đổi
  useEffect(() => {
    if (selectedDate) {
      setStoredDate(selectedDate);
    }
  }, [selectedDate]);

  // ✅ Hàm fetch data riêng để tái sử dụng khi bấm "Cập nhật"
  const fetchData = async () => {
    if (!selectedDate) return;

    setLoading(true);
    setProgress(0);

    const dateStr = selectedDate.toISOString().split("T")[0];

    // Nếu đã có cache
    if (dataByDate[dateStr]?.tienAn) {
      setData(dataByDate[dateStr].tienAn);
      setLoading(false);
      setProgress(100);
      return;
    }

    try {
      // 1️⃣ Fetch INFO
      let suatAn = 0;
      try {
        const infoRef = doc(db, "INFO", dateStr);
        const infoSnap = await getDoc(infoRef);
        if (infoSnap.exists()) {
          const infoData = infoSnap.data();
          suatAn = infoData.suatAn || 0;
        }
        setProgress(20);
      } catch (err) {
        console.error("❌ Lỗi khi fetch INFO:", err);
        setProgress(20);
      }

      // 2️⃣ Fetch CHENHLECH
      let chenhLechDauNgay = 0;
      try {
        const chenhRef = doc(db, "CHENHLECH", dateStr);
        const chenhSnap = await getDoc(chenhRef);
        if (chenhSnap.exists()) {
          const chenhData = chenhSnap.data();
          chenhLechDauNgay = chenhData.chenhLechDauNgay || 0;
        }
        setProgress(40);
      } catch (err) {
        console.error("❌ Lỗi khi fetch CHENHLECH:", err);
        setProgress(40);
      }

      // 3️⃣ Fetch DATA
      const docRef = doc(db, "DATA", dateStr);
      const docSnap = await getDoc(docRef);
      setProgress(70);

      if (docSnap.exists()) {
        const docData = docSnap.data();
        const matHang = Array.isArray(docData.matHang) ? docData.matHang : [];
        saveDataToContext(selectedDate, { ...docData });

        const loaiNames = { L1: "Xuất kho", L2: "Rau củ, gia vị", L3: "Trái cây + tráng miệng",
          L4: "Trứng", L5: "Thịt heo", L6: "Thịt bò", L7: "Cá", L8: "Tôm",
          L9: "Thịt gà", L10: "Cua", L11: "Loại khác"
        };
        const loaiOrder = ["L1","L2","L3","L4","L5","L6","L7","L8","L9","L10","L11"];
        let sttCounter = 1;
        const tableData = [];

        tableData.push({ stt: sttCounter++, dienGiai: "Chênh lệch đầu ngày", isLoaiRow: true, thanhTien: chenhLechDauNgay });
        tableData.push({ stt: sttCounter++, dienGiai: "Xuất ăn và tiêu chuẩn trong ngày", isLoaiRow: true, soLuong: suatAn, thanhTien: suatAn*27000 });
        tableData.push({ stt: sttCounter++, dienGiai: "Được chi trong ngày", isLoaiRow: true, thanhTien: suatAn*27000 });
        tableData.push({ stt: sttCounter++, dienGiai: "Đã chi trong ngày", isLoaiRow: true, thanhTien: matHang.reduce((acc,m)=>acc+(m.thanhTien||0),0) });

        const loaiMap = {};
        matHang.forEach(m => { const l = m.loai||"L11"; if(!loaiMap[l]) loaiMap[l]=[]; loaiMap[l].push(m); });
        loaiOrder.forEach(loaiKey => {
          const items = loaiMap[loaiKey]; if(!items) return;
          tableData.push({ stt:"", dienGiai:loaiNames[loaiKey], isLoaiRow:true, thanhTien: items.reduce((acc,m)=>acc+(m.thanhTien||0),0) });
          items.forEach(m => tableData.push({ stt:"", dienGiai:m.ten, dvt:m.dvt, soLuong:m.soLuong, donGia:m.donGia, thanhTien:m.thanhTien, isLoaiRow:false }));
          if(loaiKey==="L1") {
            const chiCho = matHang.filter(m=>m.loai&&m.loai!=="L1").reduce((acc,m)=>acc+(m.thanhTien||0),0);
            tableData.push({ stt:"", dienGiai:"Chi chợ", isLoaiRow:true, thanhTien: chiCho });
          }
        });

        const tongChi = matHang.reduce((acc,m)=>acc+(m.thanhTien||0),0);
        tableData.push({ stt:sttCounter, dienGiai:"Chênh lệch cuối ngày", isLoaiRow:true, thanhTien: -tongChi });

        setData(tableData);
        saveDataToContext(selectedDate, { tienAn: tableData });
        setProgress(100);
      } else {
        console.warn(`[TienAn] Không tìm thấy dữ liệu ngày ${dateStr} trong Firestore`);
        setData([]);
        saveDataToContext(selectedDate, { tienAn: [] });
        setProgress(100);
      }
    } catch (err) {
      console.error("❌ Lỗi fetchData:", err);
      setProgress(100);
    } finally {
      setLoading(false);
    }
  };


  const handleUpdateChenhLech = async () => {
    if (!selectedDate) return;

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

      const chenhlechDau = data.find(
        (item) => item.dienGiai === "Chênh lệch đầu ngày"
      )?.thanhTien || 0;

      await setDoc(doc(db, "CHENHLECH", docId), {
        chenhLechDauNgay: chenhlechDau,
        updatedAt: new Date().toISOString(),
      });

      setMessage("✅ Đã cập nhật Chênh lệch đầu ngày thành công!");
      setSuccess(true);
    } catch (err) {
      console.error("Lỗi khi cập nhật CHENHLECH:", err);
      setMessage("❌ Lỗi khi cập nhật dữ liệu!");
      setSuccess(false);
    } finally {
      setLoadingSave(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  useEffect(() => {
    if (data.length === 0) return;

    setData(prevData => {
      let changed = false;
      const newData = prevData.map(d => ({ ...d })); // clone object

      const duocChiIndex = newData.findIndex(d => d.dienGiai === "Được chi trong ngày");
      const daChiIndex = newData.findIndex(d => d.dienGiai === "Đã chi trong ngày");
      const chenhlechCuoiIndex = newData.findIndex(d => d.dienGiai === "Chênh lệch cuối ngày");

      if (duocChiIndex !== -1 && daChiIndex !== -1 && chenhlechCuoiIndex !== -1) {
        const duocChi = newData[duocChiIndex].thanhTien || 0;
        const daChi = newData[daChiIndex].thanhTien || 0;
        const newValue = duocChi - daChi;

        if (newData[chenhlechCuoiIndex].thanhTien !== newValue) {
          newData[chenhlechCuoiIndex].thanhTien = newValue;
          changed = true;
        }
      }

      return changed ? newData : prevData; // chỉ set nếu thực sự thay đổi
    });
  }, [data]);
  
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
                    console.log("rows:", data); // ✅ log đúng biến
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
                  <TableCell align="center" sx={headCell}>STT</TableCell>
                  <TableCell align="center" sx={headCell}>Nội dung</TableCell>
                  <TableCell align="center" sx={headCell}>ĐVT</TableCell>
                  <TableCell align="center" sx={headCell}>Số lượng</TableCell>
                  <TableCell align="center" sx={headCell}>Đơn giá</TableCell>
                  <TableCell align="center" sx={{ ...headCell, borderRight: 0 }}>Thành tiền</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Không có dữ liệu
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item, index) => {
                    const isSpecialRow =
                      ["Chênh lệch đầu ngày","Xuất ăn và tiêu chuẩn trong ngày","Được chi trong ngày","Đã chi trong ngày","Xuất kho","Chi chợ","Chênh lệch cuối ngày"].includes(item.dienGiai);

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
                              : undefined
                        }}
                      >
                        <TableCell
                          align="center"
                          sx={{
                            py: 0.5,
                            px: 1,
                            fontWeight: item.isLoaiRow ? "bold" : "normal",
                            color: isSpecialRow ? "#1976d2" : undefined,
                          }}
                        >
                          {item.stt}
                        </TableCell>

                        <TableCell
                          sx={{
                            py: 0.5,
                            px: 1,
                            fontWeight: item.isLoaiRow ? "bold" : "normal",
                            color: isSpecialRow ? "#1976d2" : undefined,
                            fontSize: '0.85rem'
                          }}
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
                            fontSize: '0.85rem'
                          }}
                        >
                          {item.dvt || ""}
                        </TableCell>

                        <TableCell align="center" sx={{ py: 0.5, px: 1 }}>
                          {(item.dienGiai === "Xuất ăn và tiêu chuẩn trong ngày") ? (
                            <TextField
                              size="small"
                              type="number"
                              value={item.soLuong || ""}
                              InputProps={{
                                readOnly: true,          // Chỉ hiển thị, không cho nhập
                                disableUnderline: true,  // Bỏ gạch dưới nếu dùng variant="standard"
                              }}
                              inputProps={{
                                style: {
                                  textAlign: "center",
                                  padding: "0 8px",
                                  fontSize: "0.85rem",
                                  height: 23,
                                  fontWeight: 'bold',
                                  color: "#1976d2",
                                  border: "none",        // Bỏ border ngoài
                                  backgroundColor: "transparent"
                                },
                              }}
                              variant="standard"          // hoặc "outlined" nếu muốn style khác
                              sx={{ width: 100 }}
                            />

                          ) : (
                            item.soLuong || ""
                          )}
                        </TableCell>

                        <TableCell align="right" sx={{ py: 0.5, px: 1, fontSize: '0.85rem' }}>
                          {item.donGia ? item.donGia.toLocaleString() : ""}
                        </TableCell>

                        <TableCell
                          align="right"
                          sx={{
                            py: 0.5,
                            px: 1,
                            fontWeight: item.isLoaiRow ? "bold" : "normal",
                            fontSize: '0.85rem',
                            color: isSpecialRow ? "#1976d2" : undefined
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
                                  color: "red", // đổi sang màu đỏ
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
