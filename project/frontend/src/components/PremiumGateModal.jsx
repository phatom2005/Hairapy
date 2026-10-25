import { useEffect } from "react";
import { MagicStar } from "iconsax-reactjs";
import { Link, useLocation } from "react-router-dom";
import { trackEvent } from "../lib/analytics";
import { Button, Badge } from "./ui";

/**
 * Modal nhắc nhở nâng cấp gói (Premium Paywall Gate) khi người dùng chọn kiểu tóc độc quyền
 * hoặc truy cập tính năng AI Stylist.
 */
export default function PremiumGateModal({
  isOpen,
  onClose,
  style = null,
  reason = "style", // "style" | "stylist"
}) {
  const location = useLocation();

  useEffect(() => {
    if (isOpen) {
      trackEvent("paywall_view", {
        reason,
        style_id: style?.id,
        style_name: style?.name,
      });
    }
  }, [isOpen, reason, style]);

  if (!isOpen) return null;

  const isStylist = reason === "stylist";

  const handleGoToPricing = () => {
    try {
      sessionStorage.setItem(
        "hairapy-return-to",
        location.pathname + location.search
      );
    } catch (e) {
      console.warn("Không thể lưu return-to vào sessionStorage:", e);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/50 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal dialog */}
      <div className="relative w-full max-w-md transform overflow-hidden rounded-[32px] border border-line bg-white p-7 shadow-2xl transition-all duration-300">
        <div className="flex flex-col items-center text-center">
          <Badge variant="premium" className="mb-4">
            ĐẶC QUYỀN TRẢ PHÍ
          </Badge>

          {isStylist ? (
            <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-pink/15 text-pink text-2xl font-bold">
              <MagicStar size={30} variant="Bulk" />
            </div>
          ) : style?.imageUrl ? (
            <div className="relative mb-4 size-28 overflow-hidden rounded-2xl border border-line shadow-md">
              <img
                src={style.imageUrl}
                alt={style.name || "Kiểu tóc độc quyền"}
                className="h-full w-full object-cover"
              />
              <Badge variant="premium" className="absolute top-2 right-2 text-[10px]">
                Trả phí
              </Badge>
            </div>
          ) : null}

          <h3 className="font-display text-2xl font-extrabold text-ink mb-2">
            {isStylist ? "Tư vấn cùng AI Stylist" : style?.name || "Kiểu tóc độc quyền"}
          </h3>

          <p className="text-sm text-mauve leading-relaxed mb-6">
            {isStylist
              ? "Tính năng tư vấn kiểu tóc 1:1 cùng AI Stylist độc quyền dành riêng cho Gói Tháng (5 lượt/ngày)."
              : "Kiểu tóc này thuộc bộ sưu tập độc quyền dành riêng cho Gói Tuần và Gói Tháng."}
          </p>

          <div className="flex flex-col gap-3 w-full">
            <Button
              as={Link}
              to="/pricing"
              onClick={handleGoToPricing}
              variant="pink"
              className="w-full justify-center py-3 text-sm font-bold shadow-md"
            >
              Xem các gói nâng cấp
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="w-full justify-center py-2.5 text-xs text-muted hover:text-ink"
            >
              Để sau
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
