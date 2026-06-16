// ===== Animated Content =====
// Wrap quanh bất kỳ block để fade-up khi scroll vào viewport.
// Dùng motion's whileInView → IntersectionObserver tự xử lý.
//
// Usage:
//   <AnimatedContent>
//     <YourSection />
//   </AnimatedContent>
//
//   <AnimatedContent delay={0.2} y={60}>...</AnimatedContent>

import { motion } from "motion/react";

export default function AnimatedContent({
  children,
  delay = 0,
  duration = 0.6,
  // Khoảng cách dịch chuyển ban đầu (px)
  y = 40,
  // Trigger 1 lần thôi (đỡ rerun khi scroll qua lại)
  once = true,
  // Khi nào trigger: "-100px" = trước khi vào viewport 100px
  margin = "-80px",
  className = "",
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin }}
      transition={{ duration, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
