import axios from "axios";

// Base URL: Vercel/prod set VITE_API_URL env var, local dùng Vite proxy (/api)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

// Các endpoint auth công khai: KHÔNG đính token cũ/hết hạn (tránh server từ chối request đăng nhập vì token rác)
const PUBLIC_AUTH = /^\/auth\/(login|register|google|facebook|forgot-password|reset-password|verify-email|resend-verification)/;

// Tự đính JWT token + xử lý Content-Type cho FormData
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && !PUBLIC_AUTH.test(config.url || "")) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Nếu data là FormData → xóa Content-Type để Axios tự set multipart/form-data kèm boundary
  // Ngược lại mặc định JSON
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  } else {
    config.headers["Content-Type"] = config.headers["Content-Type"] || "application/json";
  }
  return config;
});

// Xử lý hết phiên → redirect login.
// Backend trả 403 BODY RỖNG (không phải 401) khi token hết hạn/không hợp lệ → coi là hết phiên.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const res = error.response;
    const hadToken = !!error.config?.headers?.Authorization;
    const emptyBody = res && (res.data === "" || res.data == null);
    const expired = res && (res.status === 401 || (res.status === 403 && emptyBody && hadToken));
    if (expired) {
      localStorage.removeItem("token");
      // Chỉ redirect nếu không phải đang ở trang auth
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
