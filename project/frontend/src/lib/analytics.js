// Google Analytics 4 — chỉ bật khi có VITE_GA_ID (production). Không gửi PII (email, ảnh, tên).
const GA_ID = import.meta.env.VITE_GA_ID;

let ready = false;
let cachedClientId = null;

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
  let host;
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
  getGaClientId();
  trackRuntimeErrors();
  trackPageTiming();
}

/** Gửi sự kiện exception khi có lỗi JS không bắt (chỉ loại lỗi, không gửi nội dung). Giới hạn 5 lần/phiên. */
function trackRuntimeErrors() {
  let sent = 0;
  const send = (description) => {
    if (sent >= 5) return;
    sent += 1;
    trackEvent("exception", { description, fatal: false, page_path: window.location.pathname });
  };
  window.addEventListener("error", (e) => send(`js: ${e.error?.name || "Error"}`));
  window.addEventListener("unhandledrejection", (e) => send(`promise: ${e.reason?.name || "Error"}`));
}

/** Gửi thời gian tải trang (làm tròn, đơn vị ms) 1 lần sau khi trang tải xong. */
function trackPageTiming() {
  const send = () => {
    const nav = performance.getEntriesByType?.("navigation")?.[0];
    if (!nav) return;
    trackEvent("page_timing", {
      ttfb_ms: Math.round(nav.responseStart),
      dom_ready_ms: Math.round(nav.domContentLoadedEventEnd),
      load_ms: Math.round(nav.loadEventEnd),
      connection: navigator.connection?.effectiveType || "unknown",
    });
  };
  if (document.readyState === "complete") setTimeout(send, 0);
  else window.addEventListener("load", () => setTimeout(send, 0), { once: true });
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

/**
 * Lấy client_id của GA4 từ trình duyệt, cache lại để đính kèm vào header X-GA-Client-Id.
 * Trả về null nếu GA4 bị tắt hoặc chưa khởi tạo.
 */
export function getGaClientId() {
  if (cachedClientId) return cachedClientId;
  if (!GA_ID || typeof window === "undefined" || !window.gtag) return null;

  try {
    window.gtag("get", GA_ID, "client_id", (clientId) => {
      if (clientId) {
        cachedClientId = String(clientId);
      }
    });
  } catch {
    /* GA có thể bị chặn bởi adblocker */
  }

  return cachedClientId;
}

/**
 * Đặt hoặc xóa GA user_id khi người dùng đăng nhập / đăng xuất.
 */
export function setGaUserId(userId) {
  if (typeof window === "undefined" || !window.gtag) return;
  if (userId) {
    if (GA_ID) {
      window.gtag("config", GA_ID, { user_id: String(userId) });
    }
  } else {
    window.gtag("set", { user_id: null });
  }
}
