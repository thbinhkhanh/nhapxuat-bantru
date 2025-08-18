import React, { useState } from "react";
import {
  Box, Typography, Card, Button, Alert, Stack, LinearProgress
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { motion } from "framer-motion";

import { importDanhMuc } from "../utils/importDanhMuc";

export default function ImportDanhMuc({ onBack }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

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

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage("❗ Chưa chọn file!");
      setSuccess(false);
      return;
    }

    setLoading(true);
    setMessage("🔄 Đang xử lý file...");
    setProgress(0);

    try {
      const result = await importDanhMuc(selectedFile, setProgress);
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
        <Card elevation={8} sx={{ p: 4, borderRadius: 4, mt: 0 }}>
          <Typography
            variant="h5"
            color="primary"
            fontWeight="bold"
            align="center"
            gutterBottom
          >
            KEYWORD RULES
          </Typography>
          <Box
            sx={{
              height: "2px",
              width: "100%",
              backgroundColor: "#1976d2",
              borderRadius: 1,
              mt: 2,
              mb: 4,
            }}
          />

          <Stack spacing={2}>
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
                {loading ? "🔄 Đang tải lên..." : "Tải lên"}
              </Button>
            </motion.div>

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

            {/* Nút quay lại giống mẫu */}
            <Button fullWidth onClick={onBack} color="secondary" sx={{ mt: 1 }}>
              ⬅️ Quay lại
            </Button>
          </Stack>
        </Card>
      </Box>
    </Box>
  );
}
