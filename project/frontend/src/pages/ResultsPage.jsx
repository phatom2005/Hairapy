import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TRENDS } from "../lib/figmaAssets";
import { Button, Card, Badge, Section, SectionHeading } from "../components/ui";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { ArrowRight, CheckIcon, StarIcon } from "../components/icons";
import { AnimatedContent, SpotlightCard, GlareHover, BorderGlow } from "../components/animated";
import { useScanStore } from "../store/useScanStore";

// Bản đồ dịch dáng mặt sang tiếng Việt
const FACE_SHAPE_TRANSLATION = {
  Oval: "Trái xoan (Oval)",
  Round: "Tròn (Round)",
  Square: "Vuông (Square)",
  Heart: "Trái tim (Heart)",
  Oblong: "Dài/Thuôn (Oblong)",
  Diamond: "Kim cương (Diamond)",
};

// Đề xuất kiểu tóc dựa theo hình dáng khuôn mặt
const HAIRSTYLE_RECS = {
  Oval: [
    { name: "Layered Bob", match: 98, img: TRENDS[3].img },
    { name: "Textured Pixie", match: 95, img: TRENDS[5].img },
    { name: "Soft Beach Waves", match: 92, img: TRENDS[2].img },
    { name: "Modern Wolf Cut", match: 89, img: TRENDS[0].img }
  ],
  Round: [
    { name: "Long Layers", match: 97, img: TRENDS[1].img },
    { name: "Textured Pixie", match: 93, img: TRENDS[5].img },
    { name: "Layered Bob", match: 90, img: TRENDS[3].img },
    { name: "Curtain Bangs with Waves", match: 88, img: TRENDS[2].img }
  ],
  Square: [
    { name: "Soft Beach Waves", match: 96, img: TRENDS[2].img },
    { name: "Modern Wolf Cut", match: 94, img: TRENDS[0].img },
    { name: "Long Layers", match: 91, img: TRENDS[1].img },
    { name: "Layered Bob", match: 87, img: TRENDS[3].img }
  ],
  Heart: [
    { name: "Layered Bob", match: 98, img: TRENDS[3].img },
    { name: "Soft Beach Waves", match: 95, img: TRENDS[2].img },
    { name: "Modern Wolf Cut", match: 91, img: TRENDS[0].img },
    { name: "Long Layers", match: 88, img: TRENDS[1].img }
  ],
  Oblong: [
    { name: "Soft Beach Waves", match: 97, img: TRENDS[2].img },
    { name: "Layered Bob", match: 94, img: TRENDS[3].img },
    { name: "Curtain Bangs with Waves", match: 92, img: TRENDS[4].img },
    { name: "Modern Wolf Cut", match: 89, img: TRENDS[0].img }
  ],
  Diamond: [
    { name: "Textured Pixie", match: 96, img: TRENDS[5].img },
    { name: "Soft Beach Waves", match: 94, img: TRENDS[2].img },
    { name: "Layered Bob", match: 91, img: TRENDS[3].img },
    { name: "Modern Wolf Cut", match: 88, img: TRENDS[0].img }
  ]
};

