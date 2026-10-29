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
export function getVariant(name, variants = ["A", "B"]) {
  if (!variants || variants.length === 0) return "A";

  try {
    const key = `hairapy_exp_${name}`;
    const stored = localStorage.getItem(key);
    let variant;
    if (stored && variants.includes(stored)) {
      variant = stored;
    } else {
      const idx = Math.floor(Math.random() * variants.length);
      variant = variants[idx];
      localStorage.setItem(key, variant);
    }

    // Gửi exposure 1 lần mỗi phiên
    const sessionKey = `hairapy_exp_exposed_${name}`;
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, "1");
      setUserProps({ [`exp_${name}`]: variant });
      trackEvent("experiment_exposure", { experiment: name, variant });
    }
    return variant;
  } catch {
    // Trình duyệt chặn storage hoặc private mode -> fallback về variant đầu tiên
    return variants[0] || "A";
  }
}

