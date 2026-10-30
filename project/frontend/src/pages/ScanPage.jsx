import QuotaBadge from "../components/QuotaBadge";
import { Danger } from "iconsax-reactjs";
import { trackEvent, setUserProps } from "../lib/analytics";
import { useRef, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ScanGuideIllustration from "../components/ScanGuideIllustration";
import { Button, Badge, DisclosureModal } from "../components/ui";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { UploadIcon } from "../components/icons";
import { AnimatedContent, BorderGlow } from "../components/animated";
import { useScanStore } from "../store/useScanStore";
import { analyzeFace, initFaceAnalyzer } from "../lib/faceAnalysis";
import { useQueryClient } from "@tanstack/react-query";
import { normalizeImage } from "../utils/imageUtils";
import api from "../lib/api";

const STATS = [
  { value: "Trên máy bạn", label: "Ảnh không gửi đi để phân tích" },
  { value: "6 dáng mặt", label: "Trái xoan · Tròn · Vuông · Tim · Dài · Kim cương" },
  { value: "Tự chỉnh được", label: "Bạn có thể sửa nếu AI đoán chưa đúng" },
];

export default function ScanPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hairstyleId = searchParams.get("hairstyleId");
  const fileInputRef = useRef(null);

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
  } = useScanStore();

  const queryClient = useQueryClient();

  const [showDisclosure, setShowDisclosure] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);

  // Preload model MediaPipe khi vào trang lần đầu tiên
  useEffect(() => {
    initFaceAnalyzer().catch(err => {
      console.error("Lỗi preload model:", err);
    });
  }, []);

  // Xử lý sự kiện khi người dùng chọn/chụp ảnh
  const handleFileChange = async (e) => {
    let file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra kích thước file (> 5MB thì thử nén trước)
    if (file.size > 5 * 1024 * 1024) {
      file = await normalizeImage(file);
      if (file.size > 5 * 1024 * 1024) {
        setError("Kích thước tệp tin vượt quá 5MB kể cả sau khi tối ưu. Vui lòng chọn ảnh khác.");
        return;
      }
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
      let notSaved = false;
      try {
        const result = await analyzeFace(img);
        setResult(result);
        setUserProps({ face_shape: result.faceShape });

        // Gửi kết quả phân tích dáng khuôn mặt lên backend để lưu lịch sử quét
        const token = localStorage.getItem("token");
        if (token) {
          try {
            const formData = new FormData();
            formData.append("faceShape", result.faceShape);
            formData.append("image", file);
            formData.append("hairType", "Bình thường");
            await api.post("/profile/scans", formData, {
              headers: {
                "Content-Type": "multipart/form-data",
              }
            });
            trackEvent("face_scan", { face_shape: result.faceShape });
            queryClient.invalidateQueries({ queryKey: ["usage-summary"] });
          } catch (backendErr) {
            console.error("Lỗi khi lưu lịch sử quét lên backend:", backendErr);
            if (backendErr.response?.status === 429) {
              trackEvent("quota_exceeded", { feature: "face_scan" });
              notSaved = true;
            }
          }
        }

        setAnalyzing(false);
        URL.revokeObjectURL(objectUrl);
        const targetPath = hairstyleId ? `/results?hairstyleId=${hairstyleId}` : "/results";
        navigate(targetPath, { state: { notSaved } });
      } catch (err) {
        console.error("Lỗi phân tích khuôn mặt:", err);
        trackEvent("scan_error", { reason: "analyze_failed" });
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

      <section className="mx-auto grid max-w-[1100px] grid-cols-1 items-center gap-10 lg:gap-12 px-4 sm:px-10 py-10 sm:py-16 lg:grid-cols-2">
        {/* Trái: nội dung */}
        <div className="flex flex-col gap-6 sm:gap-8">
          <AnimatedContent>
            <div className="flex flex-col items-start gap-3 sm:gap-4">
              <Badge variant="new" className="uppercase tracking-wider text-[#3a4d00]">Gợi ý AI</Badge>
              <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight text-ink">
                Để AI gợi ý <span className="text-pink">kiểu tóc phù hợp với bạn</span>
              </h1>
              <p className="max-w-lg text-sm sm:text-base lg:text-lg leading-relaxed text-mauve">
                AI đo tỉ lệ khuôn mặt từ ảnh chân dung để <strong>gợi ý</strong> dáng mặt và kiểu tóc tham khảo.
                Kết quả phụ thuộc chất lượng ảnh — bạn luôn có thể tự chỉnh lại.
              </p>
            </div>
          </AnimatedContent>

          {/* Hướng dẫn chụp ảnh */}
          <AnimatedContent delay={0.15}>
            <div className="rounded-2xl border border-divider/40 bg-white/60 p-5 text-xs text-mauve backdrop-blur-sm shadow-sm">
              <p className="font-bold text-ink mb-3 text-sm">Hướng dẫn để AI phân tích tốt nhất:</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-pink shrink-0" />
                  <span>Chụp thẳng góc chính diện</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-pink shrink-0" />
                  <span>Đủ ánh sáng, không ngược sáng</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-pink shrink-0" />
                  <span>Không đeo kính, không khẩu trang</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-pink shrink-0" />
                  <span>Vén tóc mái để lộ rõ trán</span>
                </li>
              </ul>
              <p className="mt-3 text-[11px] text-muted italic border-t border-divider/20 pt-2">
                * Thuật toán đo tỉ lệ hình học nên ảnh nghiêng hoặc che trán có thể cho kết quả chưa chuẩn.
              </p>
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.2}>
            <div className="flex flex-col gap-4">
              <QuotaBadge feature="FACE_SCAN" />
              <div className="flex flex-wrap gap-4">
                <BorderGlow rounded="rounded-full" thickness={2}>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    icon={<UploadIcon size={20} />}
                    disabled={analyzing}
                  >
                    Tải ảnh
                  </Button>
                </BorderGlow>
              </div>

              {error && (
                <div className="max-w-lg rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm font-medium text-red-500">
                  <span className="flex items-start gap-2"><Danger size={16} variant="Bold" className="mt-px shrink-0" /><span>{error}</span></span>
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

          <AnimatedContent delay={0.3}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-6 pt-4 border-t border-divider/20">
              {STATS.map((s) => (
                <div key={s.label} className="flex sm:flex-col items-baseline sm:items-start gap-2 sm:gap-0.5">
                  <p className="text-sm sm:text-base font-bold text-magenta shrink-0">{s.value}</p>
                  <p className="text-xs text-mauve leading-snug">{s.label}</p>
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
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Ảnh chân dung đã chọn"
                  className="aspect-[3/4] w-full object-contain bg-ink/5 transition-all duration-300"
                />
              ) : (
                <ScanGuideIllustration className="aspect-[3/4] w-full" />
              )}

              {analyzing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/60 backdrop-blur-sm transition-opacity duration-300">
                  <div className="relative z-10 flex flex-col items-center gap-4 text-center px-6">
                    <span className="size-16 animate-spin rounded-full border-4 border-pink border-t-transparent shadow-lg" />
                    <p className="font-display font-semibold text-white tracking-wide text-lg">
                      Đang phân tích khuôn mặt...
                    </p>
                    <p className="text-xs text-white/80">
                      Lần đầu cần tải mô hình AI, có thể mất 5–10 giây
                    </p>
                  </div>
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

              <div className="absolute inset-x-10 bottom-8 flex items-center justify-between rounded-2xl bg-ink/80 p-4 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <span className="size-10 rounded-full border-2 border-pink" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Xử lý an toàn</p>
                    <p className="text-sm font-semibold text-white">Ảnh được phân tích ngay trên máy bạn</p>
                  </div>
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
