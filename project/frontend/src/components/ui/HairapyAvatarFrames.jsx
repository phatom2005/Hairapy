
import { useId } from "react";
import "./avatar-frames.css";

/**
 * Khung viền PRO (Gói Tuần - 7 ngày)
 * Thiết kế: 4 ngôi sao kim cương 4 hướng (12h, 3h, 6h, 9h) viền vàng Champagne, dải ribbon công nghệ xanh-hồng và huy hiệu chữ PRO tinh xảo phía dưới.
 */
export function AvatarFramePro({
  animated = true,
  showLabel = true,
  showBottomStar = true,
  className = "",
}) {
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, "");

  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden="true"
      className={`pointer-events-none select-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[143%] h-[143%] z-10 ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id={`proGlow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        <linearGradient id={`proGold-${id}`} x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffd775" />
          <stop offset="25%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#b8811d" />
          <stop offset="75%" stopColor="#ffd775" />
          <stop offset="100%" stopColor="#b8811d" />
        </linearGradient>

        <linearGradient id={`proRibbon-${id}`} x1="0" y1="20" x2="200" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1039da" />
          <stop offset="50%" stopColor="#ff57cf" />
          <stop offset="100%" stopColor="#1039da" />
        </linearGradient>

        <linearGradient id={`proGem-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#ff57cf" />
          <stop offset="100%" stopColor="#9c0075" />
        </linearGradient>
      </defs>

      {/* Vòng hào quang phát sáng mềm mại */}
      <circle
        cx="100"
        cy="100"
        r="76"
        stroke="#ff57cf"
        strokeWidth="3"
        opacity="0.45"
        filter={`url(#proGlow-${id})`}
        className={animated ? "hairapy-frame-pulse" : ""}
      />

      {/* Vòng viền kim loại vàng ngoài */}
      <circle cx="100" cy="100" r="77" stroke={`url(#proGold-${id})`} strokeWidth="2.2" />

      {/* Vòng Ribbon màu thương hiệu xoay nhẹ */}
      <circle
        cx="100"
        cy="100"
        r="73.5"
        stroke={`url(#proRibbon-${id})`}
        strokeWidth="4.5"
        strokeDasharray="120 6"
        className={animated ? "hairapy-frame-spin" : ""}
      />

      {/* Vòng viền trong mạ vàng */}
      <circle cx="100" cy="100" r="69.5" stroke={`url(#proGold-${id})`} strokeWidth="1.8" />

      {/* 3 Ngôi sao kim cương hướng trên, trái, phải */}
      {[
        [100, 23],
        [23, 100],
        [177, 100],
      ].map(([x, y], idx) => (
        <g key={idx} transform={`translate(${x}, ${y})`} filter={`url(#proGlow-${id})`}>
          <path
            d="M0 -15 L4.5 -4.5 L15 0 L4.5 4.5 L0 15 L-4.5 4.5 L-15 0 L-4.5 -4.5 Z"
            fill={`url(#proGold-${id})`}
            stroke="#b8811d"
            strokeWidth="0.8"
          />
          <path d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3 Z" fill={`url(#proGem-${id})`} />
          <circle cx="-1.5" cy="-2" r="1.5" fill="#ffffff" opacity="0.9" />
        </g>
      ))}

      {/* Ngôi sao đáy (chỉ hiện khi không có nhãn chữ và cho phép hiện sao đáy) */}
      {!showLabel && showBottomStar && (
        <g transform="translate(100, 177)" filter={`url(#proGlow-${id})`}>
          <path
            d="M0 -15 L4.5 -4.5 L15 0 L4.5 4.5 L0 15 L-4.5 4.5 L-15 0 L-4.5 -4.5 Z"
            fill={`url(#proGold-${id})`}
            stroke="#b8811d"
            strokeWidth="0.8"
          />
          <path d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3 Z" fill={`url(#proGem-${id})`} />
          <circle cx="-1.5" cy="-2" r="1.5" fill="#ffffff" opacity="0.9" />
        </g>
      )}

      {/* HUY HIỆU CHỮ "PRO" DƯỚI KHUNG VIỀN (ĐÃ TĂNG 1.25x) */}
      {showLabel && (
        <g transform="translate(100, 185)" filter={`url(#proGlow-${id})`}>
          {/* Nền cartouche bo tròn mạ vàng */}
          <rect
            x="-36"
            y="-11"
            width="72"
            height="22"
            rx="11"
            fill="#0b0e19"
            stroke={`url(#proGold-${id})`}
            strokeWidth="1.4"
          />
          {/* Lớp nền neon gradient mờ phía trong */}
          <rect
            x="-33"
            y="-8.5"
            width="66"
            height="17"
            rx="8.5"
            fill={`url(#proRibbon-${id})`}
            opacity="0.32"
          />
          {/* Chữ PRO to x1.25 sắc nét */}
          <text
            x="0"
            y="4.2"
            textAnchor="middle"
            fontFamily="'Unbounded', 'Be Vietnam Pro', system-ui, sans-serif"
            fontWeight="700"
            fontSize="12"
            fill="#ffffff"
            letterSpacing="1.2"
          >
            PRO
          </text>
          {/* Hạt ngọc vàng hai bên */}
          <circle cx="-26" cy="0" r="1.5" fill="#ffd775" />
          <circle cx="26" cy="0" r="1.5" fill="#ffd775" />
        </g>
      )}

      {/* Hạt sao lấp lánh phụ */}
      <circle cx="16" cy="74" r="1.8" fill="#e1ff97" className={animated ? "hairapy-frame-twinkle-1" : ""} />
      <circle cx="184" cy="126" r="1.8" fill="#e1ff97" className={animated ? "hairapy-frame-twinkle-2" : ""} />
      <circle cx="28" cy="128" r="1.2" fill="#ffffff" className={animated ? "hairapy-frame-twinkle-2" : ""} />
      <circle cx="172" cy="72" r="1.2" fill="#ffffff" className={animated ? "hairapy-frame-twinkle-1" : ""} />
    </svg>
  );
}

/**
 * Khung viền PREMIUM (Gói Tháng - 30 ngày)
 * Thiết kế: Vương miện Haute Tiara uốn lượn thanh mảnh, ngọc Marquise Ruby, đôi cánh thiên thần và huy hiệu chữ PREMIUM mạ vàng sang trọng phía dưới.
 */
export function AvatarFramePremium({
  animated = true,
  showLabel = true,
  showBottomGem = true,
  className = "",
}) {
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, "");

  return (
    <svg
      viewBox="0 0 200 226"
      aria-hidden="true"
      className={`pointer-events-none select-none absolute left-1/2 -translate-x-1/2 -top-[32%] w-[143%] h-[161%] z-10 ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id={`premGlow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        <linearGradient id={`premGold-${id}`} x1="0" y1="0" x2="200" y2="220" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffd775" />
          <stop offset="25%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#b8811d" />
          <stop offset="75%" stopColor="#ffd775" />
          <stop offset="100%" stopColor="#b8811d" />
        </linearGradient>

        <linearGradient id={`premGoldLight-${id}`} x1="0" y1="0" x2="200" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff2c2" />
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#ffd775" />
        </linearGradient>

        <linearGradient id={`premRibbon-${id}`} x1="10" y1="30" x2="190" y2="195" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ff57cf" />
          <stop offset="30%" stopColor="#ffd775" />
          <stop offset="70%" stopColor="#1039da" />
          <stop offset="100%" stopColor="#ff57cf" />
        </linearGradient>

        <linearGradient id={`premGem-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="25%" stopColor="#ffb3ea" />
          <stop offset="60%" stopColor="#ff57cf" />
          <stop offset="100%" stopColor="#9c0075" />
        </linearGradient>
      </defs>

      {/* Hào quang hồng tím tỏa mờ */}
      <circle
        cx="100"
        cy="115"
        r="76"
        stroke="#ff57cf"
        strokeWidth="3.5"
        opacity="0.35"
        filter={`url(#premGlow-${id})`}
        className={animated ? "hairapy-frame-pulse" : ""}
      />

      {/* Vòng viền ngoài mạ vàng */}
      <circle cx="100" cy="115" r="77" stroke={`url(#premGold-${id})`} strokeWidth="2.2" />

      {/* Dải Ribbon chuyển màu hoàng gia */}
      <circle cx="100" cy="115" r="73.2" stroke={`url(#premRibbon-${id})`} strokeWidth="4.8" />

      {/* Vành trong */}
      <circle cx="100" cy="115" r="69" stroke={`url(#premGold-${id})`} strokeWidth="1.6" />

      {/* Vòm cung nâng đỡ ở đáy 6h */}
      <path
        d="M64 179 Q100 196 136 179 Q100 188 64 179 Z"
        fill={`url(#premGold-${id})`}
        filter={`url(#premGlow-${id})`}
        opacity="0.85"
      />

      {/* ================= VƯƠNG MIỆN HAUTE TIARA & WINGS ================= */}
      <g filter={`url(#premGlow-${id})`}>
        {/* Vệt sáng chân vương miện */}
        <path
          d="M66 52 C78 44 90 40 100 40 C110 40 122 44 134 52"
          stroke="#ff57cf"
          strokeWidth="6"
          opacity="0.5"
          filter={`url(#premGlow-${id})`}
        />

        {/* Dải vòng đầu kép mạ vàng uốn cong theo chu vi */}
        <path
          d="M68 53 C78 48 89 45 100 45 C111 45 122 48 132 53"
          stroke={`url(#premGold-${id})`}
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M72 56 C80 52 90 50 100 50 C110 50 120 52 128 56"
          stroke={`url(#premGoldLight-${id})`}
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Đôi cánh lông vũ mềm mại uốn lượn hai bên (Trái & Phải) */}
        {/* Cánh trái */}
        <path d="M82 48 C68 44 48 36 34 42 C46 45 62 49 80 50 Z" fill={`url(#premGoldLight-${id})`} />
        <path d="M80 51 C66 48 52 44 42 48 C52 51 66 53 78 54 Z" fill={`url(#premRibbon-${id})`} opacity="0.85" />
        <path d="M85 44 C72 37 56 26 44 30 C54 35 70 41 85 45 Z" fill={`url(#premGold-${id})`} />

        {/* Cánh phải */}
        <path d="M118 48 C132 44 152 36 166 42 C154 45 138 49 120 50 Z" fill={`url(#premGoldLight-${id})`} />
        <path d="M120 51 C134 48 148 44 158 48 C148 51 134 53 122 54 Z" fill={`url(#premRibbon-${id})`} opacity="0.85" />
        <path d="M115 44 C128 37 144 26 156 30 C146 35 130 41 115 45 Z" fill={`url(#premGold-${id})`} />

        {/* 5 Chóp vương miện thanh mảnh vươn cao */}
        {/* Chóp ngoài trái */}
        <path d="M71 52 C68 46 64 38 58 35 C63 42 67 48 70 52 Z" fill={`url(#premGold-${id})`} />
        <circle cx="58" cy="34" r="1.4" fill="#ffd775" />

        {/* Chóp ngoài phải */}
        <path d="M129 52 C132 46 136 38 142 35 C137 42 133 48 130 52 Z" fill={`url(#premGold-${id})`} />
        <circle cx="142" cy="34" r="1.4" fill="#ffd775" />

        {/* Chóp giữa trái cong tự nhiên */}
        <path d="M83 50 C80 40 78 28 73 23 C78 31 84 42 86 50 Z" fill={`url(#premGold-${id})`} />
        <circle cx="73" cy="22.5" r="1.8" fill="#fff2c2" />

        {/* Chóp giữa phải cong tự nhiên */}
        <path d="M117 50 C120 40 122 28 127 23 C122 31 116 42 114 50 Z" fill={`url(#premGold-${id})`} />
        <circle cx="127" cy="22.5" r="1.8" fill="#fff2c2" />

        {/* Chóp đại hoàng gia trung tâm */}
        <path d="M96 50 C94 36 98 22 100 13 C102 22 106 36 104 50 Z" fill={`url(#premGold-${id})`} />
        <circle cx="100" cy="12" r="2.6" fill="#ffffff" filter={`url(#premGlow-${id})`} />

        {/* VIÊN NGỌC MARQUISE RUBY TRUNG TÂM */}
        <path
          d="M100 19 C107 27 109 35 109 41 C109 47 105 51 100 52 C95 51 91 47 91 41 C91 35 93 27 100 19 Z"
          fill="#b8811d"
        />
        <path
          d="M100 20.5 C106 28 107.5 35 107.5 40.5 C107.5 46 104 49.5 100 50.5 C96 49.5 92.5 46 92.5 40.5 C92.5 35 94 28 100 20.5 Z"
          fill={`url(#premGold-${id})`}
        />
        <path
          d="M100 22 C105 29 106 36 106 40 C106 45 103.5 48 100 49 C96.5 48 94 45 94 40 C94 36 95 29 100 22 Z"
          fill={`url(#premGem-${id})`}
          className={animated ? "hairapy-frame-gem-shimmer" : ""}
        />
        <ellipse cx="98" cy="28" rx="1.6" ry="3.5" transform="rotate(-18 98 28)" fill="#ffffff" opacity="0.95" />
        <circle cx="100" cy="44" r="1.2" fill="#ffffff" opacity="0.6" />
      </g>

      {/* 2 Viên đá quý phụ ở 2 hướng (9h, 3h) */}
      {/* Góc trái (9h) */}
      <g transform="translate(23, 115)" filter={`url(#premGlow-${id})`}>
        <path d="M0 -14 L4 -4 L14 0 L4 4 L0 14 L-4 4 L-14 0 L-4 -4 Z" fill={`url(#premGold-${id})`} />
        <path d="M0 -9 L2.5 -2.5 L9 0 L2.5 2.5 L0 9 L-2.5 2.5 L-9 0 L-2.5 -2.5 Z" fill={`url(#premGem-${id})`} />
        <circle cx="-1" cy="-1.5" r="1.3" fill="#ffffff" opacity="0.9" />
      </g>

      {/* Góc phải (3h) */}
      <g transform="translate(177, 115)" filter={`url(#premGlow-${id})`}>
        <path d="M0 -14 L4 -4 L14 0 L4 4 L0 14 L-4 4 L-14 0 L-4 -4 Z" fill={`url(#premGold-${id})`} />
        <path d="M0 -9 L2.5 -2.5 L9 0 L2.5 2.5 L0 9 L-2.5 2.5 L-9 0 L-2.5 -2.5 Z" fill={`url(#premGem-${id})`} />
        <circle cx="-1" cy="-1.5" r="1.3" fill="#ffffff" opacity="0.9" />
      </g>

      {/* Đáy (6h) - Nếu không bật nhãn chữ thì hiện viên ngọc giọt lệ */}
      {!showLabel && showBottomGem && (
        <g transform="translate(100, 192)" filter={`url(#premGlow-${id})`}>
          <path d="M0 -10 L4.5 0 L0 14 L-4.5 0 Z" fill={`url(#premGold-${id})`} />
          <path d="M0 -7 L3 0 L0 10 L-3 0 Z" fill={`url(#premGem-${id})`} />
          <circle cx="-0.8" cy="0" r="1" fill="#ffffff" opacity="0.9" />
        </g>
      )}

      {/* HUY HIỆU CHỮ "PREMIUM" DƯỚI KHUNG VIỀN (ĐÃ TĂNG 1.25x) */}
      {showLabel && (
        <g transform="translate(100, 196)" filter={`url(#premGlow-${id})`}>
          {/* Cánh ribbon vàng vuốt nhọn hai bên */}
          <path d="M-55 0 L-45 -7.5 L-45 7.5 Z" fill={`url(#premGold-${id})`} />
          <path d="M55 0 L45 -7.5 L45 7.5 Z" fill={`url(#premGold-${id})`} />

          {/* Khung dải băng mạ vàng sang trọng */}
          <rect
            x="-47.5"
            y="-12"
            width="95"
            height="24"
            rx="12"
            fill="#16081b"
            stroke={`url(#premGold-${id})`}
            strokeWidth="1.5"
          />
          {/* Nền phản quang hồng lụa */}
          <rect
            x="-45"
            y="-9.5"
            width="90"
            height="19"
            rx="9.5"
            fill="#ff57cf"
            opacity="0.28"
          />
          {/* Chữ PREMIUM to x1.25 thanh lịch */}
          <text
            x="0"
            y="4.2"
            textAnchor="middle"
            fontFamily="'Unbounded', 'Be Vietnam Pro', system-ui, sans-serif"
            fontWeight="700"
            fontSize="10.8"
            fill="#ffd775"
            letterSpacing="1.4"
          >
            PREMIUM
          </text>
          {/* Hạt đá quý ngọc nhỏ ở đáy */}
          <circle cx="0" cy="12" r="1.5" fill="#ff57cf" />
        </g>
      )}

      {/* Hạt sao 4 cánh lơ lửng */}
      <path
        d="M174 54 L175.5 50 L177 54 L181 55.5 L177 57 L175.5 61 L174 57 L170 55.5 Z"
        fill="#ffd775"
        className={animated ? "hairapy-frame-twinkle-1" : ""}
      />
      <path
        d="M26 54 L27.5 50 L29 54 L33 55.5 L29 57 L27.5 61 L26 57 L22 55.5 Z"
        fill="#ffd775"
        className={animated ? "hairapy-frame-twinkle-2" : ""}
      />
    </svg>
  );
}

/**
 * AvatarFrame: Component bọc thống nhất cho avatar
 */
export default function AvatarFrame({
  plan = "FREE",
  animated = true,
  showLabel = true,
  className = "",
  children,
}) {
  const isPro = plan === "PRO";
  const isPremium = plan === "PREMIUM";

  if (!isPro && !isPremium) {
    return children;
  }

  return (
    <div className={`relative inline-flex shrink-0 items-center justify-center ${className}`}>
      {isPro && <AvatarFramePro animated={animated} showLabel={showLabel} />}
      {isPremium && <AvatarFramePremium animated={animated} showLabel={showLabel} />}
      {children}
    </div>
  );
}
