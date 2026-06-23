import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { SoftAurora } from "./components/animated";
import useAuthStore from "./store/useAuthStore";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ScanPage from "./pages/ScanPage";
import ResultsPage from "./pages/ResultsPage";
import SwapPage from "./pages/SwapPage";
import CatalogPage from "./pages/CatalogPage";
import PricingPage from "./pages/PricingPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import SalonsPage from "./pages/SalonsPage";
import CheckoutPage from "./pages/CheckoutPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import PaymentCancelPage from "./pages/PaymentCancelPage";
import AdminRoute from "./components/auth/AdminRoute";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminCatalogPage from "./pages/admin/AdminCatalogPage";
import AdminSubscriptionsPage from "./pages/admin/AdminSubscriptionsPage";
import AdminUsagePage from "./pages/admin/AdminUsagePage";

// Luồng chính: / -> /scan -> /results -> /swap
export default function App() {
  const hydrate = useAuthStore((state) => state.hydrate);
  const hydrated = useAuthStore((state) => state.hydrated);

  // Gọi hàm hydrate để kiểm tra token và tải thông tin user khi load/refresh trang
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Hiển thị loading spinner cho đến khi đồng bộ xong trạng thái đăng nhập
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="size-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Background mơ màng cho mỗi route - fixed, GPU compositor xử lý */}
      <SoftAurora intensity={1.05} />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/salons" element={<SalonsPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/swap" element={<SwapPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
          <Route path="/payment/cancel" element={<PaymentCancelPage />} />
        </Route>

        {/* Admin Routes (yêu cầu đăng nhập + role ADMIN) */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/catalog" element={<AdminCatalogPage />} />
            <Route path="/admin/subscriptions" element={<AdminSubscriptionsPage />} />
            <Route path="/admin/usage" element={<AdminUsagePage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

