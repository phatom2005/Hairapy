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
  Chart,
  Home2,
  Logout,
} from "iconsax-reactjs";
import useAuthStore from "../../store/useAuthStore";
import logoStack from "../../assets/logo/logo-stack.png";

// Danh sách menu — icon Iconsax (Bold khi active, Linear khi thường)
const navItems = [
  { to: "/admin", label: "Dashboard", Icon: Element3, end: true },
  { to: "/admin/analytics", label: "Phân tích", Icon: Chart },
  { to: "/admin/users", label: "Người dùng", Icon: People },
  { to: "/admin/catalog", label: "Kho kiểu tóc", Icon: Scissor },
  { to: "/admin/salons", label: "Salon đối tác", Icon: Shop },
  { to: "/admin/subscriptions", label: "Gói đăng ký", Icon: Crown1 },
  { to: "/admin/payments", label: "Lịch sử thanh toán", Icon: ReceiptText },
  { to: "/admin/feedback", label: "Đánh giá", Icon: Star1 },
  { to: "/admin/usage", label: "Nhật ký sử dụng", Icon: Activity },
];

const STORAGE_KEY = "admin-sidebar-collapsed";

// Đọc trạng thái thu gọn đã lưu (bọc try/catch phòng khi trình duyệt chặn storage)
const readCollapsed = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

// Icon "«" / "»" cho nút thu gọn
function DoubleChevron({ flip }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform duration-300 ${flip ? "rotate-180" : ""}`}
    >
      <polyline points="11 17 6 12 11 7" />
      <polyline points="18 17 13 12 18 7" />
    </svg>
  );
}

export default function AdminLayout() {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const displayName = user?.fullName || user?.name || user?.email || "Admin";
  const initial = displayName.trim().charAt(0).toUpperCase();

  // Icon luôn đứng yên ở vị trí cố định (aside p-3 + link px-3.5 → icon cách mép 26px),
  // chỉ có chiều rộng aside và nhãn chữ thay đổi → không bị giật/nhảy chữ khi animate.
  const linkCls =
    "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold whitespace-nowrap transition-colors duration-200";
  // Nhãn: thu gọn → mờ dần + rộng 0 (dưới lg luôn thu gọn)
  const labelCls = `overflow-hidden transition-all duration-300 ${
    collapsed ? "w-0 opacity-0" : "w-40 opacity-100 max-lg:w-0 max-lg:opacity-0"
  }`;

  return (
    <div className="flex min-h-screen gap-4 bg-canvas p-3 font-sans lg:gap-6 lg:p-4">
      <aside
        className={`sticky top-3 h-[calc(100vh-1.5rem)] shrink-0 transition-[width] duration-300 ease-in-out lg:top-4 lg:h-[calc(100vh-2rem)] ${
          collapsed ? "w-[72px]" : "w-[72px] lg:w-64"
        }`}
      >
        <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-white p-3 shadow-sm">
          <div className="mb-6 flex flex-col items-center">
            <img
              src={logoStack}
              alt="Hairapy"
              className={`w-auto object-contain transition-all duration-300 ${
                collapsed ? "h-10" : "h-10 lg:h-14"
              }`}
            />
            <p
              className={`overflow-hidden text-center text-[9px] font-bold uppercase tracking-widest text-muted transition-all duration-300 ${
                collapsed ? "mt-0 max-h-0 opacity-0" : "mt-2 max-h-0 opacity-0 lg:max-h-6 lg:opacity-100"
              }`}
            >
              Admin Management
            </p>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
            {navItems.map(({ to, label, Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={label}
                className={({ isActive }) =>
                  `${linkCls} ` +
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
            <NavLink
              to="/"
              title="Về trang chính"
              className={`${linkCls} text-mauve/80 hover:bg-canvas hover:text-ink`}
            >
              <Home2 size={20} variant="Linear" className="shrink-0" />
              <span className={labelCls}>Về trang chính</span>
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              title="Đăng xuất"
              className={`${linkCls} text-left text-red-600 hover:bg-red-50`}
            >
              <Logout size={20} variant="Linear" className="shrink-0" />
              <span className={labelCls}>Đăng xuất</span>
            </button>
          </div>
        </div>

        {/* Nút « / » nằm giữa cạnh phải sidebar (chỉ hiện từ lg) */}
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          className="absolute -right-3 top-1/2 z-10 hidden size-6 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-mauve shadow-md transition-colors hover:bg-ink hover:text-white lg:flex"
        >
          <DoubleChevron flip={collapsed} />
        </button>
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
