import { LOGO_NGANG } from "../../lib/figmaAssets";
import { Link } from "react-router-dom";

// links: [{ label, to }] (route nội bộ) hoặc [{ label, href }] (mailto/link ngoài)
function FooterCol({ title, links }) {
  return (
    <div className="flex flex-col gap-4">
      <h5 className="font-bold text-magenta">{title}</h5>
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
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 py-12 sm:px-16 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Link to="/" className="inline-flex items-center">
            <img src={LOGO_NGANG} alt="Hairapy" className="h-20 w-auto" />
          </Link>
          <p className="max-w-sm text-mauve">
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
            ]}
          />
          <FooterCol title="Liên Hệ" links={[{ label: "Hỗ trợ", href: "mailto:hairapy.exe@gmail.com" }]} />
        </div>
      </div>
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 border-t border-divider/10 py-8 sm:flex-row sm:px-16">
        <p className="text-sm font-semibold text-mauve">© 2026 Hairapy AI. Scan. Style. Smile.</p>
        <div className="flex flex-wrap gap-6 text-sm font-semibold text-mauve">
          <Link to="/privacy" className="hover:text-ink transition-colors">Bảo mật</Link>
          <Link to="/terms" className="hover:text-ink transition-colors">Điều khoản</Link>
          <Link to="/delete-account" className="hover:text-ink transition-colors">Xoá tài khoản</Link>
        </div>
      </div>
    </footer>
  );
}
