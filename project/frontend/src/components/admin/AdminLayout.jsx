import { Suspense, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Element3,
  People,
  Scissor,
  Shop,
  Crown1,
  ReceiptText,
  Star1,
  Activity,
  Home2,
  Logout,
  ArrowLeft2,
  ArrowRight2,
} from "iconsax-reactjs";
import useAuthStore from "../../store/useAuthStore";
import logoStack from "../../assets/logo/logo-stack.png";

// Danh sách menu — icon Iconsax (variant Bulk khi active, Linear khi thường)
const navItems = [
  { to: "/admin", label: "Dashboard", Icon: Element3, end: true },
  { to: "/admin/users", label: "Người dùng", Icon: People },
  { to: "/admin/catalog", label: "Kho kiểu tóc", Icon: Scissor },
  { to: "/admin/salons", label: "Salon đối tác", Icon: Shop },
  { to: "/admin/subscriptions", label: "Gói đăng ký", Icon: Crown1 },
  { to: "/admin/payments", label: "Lịch sử thanh toán", Icon: ReceiptText },
  { to: "/admin/feedback", label: "Đánh giá", Icon: Star1 },
  { to: "/admin/usage", label: "Nhật ký sử dụng", Icon: Activity },
];

const STORAGE_KEY = "admin-sidebar-collapsed";

// Đọc trạng thái thu gọn đã lưu (có thể lỗi khi chặn storage nên bọc try/catch)
const readCollapsed = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

export default function AdminLayout() {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  // Thu gọn sidebar thành icon-only (dưới lg luôn thu gọn)
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* bỏ qua nếu không ghi được storage */
      }
      return next;
    });
  };

  // Class dùng chung cho mục menu: thu gọn → căn giữa icon, ẩn chữ
  const linkBase =
    "group flex items-center gap-3 rounded-2xl py-3 text-sm font-semibold transition-all duration-200 " +
    (collapsed ? "justify-center px-0" : "px-3.5 max-lg:justify-center max-lg:px-0");
  const labelCls = collapsed ? "hidden" : "max-lg:hidden";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const displayName = user?.fullName || user?.name || user?.email || "Admin";
  const initial = displayName.trim().charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen gap-4 bg-canvas p-3 font-sans lg:gap-6 lg:p-4">
      {/* Sidebar nổi, bo góc — chỉ hiện icon khi màn hình < lg */}
      <aside
        className={`sticky top-3 flex h-[calc(100vh-1.5rem)] shrink-0 flex-col rounded-3xl border border-line bg-white p-3 shadow-sm transition-[width] duration-300 lg:top-4 lg:h-[calc(100vh-2rem)] lg:p-4 ${
          collapsed ? "w-16 lg:w-[72px]" : "w-16 lg:w-64"
        }`}
      >
        <div className="mb-6 flex flex-col items-center">
          <img
            src={logoStack}
            alt="Hairapy"
            className={`w-auto object-contain ${collapsed ? "h-10" : "h-10 lg:h-14"}`}
          />
          <p
            className={`mt-2 text-center text-[9px] font-bold uppercase tracking-widest text-muted ${
              collapsed ? "hidden" : "hidden lg:block"
            }`}
          >
            Admin Management
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {navItems.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className={({ isActive }) =>
                `${linkBase} ` +
                (isActive
                  ? "bg-ink text-white shadow-md"
                  : "text-mauve/80 hover:bg-canvas hover:text-ink")
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} variant={isActive ? "Bold" : "Linear"} className="shrink-0" />
                  <span className={labelCls}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
            aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
            className={`${linkBase} hidden text-mauve/80 hover:bg-canvas hover:text-ink lg:flex`}
          >
            {collapsed ? (
              <ArrowRight2 size={20} variant="Linear" className="shrink-0" />
            ) : (
              <ArrowLeft2 size={20} variant="Linear" className="shrink-0" />
            )}
            <span className={labelCls}>Thu gọn menu</span>
          </button>
          <NavLink
            to="/"
            title="Về trang chính"
            className={`${linkBase} text-mauve/80 hover:bg-canvas hover:text-ink`}
          >
            <Home2 size={20} variant="Linear" className="shrink-0" />
            <span className={labelCls}>Về trang chính</span>
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            title="Đăng xuất"
            className={`${linkBase} text-left text-red-600 hover:bg-red-50`}
          >
            <Logout size={20} variant="Linear" className="shrink-0" />
            <span className={labelCls}>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Vùng nội dung */}
      <div className="min-w-0 flex-1">
        <header className="mb-5 flex items-center justify-end gap-3">
          <div className="text-right max-sm:hidden">
            <p className="text-sm font-bold leading-tight text-ink">{displayName}</p>
            <p className="text-xs text-muted">Quản trị viên</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
            {initial}
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1280px]">
          <Suspense
            fallback={
              <div className="flex h-[50vh] items-center justify-center">
                <div className="size-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
