import { Suspense, useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Element3,
  People,
  Scissor,
  Shop,
  Crown1,
  ReceiptText,
  Star1,
  Flag,
  Activity,
  Chart,
  Global,
  Home2,
  Logout,
  DocumentText,
  Calendar,
  HamburgerMenu,
  Add,
} from "iconsax-reactjs";
import useAuthStore from "../../store/useAuthStore";
import logoStack from "../../assets/logo/logo-stack.png";

// Danh sách menu — icon Iconsax (Bold khi active, Linear khi thường)
const navItems = [
  { to: "/admin", label: "Dashboard", Icon: Element3, end: true },
  { to: "/admin/analytics", label: "Phân tích", Icon: Chart },
  { to: "/admin/ga", label: "Google Analytics", Icon: Global },
  { to: "/admin/users", label: "Người dùng", Icon: People },
  { to: "/admin/catalog", label: "Kho kiểu tóc", Icon: Scissor },
  { to: "/admin/salons", label: "Salon đối tác", Icon: Shop },
  { to: "/admin/salon-applications", label: "Đơn đối tác", Icon: DocumentText },
  { to: "/admin/bookings", label: "Lịch hẹn salon", Icon: Calendar },
  { to: "/admin/subscriptions", label: "Gói đăng ký", Icon: Crown1 },
  { to: "/admin/payments", label: "Lịch sử thanh toán", Icon: ReceiptText },
  { to: "/admin/feedback", label: "Đánh giá", Icon: Star1 },
  { to: "/admin/ai-reports", label: "Báo cáo AI", Icon: Flag },
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
  const [mobileOpen, setMobileOpen] = useState(false);

  // Đóng mobile drawer khi bấm phím Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

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

  const linkCls =
    "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold whitespace-nowrap transition-colors duration-200 [@media(max-height:900px)]:py-2.5";
  const labelCls = `overflow-hidden transition-all duration-300 ${
    collapsed ? "w-0 opacity-0" : "w-40 opacity-100"
  }`;

  return (
    <div className="flex min-h-screen gap-4 bg-canvas p-3 font-sans lg:gap-6 lg:p-4">
      {/* Sidebar trên Desktop (Ẩn hoàn toàn trên mobile để nhường 100% diện tích cho nội dung) */}
      <aside
        className={`sticky top-3 hidden h-[calc(100vh-1.5rem)] shrink-0 transition-[width] duration-300 ease-in-out lg:top-4 lg:flex lg:flex-col lg:h-[calc(100vh-2rem)] ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-white p-3 shadow-sm">
          <div className="mb-6 flex shrink-0 flex-col items-center [@media(max-height:900px)]:mb-3">
            <img
              src={logoStack}
              alt="Hairapy"
              className={`w-auto object-contain transition-all duration-300 ${
                collapsed ? "h-10" : "h-14"
              }`}
            />
            <p
              className={`overflow-hidden text-center text-[9px] font-bold uppercase tracking-widest text-muted transition-all duration-300 ${
                collapsed ? "mt-0 max-h-0 opacity-0" : "mt-2 max-h-6 opacity-100"
              }`}
            >
              Admin Management
            </p>
          </div>

          <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

          <div className="mt-3 flex shrink-0 flex-col gap-1 border-t border-line pt-3">
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
              className={`${linkCls} text-left text-red-600 hover:bg-red-50 cursor-pointer`}
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
          className="absolute -right-3 top-1/2 z-10 hidden size-6 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-mauve shadow-md transition-colors hover:bg-ink hover:text-white lg:flex cursor-pointer"
        >
          <DoubleChevron flip={collapsed} />
        </button>
      </aside>

      {/* Mobile Off-canvas Drawer Navigation */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop mờ */}
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          />

          {/* Khung Drawer trượt */}
          <div className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col bg-white p-4 shadow-2xl">
            {/* Header trong Drawer */}
            <div className="mb-3 flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <img src={logoStack} alt="Hairapy" className="h-9 w-auto object-contain" />
                <div>
                  <p className="text-sm font-bold text-ink">Hairapy Admin</p>
                  <p className="text-[10px] text-muted">Quản trị hệ thống</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-full p-1.5 text-mauve hover:bg-line/40 hover:text-ink transition cursor-pointer"
                aria-label="Đóng menu"
              >
                <Add size={20} className="rotate-45" />
              </button>
            </div>

            {/* Danh sách menu với đầy đủ nhãn chữ */}
            <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto no-scrollbar pr-1">
              {navItems.map(({ to, label, Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-ink text-white shadow-sm"
                        : "text-mauve hover:bg-canvas hover:text-ink"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={18} variant={isActive ? "Bold" : "Linear"} className="shrink-0" />
                      <span>{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Chân menu: Về trang chính + Đăng xuất */}
            <div className="mt-3 flex shrink-0 flex-col gap-1 border-t border-line pt-3">
              <NavLink
                to="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-mauve hover:bg-canvas hover:text-ink transition-colors"
              >
                <Home2 size={18} variant="Linear" className="shrink-0" />
                <span>Về trang chính</span>
              </NavLink>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
              >
                <Logout size={18} variant="Linear" className="shrink-0" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vùng nội dung */}
      <div className="min-w-0 flex-1">
        <header className="mb-4 sm:mb-5 flex items-center justify-between gap-3">
          {/* Nút Hamburger menu & Brand info trên mobile */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex size-10 items-center justify-center rounded-2xl border border-line bg-white text-ink shadow-xs transition hover:bg-canvas cursor-pointer active:scale-95"
              aria-label="Mở menu quản trị"
            >
              <HamburgerMenu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <img src={logoStack} alt="Hairapy" className="h-8 w-auto object-contain" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted font-display">Admin</span>
            </div>
          </div>

          {/* User profile info */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="text-right max-sm:hidden">
              <p className="text-sm font-bold leading-tight text-ink">{displayName}</p>
              <p className="text-xs text-muted">Quản trị viên</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white shadow-xs">
              {initial}
            </div>
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
