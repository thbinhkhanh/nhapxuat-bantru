import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, Button, Alert, Stack, LinearProgress
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom'; // <-- import useNavigate

import { processFoodData } from '../utils/processFoodData';
import { formatExcelDate, detectExcelFormat } from '../utils/excelUtils';
import { loadKeywordRules, detectCategory } from '../utils/keywordUtils';
import { useUpdateType } from '../context/UpdateTypeContext';

export default function ImportData({ onBack }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [KEYWORD_RULES, setKeywordRules] = useState({});
  const { unmatchedItems, setUnmatchedItems } = useUpdateType();
  const navigate = useNavigate(); // <-- khởi tạo navigate

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const rules = await loadKeywordRules();
        setKeywordRules(rules);
      } catch (err) {
        console.error('❌ Lỗi khi load keyword rules:', err);
      }
    };
    fetchRules();
  }, []);

  useEffect(() => {
    if (unmatchedItems.length > 0) {
      //console.log('📦 Tổng số item chưa phân loại hiện tại:', unmatchedItems.length);
    }
  }, [unmatchedItems]);

  // ---- MỚI: tự động chuyển trang nếu có item chưa phân loại sau khi upload ----
  useEffect(() => {
    if (!loading && unmatchedItems.length > 0) {
      navigate('/phanloai'); // <-- trang phân loại
    }
  }, [loading, unmatchedItems, navigate]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.xlsx')) {
      setSelectedFile(file);
      setMessage('');
      setSuccess(false);
    } else {
      setSelectedFile(null);
      setMessage('❌ Vui lòng chọn đúng định dạng file Excel (.xlsx)');
      setSuccess(false);
    }
  };

  const handleUpload = async () => {
  if (!selectedFile) {
    setMessage('❗ Chưa chọn file!');
    setSuccess(false);
    return;
  }

  if (!KEYWORD_RULES || Object.keys(KEYWORD_RULES).length === 0) {
    setMessage('❗ Chưa tải xong danh sách rules. Vui lòng thử lại sau.');
    setSuccess(false);
    return;
  }

  setLoading(true);
  setMessage('🔄 Đang xử lý file...');
  setProgress(0);
  setCurrentIndex(0);
  setTotalCount(0);

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const buffer = e.target.result;
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });

      const result = detectExcelFormat(buffer);
      const dataMode = result.formatType;

      const groupedData = {};
      const expectedTitle = "HỢP TÁC XÃ NÔNG NGHIỆP - THƯƠNG MẠI, DỊCH VỤ, DU LỊCH - ĐẦU TƯ & XÂY DỰNG CẦN GIỜ TƯƠNG LAI";
      const skippedSheets = [];

      workbook.SheetNames.forEach(sheetName => {
        try {
          const sheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

          const b1 = rawData?.[0]?.[1]?.toString().trim();
          const b4 = rawData?.[3]?.[1]?.toString().trim();

          // Nguồn 1
          if (b1 === expectedTitle && rawData[12]) {
            const rawHeaderRow = rawData[12];
            const headersMap = rawHeaderRow.slice(1, 8).map(h => h?.toString().trim());
            const allowedKeys = ['Tên hàng', 'Tên thực phẩm', 'Đơn vị tính', 'ĐVT', 'Số lượng', 'Đơn giá', 'Thành tiền', 'Ghi chú'];
            const keyMap = {
              'Tên hàng': 'ten',
              'Tên thực phẩm': 'ten',
              'Đơn vị tính': 'dvt',
              'ĐVT': 'dvt',
              'Số lượng': 'soLuong',
              'Đơn giá': 'donGia',
              'Thành tiền': 'thanhTien',
              'Ghi chú': 'ghiChu'
            };

            const columnIndexMap = {};
            headersMap.forEach((header, i) => columnIndexMap[header] = i);

            const dateColumnIndex =
              columnIndexMap['Ngày giao'] ?? columnIndexMap['Ngày'];

            if (dateColumnIndex === undefined) {
              skippedSheets.push(sheetName);
              return;
            }

            let lastRowIndex = rawData.length - 1;
            for (let i = rawData.length - 1; i >= 13; i--) {
              const row = rawData[i];
              const dateRaw = row[1 + dateColumnIndex];
              const date = formatExcelDate(dateRaw);
              if (date) {
                lastRowIndex = i;
                break;
              }
            }

            const dataRows = rawData.slice(13, lastRowIndex + 1).map(row => {
              const dateRaw = row[1 + dateColumnIndex];
              const dateFormatted = formatExcelDate(dateRaw);
              return { date: dateFormatted, row: row.slice(1, 8) };
            });

            dataRows.forEach(({ date, row }) => {
              if (!groupedData[date]) groupedData[date] = [];
              const obj = {};
              headersMap.forEach((key, i) => {
                if (!allowedKeys.includes(key)) return;
                let value = row[i];
                if (key === 'Đơn vị tính' || key === 'ĐVT') {
                  const dvtRaw = value?.toString().trim() || '';
                  value = dvtRaw.charAt(0).toUpperCase() + dvtRaw.slice(1).toLowerCase();
                }
                const mappedKey = keyMap[key];
                if (mappedKey) obj[mappedKey] = value;
              });

              const detectedLoai = obj.ten ? detectCategory(obj.ten, KEYWORD_RULES) : "Khác";

              if (detectedLoai !== "Khác") {
                obj.loai = detectedLoai;
              } else {
                // Lưu đầy đủ các trường vào unmatchedItems
                const unmatchedItem = {
                  date,
                  ten: obj.ten || '',
                  dvt: obj.dvt || '',
                  soLuong: obj.soLuong || 0,
                  donGia: obj.donGia || 0,
                  thanhTien: obj.thanhTien || 0
                };
                //console.log("Unmatched item detected:", unmatchedItem); // <-- Thêm log ở đây
                setUnmatchedItems(prev => [...prev, unmatchedItem]);
              }

              groupedData[date].push(obj);
            });
          }

          // Nguồn 2
          else if (b4 === "HCG-THBKHANH") {
            let currentDate = null;

            for (let i = 1; i < rawData.length; i++) {
              const row = rawData[i];
              const maybeDate = row.find(cell =>
                typeof cell === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(cell.trim())
              );

              if (maybeDate) {
                currentDate = formatExcelDate(maybeDate.trim());
                if (!groupedData[currentDate]) groupedData[currentDate] = [];
                continue;
              }

              if (
                currentDate &&
                row.length >= 7 &&
                row[2] &&
                typeof row[2] === 'string' &&
                row[2].trim().toUpperCase() !== 'TRƯA'
              ) {
                const dvtRaw = row[3]?.toString().trim() || '';
                const dvt = dvtRaw.charAt(0).toUpperCase() + dvtRaw.slice(1).toLowerCase();
                const ten = row[2]?.toString().trim();

                const matHang = {
                  ten,
                  dvt,
                  soLuong: parseFloat(row[4]?.toString().replace(/,/g, '')) || 0,
                  donGia: parseFloat(row[5]?.toString().replace(/,/g, '')) || 0,
                  thanhTien: parseFloat(row[6]?.toString().replace(/,/g, '')) || 0
                };

                const detectedLoai = detectCategory(ten, KEYWORD_RULES);

                if (detectedLoai !== "Khác") {
                  matHang.loai = detectedLoai;
                } else {
                  // Lưu đầy đủ các trường vào unmatchedItems
                  const unmatchedItem = {
                    date: currentDate,
                    ten: matHang.ten,
                    dvt: matHang.dvt,
                    soLuong: matHang.soLuong,
                    donGia: matHang.donGia,
                    thanhTien: matHang.thanhTien
                  };
                  //console.log("Unmatched item detected (Nguồn 2):", unmatchedItem);
                  setUnmatchedItems(prev => [...prev, unmatchedItem]);
                }

                groupedData[currentDate].push(matHang);
              }
            }
          }

          else {
            skippedSheets.push(sheetName);
          }
        } catch {
          skippedSheets.push(sheetName);
        }
      });

      if (Object.keys(groupedData).length === 0) {
        setMessage(`❌ Không có sheet nào hợp lệ để xử lý.`);
        setSuccess(false);
        setShowAlert(true);
        return;
      }

      await processFoodData(
        groupedData,
        setProgress,
        setCurrentIndex,
        setMessage,
        setSuccess,
        setShowAlert,
        'classic'
      );

      setSelectedFile(null);
    } catch (err) {
      setSuccess(false);
      setMessage(`❌ Đã xảy ra lỗi khi xử lý file Excel: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  reader.readAsArrayBuffer(selectedFile);
};


  return (
    <Box sx={{ pt: "20px", pb: 6, px: { xs: 1, sm: 2 }, bgcolor: "#e3f2fd", minHeight: "100vh" }}>
      <Box maxWidth={480} mx="auto">
        <Card elevation={8} sx={{ p: 4, borderRadius: 4, mt: 0 }}>
          <Typography variant="h5" color="primary" fontWeight="bold" align="center" gutterBottom>
            TẢI DANH SÁCH THỰC PHẨM
          </Typography>
          <Box sx={{ height: "2px", width: "100%", backgroundColor: "#1976d2", borderRadius: 1, mt: 2, mb: 4 }} />

          <Stack spacing={2}>
            <Button variant="outlined" component="label" startIcon={<UploadFileIcon />} sx={{ height: 40 }}>
              Chọn file Excel (.xlsx)
              <input type="file" hidden accept=".xlsx" onChange={handleFileChange} />
            </Button>

            {selectedFile && (
              <Typography variant="body2" color="text.secondary">
                📄 File đã chọn: {selectedFile.name}
              </Typography>
            )}

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                fullWidth variant="contained" color="success"
                startIcon={<CloudUploadIcon />} onClick={handleUpload}
                sx={{ fontWeight: 'bold', height: 40 }} disabled={loading}
              >
                {loading ? '🔄 Đang tải lên...' : 'Tải lên'}
              </Button>
            </motion.div>

            {loading && (
              <>
                <LinearProgress variant="determinate" value={progress} />
                <Typography variant="caption" color="text.secondary" align="center">
                  Đang tải dữ liệu thực phẩm... ({currentIndex}/{totalCount} ngày - {progress}%)
                </Typography>
              </>
            )}

            {message && (
              <Alert severity={success ? 'success' : loading ? 'info' : 'error'}>
                {message}
              </Alert>
            )}

            <Button onClick={onBack} color="secondary">
              ⬅️ Quay lại
            </Button>
          </Stack>
        </Card>
      </Box>
    </Box>
  );
}
