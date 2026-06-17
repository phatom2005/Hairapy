import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";

/**
 * Component bảo vệ các tuyến đường (route) yêu cầu đăng nhập.
 * Nếu chưa hoàn thành hydrate, sẽ hiển thị màn hình tải dữ liệu.
 * Nếu chưa đăng nhập (không có token), sẽ tự động chuyển hướng về trang /login.
 */
export default function ProtectedRoute() {
  const { token, hydrated } = useAuthStore();

  // Đang đồng bộ hóa trạng thái xác thực từ local storage / API
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="size-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  // Chưa đăng nhập -> Chuyển hướng về trang Login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Đã đăng nhập -> Cho phép truy cập vào các route con
  return <Outlet />;
}
