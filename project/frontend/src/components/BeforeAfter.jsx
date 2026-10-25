import { useState } from "react";

/**
 * Component so sánh ảnh trước / sau bằng thanh kéo trượt (Before / After slider).
 * Hỗ trợ cảm ứng trên thiết bị di động và chuột trên máy tính qua thẻ range input.
 */
export default function BeforeAfter({
  beforeImage,
  afterImage,
  beforeLabel = "Ảnh gốc",
  afterLabel = "Sau khi thử",
  className = "",
}) {
  const [sliderPos, setSliderPos] = useState(50);

  return (
    <div
      className={`relative select-none overflow-hidden rounded-2xl bg-zinc-950 ${className}`}
      style={{ touchAction: "none" }}
    >
      {/* Ảnh gốc (Before) ở dưới cùng */}
      <img
        src={beforeImage}
        alt={beforeLabel}
        className="pointer-events-none block h-full w-full object-cover"
        draggable={false}
      />

      {/* Ảnh sau khi thử (After) nằm đè lên, cắt theo clip-path */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
        }}
      >
        <img
          src={afterImage}
          alt={afterLabel}
          className="pointer-events-none block h-full w-full object-cover"
          draggable={false}
        />
      </div>

      {/* Đường phân cách giữa 2 ảnh */}
      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-8 rounded-full bg-white shadow-lg flex items-center justify-center text-ink text-xs font-bold border border-black/10">
          <svg
            className="size-4 text-zinc-700"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="8 7 3 12 8 17" />
            <polyline points="16 7 21 12 16 17" />
          </svg>
        </div>
      </div>

      {/* Nhãn Trước / Sau */}
      <span className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-white/90 z-10">
        {sliderPos > 25 ? beforeLabel : ""}
      </span>
      <span className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-white/90 z-10">
        {sliderPos < 75 ? afterLabel : ""}
      </span>

      {/* Slider ẩn bắt sự kiện kéo chuột và vuốt chạm (touch) */}
      <input
        type="range"
        min="0"
        max="100"
        value={sliderPos}
        onChange={(e) => setSliderPos(Number(e.target.value))}
        className="absolute inset-0 h-full w-full opacity-0 cursor-ew-resize z-20"
        aria-label="Thanh trượt so sánh trước sau"
      />
    </div>
  );
}
