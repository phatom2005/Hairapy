// ===== Soft Aurora background =====
// Phiên bản CSS thuần (không WebGL) — perf cực tốt, an toàn cho mọi page.
// Dùng 3 lớp radial-gradient mờ nhẹ, animate vị trí chậm tạo cảm giác mơ màng.
// Respect prefers-reduced-motion: dừng anim khi user bật giảm chuyển động.

import "./soft-aurora.css";

export default function SoftAurora({
  className = "",
  // intensity: cường độ màu (0.0 → 1.0). Mặc định 0.55 cho cảm giác mềm.
  intensity = 0.55,
  // fixed: true → bám viewport (dùng cho global background)
  //        false → bám parent (dùng cho hero section riêng)
  fixed = true,
}) {
  const pos = fixed ? "fixed" : "absolute";
  return (
    <div
      aria-hidden="true"
      className={`soft-aurora pointer-events-none ${pos} inset-0 -z-10 overflow-hidden ${className}`}
      style={{ "--aurora-intensity": intensity }}
    >
      <div className="soft-aurora__blob soft-aurora__blob--pink" />
      <div className="soft-aurora__blob soft-aurora__blob--violet" />
      <div className="soft-aurora__blob soft-aurora__blob--blue" />
    </div>
  );
}
