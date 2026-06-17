import React from "react";
import Button from "./Button";

export default function DisclosureModal({ isOpen, onClose, onAccept }) {
  if (!isOpen) return null;

  const handleAccept = () => {
    localStorage.setItem("hairapy_disclosure_accepted", "true");
    onAccept();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop blur mờ ảo đẹp mắt */}
      <div 
        className="fixed inset-0 bg-ink/40 backdrop-blur-md transition-opacity duration-300" 
        onClick={onClose}
      />

      {/* Card thiết kế bo góc tròn 3xl theo design system */}
      <div className="relative w-full max-w-md transform overflow-hidden rounded-[32px] border border-line bg-white p-8 shadow-2xl transition-all duration-300">
        
        {/* Header với Icon Bảo mật tinh tế */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-pink/15 text-pink">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={2} 
              stroke="currentColor" 
              className="size-7"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" 
              />
            </svg>
          </div>
          <h3 className="font-display text-2xl font-extrabold text-ink">
            Quyền riêng tư & Xử lý ảnh
          </h3>
        </div>

        {/* Nội dung cam kết và giải thích cách xử lý ảnh */}
        <div className="space-y-4 text-sm leading-relaxed text-mauve">
          <p>
            Hairapy sử dụng trí tuệ nhân tạo (AI) để phân tích các đặc điểm trên khuôn mặt bạn nhằm gợi ý kiểu tóc phù hợp nhất. Chúng tôi cam kết bảo vệ dữ liệu cá nhân của bạn:
          </p>

          <div className="rounded-2xl bg-canvas p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-pink/20 text-pink text-xs font-bold">✓</span>
              <p className="text-ink">
                <strong className="font-semibold text-ink">Xử lý trực tiếp trên thiết bị:</strong> Phân tích hình dáng khuôn mặt chạy 100% trong trình duyệt của bạn (không tải ảnh lên máy chủ).
              </p>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-pink/20 text-pink text-xs font-bold">✓</span>
              <p className="text-ink">
                <strong className="font-semibold text-ink">Tự động xóa ảnh:</strong> Ảnh thử kiểu tóc (Hair Swap) gửi lên server sẽ được tự động xóa sạch hoàn toàn sau 24 giờ.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-pink/20 text-pink text-xs font-bold">✓</span>
              <p className="text-ink">
                <strong className="font-semibold text-ink">Không lưu trữ sinh trắc học:</strong> Dữ liệu đặc điểm khuôn mặt của bạn KHÔNG được lưu trữ dưới bất kỳ hình thức nào.
              </p>
            </div>
          </div>
        </div>

        {/* Các nút hành động */}
        <div className="mt-8 flex gap-3">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="flex-1"
          >
            Hủy bỏ
          </Button>
          <Button 
            onClick={handleAccept} 
            className="flex-1"
          >
            Tôi đồng ý
          </Button>
        </div>

      </div>
    </div>
  );
}
