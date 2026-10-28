import { useEffect } from "react";
import { MagicStar, LampOn } from "iconsax-reactjs";
import { Badge, Button } from "./ui";
import { COLOR_BY_VALUE, swatchBg } from "../lib/hairColors";

/**
 * Modal hiển thị chi tiết kiểu tóc cho khách vãng lai và thành viên.
 * Cho phép xem ảnh lớn, đổi màu biến thể, lưu yêu thích và bấm "Thử kiểu này".
 */
export default function HairstyleDetailModal({
  isOpen,
  onClose,
  hairstyle,
  variants = [],
  selectedVariant = null,
  onSelectVariant = () => {},
  isSaved = false,
  onToggleSave = () => {},
  onTryStyle = () => {},
  onFindSalon = null,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !hairstyle) return null;

  const currentStyle = selectedVariant || hairstyle;
  const isAiSample = !!currentStyle.sampleByAi;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/50 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto transform rounded-[32px] border border-line bg-white p-6 shadow-2xl transition-all duration-300 sm:p-7">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Đóng"
          className="absolute right-5 top-5 z-10 flex size-9 items-center justify-center rounded-full bg-canvas/80 text-mauve hover:bg-canvas hover:text-ink transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="size-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Ảnh lớn */}
        <div className="relative aspect-[4/5] sm:aspect-[1/1] w-full overflow-hidden rounded-2xl bg-canvas shadow-inner">
          <img
            src={currentStyle.imageUrl}
            alt={currentStyle.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.target.src = `https://placehold.co/600x600?text=${encodeURIComponent(currentStyle.name)}`;
            }}
          />

          {/* Badges góc trên */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {currentStyle.tag && (
              <Badge variant="new" className="shadow">
                {currentStyle.tag}
              </Badge>
            )}
            {currentStyle.premiumOnly && (
              <Badge variant="premium" className="shadow">
                Trả phí
              </Badge>
            )}
          </div>

          {/* Nhãn AI Sample góc dưới nếu có */}
          {isAiSample && (
            <div className="absolute left-3 bottom-3 rounded-full bg-ink/75 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md shadow">
              <span className="inline-flex items-center gap-1"><MagicStar size={12} variant="Bold" /> Ảnh minh hoạ do AI tạo</span>
            </div>
          )}
        </div>

        {/* Thông tin chi tiết */}
        <div className="mt-5 space-y-4">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-2xl font-extrabold text-ink">
                {currentStyle.name}
              </h3>
              <button
                type="button"
                onClick={(e) => onToggleSave(e, currentStyle.id)}
                className={`flex size-10 shrink-0 items-center justify-center rounded-full border transition ${
                  isSaved
                    ? "border-pink bg-pink/10 text-pink"
                    : "border-line bg-canvas/60 text-mauve hover:text-pink hover:border-pink/40"
                }`}
                title={isSaved ? "Bỏ lưu kiểu tóc" : "Lưu vào yêu thích"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill={isSaved ? "#FF57CF" : "none"}
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke={isSaved ? "#FF57CF" : "currentColor"}
                  className="size-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-sm text-mauve leading-relaxed">
              {currentStyle.description}
            </p>
          </div>

          {/* Dòng ghi chú kết quả AI nếu sampleByAi */}
          {isAiSample && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs font-medium text-primary">
              <span className="flex items-start gap-1.5"><LampOn size={14} variant="Bold" className="mt-px shrink-0" /> Kết quả thử trên ảnh của bạn sẽ tương tự ảnh này.</span>
            </div>
          )}

          {/* Thuộc tính kiểu tóc */}
          <div className="grid grid-cols-3 gap-2.5 rounded-2xl bg-canvas p-3 text-center text-xs">
            <div>
              <span className="block font-medium text-muted">Dáng mặt</span>
              <span className="mt-0.5 block font-bold text-ink">
                {currentStyle.faceShape || "Mọi dáng mặt"}
              </span>
            </div>
            <div>
              <span className="block font-medium text-muted">Độ dài</span>
              <span className="mt-0.5 block font-bold text-ink">
                {currentStyle.hairLength || "Vừa"}
              </span>
            </div>
            <div>
              <span className="block font-medium text-muted">Phù hợp</span>
              <span className="mt-0.5 block font-bold text-ink">
                {currentStyle.gender || "Unisex"}
              </span>
            </div>
          </div>

          {/* Hàng chọn biến thể màu nếu có */}
          {variants.length > 1 && (
            <div>
              <span className="mb-2 block text-xs font-bold text-mauve">
                Biến thể màu sắc ({variants.length}):
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {variants.map((v) => {
                  const isSelected = v.id === currentStyle.id;
                  const colorObj = v.ailabColor ? COLOR_BY_VALUE[v.ailabColor] : null;
                  const tones = colorObj?.tones || ["#3a2c23", "#231812", "#0f0a07"];
                  const label = colorObj?.label || (v.baseStyleId ? "Biến thể" : "Màu gốc");

                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => onSelectVariant(v)}
                      title={`${label} (${v.name})`}
                      className={`relative flex size-8 items-center justify-center rounded-full transition-transform ${
                        isSelected
                          ? "ring-2 ring-pink ring-offset-2 scale-110"
                          : "hover:scale-105 opacity-80 hover:opacity-100"
                      }`}
                      style={{ background: swatchBg(tones) }}
                    >
                      {isSelected && (
                        <span className="size-2 rounded-full bg-white shadow-sm" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nút hành động chính */}
          <div className="pt-2 flex flex-col gap-2.5">
            <Button
              onClick={() => onTryStyle(currentStyle)}
              variant="pink"
              className="w-full justify-center py-3.5 text-sm font-bold shadow-lg"
            >
              Thử kiểu này ngay
            </Button>
            {onFindSalon && (
              <Button
                type="button"
                onClick={() => onFindSalon(currentStyle)}
                variant="outline"
                className="w-full justify-center py-2.5 text-xs font-semibold text-pink border-pink/40 hover:bg-pink/10"
              >
                Cắt kiểu này ở đâu? — Tìm Salon đối tác →
              </Button>
            )}
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="w-full justify-center py-2.5 text-xs text-muted hover:text-ink"
            >
              Đóng
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
