import { useState } from "react";
import { SCAN_PORTRAIT, TRENDS } from "../lib/figmaAssets";
import { Button, Card } from "../components/ui";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { CheckIcon } from "../components/icons";

const STYLES = TRENDS.slice(0, 6); // tái dùng ảnh trend làm thumbnail kiểu tóc
const PALETTES = {
  "Tự nhiên": ["#1a1a1a", "#3a2a1a", "#6b4423", "#a0703c", "#c89b6a", "#e0c097"],
  "Neon & Pastel": ["#ff57cf", "#2a4ae8", "#d0ee88", "#9b5cff", "#42d6e8", "#ff8fb1"],
};

export default function SwapPage() {
  const [styleIdx, setStyleIdx] = useState(0);
  const [tab, setTab] = useState("Tự nhiên");
  const [color, setColor] = useState(PALETTES["Tự nhiên"][2]);
  const [shade, setShade] = useState(50);
  const [applied, setApplied] = useState(false);

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-6 py-12 sm:px-16 lg:grid-cols-[340px_1fr]">
        {/* ASIDE: bộ chọn */}
        <Card className="flex flex-col gap-6">
          {/* Chọn kiểu tóc */}
          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">Chọn kiểu tóc</h2>
            <div className="grid grid-cols-3 gap-3">
              {STYLES.map((s, i) => (
                <button key={s.name} onClick={() => setStyleIdx(i)}
                  className={`relative overflow-hidden rounded-xl border-2 transition ${
                    styleIdx === i ? "border-primary" : "border-transparent"}`}>
                  <img src={s.img} alt={s.name} className="aspect-square w-full object-cover" />
                  {styleIdx === i && (
                    <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-primary text-white">
                      <CheckIcon size={12} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Màu sắc */}
          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">Màu sắc</h2>
            <div className="mb-3 flex gap-2 rounded-full bg-canvas p-1">
              {Object.keys(PALETTES).map((t) => (
                <button key={t} onClick={() => { setTab(t); setColor(PALETTES[t][2]); }}
                  className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
                    tab === t ? "bg-white text-ink shadow" : "text-muted"}`}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {PALETTES[tab].map((c) => (
                <button key={c} onClick={() => setColor(c)}
                  className={`size-9 rounded-full border-2 transition ${
                    color === c ? "border-ink scale-110" : "border-white"}`}
                  style={{ backgroundColor: c }} aria-label={c} />
              ))}
            </div>
          </div>

          {/* Tùy chỉnh sắc độ */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-mauve">Tùy chỉnh sắc độ</label>
            <input type="range" min="0" max="100" value={shade}
              onChange={(e) => setShade(+e.target.value)}
              className="w-full accent-primary" />
          </div>

          <Button onClick={() => setApplied(true)} className="w-full">Áp dụng</Button>
        </Card>

        {/* PREVIEW */}
        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-[32px] shadow-2xl ring-4 ring-pink/40">
            <img src={SCAN_PORTRAIT} alt="Preview" className="aspect-[4/3] w-full object-cover" />
            {/* lớp phủ màu mô phỏng */}
            <div className="pointer-events-none absolute inset-0 mix-blend-soft-light"
              style={{ backgroundColor: color, opacity: shade / 150 }} />
            {/* trạng thái AI */}
            <div className="absolute left-6 top-6 flex items-center gap-2 rounded-full bg-ink/70 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md">
              <span className="size-2 animate-pulse rounded-full bg-lime" />
              {applied ? "Hoàn tất" : "Đang mô phỏng AI..."}
            </div>
            {/* thanh hành động nổi */}
            <div className="absolute inset-x-6 bottom-6 flex items-center justify-between rounded-2xl bg-white/90 px-5 py-3 shadow-lg backdrop-blur-md">
              <div>
                <p className="text-sm font-bold text-ink">{STYLES[styleIdx].name}</p>
                <p className="text-xs text-muted">Màu đang chọn</p>
              </div>
              <span className="size-8 rounded-full border-2 border-line" style={{ backgroundColor: color }} />
            </div>
          </div>

          {/* Lịch sử */}
          <div>
            <p className="mb-3 text-sm font-bold text-mauve">Lịch sử:</p>
            <div className="flex gap-3">
              {STYLES.slice(0, 5).map((s) => (
                <img key={s.name} src={s.img} alt={s.name}
                  className="size-16 rounded-xl object-cover opacity-80 transition hover:opacity-100" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
