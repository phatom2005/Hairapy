import { AI_STYLIST_ENABLED, SOON } from "./features";
// Nguồn sự thật DUY NHẤT cho tên gói, giá, quyền lợi ở FE — phải khớp UsageService.getDailyLimit (backend)
export const PLAN_LABEL = { FREE: "Miễn phí", PRO: "Gói Tuần", PREMIUM: "Gói Tháng" };
export const PLAN_RANK = { FREE: 0, PRO: 1, PREMIUM: 2 };

export const PLANS = [
  {
    code: "FREE",
    name: "Miễn phí",
    tagline: "Bắt đầu hành trình của bạn",
    price: "0đ",
    period: "/ vĩnh viễn",
    days: null,
    highlight: false,
    label: "GÓI MIỄN PHÍ",
    cta: "Dùng bản miễn phí",
    to: "/register",
    variant: "outline",
    desc: "Phân tích khuôn mặt không giới hạn, lưu 5 lần/ngày và 1 lần thử kiểu tóc AI.",
    features: [
      { text: "Phân tích khuôn mặt không giới hạn", on: true },
      { text: "Lưu 5 lần quét/ngày vào lịch sử", on: true },
      { text: "1 lần thử kiểu tóc AI mỗi ngày", on: true },
      { text: "Ảnh kết quả không watermark", on: false },
      { text: "Kiểu tóc độc quyền", on: false },
      { text: "Tư vấn kiểu tóc với AI Stylist" + (AI_STYLIST_ENABLED ? "" : SOON), on: false },
    ],
  },
  {
    code: "PRO",
    name: "Gói Tuần",
    tagline: "Trải nghiệm nhanh",
    price: "49.000đ",
    period: "/ 7 ngày",
    days: 7,
    highlight: false,
    label: "TRẢI NGHIỆM NHANH",
    cta: "Mua Gói Tuần",
    to: "/checkout?plan=PRO",
    variant: "outline",
    desc: "5 lần thử tóc mỗi ngày, ảnh HD không logo, mở khóa kiểu độc quyền.",
    features: [
      { text: "Phân tích khuôn mặt không giới hạn", on: true },
      { text: "Lưu 5 lần quét/ngày vào lịch sử", on: true },
      { text: "5 lần thử kiểu tóc AI mỗi ngày", on: true },
      { text: "Ảnh kết quả không watermark", on: true },
      { text: "Kiểu tóc độc quyền", on: true },
      { text: "Tư vấn kiểu tóc với AI Stylist" + (AI_STYLIST_ENABLED ? "" : SOON), on: false },
    ],
  },
  {
    code: "PREMIUM",
    name: "Gói Tháng",
    tagline: "Trải nghiệm cao cấp toàn diện",
    price: "99.000đ",
    period: "/ 30 ngày",
    days: 30,
    highlight: true,
    label: "ƯU ĐÃI LỚN NHẤT",
    cta: "Mua Gói Tháng",
    to: "/checkout?plan=PREMIUM",
    variant: "pink",
    desc: AI_STYLIST_ENABLED ? "8 lần thử tóc mỗi ngày, ảnh HD không logo & tư vấn kiểu tóc với AI Stylist." : "8 lần thử tóc mỗi ngày, ảnh HD không logo, kiểu tóc độc quyền.",
    features: [
      { text: "Phân tích khuôn mặt không giới hạn", on: true },
      { text: "Lưu 5 lần quét/ngày vào lịch sử", on: true },
      { text: "8 lần thử kiểu tóc AI mỗi ngày", on: true },
      { text: "Ảnh kết quả không watermark", on: true },
      { text: "Kiểu tóc độc quyền", on: true },
      { text: AI_STYLIST_ENABLED ? "Tư vấn kiểu tóc với AI Stylist (5 lượt/ngày)" : "Tư vấn kiểu tóc với AI Stylist" + SOON, on: AI_STYLIST_ENABLED },
    ],
  },
];

// Gói Đối tác cho salon (Phase 4) — thanh toán mô phỏng, admin ghi nhận tay
export const SALON_PARTNER = {
  name: "Gói Đối tác Salon",
  price: 299000,
  priceLabel: "299.000đ",
  period: "/ tháng",
  trialDays: 30,
};

/**
 * Trạng thái nút mua cho 1 gói, dựa trên user.plan (từ /auth/me).
 * @param {object} plan - object gói từ PLANS
 * @param {object|null} user - thông tin user hiện tại
 * @returns {{ text: string, to: string|null, disabled: boolean, hint?: string }}
 */
export function getPlanCta(plan, user) {
  const code = plan.code || (plan.name === "Gói Tuần" || plan.name === "Tuần" ? "PRO" : plan.name === "Gói Tháng" || plan.name === "Premium" || plan.name === "Tháng" ? "PREMIUM" : "FREE");

  if (!user) {
    if (code === "FREE") return { text: "Dùng miễn phí", to: "/register", disabled: false };
    if (code === "PRO") return { text: "Mua Gói Tuần", to: "/checkout?plan=PRO", disabled: false };
    return { text: "Mua Gói Tháng", to: "/checkout?plan=PREMIUM", disabled: false };
  }

  if (user.role === "ADMIN") {
    if (code === "FREE") return { text: "Trang quản trị", to: "/admin", disabled: false };
    return { text: "Đã có quyền Admin", to: null, disabled: true };
  }

  if (user.role === "TESTER") {
    return { text: "Tài khoản Tester", to: null, disabled: true };
  }

  const userPlan = user.plan || "FREE";

  if (userPlan === "FREE") {
    if (code === "FREE") return { text: "Đang dùng", to: null, disabled: true };
    if (code === "PRO") return { text: "Mua Gói Tuần", to: "/checkout?plan=PRO", disabled: false };
    return { text: "Mua Gói Tháng", to: "/checkout?plan=PREMIUM", disabled: false };
  }

  if (userPlan === "PRO") {
    if (code === "FREE") return { text: "Đã sở hữu", to: null, disabled: true };
    if (code === "PRO") {
      return {
        text: "Gia hạn",
        to: "/checkout?plan=PRO",
        disabled: false,
        hint: "Cộng thêm 7 ngày vào hạn hiện tại",
      };
    }
    return {
      text: "Nâng cấp",
      to: "/checkout?plan=PREMIUM",
      disabled: false,
      hint: "Lên Gói Tháng ngay, ngày còn lại được cộng dồn",
    };
  }

  if (userPlan === "PREMIUM") {
    if (code === "FREE") return { text: "Đã sở hữu", to: null, disabled: true };
    if (code === "PRO") {
      return {
        text: "Gói Tuần",
        to: null,
        disabled: true,
        hint: "Bạn đang dùng Gói Tháng",
      };
    }
    return {
      text: "Gia hạn",
      to: "/checkout?plan=PREMIUM",
      disabled: false,
      hint: "Cộng thêm 30 ngày vào hạn hiện tại",
    };
  }

  return { text: "Mua ngay", to: `/checkout?plan=${code}`, disabled: false };
}
