// ===== Ảnh local (placeholder) — thay cho URL Figma tạm =====
// Ảnh nằm trong src/assets/placeholders/ → import = đường dẫn vĩnh viễn, không mất hình.
// 👉 Thay ảnh THẬT: bỏ file vào src/assets/ rồi sửa import bên dưới. Tên biến giữ nguyên.

import logoIcon from "../assets/logo/logo-icon.png";   // icon vuông
import logoFull from "../assets/logo/logo-full.png";   // ngang (icon + chữ)
import logoStack from "../assets/logo/logo-stack.png"; // dọc (icon trên, chữ dưới)
import logoWhite from "../assets/logo/logo-white.png"; // dọc, màu trắng (nền tối)
import logoNgang from "../assets/logo/EXE_Hairapy logo_Logo ngang.png"; // logo ngang mới
import authBg from "../assets/placeholders/auth-bg.svg";
import hero from "../assets/placeholders/hero.svg";
import scan from "../assets/placeholders/scan.svg";
import avatar from "../assets/placeholders/avatar.svg";
import salonMap from "../assets/placeholders/map.svg";



import salon1 from "../assets/placeholders/salon-1.svg";
import salon2 from "../assets/placeholders/salon-2.svg";
import salon3 from "../assets/placeholders/salon-3.svg";

export const LOGO = logoIcon;        // icon vuông (favicon, ô nhỏ)
export const LOGO_FULL = logoFull;   // logo ngang -> Navbar, Footer
export const LOGO_STACK = logoStack; // logo dọc -> màn auth
export const LOGO_WHITE = logoWhite; // logo dọc trắng -> nền gradient/tối
export const LOGO_NGANG = logoNgang; // logo ngang mới của EXE_Hairapy
export const AUTH_BG = authBg;
export const HERO_IMG = hero;
export const SCAN_PORTRAIT = scan;
export const PROFILE_IMG = avatar;



export const SALON_MAP = salonMap;
export const SALONS = [
  { name: "Elite Hair Design - Quận 1", rating: 4.9, addr: "123 Lê Lợi, Phường Bến Thành, Quận 1", price: "250.000đ", verified: true, img: salon1 },
  { name: "The Studio - Quận 3", rating: 4.8, addr: "45 Nguyễn Đình Chiểu, Quận 3", price: "180.000đ", verified: true, img: salon2 },
  { name: "Urban Cut - Quận 7", rating: 4.7, addr: "88 Nguyễn Văn Linh, Quận 7", price: "200.000đ", verified: false, img: salon3 },
];
