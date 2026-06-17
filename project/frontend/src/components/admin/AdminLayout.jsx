import { NavLink, Outlet, useNavigate } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";
import {
  DashboardIcon,
  UsersIcon,
  ScissorsIcon,
  CrownIcon,
  ActivityIcon,
  HomeIcon
} from "../icons";
import logoStack from "../../assets/logo/logo-stack.png";

export default function AdminLayout() {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { to: "/admin", label: "Dashboard", icon: <DashboardIcon />, end: true },
    { to: "/admin/users", label: "Người dùng", icon: <UsersIcon /> },
    { to: "/admin/catalog", label: "Kho kiểu tóc", icon: <ScissorsIcon /> },
    { to: "/admin/subscriptions", label: "Gói đăng ký", icon: <CrownIcon /> },
    { to: "/admin/usage", label: "Nhật ký sử dụng", icon: <ActivityIcon /> },
  ];

  return (
    <div className="flex min-h-screen bg-canvas font-sans">
      {/* Sidebar cố định bên trái */}
      <aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-line bg-white p-6 shadow-sm">
        {/* Logo & Subtitle */}
        <div className="mb-8 px-2 flex flex-col items-center">
          <img src={logoStack} alt="Hairapy Logo" className="h-16 w-auto object-contain" />
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted mt-3 text-center">
            Admin Management
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-1 flex-col gap-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 text-sm font-semibold transition-all duration-200 rounded-2xl ` +
                (isActive
                  ? "bg-pink/10 text-magenta shadow-sm"
                  : "text-mauve/80 hover:bg-canvas hover:text-ink")
              }
            >
              <span className="shrink-0">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="mt-auto flex flex-col gap-1.5 pt-4 border-t border-line">
          <NavLink
            to="/"
            className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold text-mauve/80 transition-all rounded-2xl hover:bg-canvas hover:text-ink"
          >
            <HomeIcon />
            Về trang chính
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3.5 px-4 py-3 text-left text-sm font-semibold text-red-600 transition-all rounded-2xl hover:bg-red-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Vùng hiển thị nội dung chính bên phải */}
      <main className="flex-1 p-8 overflow-y-auto max-w-[1200px] mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
