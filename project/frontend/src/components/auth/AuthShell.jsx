// Khung Login + Register: một thẻ frosted bo góc đặt giữa, nổi trên SoftAurora.
// Không còn vệt chia dọc (seam) như bản split full-height trước.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LOGO_STACK } from "../../lib/figmaAssets";
import { GoogleIcon, FacebookIcon } from "../icons";
import useAuthStore from "../../store/useAuthStore";

export function AuthShell({ children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-8">
      <div className="grid w-full max-w-[1000px] overflow-hidden rounded-[32px] bg-white/80 shadow-2xl ring-1 ring-white/60 backdrop-blur-xl lg:grid-cols-2">
        {/* TRÁI: logo */}
        <div className="relative hidden flex-col items-center justify-center gap-8 bg-gradient-to-br from-pink/10 to-primary/10 p-12 lg:flex">
          <img src={LOGO_STACK} alt="Hairapy"
            className="w-full max-w-[280px] drop-shadow-[0_20px_13px_rgba(0,0,0,0.06)]" />
          <p className="text-center text-2xl font-bold leading-8 text-mauve/70">
            Nền tảng AI tối ưu cho mái tóc của bạn
          </p>
        </div>

        {/* PHẢI: form */}
        <div className="flex items-center justify-center p-8 sm:p-12">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function AuthHeading({ title, subtitle }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="h-1 w-12 rounded-full bg-lime" />
      <h1 className="pt-2 text-center text-[32px] font-bold tracking-tight text-ink">{title}</h1>
      <p className="text-center text-base text-mauve">{subtitle}</p>
    </div>
  );
}

export function OrDivider({ label }) {
  return (
    <div className="flex w-full items-center">
      <span className="h-px flex-1 bg-divider" />
      <span className="px-6 text-xs font-bold tracking-wide text-muted">{label}</span>
      <span className="h-px flex-1 bg-divider" />
    </div>
  );
}

// Lazy-load script Google Identity Services 1 lần duy nhất, tái dùng promise cho các lần gọi sau.
let googleScriptPromise = null;
function loadGoogleScript() {
  if (googleScriptPromise) return googleScriptPromise;
  googleScriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Không tải được Google Identity Services"));
    document.head.appendChild(script);
  });
  return googleScriptPromise;
}

// Lazy-load script Facebook SDK 1 lần duy nhất
let facebookScriptPromise = null;
function loadFacebookScript() {
  if (facebookScriptPromise) return facebookScriptPromise;
  facebookScriptPromise = new Promise((resolve, reject) => {
    if (window.FB) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
      if (window.FB && appId) {
        window.FB.init({
          appId,
          cookie: true,
          xfbml: false,
          version: "v21.0",
        });
      }
      resolve();
    };
    script.onerror = () => reject(new Error("Không tải được Facebook SDK"));
    document.head.appendChild(script);
  });
  return facebookScriptPromise;
}

export function SocialButtons({ redirectTo = "/profile" }) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const navigate = useNavigate();
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const loginWithFacebook = useAuthStore((s) => s.loginWithFacebook);

  const base =
    "flex items-center justify-center gap-3 rounded-3xl border-2 border-line bg-white py-[14px] " +
    "text-sm font-semibold text-ink transition hover:bg-canvas disabled:opacity-50 disabled:cursor-not-allowed";

  const handleGoogleClick = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      alert("Đăng nhập Google chưa được cấu hình.");
      return;
    }
    setGoogleLoading(true);
    try {
      await loadGoogleScript();
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "openid email profile",
        callback: async (tokenResponse) => {
          try {
            if (tokenResponse.access_token) {
              await loginWithGoogle(tokenResponse.access_token);
              navigate(redirectTo);
            }
          } catch (err) {
            alert(err.message || "Đăng nhập Google thất bại.");
          } finally {
            setGoogleLoading(false);
          }
        },
        error_callback: () => setGoogleLoading(false),
      });
      client.requestAccessToken();
    } catch {
      setGoogleLoading(false);
      alert("Không thể kết nối tới Google. Vui lòng thử lại.");
    }
  };

  const handleFacebookResponse = async (response) => {
    try {
      if (response.authResponse?.accessToken) {
        await loginWithFacebook(response.authResponse.accessToken);
        navigate(redirectTo);
      } else {
        setFacebookLoading(false);
      }
    } catch (err) {
      setFacebookLoading(false);
      alert(err.message || "Đăng nhập Facebook thất bại.");
    }
  };

  const handleFacebookClick = async () => {
    const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
    if (!appId) {
      alert("Đăng nhập Facebook chưa được cấu hình.");
      return;
    }
    setFacebookLoading(true);
    try {
      await loadFacebookScript();
      if (!window.FB) {
        throw new Error("Facebook SDK không khả dụng.");
      }
      // LUU Y: FB SDK khong chap nhan callback la async function truyen truc tiep
      // (ne'm loi noi bo "Expression is of type asyncfunction, not function").
      // Phai dung callback dong bo, roi goi ham async rieng ben trong.
      window.FB.login(
        (response) => {
          handleFacebookResponse(response);
        },
        { scope: "email,public_profile" }
      );
    } catch (err) {
      setFacebookLoading(false);
      alert(err.message || "Không thể kết nối tới Facebook. Vui lòng thử lại.");
    }
  };

  return (
    <div className="grid w-full grid-cols-2 gap-4">
      <button type="button" className={base} onClick={handleGoogleClick} disabled={googleLoading || facebookLoading}>
        <GoogleIcon /> {googleLoading ? "Đang kết nối..." : "Google"}
      </button>
      <button type="button" className={base} onClick={handleFacebookClick} disabled={googleLoading || facebookLoading}>
        <FacebookIcon /> {facebookLoading ? "Đang kết nối..." : "Facebook"}
      </button>
    </div>
  );
}
