/**
 * Chuyển chuỗi hex thành mảng [r, g, b]
 */
export function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Danh sách màu tóc hỗ trợ bởi Hairapy và AILab Pro API.
 * Đồng bộ với HairSwapService.COLOR_LABELS_VI trên Backend.
 * Mỗi màu có tones: [light, base, dark] và rgb: [r, g, b] tương ứng với base tone.
 */
export const HAIR_COLORS = [
  { value: "black", label: "Đen", tones: ["#4a4a52", "#1b1b20", "#050507"], rgb: hexToRgb("#1b1b20") },
  { value: "brown", label: "Nâu", tones: ["#9a6b45", "#5b3a22", "#2e1a0e"], rgb: hexToRgb("#5b3a22") },
  { value: "lightBrown", label: "Nâu Sáng", tones: ["#cfa57a", "#9b7048", "#6a4a2c"], rgb: hexToRgb("#9b7048") },
  { value: "blonde", label: "Vàng", tones: ["#f6dd9a", "#d9b25f", "#a9812f"], rgb: hexToRgb("#d9b25f") },
  { value: "platinumBlonde", label: "Bạch Kim", tones: ["#fbf6e8", "#e6dcc3", "#c4b896"], rgb: hexToRgb("#e6dcc3") },
  { value: "red", label: "Đỏ", tones: ["#e0624f", "#b3321f", "#6e170c"], rgb: hexToRgb("#b3321f") },
  { value: "burgundy", label: "Đỏ Rượu", tones: ["#9a3558", "#6a1634", "#36081a"], rgb: hexToRgb("#6a1634") },
  { value: "orange", label: "Cam", tones: ["#f5a45d", "#dd7a1f", "#a55410"], rgb: hexToRgb("#dd7a1f") },
  { value: "pink", label: "Hồng", tones: ["#fcc3d8", "#f08fb3", "#c9608a"], rgb: hexToRgb("#f08fb3") },
  { value: "purple", label: "Tím", tones: ["#ae92e8", "#7852c4", "#46298a"], rgb: hexToRgb("#7852c4") },
  { value: "blue", label: "Xanh Dương", tones: ["#7fb0f5", "#3571d6", "#1c418f"], rgb: hexToRgb("#3571d6") },
  { value: "green", label: "Xanh Lá", tones: ["#79d49e", "#2f9e5e", "#16603a"], rgb: hexToRgb("#2f9e5e") },
  { value: "grey", label: "Xám", tones: ["#c3c8ce", "#8e949b", "#585d63"], rgb: hexToRgb("#8e949b") },
  { value: "silver", label: "Bạc", tones: ["#f1f3f5", "#cdd2d8", "#9aa1a9"], rgb: hexToRgb("#cdd2d8") },
  { value: "white", label: "Trắng", tones: ["#ffffff", "#f1f1f1", "#d6d6d6"], rgb: hexToRgb("#f1f1f1") },
  { value: "lightBlue", label: "Xanh Nhạt", tones: ["#b8e2f8", "#78bfe8", "#3a93cb"], rgb: hexToRgb("#78bfe8") },
  { value: "lightPurple", label: "Tím Nhạt", tones: ["#e2d2f9", "#bfa3f0", "#9268db"], rgb: hexToRgb("#bfa3f0") },
  { value: "darkBlue", label: "Xanh Đậm", tones: ["#30558a", "#153366", "#0b1c3b"], rgb: hexToRgb("#153366") },
  { value: "darkGreen", label: "Xanh Rêu", tones: ["#366848", "#1c452b", "#0d2818"], rgb: hexToRgb("#1c452b") },
  { value: "gradient", label: "Ombre", tones: ["#f08fb3", "#ae92e8", "#3571d6"], rgb: hexToRgb("#ae92e8") },
  { value: "multicolored", label: "Nhiều Màu", tones: ["#e0624f", "#d9b25f", "#2f9e5e"], rgb: hexToRgb("#d9b25f") },
];

export const COLOR_LABELS = Object.fromEntries(
  HAIR_COLORS.map((c) => [c.value, c.label])
);

export const COLOR_BY_VALUE = Object.fromEntries(
  HAIR_COLORS.map((c) => [c.value, c])
);

/**
 * Sinh chuỗi CSS linear-gradient từ mảng tones [light, base, dark]
 */
export const swatchBg = (tones) => {
  if (!tones || tones.length === 0) return "#888888";
  if (tones.length === 1) return tones[0];
  if (tones.length === 2) return `linear-gradient(135deg, ${tones[0]} 0%, ${tones[1]} 100%)`;
  const [light, base, dark] = tones;
  return `linear-gradient(120deg, ${dark} 0%, ${base} 35%, ${light} 50%, ${base} 65%, ${dark} 100%)`;
};
