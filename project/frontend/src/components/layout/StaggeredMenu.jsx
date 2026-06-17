// ===== Staggered Menu (mobile only) =====
// Overlay fullscreen, items stagger fade-in/slide-up.
// Click ngoài hoặc X để đóng.
// Phụ thuộc <AnimatePresence> của parent (PillNav) — chỉ render khi open.

import { Link } from "react-router-dom";
import { motion } from "motion/react";
import Button from "../ui/Button";
import useAuthStore from "../../store/useAuthStore";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
  exit: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, y: 20, transition: { duration: 0.25 } },
};

export default function StaggeredMenu({ items, onClose }) {
  const { token, logout } = useAuthStore();
  return (
    <motion.div
      initial="hidden"
      animate="show"
      exit="exit"
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-canvas/95 backdrop-blur-xl md:hidden"
      onClick={onClose}
    >
      {/* Close button */}
      <motion.button
        variants={itemVariants}
        onClick={onClose}
        aria-label="Đóng menu"
        className="absolute right-6 top-6 flex size-12 items-center justify-center rounded-full bg-ink text-white shadow-lg"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </motion.button>

      {/* Menu items */}
      <motion.ul
        variants={containerVariants}
        className="flex flex-col items-center gap-6"
        onClick={(e) => e.stopPropagation()} // không đóng khi click vào item
      >
        {items.map((it) => (
          <motion.li key={it.label} variants={itemVariants}>
            <Link
              to={it.to}
              onClick={onClose}
              className="font-display text-5xl font-extrabold text-ink hover:text-brand"
            >
              {it.label}
            </Link>
          </motion.li>
        ))}

        {/* CTA group */}
        <motion.li variants={itemVariants} className="mt-8 flex flex-col items-center gap-4">
          {!token ? (
            <>
              <Link to="/login" onClick={onClose} className="text-base font-semibold text-mauve">
                Đăng nhập
              </Link>
              <Button to="/register" size="lg" onClick={onClose}>
                Bắt đầu ngay
              </Button>
            </>
          ) : (
            <>
              <Link to="/profile" onClick={onClose} className="text-base font-semibold text-mauve">
                Hồ sơ cá nhân
              </Link>
              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="text-base font-semibold text-[#ba1a1a]"
              >
                Đăng xuất
              </button>
            </>
          )}
        </motion.li>
      </motion.ul>
    </motion.div>
  );
}
