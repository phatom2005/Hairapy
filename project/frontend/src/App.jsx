import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { trackPageView, setUserProps, markInternalTraffic } from "./lib/analytics";
import { SoftAurora } from "./components/animated";
import useAuthStore from "./store/useAuthStore";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import CheckEmailPage from "./pages/CheckEmailPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ScanPage from "./pages/ScanPage";
import ResultsPage from "./pages/ResultsPage";
import SwapPage from "./pages/SwapPage";
import CatalogPage from "./pages/CatalogPage";
import PricingPage from "./pages/PricingPage";
import ProfilePage from "./pages/ProfilePage";
import AdminRoute from "./components/auth/AdminRoute";
import AdminLayout from "./components/admin/AdminLayout";
import SalonOwnerRoute from "./components/auth/SalonOwnerRoute";
import SalonPortalLayout from "./components/salon/SalonPortalLayout";


// ===== Phase 6.6: tách bundle =====
// Trang chính của luồng khách (Landing/Scan/Results/Swap/Catalog/Auth) vẫn import tĩnh để mở tức thì.
// Trang ít vào, cổng salon và toàn bộ admin tải theo nhu cầu -> bundle đầu nhẹ hơn nhiều.
// SalonsPage/SalonDetailPage kéo theo leaflet (bản đồ) -> tách riêng
const SalonsPage = lazy(() => import("./pages/SalonsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const SalonDetailPage = lazy(() => import("./pages/SalonDetailPage"));
const ForSalonsPage = lazy(() => import("./pages/ForSalonsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const FeedbackPage = lazy(() => import("./pages/FeedbackPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const DeleteAccountPage = lazy(() => import("./pages/DeleteAccountPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccessPage"));
const PaymentCancelPage = lazy(() => import("./pages/PaymentCancelPage"));
const SalonOverviewPage = lazy(() => import("./pages/salon/SalonOverviewPage"));
const SalonBookingsPage = lazy(() => import("./pages/salon/SalonBookingsPage"));
const SalonHairstylesPage = lazy(() => import("./pages/salon/SalonHairstylesPage"));
const SalonInsightsPage = lazy(() => import("./pages/salon/SalonInsightsPage"));
const SalonProfilePage = lazy(() => import("./pages/salon/SalonProfilePage"));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminCatalogPage = lazy(() => import("./pages/admin/AdminCatalogPage"));
const AdminSalonsPage = lazy(() => import("./pages/admin/AdminSalonsPage"));
const AdminSalonApplicationsPage = lazy(() => import("./pages/admin/AdminSalonApplicationsPage"));
const AdminBookingsPage = lazy(() => import("./pages/admin/AdminBookingsPage"));
const AdminSubscriptionsPage = lazy(() => import("./pages/admin/AdminSubscriptionsPage"));
const AdminPaymentsPage = lazy(() => import("./pages/admin/AdminPaymentsPage"));
const AdminFeedbackPage = lazy(() => import("./pages/admin/AdminFeedbackPage"));
const AdminAiReportsPage = lazy(() => import("./pages/admin/AdminAiReportsPage"));
const AdminUsagePage = lazy(() => import("./pages/admin/AdminUsagePage"));
const AdminAnalyticsPage = lazy(() => import("./pages/admin/AdminAnalyticsPage"));
const AdminGaPage = lazy(() => import("./pages/admin/AdminGaPage"));

// Luồng chính: / -> /scan -> /results -> /swap
export default function App() {
  const hydrate = useAuthStore((state) => state.hydrate);
  const hydrated = useAuthStore((state) => state.hydrated);
  const loginWithFacebook = useAuthStore((state) => state.loginWithFacebook);
  const navigate = useNavigate();
  const location = useLocation();

  // GA4: gắn thuộc tính người dùng + đánh dấu lưu lượng nội bộ (Admin/Tester) khi user thay đổi
  const gaUser = useAuthStore((state) => state.user);
  useEffect(() => {
    const role = gaUser?.role ? String(gaUser.role).toLowerCase() : "";
    setUserProps({ user_role: role || "guest" });
    markInternalTraffic(role === "admin" || role === "tester");
  }, [gaUser?.role]);

  // GA4: gửi page_view mỗi lần đổi route
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
  // Khởi tạo trực tiếp từ URL hash lúc render đầu (không setState đồng bộ trong effect)
  const [fbProcessing, setFbProcessing] = useState(() =>
    window.location.hash.includes("access_token=")
  );

  // Gọi hàm hydrate để kiểm tra token và tải thông tin user khi load/refresh trang
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Xử lý callback từ Facebook OAuth Redirect Flow (Đăng nhập Facebook).
  // Facebook redirect về đúng gốc domain kèm access_token trong URL hash
  // (vì dùng response_type=token, không dùng FB SDK/FedCM - xem AuthShell.jsx).
  // Lưu ý: mọi setFbProcessing bên dưới đều nằm trong callback bất đồng bộ
  // (.then/.catch/.finally), không gọi đồng bộ ngay trong thân effect.
  useEffect(() => {
    if (!window.location.hash.includes("access_token=")) return;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get("access_token");
    const oauthError = params.get("error");
    const redirectTo = sessionStorage.getItem("fbLoginRedirectTo") || "/profile";
    sessionStorage.removeItem("fbLoginRedirectTo");

    // Xóa access_token khỏi URL ngay để tránh lộ token qua lịch sử trình duyệt/URL
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    const run = async () => {
      if (oauthError) {
        alert("Đăng nhập Facebook đã bị hủy hoặc thất bại.");
        return;
      }
      if (!accessToken) return;
      try {
        await loginWithFacebook(accessToken);
        navigate(redirectTo);
      } catch (err) {
        alert(err.message || "Đăng nhập Facebook thất bại.");
      }
    };

    run().finally(() => setFbProcessing(false));
    // Chỉ chạy 1 lần khi component mount (đọc hash lúc redirect về)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hiển thị loading spinner cho đến khi đồng bộ xong trạng thái đăng nhập
  // (hoặc trong lúc đang xử lý callback đăng nhập Facebook)
  if (!hydrated || fbProcessing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="size-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative isolate">
      {/* Background mơ màng cho mỗi route - fixed, GPU compositor xử lý */}
      <SoftAurora intensity={1.05} />
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/check-email" element={<CheckEmailPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/salons" element={<SalonsPage />} />
        <Route path="/salons/:id" element={<SalonDetailPage />} />
        <Route path="/for-salons" element={<ForSalonsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/delete-account" element={<DeleteAccountPage />} />

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

        {/* Salon Owner Portal Routes (yêu cầu đăng nhập + role SALON_OWNER) */}
        <Route element={<SalonOwnerRoute />}>
          <Route element={<SalonPortalLayout />}>
            <Route path="/salon-portal" element={<SalonOverviewPage />} />
            <Route path="/salon-portal/bookings" element={<SalonBookingsPage />} />
            <Route path="/salon-portal/hairstyles" element={<SalonHairstylesPage />} />
            <Route path="/salon-portal/insights" element={<SalonInsightsPage />} />
            <Route path="/salon-portal/profile" element={<SalonProfilePage />} />
          </Route>
        </Route>

        {/* Admin Routes (yêu cầu đăng nhập + role ADMIN) */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/catalog" element={<AdminCatalogPage />} />
            <Route path="/admin/subscriptions" element={<AdminSubscriptionsPage />} />
            <Route path="/admin/payments" element={<AdminPaymentsPage />} />
            <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
            <Route path="/admin/ai-reports" element={<AdminAiReportsPage />} />
            <Route path="/admin/salons" element={<AdminSalonsPage />} />
            <Route path="/admin/salon-applications" element={<AdminSalonApplicationsPage />} />
            <Route path="/admin/bookings" element={<AdminBookingsPage />} />
            <Route path="/admin/usage" element={<AdminUsagePage />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
            <Route path="/admin/ga" element={<AdminGaPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </div>
  );
}

// Spinner giữa màn hình khi đang tải chunk của trang lazy
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="size-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
    </div>
  );
}
