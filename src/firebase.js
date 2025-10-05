import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  //apiKey: "AIzaSyBJ8NOTCQgZFS1AtRi8fkmmMUYot4NVyFU",
  //authDomain: "quanly-nhapxuat-bantru.firebaseapp.com",
  //projectId: "quanly-nhapxuat-bantru",
  //storageBucket: "quanly-nhapxuat-bantru.firebasestorage.app",
  //messagingSenderId: "373450024657",
  //appId: "1:373450024657:web:ee1cef903da188faaec7f0"

  apiKey: "AIzaSyCeRgQYCaMLt15zsWKkrJ0PJDyeQXHIgFY",
  authDomain: "quanly-nhapxuat-bantru-2.firebaseapp.com",
  projectId: "quanly-nhapxuat-bantru-2",
  storageBucket: "quanly-nhapxuat-bantru-2.firebasestorage.app",
  messagingSenderId: "532960156751",
  appId: "1:532960156751:web:34e78267294cfb8ed15e3a"
};

// Chỉ khởi tạo nếu chưa có app nào
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Lấy Firestore và Auth
const db = getFirestore(app);
const auth = getAuth(app);

// Export thêm app để import được ở các file khác
export { app, db, auth };
