import React, { useState } from 'react';
import {
  Box, Typography, Card, Button, Alert, Stack, LinearProgress
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import { doc, setDoc } from "firebase/firestore";
import { db } from './firebase';

export default function TaiDuLieu({ onBack }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

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

    setLoading(true);
    setMessage('🔄 Đang xử lý file...');
    setProgress(0);
    setCurrentIndex(0);
    setTotalCount(0);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const jsonData = XLSX.utils.sheet_to_json(sheet, {
          defval: '',
          header: 0
        });

        await processFoodData(jsonData);
      } catch (err) {
        console.error('❌ Lỗi khi xử lý file:', err);
        setSuccess(false);
        setMessage('❌ Đã xảy ra lỗi khi xử lý file Excel.');
      } finally {
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const processFoodData = async (jsonData) => {
    const groupedByDate = {};

    jsonData.forEach(row => {
      const ngayRaw = row['Ngày']?.toString().trim();
      const ngay = new Date(ngayRaw).toISOString().split('T')[0];
      if (!ngay) return;

      const matHang = {
        stt: row['STT'] || '',
        ten: row['Tên thực phẩn']?.toString().trim(),
        dvt: row['ĐVT']?.toString().trim(),
        soLuong: parseFloat(row['Đơn giá']) || 0,
        donGia: parseFloat(row['Đơn giá']) || 0,
        thanhTien: parseFloat(row['Thành tiền']) || 0,
        loai: row['Loại']?.toString().trim()
      };

      if (!groupedByDate[ngay]) groupedByDate[ngay] = [];
      groupedByDate[ngay].push(matHang);
    });

    const allDates = Object.keys(groupedByDate);
    setTotalCount(allDates.length);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < allDates.length; i++) {
      const dateKey = allDates[i];
      const matHangList = groupedByDate[dateKey];

      const docRef = doc(db, 'chiCho', dateKey);
      try {
        await setDoc(docRef, {
          ngay: dateKey,
          matHang: matHangList,
          tongMatHang: matHangList.length,
          updatedAt: new Date().toISOString()
        });
        successCount++;
      } catch (err) {
        console.error(`❌ Lỗi khi ghi dữ liệu ngày ${dateKey}:`, err.message);
        errorCount++;
      }

      setCurrentIndex(i + 1);
      setProgress(Math.round(((i + 1) / allDates.length) * 100));
    }

    setSuccess(errorCount === 0);
    setMessage(errorCount === 0
      ? `✅ Đã thêm thành công ${successCount} ngày dữ liệu thực phẩm.`
      : `⚠️ Có ${errorCount} lỗi khi thêm dữ liệu thực phẩm.`);
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'transparent', pt: 0, px: 1 }}>
      <Box maxWidth={420} mx="auto">
        <Card elevation={8} sx={{ p: 4, borderRadius: 4, mt: 2 }}>
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