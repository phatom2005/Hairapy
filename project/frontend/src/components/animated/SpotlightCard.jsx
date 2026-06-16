// ===== Spotlight Card =====
// Card với vệt sáng tròn bám theo chuột (kiểu Linear, Vercel).
// Pure CSS + mousemove → cực nhẹ.
//
// Usage:
//   <SpotlightCard>...</SpotlightCard>
//   <SpotlightCard spotlightColor="rgba(255, 87, 207, 0.18)">...</SpotlightCard>

import { useRef } from "react";
import "./spotlight-card.css";

export default function SpotlightCard({
  children,
  className = "",
  // Màu spotlight — mặc định hồng nhạt theo brand
  spotlightColor = "rgba(255, 87, 207, 0.18)",
  // Bán kính vệt sáng (px)
  size = 500,
}) {
  const ref = useRef(null);

  const handleMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ref.current.style.setProperty("--spotlight-x", `${x}px`);
    ref.current.style.setProperty("--spotlight-y", `${y}px`);
    ref.current.style.setProperty("--spotlight-opacity", "1");
  };

  const handleLeave = () => {
    if (!ref.current) return;
    ref.current.style.setProperty("--spotlight-opacity", "0");
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`spotlight-card ${className}`}
      style={{
        "--spotlight-color": spotlightColor,
        "--spotlight-size": `${size}px`,
      }}
    >
      {children}
    </div>
  );
}
