// ===== Border Glow =====
// Viền gradient xoay vòng — cảm giác "live", thu hút mắt.
// Dùng @property cho phép animate conic-gradient angle (Chrome 85+, Safari 16.4+).
// Fallback: viền static gradient nếu browser cũ.
//
// Usage:
//   <BorderGlow rounded="rounded-full">
//     <button>CTA</button>
//   </BorderGlow>

import "./border-glow.css";

export default function BorderGlow({
  children,
  className = "",
  // Class bo góc — phải set đúng để inner khớp với outer
  rounded = "rounded-full",
  // Thời gian xoay 1 vòng (ms)
  duration = 4000,
  // Độ dày viền (px)
  thickness = 2,
}) {
  return (
    <div
      className={`border-glow ${rounded} ${className}`}
      style={{
        "--glow-duration": `${duration}ms`,
        "--glow-thickness": `${thickness}px`,
      }}
    >
      <div className={`border-glow__inner ${rounded}`}>{children}</div>
    </div>
  );
}
