import { Eye, Flash, TickCircle } from "iconsax-reactjs";

// Hỗ trợ dùng ảnh thật nếu có file src/assets/scan-sample.webp
const sampleModules = import.meta.glob("../assets/scan-sample.webp", { eager: true });
const sampleImg = sampleModules["../assets/scan-sample.webp"]?.default;

export default function ScanGuideIllustration({ className = "" }) {
  if (sampleImg) {
    return (
      <img
        src={sampleImg}
        alt="Ảnh mẫu chụp chuẩn để quét khuôn mặt"
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden bg-canvas ${className}`}
      aria-label="Khung hướng dẫn chụp ảnh chân dung"
    >
      {/* SVG silhouette đầu + vai, khung oval nét đứt, góc viewfinder và chấm landmark */}
      <svg
        viewBox="0 0 300 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full max-h-[380px] p-2"
      >
        {/* 4 góc ngắm (viewfinder) */}
        <path d="M 32 50 L 32 32 L 50 32" stroke="#ff57cf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        <path d="M 250 32 L 268 32 L 268 50" stroke="#ff57cf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        <path d="M 32 280 L 32 298 L 50 298" stroke="#ff57cf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        <path d="M 250 298 L 268 298 L 268 280" stroke="#ff57cf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />

        {/* Silhouette nét mảnh đầu & vai */}
        <path
          d="M 45 320 C 55 245 95 230 118 215 L 126 195 C 130 197 140 200 150 200 C 160 200 170 197 174 195 L 182 215 C 205 230 245 245 255 320"
          stroke="#1a1a1a"
          strokeOpacity="0.2"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Đầu / khuôn mặt line-art */}
        <path
          d="M 105 130 C 105 85 130 75 150 75 C 170 75 195 85 195 130 C 195 170 180 195 150 195 C 120 195 105 170 105 130 Z"
          stroke="#1a1a1a"
          strokeOpacity="0.2"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Khung oval nét đứt căn giữa vùng mặt */}
        <ellipse
          cx="150"
          cy="138"
          rx="56"
          ry="72"
          stroke="#ff57cf"
          strokeWidth="1.5"
          strokeDasharray="6 6"
          opacity="0.5"
        />

        {/* Trục đối xứng mờ */}
        <line x1="150" y1="60" x2="150" y2="215" stroke="#ff57cf" strokeWidth="1" strokeDasharray="3 3" opacity="0.25" />

        {/* Các chấm landmark mờ màu pink trên mắt, mũi, cằm, gò má */}
        <circle cx="132" cy="128" r="3" fill="#ff57cf" opacity="0.8" />
        <circle cx="168" cy="128" r="3" fill="#ff57cf" opacity="0.8" />
        <circle cx="150" cy="148" r="3" fill="#ff57cf" opacity="0.8" />
        <circle cx="150" cy="168" r="2.5" fill="#ff57cf" opacity="0.8" />
        <circle cx="150" cy="190" r="3.5" fill="#ff57cf" opacity="0.8" />
        <circle cx="114" cy="142" r="2.5" fill="#ff57cf" opacity="0.6" />
        <circle cx="186" cy="142" r="2.5" fill="#ff57cf" opacity="0.6" />
      </svg>

      {/* 3 gợi ý ngắn có icon iconsax dưới khung */}
      <div className="absolute bottom-3 inset-x-3 sm:inset-x-4 flex items-center justify-between gap-1 sm:gap-2 rounded-2xl bg-white/90 backdrop-blur-md px-2.5 py-2 border border-divider/20 text-[11px] font-medium text-mauve shadow-xs">
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <Eye size={13} className="text-pink shrink-0" />
          <span>Nhìn thẳng</span>
        </div>
        <span className="text-divider/60">•</span>
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <Flash size={13} className="text-pink shrink-0" />
          <span>Đủ sáng</span>
        </div>
        <span className="text-divider/60">•</span>
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <TickCircle size={13} className="text-pink shrink-0" />
          <span>Lộ trán & cằm</span>
        </div>
      </div>
    </div>
  );
}

