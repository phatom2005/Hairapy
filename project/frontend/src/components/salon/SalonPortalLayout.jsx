import { useState } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  Scissors,
  Store,
  LayoutDashboard,
  ExternalLink,
  Home,
  LogOut,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import useAuthStore from "../../store/useAuthStore";
import logoStack from "../../assets/logo/logo-stack.png";

const navItems = [
  { to: "/salon-portal", label: "Tổng quan", Icon: LayoutDashboard, end: true },
  { to: "/salon-portal/bookings", label: "Yêu cầu đặt lịch", Icon: Calendar },
  { to: "/salon-portal/hairstyles", label: "Kiểu tóc nhận làm", Icon: Scissors },
  { to: "/salon-portal/profile", label: "Hồ sơ salon", Icon: Store },
];

export default function SalonPortalLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-white transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <Link to="/salon-portal" className="flex items-center gap-2.5">
            <img src={logoStack} alt="Hairapy" className="size-8 object-contain" />
            <div>
              <span className="font-display text-sm font-extrabold tracking-tight text-ink block leading-none">
                HAIRAPY
              </span>
              <span className="text-[10px] font-bold text-pink uppercase tracking-wider block mt-0.5">
                Cổng Chủ Salon
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-mauve hover:bg-canvas lg:hidden cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-colors ${
                  isActive
                    ? "bg-pink text-white shadow-sm"
                    : "text-mauve hover:bg-canvas hover:text-ink"
                }`
              }
            >
              <item.Icon className="size-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="border-t border-line p-3 space-y-1 text-xs">
          {user?.salonId && (
            <Link
              to={`/salons/${user.salonId}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 font-semibold text-mauve hover:bg-canvas hover:text-pink transition-colors"
            >
              <ExternalLink className="size-4 shrink-0" />
              <span>Xem trang salon công khai</span>
            </Link>
          )}

          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 font-semibold text-mauve hover:bg-canvas hover:text-ink transition-colors"
          >
            <Home className="size-4 shrink-0" />
            <span>Về trang chủ Hairapy</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 rounded-xl px-3.5 py-2 font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="size-4 shrink-0" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-white/80 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-mauve hover:bg-canvas lg:hidden cursor-pointer"
            >
              <Menu className="size-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-ink">Salon Đối Tác</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink/10 border border-pink/20 text-pink font-semibold">
              <Sparkles className="size-3.5" />
              <span>Đối tác Hairapy AI</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-ink truncate max-w-[150px]">{user?.fullName || "Chủ salon"}</p>
              <p className="text-[10px] text-muted truncate max-w-[150px]">{user?.email}</p>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
