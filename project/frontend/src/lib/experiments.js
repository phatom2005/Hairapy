import { trackEvent, setUserProps } from "./analytics";

/**
 * Danh sách các thử nghiệm A/B đang chạy trên Hairapy.
 */
export const EXPERIMENTS = {
  salon_cta: ["A", "B"],
};

/**
 * Lấy variant cho người dùng:
 * - Gán ngẫu nhiên 1 lần và lưu vào localStorage.
 * - Gửi thuộc tính người dùng và sự kiện experiment_exposure 1 lần mỗi phiên (sessionStorage).
 *
 * @param {string} name Tên thử nghiệm
 * @param {string[]} variants Danh sách các biến thể (mặc định ["A", "B"])
 * @returns {string} Biến thể được gán
 */
export function getVariant(name, variants = EXPERIMENTS[name] || ["A", "B"]) {
  const variant = peekVariant(name, variants);
  trackExposure(name, variant);
  return variant;
}

/**
 * Chỉ lấy (và gán lần đầu) variant, KHÔNG gửi sự kiện — dùng được trong useState initializer.
 */
export function peekVariant(name, variants = EXPERIMENTS[name] || ["A", "B"]) {
  if (!variants || variants.length === 0) return "A";
  try {
    const key = `hairapy_exp_${name}`;
    const stored = localStorage.getItem(key);
    if (stored && variants.includes(stored)) return stored;
    const variant = variants[Math.floor(Math.random() * variants.length)];
    localStorage.setItem(key, variant);
    return variant;
  } catch {
    // Trình duyệt chặn storage hoặc private mode -> luôn variant đầu tiên
    return variants[0] || "A";
  }
}

/**
 * Ghi nhận người dùng ĐÃ THẤY thử nghiệm: set user property + experiment_exposure, 1 lần mỗi phiên.
 * Gọi khi phần tử thử nghiệm thực sự hiển thị (trong useEffect), không gọi lúc render.
 */
export function trackExposure(name, variant) {
  try {
    const sessionKey = `hairapy_exp_exposed_${name}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "1");
  } catch {
    // Không có sessionStorage -> vẫn gửi (có thể trùng, chấp nhận)
  }
  setUserProps({ [`exp_${name}`]: variant });
  trackEvent("experiment_exposure", { experiment: name, variant });
}
