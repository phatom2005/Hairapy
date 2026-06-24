import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card } from "../components/ui";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { CheckIcon } from "../components/icons";
import { useScanStore } from "../store/useScanStore";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";

const PALETTES = {
  "Tự nhiên": ["#1a1a1a", "#3a2a1a", "#6b4423", "#a0703c", "#c89b6a", "#e0c097"],
  "Neon & Pastel": ["#ff57cf", "#2a4ae8", "#d0ee88", "#9b5cff", "#42d6e8", "#ff8fb1"],
};

export default function SwapPage() {
  const navigate = useNavigate();
  
  // Lấy ảnh gốc và kiểu tóc đã chọn (nếu có) từ useScanStore
  const { imageFile, previewUrl, selectedHairstyle } = useScanStore();

  const [activeStyle, setActiveStyle] = useState(null);
  const [tab, setTab] = useState("Tự nhiên");
  const [color, setColor] = useState(PALETTES["Tự nhiên"][2]);
  const [shade, setShade] = useState(50);

  // Các state xử lý tích hợp API thật
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [error, setError] = useState(null);

  // Fetch danh sách kiểu tóc từ API để làm mẫu thử
  const { data: styles = [] } = useQuery({
    queryKey: ["hairstyles-swap"],
    queryFn: async () => {
      const { data } = await api.get("/hairstyles");
      return data;
    },
  });

  // Bảo vệ route: Nếu không có ảnh preview thì chuyển hướng về /scan
  useEffect(() => {
    if (!previewUrl) {
      navigate("/scan");
    }
  }, [previewUrl, navigate]);

  // Thiết lập kiểu tóc được chọn khi vào trang (ưu tiên từ ResultsPage)
  useEffect(() => {
    if (selectedHairstyle) {
      setActiveStyle(selectedHairstyle);
    } else if (styles.length > 0 && !activeStyle) {
      // Fallback: chọn kiểu tóc đầu tiên nếu truy cập trực tiếp
      const first = styles[0];
      setActiveStyle({
        id: first.id,
        name: first.name,
        imageUrl: first.imageUrl,
        ailabHairType: first.ailabHairType,
      });
    }
  }, [selectedHairstyle, styles]);

  if (!previewUrl) {
    return null;
  }

  // Gửi request đổi kiểu tóc đến backend proxy
  const handleApply = async () => {
    if (!imageFile || !activeStyle?.ailabHairType) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("hairType", activeStyle.ailabHairType);

    try {
      // Gọi API POST /api/swap/try
      const response = await api.post("/swap/try", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      let imgData = response.data.image;
      if (imgData) {
        // Nếu API trả về chuỗi Base64 chưa có tiền tố thì bổ sung để hiển thị
        if (!imgData.startsWith("http") && !imgData.startsWith("data:image")) {
          imgData = `data:image/png;base64,${imgData}`;
        }
        setResultImage(imgData);
      } else {
        throw new Error("Không có dữ liệu ảnh trả về từ AI.");
      }
    } catch (err) {
      console.error("Lỗi khi gọi Hair Swap API:", err);
      const errorData = err.response?.data;

      // Xử lý khi AI timeout và được hoàn lượt (504)
      if (err.response?.status === 504 || errorData?.refunded) {
        setError("AI xử lý quá lâu. Lượt của bạn đã được hoàn lại — hãy thử lại nhé!");
        setLoading(false);
        return;
      }

      // Xử lý khi hết lượt giới hạn hàng ngày (429)
      if (err.response?.status === 429) {
        setError(`Bạn đã hết lượt thử kiểu tóc hôm nay (${errorData.limit} lượt/ngày). Nâng cấp Premium để có thêm lượt!`);
        setLoading(false);
        return;
      }

      const errMsg = errorData?.error || "AI xử lý quá lâu hoặc gặp sự cố, vui lòng thử lại.";
      const errDetails = errorData?.details ? ` (Chi tiết: ${errorData.details})` : "";
      
      const isCreditError = errDetails.toLowerCase().includes("credits") || errDetails.toLowerCase().includes("credit");
      const isKeyError = errDetails.toLowerCase().includes("key") || errDetails.toLowerCase().includes("key");

      if (isCreditError || isKeyError) {
        setError("Tài khoản AILabTools đã hết điểm (Credits) hoặc chưa cấu hình API Key chính xác. Vui lòng đăng ký/nạp thêm tại ailabtools.com và cấu hình biến AILAB_API_KEY trên Railway. (Hệ thống đã tự động chuyển sang Chế độ Mô phỏng để không gián đoạn demo).");
        setResultImage(previewUrl);
      } else {
        setError(`${errMsg}${errDetails}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-6 py-12 sm:px-16 lg:grid-cols-[380px_1fr]">
        
        {/* ASIDE: bộ chọn */}
        <Card className="flex flex-col gap-6">
          {/* Chọn kiểu tóc */}
          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">Chọn kiểu tóc</h2>
            {styles.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted">
                Đang tải danh sách kiểu tóc...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
                {styles.map((s) => {
                  const isActive = activeStyle?.id === s.id;
                  return (
                    <button 
                      key={s.id} 
                      onClick={() => setActiveStyle({
                        id: s.id,
                        name: s.name,
                        imageUrl: s.imageUrl,
                        ailabHairType: s.ailabHairType
                      })}
                      className={`relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                        isActive ? "border-primary font-bold" : "border-transparent"
                      }`}
                    >
                      <img 
                        src={s.imageUrl} 
                        alt={s.name} 
                        className="aspect-square w-full object-cover" 
                        onError={(e) => { e.target.src = `https://placehold.co/300x300?text=${encodeURIComponent(s.name)}`; }}
                      />
                      {isActive && (
                        <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-primary text-white z-10">
                          <CheckIcon size={12} />
                        </span>
                      )}
                      {s.premiumOnly && (
                        <span className="absolute left-1 top-1 rounded bg-magenta/90 px-1.5 py-0.5 text-[9px] font-bold text-white z-10">PRO</span>
                      )}
                      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 truncate text-center">
                        {s.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Màu sắc (Mô phỏng lớp phủ màu) */}
          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">Màu sắc mô phỏng</h2>
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
            <label className="mb-2 block text-sm font-semibold text-mauve">Sắc độ phủ màu</label>
            <input type="range" min="0" max="100" value={shade}
              onChange={(e) => setShade(+e.target.value)}
              className="w-full accent-primary" />
          </div>

          {/* Hiển thị thông báo lỗi nếu ghép ảnh thất bại */}
          {error && (
            <div className="text-xs font-semibold text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
              ⚠️ {error}
            </div>
          )}

          {/* Nút bấm trigger Hair Swap */}
          <div className="relative group w-full">
            <Button 
              onClick={handleApply} 
              disabled={loading || !activeStyle?.ailabHairType} 
              className="w-full"
            >
              {loading ? "Đang xử lý..." : "Áp dụng kiểu tóc AI"}
            </Button>
            {activeStyle && !activeStyle.ailabHairType && (
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-ink text-white text-[11px] py-1.5 px-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-line z-50">
                Kiểu tóc này chưa hỗ trợ thử nghiệm AI
              </span>
            )}
          </div>

          {/* Nút khôi phục ảnh gốc */}
          {resultImage && (
            <Button variant="outline" onClick={() => setResultImage(null)} className="w-full">
              Khôi phục ảnh gốc
            </Button>
          )}
        </Card>

        {/* PREVIEW */}
        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-[32px] shadow-2xl ring-4 ring-pink/40 bg-ink">
            {/* Ảnh hiển thị: Ưu tiên ảnh đã ghép của AI, nếu chưa có hiển thị ảnh xem trước gốc */}
            <img 
              src={resultImage || previewUrl} 
              alt="Preview chân dung" 
              className="aspect-[3/4] w-full object-cover transition-all duration-300" 
            />
            
            {/* Lớp phủ màu mô phỏng */}
            <div className="pointer-events-none absolute inset-0 mix-blend-soft-light"
              style={{ backgroundColor: color, opacity: shade / 150 }} />

            {/* Trạng thái AI loading overlay */}
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/75 backdrop-blur-sm transition-opacity duration-300">
                <span className="size-14 animate-spin rounded-full border-4 border-pink border-t-transparent shadow-lg" />
                <p className="mt-4 font-display font-semibold text-white animate-pulse tracking-wide text-lg">
                  AI đang tạo kiểu tóc mới...
                </p>
                <p className="text-xs text-white/60">
                  Có thể mất tối đa 15 giây để xử lý
                </p>
              </div>
            )}

            {/* Trạng thái hiển thị góc trên */}
            <div className="absolute left-6 top-6 flex items-center gap-2 rounded-full bg-ink/75 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md">
              <span className={`size-2 rounded-full ${loading ? "bg-amber-400 animate-pulse" : resultImage ? "bg-lime" : "bg-pink"}`} />
              {loading ? "AI đang ghép..." : resultImage ? "Hoàn tất ghép tóc AI" : "Ảnh gốc - Sẵn sàng ghép"}
            </div>

            {/* Thanh hành động nổi bên dưới ảnh */}
            <div className="absolute inset-x-6 bottom-6 flex items-center justify-between rounded-2xl bg-white/95 px-5 py-3 shadow-lg backdrop-blur-md">
              <div className="max-w-[70%]">
                <p className="text-sm font-bold text-ink truncate" title={activeStyle?.name}>{activeStyle?.name || "Đang tải..."}</p>
                <p className="text-xs text-muted">Mã kiểu tóc: AI #{activeStyle?.ailabHairType !== undefined && activeStyle?.ailabHairType !== null ? activeStyle.ailabHairType : "N/A"}</p>
              </div>
              <span className="size-8 rounded-full border border-line shrink-0" style={{ backgroundColor: color }} />
            </div>
          </div>

          {/* Lịch sử mẫu thử */}
          <div>
            <p className="mb-3 text-sm font-bold text-mauve">Tất cả kiểu tóc có sẵn:</p>
            <div className="flex gap-3 overflow-x-auto pb-2 pr-1">
              {styles.map((s) => {
                const isActive = activeStyle?.id === s.id;
                return (
                  <button 
                    key={s.id} 
                    onClick={() => setActiveStyle({
                      id: s.id,
                      name: s.name,
                      imageUrl: s.imageUrl,
                      ailabHairType: s.ailabHairType
                    })} 
                    className="shrink-0 relative"
                  >
                    <img 
                      src={s.imageUrl} 
                      alt={s.name}
                      className={`size-20 rounded-xl object-cover transition duration-200 ${
                        isActive ? "opacity-100 ring-2 ring-primary" : "opacity-60 hover:opacity-100"
                      }`} 
                      onError={(e) => { e.target.src = `https://placehold.co/300x300?text=${encodeURIComponent(s.name)}`; }}
                    />
                    {s.premiumOnly && (
                      <span className="absolute left-1 top-1 rounded bg-magenta/90 px-1 py-0.5 text-[8px] font-bold text-white z-10">PRO</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      <Footer />
    </div>
  );
}
