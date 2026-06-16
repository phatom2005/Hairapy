import { useState } from "react";
import { SALON_MAP, SALONS } from "../lib/figmaAssets";
import { Button, Card, Badge, Input } from "../components/ui";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { StarIcon } from "../components/icons";
import { AnimatedContent, SpotlightCard } from "../components/animated";

const FILTERS = ["Quận / Huyện", "Loại dịch vụ", "Khoảng giá"];

export default function SalonsPage() {
  const [q, setQ] = useState("");
  const list = SALONS.filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Thanh tìm kiếm + filter */}
      <section className="border-b border-divider/20 bg-white px-6 py-6 sm:px-16">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1">
            <Input placeholder="Tìm kiếm salon theo tên hoặc dịch vụ..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <select key={f} className="rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-mauve outline-none">
                <option>{f}</option>
              </select>
            ))}
            <Button size="sm">Lọc</Button>
          </div>
        </div>
      </section>

      {/* List + Map */}
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-6 py-10 sm:px-16 lg:grid-cols-[1.2fr_1fr]">
        {/* Danh sách salon */}
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h1 className="font-display text-2xl font-bold text-ink">{list.length} Salon gần bạn</h1>
            <a href="#" className="text-sm font-bold text-primary">Xem tất cả</a>
          </div>

          <div className="flex flex-col gap-5">
            {list.map((sl, idx) => (
              <AnimatedContent key={sl.name} delay={idx * 0.08}>
                <SpotlightCard className="rounded-2xl">
                  <Card padded={false} className="flex flex-col overflow-hidden sm:flex-row">
                    <img src={sl.img} alt={sl.name} className="h-44 w-full object-cover sm:w-44" />
                    <div className="flex flex-1 flex-col gap-2 p-5">
                      {sl.verified && <Badge variant="premium" className="w-fit">HAIRAPY KIỂM ĐỊNH</Badge>}
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-ink">{sl.name}</h3>
                        <span className="flex items-center gap-1 text-sm font-bold text-ink">
                          <StarIcon size={16} className="text-lime" /> {sl.rating}
                        </span>
                      </div>
                      <p className="text-sm text-mauve">{sl.addr}</p>
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Giá từ</p>
                          <p className="font-bold text-magenta">{sl.price}</p>
                        </div>
                        <Button size="sm">Đặt lịch ngay</Button>
                      </div>
                    </div>
                  </Card>
                </SpotlightCard>
              </AnimatedContent>
            ))}
            {list.length === 0 && <p className="py-10 text-center text-mauve">Không tìm thấy salon.</p>}
          </div>
        </div>

        {/* Bản đồ */}
        <div className="relative hidden overflow-hidden rounded-3xl shadow-lg lg:block">
          <img src={SALON_MAP} alt="Bản đồ salon" className="sticky top-24 h-[600px] w-full object-cover" />
        </div>
      </div>

      <Footer />
    </div>
  );
}
