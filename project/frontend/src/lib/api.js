import axios from "axios";

// Base URL: Vercel/prod set VITE_API_URL env var, local dùng Vite proxy (/api)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

// Tự đính JWT token + xử lý Content-Type cho FormData
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
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

// Xử lý 401 → redirect login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
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
