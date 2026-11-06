import { LOGO_NGANG, LOGO_NGANG_SIZE } from "../../lib/figmaAssets";
import { Link } from "react-router-dom";

// links: [{ label, to }] (route nội bộ) hoặc [{ label, href }] (mailto/link ngoài)
function FooterCol({ title, links }) {
  return (
    <div className="flex flex-col gap-2.5 text-sm sm:gap-4 sm:text-base">
      {/* h2 thay h5: tránh nhảy cấp tiêu đề (a11y). Tailwind reset cỡ chữ heading về inherit nên hiển thị y như cũ */}
      <h2 className="font-bold text-magenta">{title}</h2>
      {links.map((l) =>
        l.to ? (
          <Link key={l.label} to={l.to} className="text-mauve hover:text-ink">{l.label}</Link>
        ) : (
          <a key={l.label} href={l.href} className="text-mauve hover:text-ink">{l.label}</a>
        )
      )}
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="rounded-t-3xl bg-white px-6 sm:px-16">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 py-8 sm:gap-8 sm:px-16 sm:py-12 md:grid-cols-2">
        <div className="flex flex-col gap-3 sm:gap-6">
          <Link to="/" className="-ml-2 inline-flex items-center self-start">
            <img src={LOGO_NGANG} alt="Hairapy" {...LOGO_NGANG_SIZE} loading="lazy" decoding="async" className="h-12 w-auto sm:h-20" />
          </Link>
          <p className="max-w-sm text-sm text-mauve sm:text-base">
            Hairapy AI - Ứng dụng dẫn đầu về công nghệ làm đẹp cho thế hệ mới. Chúng tôi tin rằng
            mỗi người đều xứng đáng có một diện mạo tự tin nhất.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <FooterCol
            title="Khám Phá"
            links={[
              { label: "Catalog", to: "/catalog" },
              { label: "Bảng giá", to: "/pricing" },
              { label: "Salon", to: "/salons" },
              { label: "Dành cho Salon đối tác", to: "/for-salons" },
            ]}
          />
          <FooterCol title="Liên Hệ" links={[{ label: "Hỗ trợ", href: "mailto:hairapy.exe@gmail.com" }]} />
        </div>
      </div>
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 border-t border-divider/10 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:flex-row sm:gap-4 sm:px-16 sm:py-8">
        <p className="text-xs font-semibold text-mauve sm:text-sm">© 2026 Hairapy AI. Scan. Style. Smile.</p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-semibold text-mauve sm:text-sm">
          <Link to="/privacy" className="hover:text-ink transition-colors">Bảo mật</Link>
          <Link to="/terms" className="hover:text-ink transition-colors">Điều khoản</Link>
          <Link to="/delete-account" className="hover:text-ink transition-colors">Xoá tài khoản</Link>
        </div>
      </div>
    </footer>
  );
}
