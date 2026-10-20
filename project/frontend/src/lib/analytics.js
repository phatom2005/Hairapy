// Google Analytics 4 — chỉ bật khi có VITE_GA_ID (production). Không gửi PII (email, ảnh, tên).
const GA_ID = import.meta.env.VITE_GA_ID;

let ready = false;

const FT_KEY = "hairapy_first_touch";
// Chỉ giữ lại các tham số chiến dịch khi gửi page_location (KHÔNG gửi token reset mật khẩu, v.v.)
const KEEP_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "ttclid"];

/** Nhận diện trình duyệt trong app MXH (các app này hay giấu referrer nên bị GA tính là Direct). */
function detectSocialApp() {
  const ua = navigator.userAgent || "";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "facebook";
  if (/Instagram/i.test(ua)) return "instagram";
  if (/musical_ly|TikTok|BytedanceWebview/i.test(ua)) return "tiktok";
  if (/Zalo/i.test(ua)) return "zalo";
  if (/Line\//i.test(ua)) return "line";
  return "";
}

/** Phân loại referrer thành tên nền tảng MXH (nếu có). */
function socialFromReferrer(ref) {
  if (!ref) return "";
  let host = "";
  try {
    host = new URL(ref).hostname;
  } catch {
    return "";
  }
  if (/facebook\.com|fb\.com|fb\.me/.test(host)) return "facebook";
  if (/instagram\.com/.test(host)) return "instagram";
  if (/tiktok\.com/.test(host)) return "tiktok";
  if (/zalo\.me|zaloapp\.com/.test(host)) return "zalo";
  if (/youtube\.com|youtu\.be/.test(host)) return "youtube";
  if (/t\.co|twitter\.com|x\.com/.test(host)) return "x";
  if (/reddit\.com/.test(host)) return "reddit";
  if (/threads\.net/.test(host)) return "threads";
  return "";
}

/** Lưu nguồn truy cập LẦN ĐẦU (first-touch) để gắn vào sign_up/purchase dù họ đăng ký vài ngày sau. */
function captureFirstTouch() {
  try {
    if (localStorage.getItem(FT_KEY)) return;
    const q = new URLSearchParams(window.location.search);
    const social = detectSocialApp() || socialFromReferrer(document.referrer);
    const source = q.get("utm_source") || social || (document.referrer ? new URL(document.referrer).hostname : "direct");
    const medium = q.get("utm_medium") || (social ? "social" : document.referrer ? "referral" : "none");
    localStorage.setItem(
      FT_KEY,
      JSON.stringify({ ft_source: source, ft_medium: medium, ft_campaign: q.get("utm_campaign") || "" }),
    );
  } catch {
    /* bỏ qua nếu storage bị chặn */
  }
}

function firstTouch() {
  try {
    return JSON.parse(localStorage.getItem(FT_KEY) || "{}");
  } catch {
    return {};
  }
}

/** Nạp gtag.js một lần. Không có GA_ID thì mọi hàm bên dưới là no-op. */
export function initAnalytics() {
  if (!GA_ID || ready || typeof window === "undefined") return;
  captureFirstTouch();

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  // SPA: tự gửi page_view thủ công khi đổi route nên tắt page_view mặc định
  window.gtag("config", GA_ID, { send_page_view: false });
  // Thuộc tính người dùng: nguồn đầu tiên + app MXH đang dùng để mở link
  setUserProps({ ...firstTouch(), social_app: detectSocialApp() });
  ready = true;
}

/** Gửi page_view khi đổi route (bỏ qua khu vực admin). Giữ lại tham số UTM để GA ghi nhận chiến dịch. */
export function trackPageView(path) {
  if (!ready || path.startsWith("/admin")) return;
  const src = new URLSearchParams(window.location.search);
  const keep = new URLSearchParams();
  KEEP_PARAMS.forEach((k) => src.get(k) && keep.set(k, src.get(k)));
  const qs = keep.toString();
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.origin + path + (qs ? `?${qs}` : ""),
    page_referrer: document.referrer || undefined,
  });
}

/** Gửi event tuỳ chỉnh. Tự đính kèm nguồn first-touch để báo cáo theo kênh. */
export function trackEvent(name, params = {}) {
  if (!ready) return;
  window.gtag("event", name, { ...firstTouch(), ...params });
}

/** Đặt thuộc tính người dùng (vd plan_tier, user_role). Giá trị rỗng bị bỏ qua. */
export function setUserProps(props) {
  if (typeof window === "undefined" || !window.gtag) return;
  const clean = Object.fromEntries(Object.entries(props).filter(([, v]) => v !== "" && v != null));
  if (Object.keys(clean).length) window.gtag("set", "user_properties", clean);
}

/** Đánh dấu lưu lượng nội bộ (Admin/Tester) để lọc ra khỏi báo cáo bằng Data filter của GA4. */
export function markInternalTraffic(isInternal) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("set", { traffic_type: isInternal ? "internal" : undefined });
}
