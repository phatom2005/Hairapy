// ===== Pill Nav =====
// Navbar dạng pill, có indicator trượt mượt giữa các item dùng motion layoutId.
// Mobile: hamburger mở StaggeredMenu overlay full màn.
//
// Replace cho Navbar.jsx cũ. Giữ nguyên API items={[{label, to}]}.

import { useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import Logo from "./Logo";
import Button from "../ui/Button";
import StaggeredMenu from "./StaggeredMenu";
import { PROFILE_IMG } from "../../lib/figmaAssets";

const DEFAULT_ITEMS = [
  { label: "Tính năng", to: "/#features" },
  { label: "Bộ sưu tập", to: "/catalog" },
  { label: "Premium", to: "/pricing" },
];

export default function PillNav({ items = DEFAULT_ITEMS }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Resolve active item theo URL (so sánh path bỏ hash)
  const activeLabel = items.find((it) => {
    const path = it.to.split("#")[0];
    return path === location.pathname || (path === "/" && location.pathname === "/");
  })?.label;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-divider/20 bg-canvas/80 shadow-sm backdrop-blur-md">
        <nav className="mx-auto flex h-20 max-w-[1200px] items-center justify-between px-6 sm:px-16">
          <Logo />

          {/* Desktop: pill nav với sliding indicator */}
          <div className="hidden md:flex">
            <div className="relative flex items-center gap-1 rounded-full border border-divider/40 bg-white/60 p-1.5 shadow-sm backdrop-blur">
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
                        className="absolute inset-0 rounded-full bg-gradient-to-br from-pink to-brand shadow-md"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span
                      className={`relative z-10 ${
                        isActive ? "text-white" : "text-mauve hover:text-ink"
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
            <Link to="/login" className="text-sm font-semibold text-mauve hover:text-ink">
              Đăng nhập
            </Link>
            <Button to="/register" size="sm">Bắt đầu ngay</Button>
            <Link to="/profile" aria-label="Tài khoản">
              <img
                src={PROFILE_IMG}
                alt=""
                className="size-9 rounded-full border-2 border-white object-cover shadow"
              />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Mở menu"
            className="flex size-10 items-center justify-center rounded-full bg-white shadow md:hidden"
          >
            <Hamburger />
          </button>
        </nav>
      </header>

      {/* Mobile overlay menu */}
      <AnimatePresence>
        {mobileOpen && (
          <StaggeredMenu
            items={items}
            onClose={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function Hamburger() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}
