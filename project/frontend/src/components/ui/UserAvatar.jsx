import React from "react";
import useAuthStore from "../../store/useAuthStore";
import { AvatarFramePro, AvatarFramePremium } from "./HairapyAvatarFrames";

// Avatar hiển thị chữ cái đầu với gradient màu thương hiệu theo hash của email.
// Hỗ trợ hiển thị khung viền PRO & PREMIUM tương ứng với gói tài khoản của người dùng.

const GRADIENTS = [
  "from-pink to-brand",
  "from-magenta to-pink",
  "from-brand to-primary",
  "from-magenta to-brand",
];

function getGradientByHash(str = "") {
  let hash = 0;
  const clean = (str || "").toLowerCase().trim();
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[idx];
}

function getInitial(name = "", email = "") {
  const cleanName = (name || "").trim();
  if (cleanName) {
    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length > 0) {
      const lastWord = parts[parts.length - 1];
      // Lấy chữ cái đầu của từ cuối (tên tiếng Việt), viết hoa, giữ nguyên dấu
      return Array.from(lastWord)[0].toUpperCase();
    }
  }
  const cleanEmail = (email || "").trim();
  if (cleanEmail) {
    return Array.from(cleanEmail)[0].toUpperCase();
  }
  return "U";
}

const SIZE_CLASSES = {
  sm: "size-9 text-xs sm:text-sm",
  md: "size-12 text-base",
  lg: "size-24 text-3xl",
  xl: "size-40 text-5xl",
};

// Cỡ chữ và kích thước của huy hiệu Tier Badge đặt ở đáy avatar
// Tỷ lệ nhỏ gọn, thanh thoát: Size 'sm' cho Navbar được thu gọn tối đa để không bị dài hay cộm
const BADGE_SIZE_CLASSES = {
  sm: "-bottom-0.5 px-1.5 py-[0.5px] text-[6.5px] font-bold tracking-tight",
  md: "-bottom-1 px-2 py-0.5 text-[8.5px] font-bold tracking-wide",
  lg: "-bottom-1.5 px-2.5 py-0.5 text-[10px] font-bold tracking-wider",
  xl: "-bottom-2 px-3.5 py-1 text-xs font-bold tracking-widest",
};

export default function UserAvatar({
  name = "",
  email = "",
  src = "",
  size = "md",
  plan: planProp,
  animated = true,
  showLabel = true,
  className = "",
}) {
  const authUser = useAuthStore((s) => s.user);

  // Tự động nhận diện plan từ authUser nếu không truyền prop trực tiếp
  const effectivePlan =
    planProp !== undefined
      ? planProp
      : !email || (authUser?.email && authUser.email.toLowerCase() === email.toLowerCase())
      ? authUser?.plan || "FREE"
      : "FREE";

  const isPro = effectivePlan === "PRO";
  const isPremium = effectivePlan === "PREMIUM";
  const hasFrame = isPro || isPremium;

  const gradient = getGradientByHash(email || name);
  const initial = getInitial(name, email);
  const sizeClass = SIZE_CLASSES[size] || size;
  const badgeSizeClass = BADGE_SIZE_CLASSES[size] || BADGE_SIZE_CLASSES.md;

  if (hasFrame) {
    // Lọc bỏ class border hoặc ring bên ngoài truyền vào để không bao giờ tạo thành viền ô vuông quanh SVG frame
    const safeClassName = className
      ? className
          .split(/\s+/)
          .filter(
            (c) =>
              !c.startsWith("border") &&
              !c.includes(":border") &&
              !c.startsWith("ring") &&
              !c.includes(":ring")
          )
          .join(" ")
      : "";

    return (
      <div
        role="img"
        aria-label={name || email || `Avatar người dùng ${effectivePlan}`}
        className={`relative inline-flex shrink-0 items-center justify-center rounded-full select-none ${sizeClass} ${safeClassName}`}
      >
        {/* Khung viền vector SVG (vương miện, cánh, vòng hào quang xoay sáng) */}
        {isPro && <AvatarFramePro animated={animated} showLabel={false} />}
        {isPremium && <AvatarFramePremium animated={animated} showLabel={false} />}

        {/* Lõi Avatar tròn bên trong */}
        <div className="flex size-full items-center justify-center rounded-full font-display font-bold text-white shadow-sm overflow-hidden">
          <div className={`flex size-full items-center justify-center bg-gradient-to-br ${gradient}`}>
            {src ? (
              <img src={src} alt={name || "Avatar"} className="size-full object-cover" />
            ) : (
              <span>{initial}</span>
            )}
          </div>
        </div>

        {/* Huy hiệu chữ PRO / PREMIUM nhỏ gọn, tinh tế ở đáy Avatar */}
        {showLabel && (
          <span
            className={`absolute left-1/2 -translate-x-1/2 z-20 whitespace-nowrap rounded-full border shadow-sm font-display uppercase leading-none ${badgeSizeClass} ${
              isPro
                ? "bg-gradient-to-r from-[#1039da] to-[#ff57cf] text-white border-[#ffd775]/70"
                : "bg-gradient-to-r from-[#17061d] via-[#850069] to-[#17061d] text-[#ffe699] border border-[#ffd775]/80"
            }`}
          >
            {isPro ? "PRO" : "PREMIUM"}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={name || email || "Avatar người dùng"}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br ${gradient} font-display font-bold text-white shadow-sm border border-white/20 overflow-hidden ${sizeClass} ${className}`}
    >
      {src ? (
        <img src={src} alt={name || "Avatar"} className="size-full object-cover" />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}
