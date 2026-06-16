// ===== Marquee Text =====
// Strip text chạy ngang vô tận. Pure CSS animation translateX(-50%).
// Duplicate nội dung 2 lần để seamless loop.
//
// Usage:
//   <MarqueeText items={["Scan", "Style", "Smile"]} />

import "./marquee-text.css";

export default function MarqueeText({
  items = [],
  // Thời gian 1 vòng (giây) — càng lớn càng chậm
  duration = 30,
  // Ký tự ngăn cách
  separator = "•",
  // Class cho text
  textClassName = "text-base font-semibold uppercase tracking-widest",
  className = "",
}) {
  // Tạo 1 chuỗi nội dung gồm items + separator
  const renderRow = (key) => (
    <div className="marquee__row" key={key} aria-hidden={key !== "main"}>
      {items.map((item, i) => (
        <span key={i} className="marquee__item">
          <span className={textClassName}>{item}</span>
          <span className="marquee__sep" aria-hidden="true">{separator}</span>
        </span>
      ))}
    </div>
  );

  return (
    <div
      className={`marquee ${className}`}
      style={{ "--marquee-duration": `${duration}s` }}
      role="marquee"
      aria-label={items.join(", ")}
    >
      <div className="marquee__track">
        {renderRow("main")}
        {renderRow("dup")}
      </div>
    </div>
  );
}
