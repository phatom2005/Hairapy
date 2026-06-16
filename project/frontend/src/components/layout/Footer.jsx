import { LOGO } from "../../lib/figmaAssets";

function FooterCol({ title, links }) {
  return (
    <div className="flex flex-col gap-4">
      <h5 className="font-bold text-magenta">{title}</h5>
      {links.map((l) => (
        <a key={l} href="#" className="text-mauve hover:text-ink">{l}</a>
      ))}
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="rounded-t-3xl bg-white px-6 sm:px-16">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 py-12 sm:px-16 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <img src={LOGO} alt="Hairapy" className="size-12" />
            <span className="text-2xl font-black text-magenta">Hairapy</span>
          </div>
          <p className="max-w-sm text-mauve">
            Hairapy AI - Ứng dụng dẫn đầu về công nghệ làm đẹp cho thế hệ mới. Chúng tôi tin rằng
            mỗi người đều xứng đáng có một diện mạo tự tin nhất.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <FooterCol title="Khám Phá" links={["Về chúng tôi", "Tính năng", "Catalog"]} />
          <FooterCol title="Liên Hệ" links={["Instagram", "TikTok", "Hỗ trợ"]} />
        </div>
      </div>
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 border-t border-divider/10 py-8 sm:flex-row sm:px-16">
        <p className="text-sm font-semibold text-mauve">© 2026 Hairapy AI. Scan. Style. Smile.</p>
        <div className="flex gap-6 text-sm font-semibold text-mauve">
          <a href="#">Bảo mật</a>
          <a href="#">Điều khoản</a>
        </div>
      </div>
    </footer>
  );
}
