// ===== Staggered Menu (mobile only) =====
// Overlay fullscreen, items stagger fade-in/slide-up.
// Click ngoài hoặc X để đóng.
// Phụ thuộc <AnimatePresence> của parent (PillNav) — chỉ render khi open.

import { Link } from "react-router-dom";
import { motion } from "motion/react";
import Button from "../ui/Button";
import UserAvatar from "../ui/UserAvatar";
import useAuthStore from "../../store/useAuthStore";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
  exit: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  exit: { opacity: 0, y: 15, transition: { duration: 0.2 } },
};

export default function StaggeredMenu({ items, onClose }) {
  const { token, user, logout } = useAuthStore();

  return (
    <motion.div
      initial="hidden"
      animate="show"
      exit="exit"
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-y-auto px-6 py-12 bg-canvas/98 backdrop-blur-2xl md:hidden"
      onClick={onClose}
    >
      {/* Close button */}
      <motion.button
        variants={itemVariants}
        onClick={onClose}
        aria-label="Đóng menu"
        className="fixed right-5 top-5 z-20 flex size-11 items-center justify-center rounded-full bg-ink text-white shadow-lg cursor-pointer active:scale-95 transition-transform"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </motion.button>

      {/* Menu items container */}
      <motion.ul
        variants={containerVariants}
        className="flex w-full max-w-xs flex-col items-center gap-4 my-auto"
        onClick={(e) => e.stopPropagation()} // không đóng khi click vào item
      >
        {/* User Card when logged in */}
        {token && user && (
          <motion.li variants={itemVariants} className="w-full mb-3">
            <Link
              to="/profile"
              onClick={onClose}
              className="flex items-center gap-3.5 p-3 rounded-2xl border border-line bg-white shadow-xs hover:border-pink transition-colors"
            >
              <UserAvatar name={user.fullName} email={user.email} plan={user.plan} size="md" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-ink truncate">{user.fullName || "Người dùng"}</p>
                <p className="text-xs text-mauve truncate">{user.email}</p>
                <span className="inline-block mt-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-pink/15 text-pink border border-pink/30">
                  {user.plan === "PREMIUM" ? "Gói Tháng • Premium" : user.plan === "PRO" ? "Gói Tuần • PRO" : "Gói Miễn Phí"}
                </span>
              </div>
            </Link>
          </motion.li>
        )}

        {items.map((it) => (
          <motion.li key={it.label} variants={itemVariants} className="w-full text-center">
            <Link
              to={it.to}
              onClick={onClose}
              className="block py-2 font-display text-2xl sm:text-3xl font-extrabold text-ink hover:text-brand transition-colors"
            >
              {it.label}
            </Link>
          </motion.li>
        ))}

        {/* CTA group */}
        <motion.li variants={itemVariants} className="mt-4 flex w-full flex-col items-center gap-3 pt-4 border-t border-divider/20">
          {!token ? (
            <>
              <Link to="/login" onClick={onClose} className="text-sm font-semibold text-mauve hover:text-ink">
                Đăng nhập
              </Link>
              <Button to="/register" size="md" onClick={onClose} className="w-full shadow-md">
                Bắt đầu ngay
              </Button>
            </>
          ) : (
            <div className="flex w-full items-center justify-between gap-3 px-2">
              <Link to="/profile" onClick={onClose} className="text-sm font-semibold text-primary hover:underline">
                Xem Hồ Sơ →
              </Link>
              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="text-sm font-semibold text-[#ba1a1a] hover:underline cursor-pointer"
              >
                Đăng xuất
              </button>
            </div>
          )}
        </motion.li>
      </motion.ul>
    </motion.div>
  );
}
