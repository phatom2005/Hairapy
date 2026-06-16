import { useNavigate } from "react-router-dom";
import { SCAN_PORTRAIT } from "../lib/figmaAssets";
import { Button, Badge } from "../components/ui";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { CameraIcon, UploadIcon } from "../components/icons";
import { AnimatedContent, BorderGlow } from "../components/animated";

const STATS = [
  { value: "150+", label: "Điểm khuôn mặt" },
  { value: "0.2s", label: "Thời gian xử lý" },
  { value: "Toàn cầu", label: "Kho xu hướng" },
];

export default function ScanPage() {
  const navigate = useNavigate();
  const goResults = () => navigate("/results");

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="mx-auto grid max-w-[1100px] grid-cols-1 items-center gap-12 px-6 py-16 sm:px-10 lg:grid-cols-2">
        {/* Trái: nội dung */}
        <div className="flex flex-col gap-8">
          <AnimatedContent>
            <div className="flex flex-col items-start gap-4">
              <Badge variant="new" className="uppercase tracking-wider text-[#3a4d00]">Phân tích AI</Badge>
              <h1 className="font-display text-5xl font-extrabold leading-tight tracking-tight text-ink">
                Để AI tìm ra <span className="text-pink">phiên bản đẹp nhất của bạn</span>
              </h1>
              <p className="max-w-lg text-lg leading-7 text-mauve">
                Trải nghiệm tương lai của tạo kiểu với mạng nơ-ron tiên tiến. AI của chúng tôi phân tích
                hơn 150+ điểm trên khuôn mặt để gợi ý kiểu cắt, màu và phong cách phù hợp nhất
                với cấu trúc xương riêng của bạn.
              </p>
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.2}>
            <div className="flex flex-wrap gap-4">
              {/* CTA chính: viền glow xoay */}
              <BorderGlow rounded="rounded-full" thickness={2}>
                <Button onClick={goResults} icon={<CameraIcon size={20} />}>Chụp ảnh</Button>
              </BorderGlow>
              <Button onClick={goResults} variant="outline" icon={<UploadIcon size={20} />}>Tải ảnh lên</Button>
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.4}>
            <div className="flex gap-8 pt-4">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-magenta">{s.value}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-mauve">{s.label}</p>
                </div>
              ))}
            </div>
          </AnimatedContent>
        </div>

        {/* Phải: khung scan */}
        <AnimatedContent delay={0.3} y={50}>
          <div className="relative">
            <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-magenta/5 blur-[32px]" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 size-80 rounded-full bg-primary/5 blur-[32px]" />

            <div className="relative overflow-hidden rounded-[32px] border-4 border-white bg-line shadow-2xl">
              <img src={SCAN_PORTRAIT} alt="Đang quét AI" className="aspect-[3/4] w-full object-cover" />

              {/* 4 góc khung digital */}
              {[
                "left-8 top-8 border-l-4 border-t-4 rounded-tl-xl",
                "right-8 top-8 border-r-4 border-t-4 rounded-tr-xl",
                "bottom-8 left-8 border-b-4 border-l-4 rounded-bl-xl",
                "bottom-8 right-8 border-b-4 border-r-4 rounded-br-xl",
              ].map((c) => (
                <span key={c} className={`absolute size-12 border-pink ${c}`} />
              ))}

              {/* badge độ chính xác */}
              <div className="absolute right-7 top-12 flex items-center gap-2 rounded-2xl border border-magenta/20 bg-white/90 px-4 py-2 shadow-lg backdrop-blur-md">
                <span className="text-[11px] text-magenta">đã xác thực</span>
                <span className="text-sm font-semibold text-ink">Chính xác 99.8%</span>
              </div>

              {/* data readout */}
              <div className="absolute inset-x-10 bottom-12 flex items-center justify-between rounded-2xl bg-ink/80 p-4 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <span className="size-10 rounded-full border-2 border-pink" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Nhận diện khuôn mặt</p>
                    <p className="text-sm font-semibold text-white">DÁNG OVAL</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Độ tin cậy</p>
                  <p className="text-2xl font-bold text-pink">94%</p>
                </div>
              </div>
            </div>
          </div>
        </AnimatedContent>
      </section>

      <Footer />
    </div>
  );
}
