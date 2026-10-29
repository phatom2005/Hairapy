// ===== Pill Nav =====
// Navbar dạng pill, có indicator trượt mượt giữa các item dùng motion layoutId.
// Mobile: hamburger mở StaggeredMenu overlay full màn.
//
// Replace cho Navbar.jsx cũ. Giữ nguyên API items={[{label, to}]}.

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import UserAvatar from "../ui/UserAvatar";
import useAuthStore from "../../store/useAuthStore";
import Button from "../ui/Button";
import Logo from "./Logo";
import StaggeredMenu from "./StaggeredMenu";
import "../animated/border-glow.css";

const DEFAULT_ITEMS = [
  { label: "Tính năng", to: "/#features" },
  { label: "Bộ sưu tập", to: "/catalog" },
  { label: "Salon", to: "/salons" },
  { label: "Premium", to: "/pricing" },
];

export default function PillNav({ items = DEFAULT_ITEMS }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { token, user, logout } = useAuthStore();

  // Resolve active item theo URL (so sánh path bỏ hash)
  const activeLabel = items.find((it) => {
    const path = it.to.split("#")[0];
    return (
      path === location.pathname || (path === "/" && location.pathname === "/")
    );
  })?.label;

  return (
    <>
      <header className="sticky top-3 sm:top-4 z-50 px-3 sm:px-6 transition-all duration-300">
        <div className="relative mx-auto max-w-[1260px] w-full">
          {/* Animated LED Border Glow Wrapper (dải LED chuyển động quanh viền) */}
          <div
            className="navbar-glow rounded-full w-full block transition-all"
            style={{
              "--glow-duration": "6000ms",
              "--glow-thickness": "2px",
            }}
          >
            {/* The Floating Glass Pill - Kính mờ trong suốt (bg-white/60 + backdrop-blur-xl) */}
            <nav className="flex h-16 sm:h-[68px] w-full items-center justify-between rounded-full bg-white/60 px-5 sm:px-8 shadow-xs backdrop-blur-xl backdrop-saturate-150 transition-all">
              <Logo className="h-10 sm:h-12 w-auto hover:opacity-90 transition-opacity" />

              {/* Desktop: pill nav với sliding indicator */}
              <div className="hidden md:flex">
                <div className="relative flex items-center gap-1 rounded-full border border-line/60 bg-white/50 p-1 shadow-2xs backdrop-blur-sm">
                  {items.map((it) => {
                    const isActive = activeLabel === it.label;
                    return (
                      <NavLink
                        key={it.label}
                        to={it.to}
                        className="relative rounded-full px-5 py-2 text-sm font-semibold transition-colors"
                      >
                        {/* Indicator viên thuốc trượt — dùng layoutId để motion tween */}
                        {isActive && (
                          <motion.span
                            layoutId="pill-nav-indicator"
                            className="absolute inset-0 rounded-full bg-gradient-to-br from-pink to-brand shadow-sm"
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 30,
                            }}
                          />
                        )}
                        <span
                          className={`relative z-10 transition-colors ${
                            isActive
                              ? "text-white"
                              : "text-mauve hover:text-ink font-semibold"
                          }`}
                        >
                          {it.label}
                        </span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>

              {/* Right side: login + CTA + profile (desktop) | hamburger (mobile) */}
              <div className="hidden items-center gap-4 md:flex">
                {!token ? (
                  <>
                    <Link
                      to="/login"
                      className="text-sm font-semibold text-mauve hover:text-ink transition-colors"
                    >
                      Đăng nhập
                    </Link>
                    <Button to="/register" size="sm">
                      Bắt đầu ngay
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    {user?.role === "SALON_OWNER" && (
                      <Link
                        to="/salon-portal"
                        className="rounded-full px-3 py-1.5 text-xs font-bold bg-pink/15 text-pink border border-pink/30 hover:bg-pink hover:text-white transition-colors"
                      >
                        Cổng Salon
                      </Link>
                    )}
                    <Link
                      to="/profile"
                      aria-label="Tài khoản"
                      className="group flex items-center gap-2"
                    >
                      <UserAvatar
                        name={user?.fullName}
                        email={user?.email}
                        plan={user?.plan}
                        size="sm"
                        className="border-2 border-white group-hover:ring-2 group-hover:ring-primary/40 transition-all"
                      />
                    </Link>
                    <button
                      onClick={logout}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold text-[#ba1a1a] hover:bg-[#ba1a1a]/10 transition-colors cursor-pointer"
                    >
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(true)}
                aria-label="Mở menu"
                className="flex size-9 items-center justify-center rounded-full bg-line/60 text-ink hover:bg-line transition-colors md:hidden cursor-pointer"
              >
                <Hamburger />
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile overlay menu */}
      <AnimatePresence>
        {mobileOpen && (
          <StaggeredMenu items={items} onClose={() => setMobileOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

function Hamburger() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}
