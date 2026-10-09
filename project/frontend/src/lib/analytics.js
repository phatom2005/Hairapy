// Google Analytics 4 — chỉ bật khi có VITE_GA_ID (production). Không gửi PII (email, ảnh, tên).
const GA_ID = import.meta.env.VITE_GA_ID;

let ready = false;

/** Nạp gtag.js một lần. Không có GA_ID thì mọi hàm bên dưới là no-op. */
export function initAnalytics() {
  if (!GA_ID || ready || typeof window === "undefined") return;
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
  ready = true;
}

/** Gửi page_view khi đổi route (bỏ qua khu vực admin). */
export function trackPageView(path) {
  if (!ready || path.startsWith("/admin")) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.origin + path,
  });
}

/** Gửi event tuỳ chỉnh: sign_up, face_scan, hair_swap, begin_checkout, purchase... */
export function trackEvent(name, params = {}) {
  if (!ready) return;
  window.gtag("event", name, params);
}
