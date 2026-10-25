// Cờ bật/tắt tính năng ở FE. Bật lại bằng biến môi trường Vercel rồi redeploy, không cần sửa code.
// AI Stylist: tạm "Sắp ra mắt" — backend vẫn còn endpoint, chỉ ẩn giao diện + không quảng cáo như quyền lợi đang có.
export const AI_STYLIST_ENABLED = import.meta.env.VITE_AI_STYLIST_ENABLED === "true";

/** Nhãn đuôi cho tính năng chưa mở (dùng trong bảng giá / landing). */
export const SOON = " (sắp ra mắt)";
