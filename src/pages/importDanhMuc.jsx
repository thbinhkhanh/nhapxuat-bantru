import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  Button,
  Alert,
  Stack,
  LinearProgress
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";   // 📂 icon chọn file
import CloudUploadIcon from "@mui/icons-material/CloudUpload"; // ☁️ icon upload
import { motion } from "framer-motion";

import { importDanhMuc } from "../utils/importDanhMuc"; // xử lý Excel + batch.commit
import { useDanhMuc } from "../context/DanhMucContext"; // 👈 dùng context

export default function ImportDanhMuc({ onBack }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Context
  const { danhMuc, fetchDanhMuc, setDanhMuc } = useDanhMuc();

  // --- Chọn file Excel ---
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith(".xlsx")) {
      setSelectedFile(file);
      setMessage("");
      setSuccess(false);
    } else {
      setSelectedFile(null);
      setMessage("❌ Vui lòng chọn file Excel (.xlsx)");
      setSuccess(false);
    }
  };

  // --- Upload & Import ---
  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage("❗ Chưa chọn file!");
      setSuccess(false);
      return;
    }

    setLoading(true);
    setMessage("🔄 Đang import dữ liệu (batch)...");
    setProgress(0);

    try {
      let existingDanhMuc = danhMuc;

      // Nếu context chưa có dữ liệu thì tải từ Firestore
      if (!existingDanhMuc || existingDanhMuc.length === 0) {
        await fetchDanhMuc();
        existingDanhMuc = danhMuc;
      }

      // Import Excel và chỉ thêm mới (so sánh với existingDanhMuc)
      const result = await importDanhMuc(selectedFile, setProgress, existingDanhMuc);

      // Sau khi import thành công, cập nhật lại context + storage
      await fetchDanhMuc();

      setMessage(result);
      setSuccess(true);
    } catch (err) {
      setMessage("❌ Lỗi import: " + err.message);
      setSuccess(false);
    } finally {
      setLoading(false);
      setSelectedFile(null);
    }
  };

  return (
    <Box sx={{ pt: "20px", pb: 6, px: { xs: 1, sm: 2 }, bgcolor: "#e3f2fd", minHeight: "100vh" }}>
      <Box maxWidth={480} mx="auto">
        <Card elevation={8} sx={{ p: 4, borderRadius: 4 }}>
          <Typography variant="h5" color="primary" fontWeight="bold" align="center" gutterBottom>
            DANH MỤC HÀNG HÓA
          </Typography>

          <Box sx={{ height: "2px", width: "100%", backgroundColor: "#1976d2", borderRadius: 1, mt: 2, mb: 4 }} />

          <Stack spacing={2}>
            {/* Nút chọn file */}
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFileIcon />}
              sx={{ height: 40 }}
            >
              Chọn file Excel (.xlsx)
              <input type="file" hidden accept=".xlsx" onChange={handleFileChange} />
            </Button>

            {selectedFile && (
              <Typography variant="body2" color="text.secondary">
                📄 File đã chọn: {selectedFile.name}
              </Typography>
            )}

            {/* Nút upload */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                fullWidth
                variant="contained"
                color="success"
                startIcon={<CloudUploadIcon />}
                onClick={handleUpload}
                sx={{ fontWeight: "bold", height: 40 }}
                disabled={loading}
              >
                {loading ? "🔄 Đang tải lên (batch)..." : "Tải lên"}
              </Button>
            </motion.div>

            {/* Progress */}
            {loading && (
              <>
                <LinearProgress variant="determinate" value={progress} />
                <Typography variant="caption" color="text.secondary" align="center">
                  Đang import danh mục... ({progress}%)
                </Typography>
              </>
            )}

            {message && (
              <Alert severity={success ? "success" : loading ? "info" : "error"}>
                {message}
              </Alert>
            )}

            <Button fullWidth onClick={onBack} color="secondary" sx={{ mt: 1 }}>
              ⬅️ Quay lại
            </Button>
          </Stack>
        </Card>
      </Box>
    </Box>
  );
}
