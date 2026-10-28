import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";

/**
 * Route guard bảo vệ các trang thuộc Cổng Quản lý Salon (/salon-portal).
 * Chỉ cho phép người dùng có vai trò SALON_OWNER.
 */
export default function SalonOwnerRoute() {
  const { token, user, hydrated } = useAuthStore();

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="size-10 animate-spin rounded-full border-4 border-pink border-t-transparent" />
      </div>
    );
  }

  // Chưa đăng nhập -> Chuyển hướng sang Login
  if (!token) {
    return <Navigate to="/login" replace state={{ from: "/salon-portal", message: "Đăng nhập với tài khoản Chủ Salon để tiếp tục." }} />;
  }

  // Không phải chủ salon -> chuyển hướng sang trang giới thiệu /for-salons
  if (user?.role !== "SALON_OWNER") {
    return <Navigate to="/for-salons" replace />;
  }

  return <Outlet />;
}
