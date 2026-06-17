import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";

/**
 * Component bảo vệ các tuyến đường (route) yêu cầu quyền ADMIN.
 * Nếu chưa hoàn thành hydrate, sẽ hiển thị màn hình tải dữ liệu.
 * Nếu chưa đăng nhập (không có token), sẽ chuyển hướng về trang /login.
 * Nếu vai trò của user không phải là ADMIN, sẽ chuyển hướng về trang chủ /.
 */
export default function AdminRoute() {
  const { token, user, hydrated } = useAuthStore();

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

  // Đăng nhập nhưng không phải admin -> Quay về trang chủ
  if (user?.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  // Đã xác thực admin -> Cho phép truy cập
  return <Outlet />;
}