// Lý do lựa chọn kiểu tóc dựa theo dáng mặt
const REASONS_MAP = {
  Oval: [
    { title: "Tôn vinh sự cân bằng tự nhiên", desc: "AI đã nhận diện được xương gò má đối xứng của bạn. Các kiểu tóc layer sẽ giúp làm nổi bật sự hài hòa tự nhiên và thanh tú của dáng mặt Oval." },
    { title: "Làm nổi bật đường nét thanh tú", desc: "Đường hàm thon gọn và trán cân đối là ưu điểm lớn. Các kiểu tóc ngắn hoặc vén sau tai sẽ tôn vinh cấu trúc xương lý tưởng này." }
  ],
  Round: [
    { title: "Kéo dài tỷ lệ gương mặt", desc: "Gương mặt tròn có chiều rộng gần bằng chiều dài. Các kiểu tóc dài tỉa tầng hoặc bob lệch sẽ tạo cảm giác gương mặt thon thả và dài hơn." },
    { title: "Tạo độ phồng phần đỉnh đầu", desc: "Phần đỉnh đầu được sấy phồng giúp dịch chuyển trọng tâm thị giác của người đối diện lên trên, làm gương mặt trông thanh thoát hơn." }
  ],
  Square: [
    { title: "Làm mềm các góc cạnh", desc: "Gương mặt vuông có phần hàm sắc sảo. Sóng nước mềm mại hoặc wolf cut tỉa tầng sẽ che bớt góc hàm và tạo độ nữ tính, mềm mại." },
    { title: "Tránh các đường cắt ngang thô", desc: "Các đường layer so le mềm mại ôm sát gương mặt sẽ giúp phá vỡ các khối vuông góc cạnh một cách khéo léo và tự nhiên." }
  ],
  Heart: [
    { title: "Cân bằng nửa dưới gương mặt", desc: "Gương mặt hình tim có trán rộng và cằm nhọn. Các lọn tóc xoăn nhẹ ở phần đuôi giúp bù đắp chiều ngang cho phần cằm hẹp." },
    { title: "Giảm độ rộng vùng trán thái dương", desc: "Mái thưa hoặc mái bay rủ nhẹ sang hai bên sẽ che bớt phần thái dương rộng, tạo tỷ lệ cân đối hơn cho phần trên khuôn mặt." }
  ],
  Oblong: [
    { title: "Mở rộng chiều ngang gương mặt", desc: "Khuôn mặt thuôn dài cần các kiểu tóc xoăn nhẹ hoặc sóng lơi bồng bềnh để tạo cảm giác đầy đặn hơn về chiều rộng." },
    { title: "Rút ngắn chiều dài bằng mái che", desc: "Mái bằng hoặc mái bay che bớt phần trán cao sẽ giúp rút ngắn chiều dài thị giác một cách đáng kể." }
  ],
  Diamond: [
    { title: "Làm dịu phần gò má nhô cao", desc: "Dáng mặt kim cương có gò má rộng và trán, cằm hẹp. Các kiểu tóc bob tỉa tầng ôm nhẹ sẽ che bớt độ rộng vùng gò má." },
    { title: "Tạo độ phồng vùng thái dương", desc: "Độ phồng ở phần thái dương và chân tóc quanh cằm giúp cân đối khoảng cách so với phần gò má rộng nhất." }
  ]
};

