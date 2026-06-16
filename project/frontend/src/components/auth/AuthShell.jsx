// Khung Login + Register: một thẻ frosted bo góc đặt giữa, nổi trên SoftAurora.
// Không còn vệt chia dọc (seam) như bản split full-height trước.
import { LOGO_STACK } from "../../lib/figmaAssets";
import { GoogleIcon, FacebookIcon } from "../icons";

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

export function SocialButtons() {
  const base =
    "flex items-center justify-center gap-3 rounded-3xl border-2 border-line bg-white py-[14px] " +
    "text-sm font-semibold text-ink transition hover:bg-canvas";
  return (
    <div className="grid w-full grid-cols-2 gap-4">
      <button type="button" className={base}><GoogleIcon /> Google</button>
      <button type="button" className={base}><FacebookIcon /> Facebook</button>
    </div>
  );
}
