import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SCAN_PORTRAIT } from "../lib/figmaAssets";
import { Button, Badge, DisclosureModal } from "../components/ui";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { CameraIcon, UploadIcon } from "../components/icons";
import { AnimatedContent, BorderGlow } from "../components/animated";
import { useScanStore } from "../store/useScanStore";
import { analyzeFace, initFaceAnalyzer } from "../lib/faceAnalysis";

const STATS = [
  { value: "478 điểm", label: "Điểm khuôn mặt" },
  { value: "0.2s", label: "Thời gian xử lý" },
  { value: "Toàn cầu", label: "Kho xu hướng" },
];

export default function ScanPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Lấy dữ liệu và actions từ Zustand store
  const {
    previewUrl,
    setImage,
    setResult,
    analyzing,
    setAnalyzing,
    error,
    setError,
    reset,
    gender,
    setGender,
  } = useScanStore();

  const [showDisclosure, setShowDisclosure] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);

  // Preload model MediaPipe khi vào trang lần đầu tiên
  useEffect(() => {
    initFaceAnalyzer().catch(err => {
      console.error("Lỗi preload model:", err);
    });
  }, []);

  // Xử lý sự kiện khi người dùng chọn/chụp ảnh
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra kích thước file (tối đa 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Kích thước tệp tin vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.");
      return;
    }

    const accepted = localStorage.getItem("hairapy_disclosure_accepted") === "true";
    if (accepted) {
      startAnalysis(file);
    } else {
      setPendingFile(file);
      setShowDisclosure(true);
    }
  };

  // Kích hoạt phân tích ảnh
  const startAnalysis = async (file) => {
    setAnalyzing(true);
    setError(null);
    setImage(file);

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = objectUrl;

    img.onload = async () => {
      try {
        const result = await analyzeFace(img);
        setResult(result);
        setAnalyzing(false);
        URL.revokeObjectURL(objectUrl);
        navigate("/results");
      } catch (err) {
        console.error("Lỗi phân tích khuôn mặt:", err);
        setError(err.message || "Không thể phân tích khuôn mặt. Hãy chắc chắn ảnh rõ mặt.");
        setAnalyzing(false);
        URL.revokeObjectURL(objectUrl);
      }
    };

    img.onerror = () => {
      setError("Không thể tải hình ảnh để tiến hành phân tích.");
      setAnalyzing(false);
      URL.revokeObjectURL(objectUrl);
    };
  };

  const handleAcceptDisclosure = () => {
    setShowDisclosure(false);
    if (pendingFile) {
      startAnalysis(pendingFile);
      setPendingFile(null);
    }
  };

  const handleCloseDisclosure = () => {
    setShowDisclosure(false);
    setPendingFile(null);
    reset();
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes laserScan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}} />

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
                hơn 470+ điểm trên khuôn mặt để gợi ý kiểu cắt, màu và phong cách phù hợp nhất
                với cấu trúc xương riêng của bạn.
              </p>
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.15}>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-mauve">Giới tính của bạn</p>
              <div className="flex gap-3">
                {[
                  { value: "Nam", icon: "👨" },
                  { value: "Nữ", icon: "👩" },
                ].map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setGender(g.value)}
                    className={`flex items-center gap-2 rounded-full border-2 px-5 py-2.5 text-sm font-semibold transition-all ${
                      gender === g.value
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-line text-mauve hover:border-primary/50"
                    }`}
                  >
                    <span>{g.icon}</span>
                    {g.value}
                  </button>
                ))}
              </div>
              {!gender && (
                <p className="text-xs text-muted">Vui lòng chọn để AI gợi ý kiểu tóc phù hợp hơn</p>
              )}
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.2}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-4">
                <BorderGlow rounded="rounded-full" thickness={2}>
                  <Button
                    onClick={() => cameraInputRef.current?.click()}
                    icon={<CameraIcon size={20} />}
                    disabled={analyzing}
                  >
                    Chụp ảnh
                  </Button>
                </BorderGlow>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  icon={<UploadIcon size={20} />}
                  disabled={analyzing}
                >
                  Tải ảnh lên
                </Button>
              </div>

              {error && (
                <div className="max-w-lg rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm font-medium text-red-500">
                  ⚠️ {error}
                </div>
              )}
            </div>
          </AnimatedContent>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleFileChange}
            accept="image/*"
            capture="user"
            className="hidden"
          />

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
              <img
                src={previewUrl || SCAN_PORTRAIT}
                alt="Đang quét AI"
                className="aspect-[3/4] w-full object-cover transition-all duration-300"
              />

              {analyzing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/60 backdrop-blur-sm transition-opacity duration-300">
                  <div className="relative z-10 flex flex-col items-center gap-4 text-center px-6">
                    <span className="size-16 animate-spin rounded-full border-4 border-pink border-t-transparent shadow-lg" />
                    <p className="font-display font-semibold text-white animate-pulse tracking-wide text-lg">
                      Đang phân tích khuôn mặt...
                    </p>
                    <p className="text-xs text-white/70">
                      Tính toán 478 điểm mốc bằng WebAssembly
                    </p>
                  </div>
                  <div
                    className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-pink to-transparent shadow-[0_0_15px_#ff57cf]"
                    style={{ animation: "laserScan 2.5s ease-in-out infinite" }}
                  />
                </div>
              )}

              {[
                "left-8 top-8 border-l-4 border-t-4 rounded-tl-xl",
                "right-8 top-8 border-r-4 border-t-4 rounded-tr-xl",
                "bottom-8 left-8 border-b-4 border-l-4 rounded-bl-xl",
                "bottom-8 right-8 border-b-4 border-r-4 rounded-br-xl",
              ].map((c) => (
                <span key={c} className={`absolute size-12 border-pink ${c}`} />
              ))}

              <div className="absolute right-7 top-12 flex items-center gap-2 rounded-2xl border border-magenta/20 bg-white/90 px-4 py-2 shadow-lg backdrop-blur-md">
                <span className="text-[11px] text-magenta">đã xác thực</span>
                <span className="text-sm font-semibold text-ink">Chính xác 99.8%</span>
              </div>

              <div className="absolute inset-x-10 bottom-12 flex items-center justify-between rounded-2xl bg-ink/80 p-4 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <span className="size-10 rounded-full border-2 border-pink" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Nhận diện khuôn mặt</p>
                    <p className="text-sm font-semibold text-white">CHẠY CLIENT-SIDE</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Độ bảo mật</p>
                  <p className="text-2xl font-bold text-pink">100%</p>
                </div>
              </div>
            </div>
          </div>
        </AnimatedContent>
      </section>

      <DisclosureModal
        isOpen={showDisclosure}
        onClose={handleCloseDisclosure}
        onAccept={handleAcceptDisclosure}
      />

      <Footer />
    </div>
  );
}
