import { create } from "zustand";
import api from "../lib/api";

/**
 * Zustand Store quản lý trạng thái xác thực người dùng.
 * Làm nguồn chân lý duy nhất (Single Source of Truth) cho frontend.
 */
const useAuthStore = create((set, get) => ({
  token: localStorage.getItem("token") || null,
  user: null,
  loading: false,
  error: null,
  hydrated: false,

  /**
   * Đăng nhập người dùng bằng email và mật khẩu.
   */
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post("/auth/login", { email, password });
      const { token, email: userEmail, role, fullName } = res.data;
      localStorage.setItem("token", token);
      set({ token, user: { email: userEmail, role, fullName }, loading: false });
      return true;
    } catch (err) {
      let errMsg = "Đăng nhập thất bại. Vui lòng kiểm tra lại.";
      if (err.response?.data) {
        if (err.response.data.message) {
          errMsg = err.response.data.message;
        } else if (err.response.data.errors) {
          errMsg = Object.values(err.response.data.errors).join(", ");
        }
      }
      set({ error: errMsg, loading: false });
      throw new Error(errMsg, { cause: err });
    }
  },

  /**
   * Đăng ký tài khoản người dùng mới.
   */
  register: async (email, password, confirmPassword, fullName) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post("/auth/register", { email, password, confirmPassword, fullName });
      const { token, email: userEmail, role, fullName: userFullName } = res.data;
      localStorage.setItem("token", token);
      set({ token, user: { email: userEmail, role, fullName: userFullName }, loading: false });
      return true;
    } catch (err) {
      let errMsg = "Đăng ký thất bại. Vui lòng thử lại.";
      if (err.response?.data) {
        if (err.response.data.message) {
          errMsg = err.response.data.message;
        } else if (err.response.data.errors) {
          errMsg = Object.values(err.response.data.errors).join(", ");
        }
      }
      set({ error: errMsg, loading: false });
      throw new Error(errMsg, { cause: err });
    }
  },

  /**
   * Đăng xuất, xóa toàn bộ thông tin xác thực khỏi store và localStorage.
   */
  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, user: null, error: null });
    // Chuyển hướng về trang chủ và tải lại trang để xóa sạch cache/state cũ
    window.location.href = "/";
  },

  /**
   * Đồng bộ lại trạng thái xác thực khi tải/làm mới trang.
   * Nếu có token, sẽ gọi API /auth/me để lấy thông tin người dùng mới nhất.
   */
  hydrate: async () => {
    const { token } = get();
    if (!token) {
      set({ hydrated: true });
      return;
    }
    try {
      const res = await api.get("/auth/me");
      set({ user: res.data, hydrated: true });
    } catch {
      // Nếu token hết hạn hoặc không hợp lệ, đăng xuất người dùng
      localStorage.removeItem("token");
      set({ token: null, user: null, hydrated: true });
    }
  },

  /**
   * Cập nhật thông tin user cục bộ trong store (sau khi PUT /auth/me thành công),
   * tránh phải gọi lại hydrate()/auth/me thêm 1 round-trip không cần thiết.
   */
  updateUser: (partial) => set((state) => ({ user: { ...state.user, ...partial } })),

  /**
   * Xóa thông báo lỗi hiện tại.
   */
  clearError: () => set({ error: null }),
}));

export default useAuthStore;
