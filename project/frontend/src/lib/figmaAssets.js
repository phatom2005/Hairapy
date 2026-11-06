// ===== Ảnh logo thương hiệu =====
// Logo chính thức từ thư mục src/assets/logo/

import logoIcon from "../assets/logo/logo-icon.png";
import logoFull from "../assets/logo/logo-full.png";
// Bản WebP đã thu nhỏ cho web (ảnh gốc PNG 6750px/2085px vẫn giữ trong thư mục logo)
import logoStack from "../assets/logo/logo-stack.webp";
import logoWhite from "../assets/logo/logo-white.png";
import logoNgang from "../assets/logo/logo-ngang.webp";

export const LOGO = logoIcon;
export const LOGO_FULL = logoFull;
export const LOGO_STACK = logoStack;
export const LOGO_WHITE = logoWhite;
export const LOGO_NGANG = logoNgang;
// Kích thước thật của logo ngang (dùng cho width/height của <img> để không xô lệch bố cục)
export const LOGO_NGANG_SIZE = { width: 628, height: 240 };
