import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
  useNavigate
} from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Button,
  Typography,
  Box,
  Modal
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';

// Import các trang
import Home from './pages/Home';
import PhieuXuat from './pages/PhieuXuat';
import ChiCho from './pages/ChiCho';
import TienAn from './pages/TienAn';
import ImportData from './pages/ImportData';
import ImportDanhMuc from './pages/importDanhMuc';
import UpdateData from './pages/UpdateData';
import UpdateType from './pages/UpdateType';

// Import DataProvider
import { DataProvider } from './context/DataContext';
import { UpdateTypeProvider, useUpdateType } from './context/UpdateTypeContext'; // ✅ import provider
import { DanhMucProvider } from "./context/DanhMucContext";
import { InfoProvider } from "./context/InfoContext"; // ✅ import mới


function AppContent() {
  const location = useLocation();
  const [openLogo, setOpenLogo] = useState(false);

  const navItems = [
    { path: '/home', label: 'Trang chủ', icon: <HomeIcon /> },
    { path: '/phieuxuat', label: 'Xuất kho' },
    { path: '/chicho', label: 'Chi chợ' },
    { path: '/tienan', label: 'Tiền ăn' },
    { path: '/nhapphieu', label: 'Nhập phiếu' },
    //{ path: '/danhmuc', label: 'Danh mục' },
    { path: '/capnhat', label: 'Cập nhật' },
    { path: '/phanloai', label: 'Phân loại' },
  ];

  return (
    <>
      <AppBar position="fixed" sx={{ background: '#1976d2' }}>
        <Toolbar
          sx={{
            display: 'flex',
            gap: 1,
            minHeight: '44px !important', // giống mẫu
            paddingTop: 0,
            paddingBottom: 0,
            overflowX: 'auto',      // cho phép scroll ngang trên mobile
            whiteSpace: 'nowrap',   // giữ menu trên 1 dòng
          }}
        >
          <Box
            component="img"
            src="/Logo.png"
            alt="Logo"
            sx={{ height: '34px', marginLeft: -2, cursor: 'pointer', flexShrink: 0 }}
            onClick={() => setOpenLogo(true)}
          />

          {navItems.map((item) => (
            <Button
              key={item.path}
              component={Link}
              to={item.path}
              sx={{
                color: 'white',
                backgroundColor: 'transparent',
                padding: '4px 12px',
                minHeight: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                textTransform: 'none',
                borderRadius: 1,
                borderBottom: location.pathname === item.path ? '3px solid #fff' : '3px solid transparent', // ✅ highlight giống tab active
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
                transition: 'all 0.2s ease',
                ...(item.icon && { minWidth: 30 }), // 👉 thu nhỏ thêm minWidth cho nút chỉ có icon
                ...(item.path === '/home' && { ml: 1 }), // ml=2 ≈ 16px; tăng/giảm tùy ý
              }}
            >
              {item.icon ? item.icon : item.label}
            </Button>
          ))}


          <Box sx={{ flexGrow: 1 }} />
          <Typography
            variant="body2"
            sx={{
              color: 'white',
              lineHeight: 1,
              display: { xs: 'none', sm: 'block' }, // ẩn trên mobile
            }}
          >
            Năm học: 2025 - 2026
          </Typography>
        </Toolbar>
      </AppBar>

      <Modal
        open={openLogo}
        onClose={() => setOpenLogo(false)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(5px)'
        }}
      >
        <Box sx={{ outline: 'none', bgcolor: 'transparent' }}>
          <Box
            component="img"
            src="/Logo.png"
            alt="Logo lớn"
            sx={{
              maxWidth: '80vw',
              maxHeight: '80vh',
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              cursor: 'pointer',
            }}
            onClick={() => setOpenLogo(false)}
          />
        </Box>
      </Modal>

      <Box sx={{ paddingTop: '44px' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/phieuxuat" element={<PhieuXuat />} />
          <Route path="/chicho" element={<ChiCho />} />
          <Route path="/tienan" element={<TienAn />} />

          <Route
            path="/nhapphieu"
            element={<ImportDataWithRedirect />}
          />

          {/*<Route path="/danhmuc" element={<ImportDanhMuc onBack={() => window.history.back()} />} />*/}
          <Route path="/capnhat" element={<UpdateData />} />
          <Route path="/phanloai" element={<UpdateType />} />
        </Routes>
      </Box>
    </>
  );
}

// Wrapper component để handle redirect sau import
function ImportDataWithRedirect() {
  const navigate = useNavigate();
  const { setUnmatchedItems } = useUpdateType();

  const handleImportFinish = (importedData) => {
    const unmatched = importedData.filter(item => !item.loai);
    if (unmatched.length > 0) {
      setUnmatchedItems(unmatched);
      navigate('/phanloai');
    } else {
      window.history.back();
    }
  };

  return <ImportData onBack={() => window.history.back()} onFinish={handleImportFinish} />;
}

export default function App() {
  return (
    <DataProvider>
      <UpdateTypeProvider>
        <DanhMucProvider>
          <InfoProvider>  {/* ✅ Thêm InfoProvider */}
            <Router>
              <AppContent />
            </Router>
          </InfoProvider>
        </DanhMucProvider>
      </UpdateTypeProvider>
    </DataProvider>
  );
}
