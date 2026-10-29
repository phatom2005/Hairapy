// Avatar hiển thị chữ cái đầu với gradient màu thương hiệu theo hash của email.
// Thay thế cho ảnh mock mặt cười avatar.svg cũ.

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

export default function UserAvatar({
  name = "",
  email = "",
  size = "md",
  className = "",
}) {
  const gradient = getGradientByHash(email || name);
  const initial = getInitial(name, email);
  const sizeClass = SIZE_CLASSES[size] || size;

  return (
    <div
      role="img"
      aria-label={name || email || "Avatar người dùng"}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br ${gradient} font-display font-bold text-white shadow-sm border border-white/20 ${sizeClass} ${className}`}
    >
      <span>{initial}</span>
    </div>
  );
}

