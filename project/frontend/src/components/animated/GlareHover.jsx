// ===== Glare Hover =====
// Vệt sáng chéo lướt qua khi hover (kiểu thẻ ngân hàng/Apple Card).
// CSS thuần — không JS runtime cost.
//
// Usage:
//   <GlareHover>...</GlareHover>

import "./glare-hover.css";

export default function GlareHover({
  children,
  className = "",
  // Thời gian lướt (ms)
  duration = 700,
}) {
  return (
    <div
      className={`glare-hover ${className}`}
      style={{ "--glare-duration": `${duration}ms` }}
    >
      {children}
    </div>
  );
}