export default function ResultsPage() {
  const navigate = useNavigate();
  
  // Lấy kết quả phân tích và ảnh preview từ Zustand store
  const { analysisResult, previewUrl } = useScanStore();

  // Kiểm tra nếu chưa có kết quả scan thì chuyển hướng về /scan
  useEffect(() => {
    if (!analysisResult) {
      navigate("/scan");
    }
  }, [analysisResult, navigate]);

  if (!analysisResult) {
    return null;
  }

  const { faceShape, metrics } = analysisResult;

  // Cấu hình các chỉ số sinh trắc học dựa trên dáng khuôn mặt nhận diện được
  const faceShapeText = FACE_SHAPE_TRANSLATION[faceShape] || faceShape;
  const BIOMETRICS = [
    { label: "Hình dáng khuôn mặt", value: faceShapeText },
    { label: "Chất tóc", value: "Wavy (Sóng nhẹ)" },
    { label: "Tông da", value: "Warm (Ấm)" },
    { label: "Mật độ tóc", value: "Medium (Trung bình)" },
  ];

  // Tính toán điểm số trực quan dựa trên tỷ lệ khuôn mặt thực tế
  const symmetryScore = Math.min(99, Math.round(90 + (metrics.widthToLength ? (1 - Math.abs(0.75 - metrics.widthToLength)) * 10 : 5)));
  const styleScore = Math.round(85 + (metrics.foreheadToJaw ? Math.min(14, metrics.foreheadToJaw * 10) : 10));

  const SCORES = [
    { label: "Điểm cân đối", value: symmetryScore },
    { label: "Độ hợp phong cách", value: styleScore },
  ];

  // Lấy các khuyến nghị kiểu tóc và lý do tương ứng với dáng khuôn mặt
  const recs = HAIRSTYLE_RECS[faceShape] || HAIRSTYLE_RECS.Oval;
  const reasons = REASONS_MAP[faceShape] || REASONS_MAP.Oval;

  const tryStyle = () => navigate("/swap");

  return (
    <div className="min-h-screen">
      <Navbar />

      <Section className="bg-transparent">
        {/* Header */}
        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          <Badge variant="new" className="uppercase tracking-wider text-[#3a4d00]">AI phân tích trực tiếp</Badge>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Phân tích kết quả của bạn</h1>
          <p className="text-base text-mauve">Dựa trên trí tuệ nhân tạo, chúng tôi đã tạo ra hồ sơ tóc cá nhân hóa cho bạn.</p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.4fr]">
          {/* Hồ sơ khuôn mặt */}
          <Card className="flex flex-col gap-6">
            <h3 className="text-xl font-bold text-ink">Hồ sơ khuôn mặt</h3>
            <img 
              src={previewUrl} 
              alt="Khuôn mặt người dùng" 
              className="aspect-square w-full rounded-2xl object-cover border border-line" 
            />

            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Chỉ số sinh trắc học</p>
              <dl className="grid grid-cols-2 gap-3">
                {BIOMETRICS.map((b) => (
                  <div key={b.label} className="rounded-xl bg-canvas p-3">
                    <dt className="text-xs text-muted">{b.label}</dt>
                    <dd className="text-base font-bold text-ink">{b.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Điểm chuẩn</p>
              <div className="flex flex-col gap-3">
                {SCORES.map((s) => (
                  <div key={s.label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-mauve">{s.label}</span>
                      <span className="font-bold text-magenta">{s.value}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-line">
                      <div className="h-2 rounded-full bg-magenta" style={{ width: `${s.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="flex items-center gap-2 text-xs text-muted">
              <CheckIcon size={14} className="text-lime" /> Dữ liệu được xác thực bởi <b className="text-mauve">Hairapy AI v4.2</b>
            </p>
          </Card>

          {/* Đề xuất */}
          <div className="flex flex-col gap-6">
            <SectionHeading 
              center={false}
              title={`Kiểu tóc dành cho gương mặt ${FACE_SHAPE_TRANSLATION[faceShape].split(" (")[0]}`}
              subtitle="4 đề xuất hàng đầu phù hợp nhất với cấu trúc xương của bạn."
              action={<a href="#" className="flex shrink-0 items-center gap-2 font-bold text-primary">Xem tất cả <ArrowRight /></a>} 
            />

            <div className="grid grid-cols-2 gap-6">
              {recs.map((r, idx) => (
                <AnimatedContent key={r.name} delay={idx * 0.1}>
                  <SpotlightCard className="rounded-2xl">
                    <Card padded={false} className="overflow-hidden">
                      <div className="relative">
                        <img src={r.img} alt={r.name} className="h-56 w-full object-cover" />
                        <Badge variant="new" className="absolute left-3 top-3 shadow">{r.match}% phù hợp</Badge>
                      </div>
                      <div className="flex items-center justify-between p-4">
                        <h4 className="font-bold text-ink">{r.name}</h4>
                        <Button onClick={tryStyle} size="sm" className="px-4 py-2 text-xs">Thử ngay</Button>
                      </div>
                    </Card>
                  </SpotlightCard>
                </AnimatedContent>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Tại sao phù hợp */}
      <Section className="bg-transparent">
        <SectionHeading title="Tại sao các kiểu tóc này lại phù hợp?" />
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {reasons.map((r, idx) => (
            <AnimatedContent key={r.title} delay={idx * 0.15}>
              <SpotlightCard className="rounded-2xl">
                <Card>
                  <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-pink/10 text-pink">
                    <StarIcon size={22} />
                  </span>
                  <h3 className="mb-2 text-xl font-bold text-ink">{r.title}</h3>
                  <p className="leading-relaxed text-mauve">{r.desc}</p>
                </Card>
              </SpotlightCard>
            </AnimatedContent>
          ))}
        </div>
      </Section>

      {/* CTA AR */}
      <section className="bg-transparent px-4 py-16 sm:px-16">
        <AnimatedContent y={60}>
          <GlareHover className="mx-auto max-w-[1200px] rounded-[40px]">
            <div className="relative flex flex-col items-center gap-6 overflow-hidden rounded-[40px] bg-[#2f3131] p-12 text-center sm:p-16">
              <div className="pointer-events-none absolute inset-[-10%] bg-pink/20 blur-[60px]" />
              <h2 className="relative font-display text-3xl font-extrabold text-white sm:text-4xl">Muốn thử tất cả các kiểu tóc bằng AR?</h2>
              <p className="relative max-w-xl text-[#e2e2e2]">
                Sử dụng công nghệ thực tế ảo tăng cường để thấy chính mình trong hàng trăm kiểu tóc khác nhau trước khi ra tiệm.
              </p>
              <div className="relative">
                <BorderGlow rounded="rounded-full" thickness={2}>
                  <Button to="/pricing" variant="pink">Nâng cấp Premium ngay</Button>
                </BorderGlow>
              </div>
            </div>
          </GlareHover>
        </AnimatedContent>
      </section>

      <Footer />
    </div>
  );
}
