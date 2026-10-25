import { useState, useEffect } from "react";
import { TickCircle, Copy, DocumentCopy } from "iconsax-reactjs";
import { ShareIcon } from "./icons";
import { trackEvent } from "../lib/analytics";

/**
 * Chuyển đổi blob bất kỳ sang PNG để đáp ứng yêu cầu nghiêm ngặt của Clipboard API trên trình duyệt.
 */
async function ensurePngBlob(blob) {
  if (blob.type === "image/png") return blob;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) resolve(pngBlob);
        else reject(new Error("Không thể tạo blob PNG."));
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không thể tải ảnh để nén PNG."));
    };
    img.src = url;
  });
}

/**
 * SVG Icons chính hãng cho các nền tảng mạng xã hội
 */
function TikTokIcon({ size = 20, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.4a6.33 6.33 0 0 0-.85-.06A6.34 6.34 0 0 0 3.14 15.7a6.34 6.34 0 0 0 10.74 4.5 6.34 6.34 0 0 0 1.94-4.52V8.92a8.28 8.28 0 0 0 4.84 1.56V7.03a4.84 4.84 0 0 1-1.07-.34z" />
    </svg>
  );
}

function FacebookIcon({ size = 20, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2" className={className}>
      <path d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.93-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12z" />
    </svg>
  );
}

function MessengerIcon({ size = 20, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id="msg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00B2FF" />
          <stop offset="100%" stopColor="#006AFF" />
        </linearGradient>
      </defs>
      <path
        fill="url(#msg-grad)"
        d="M12 2C6.48 2 2 6.03 2 11c0 2.83 1.46 5.36 3.74 6.94V21l3.05-1.68c1.02.28 2.1.44 3.21.44 5.52 0 10-4.03 10-9s-4.48-9-10-9zm1.06 12.15l-2.73-2.91-5.33 2.91 5.86-6.22 2.78 2.91 5.28-2.91-5.86 6.22z"
      />
    </svg>
  );
}

function ZaloIcon({ size = 20, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect width="24" height="24" rx="6" fill="#0068FF" />
      <text
        x="12"
        y="16"
        fill="#FFFFFF"
        fontSize="9.5"
        fontWeight="bold"
        fontFamily="sans-serif"
        textAnchor="middle"
      >
        Zalo
      </text>
    </svg>
  );
}

/**
 * Modal Chia sẻ thông minh (Hybrid Social Share Modal)
 */
export default function ShareModal({
  isOpen,
  onClose,
  imageBlob,
  imageUrl,
  styleName = "Kiểu tóc mới",
  colorName = "",
  shareUrl = typeof window !== "undefined" ? window.location.href : "",
}) {
  const [copyingImage, setCopyingImage] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setImageCopied(false);
      setLinkCopied(false);
      setFeedbackNotice(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const triggerDownload = (filenamePrefix = "hairapy") => {
    if (!imageBlob && !imageUrl) return;
    const blobToUse = imageBlob;
    const downloadUrl = blobToUse ? URL.createObjectURL(blobToUse) : imageUrl;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${filenamePrefix}-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (blobToUse) URL.revokeObjectURL(downloadUrl);
  };

  /**
   * Tính năng 1: Sao chép ảnh vào clipboard để Ctrl+V vào Messenger/Zalo
   */
  const handleCopyImage = async () => {
    if (!imageBlob && !imageUrl) return;
    setCopyingImage(true);

    try {
      let blob = imageBlob;
      if (!blob && imageUrl) {
        const res = await fetch(imageUrl);
        blob = await res.blob();
      }

      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        const pngBlob = await ensurePngBlob(blob);
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": pngBlob }),
        ]);

        setImageCopied(true);
        setFeedbackNotice({
          type: "success",
          title: "Đã sao chép ảnh vào Bộ nhớ tạm!",
          desc: "Bạn có thể mở Messenger, Zalo hoặc khung chat bất kỳ và bấm Ctrl + V để gửi ngay.",
        });
        trackEvent("share_action", { channel: "clipboard_image", styleName });
        setTimeout(() => setImageCopied(false), 3500);
      } else {
        // Fallback tải ảnh nếu trình duyệt không hỗ trợ ClipboardItem image
        triggerDownload("hairapy-anh");
        setFeedbackNotice({
          type: "info",
          title: "Đã tải ảnh về máy!",
          desc: "Trình duyệt không cho phép dán ảnh tự động. Ảnh đã được tải về máy để bạn gửi trực tiếp.",
        });
      }
    } catch (err) {
      console.error("Không thể chép ảnh vào clipboard:", err);
      triggerDownload("hairapy-anh");
      setFeedbackNotice({
        type: "info",
        title: "Đã tải ảnh về máy!",
        desc: "Bạn có thể gửi file ảnh vừa tải về qua ứng dụng chat yêu thích.",
      });
    } finally {
      setCopyingImage(false);
    }
  };

  /**
   * Tính năng 2: Chia sẻ qua TikTok
   */
  const handleShareTikTok = () => {
    triggerDownload("hairapy-tiktok");
    setFeedbackNotice({
      type: "tiktok",
      title: "Đã tải ảnh chất lượng cao cho TikTok!",
      desc: "Mở ứng dụng TikTok trên điện thoại, chọn ảnh vừa tải từ Thư viện để đăng Story hoặc ghép vào video nhé! ✨",
      actionText: "Mở TikTok Web",
      actionUrl: "https://www.tiktok.com/upload?lang=vi-VN",
    });
    trackEvent("share_action", { channel: "tiktok", styleName });
  };

  /**
   * Tính năng 3: Chia sẻ qua Facebook
   */
  const handleShareFacebook = () => {
    const quote = `Mình vừa thử kiểu tóc ${styleName}${colorName ? ` màu ${colorName}` : ""} trên Hairapy AI! Mọi người thấy hợp không?`;
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(quote)}`;
    window.open(fbUrl, "_blank", "width=600,height=520,scrollbars=yes,resizable=yes");
    trackEvent("share_action", { channel: "facebook", styleName });
  };

  /**
   * Tính năng 4: Gửi qua Messenger
   */
  const handleShareMessenger = async () => {
    // Tự động copy ảnh trước để người dùng paste luôn
    try {
      if (imageBlob && navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        const pngBlob = await ensurePngBlob(imageBlob);
        await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
      }
    } catch (e) {
      console.warn("Không thể sao chép trước ảnh cho Messenger:", e);
    }

    setFeedbackNotice({
      type: "messenger",
      title: "Đã sao chép ảnh cho Messenger!",
      desc: "Cửa sổ Messenger đang mở. Bạn chỉ cần nhấn tổ hợp phím Ctrl + V để dán ảnh và gửi cho bạn bè ngay.",
      actionText: "Mở Messenger Web",
      actionUrl: "https://www.messenger.com/",
    });

    window.open("https://www.messenger.com/", "_blank");
    trackEvent("share_action", { channel: "messenger", styleName });
  };

  /**
   * Tính năng 5: Gửi qua Zalo
   */
  const handleShareZalo = async () => {
    try {
      if (imageBlob && navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        const pngBlob = await ensurePngBlob(imageBlob);
        await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
      }
    } catch (e) {
      console.warn("Không thể sao chép trước ảnh cho Zalo:", e);
    }

    setFeedbackNotice({
      type: "zalo",
      title: "Đã sao chép ảnh cho Zalo!",
      desc: "Chuyển sang khung chat Zalo và nhấn Ctrl + V để gửi ảnh diện mạo mới cho bạn bè.",
      actionText: "Mở Zalo Web",
      actionUrl: "https://chat.zalo.me/",
    });

    window.open("https://chat.zalo.me/", "_blank");
    trackEvent("share_action", { channel: "zalo", styleName });
  };

  /**
   * Tính năng 6: Sao chép link trang
   */
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setFeedbackNotice({
        type: "success",
        title: "Đã sao chép liên kết!",
        desc: "Đã lưu đường dẫn trang vào bộ nhớ tạm.",
      });
      trackEvent("share_action", { channel: "copy_link", styleName });
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (err) {
      console.error("Lỗi chép link:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop mờ sang trọng */}
      <div
        className="fixed inset-0 bg-ink/50 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg transform overflow-hidden rounded-[28px] border border-line bg-white p-6 sm:p-7 shadow-2xl transition-all duration-300 z-10 animate-in fade-in zoom-in-95">
        {/* Nút đóng modal */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 size-8 rounded-full border border-line bg-canvas text-mauve hover:text-ink hover:bg-neutral-100 flex items-center justify-center transition cursor-pointer"
          aria-label="Đóng modal"
        >
          ✕
        </button>

        {/* Tiêu đề & Giới thiệu */}
        <div className="flex items-center gap-2.5 mb-1">
          <div className="size-9 rounded-2xl bg-pink/15 text-pink flex items-center justify-center shrink-0">
            <ShareIcon size={20} />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-ink">
              Chia sẻ diện mạo mới
            </h3>
          </div>
        </div>
        <p className="text-xs text-mauve mb-5 ml-11">
          Khoe ngay với bạn bè trên TikTok, Messenger, Facebook hoặc Zalo
        </p>

        {/* Khung Preview ảnh thu nhỏ kèm thông tin */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-divider/60 bg-canvas/70 p-3 mb-5">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Ảnh tạo mẫu tóc"
              className="size-16 rounded-xl object-cover border border-line shadow-xs shrink-0"
            />
          ) : (
            <div className="size-16 rounded-xl bg-pink/10 border border-pink/30 flex items-center justify-center text-pink font-bold text-xs shrink-0">
              Hairapy
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-ink text-sm truncate">
                {styleName}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink/10 text-pink">
                AI Studio
              </span>
            </div>
            {colorName ? (
              <p className="text-xs text-mauve mt-0.5 flex items-center gap-1">
                <span>Màu tóc:</span>
                <span className="font-semibold text-ink">{colorName}</span>
              </p>
            ) : (
              <p className="text-xs text-mauve mt-0.5">Màu tóc gốc tự nhiên</p>
            )}
            <p className="text-[11px] text-muted truncate mt-0.5">
              Độ nét cao • Sẵn sàng chia sẻ
            </p>
          </div>
        </div>

        {/* Banner hướng dẫn / thông báo trạng thái khi click */}
        {feedbackNotice && (
          <div
            className={`rounded-2xl p-3.5 mb-4 text-xs transition-all flex items-start gap-2.5 ${
              feedbackNotice.type === "tiktok"
                ? "bg-neutral-900 text-white"
                : feedbackNotice.type === "messenger"
                ? "bg-blue-50 text-blue-900 border border-blue-200"
                : feedbackNotice.type === "zalo"
                ? "bg-sky-50 text-sky-900 border border-sky-200"
                : "bg-emerald-50 text-emerald-900 border border-emerald-200"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              <TickCircle
                size={18}
                variant="Bold"
                className={
                  feedbackNotice.type === "tiktok"
                    ? "text-pink"
                    : feedbackNotice.type === "messenger"
                    ? "text-[#0084FF]"
                    : feedbackNotice.type === "zalo"
                    ? "text-[#0068FF]"
                    : "text-emerald-600"
                }
              />
            </div>
            <div className="flex-1">
              <p className="font-bold">{feedbackNotice.title}</p>
              <p className="opacity-90 mt-0.5 leading-relaxed text-[11px]">
                {feedbackNotice.desc}
              </p>
              {feedbackNotice.actionUrl && (
                <a
                  href={feedbackNotice.actionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold underline hover:opacity-80"
                >
                  {feedbackNotice.actionText} →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Action nổi bật nhất trên Desktop: SAO CHÉP ẢNH VÀO CLIPBOARD */}
        <div className="mb-5">
          <button
            type="button"
            onClick={handleCopyImage}
            disabled={copyingImage}
            className={`w-full group relative overflow-hidden rounded-2xl border p-4 text-left transition-all cursor-pointer flex items-center justify-between shadow-xs ${
              imageCopied
                ? "border-emerald-400 bg-emerald-50/80 text-emerald-900"
                : "border-pink/40 bg-gradient-to-r from-pink/5 via-pink/10 to-purple-500/5 hover:border-pink hover:shadow-md"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  imageCopied ? "bg-emerald-600 text-white" : "bg-pink text-white"
                }`}
              >
                {imageCopied ? (
                  <TickCircle size={22} variant="Bold" />
                ) : (
                  <DocumentCopy size={20} variant="Bold" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-ink group-hover:text-pink transition">
                    {imageCopied ? "Đã sao chép ảnh vào Clipboard!" : "Sao chép ảnh (Ctrl + V)"}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink text-white">
                    Nhanh nhất
                  </span>
                </div>
                <p className="text-xs text-mauve mt-0.5">
                  Dán trực tiếp vào Messenger, Zalo mà không cần lưu file vào máy
                </p>
              </div>
            </div>

            <span className="text-xs font-bold text-primary shrink-0 ml-2">
              {copyingImage ? "Đang xử lý..." : imageCopied ? "Đã chép ✓" : "Chép ngay"}
            </span>
          </button>
        </div>

        {/* Dải 4 nút Mạng Xã Hội */}
        <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
          Hoặc chọn nền tảng chia sẻ:
        </p>
        <div className="grid grid-cols-4 gap-2.5 mb-5">
          {/* TikTok */}
          <button
            type="button"
            onClick={handleShareTikTok}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-line bg-canvas hover:border-black hover:bg-neutral-900 hover:text-white transition group cursor-pointer"
          >
            <div className="size-9 rounded-xl bg-black text-white flex items-center justify-center group-hover:scale-105 transition-transform">
              <TikTokIcon size={18} />
            </div>
            <span className="text-xs font-bold text-ink group-hover:text-white">
              TikTok
            </span>
          </button>

          {/* Facebook */}
          <button
            type="button"
            onClick={handleShareFacebook}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-line bg-canvas hover:border-blue-400 hover:bg-blue-50/50 transition group cursor-pointer"
          >
            <div className="size-9 rounded-xl bg-[#1877F2]/10 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FacebookIcon size={20} />
            </div>
            <span className="text-xs font-bold text-ink">
              Facebook
            </span>
          </button>

          {/* Messenger */}
          <button
            type="button"
            onClick={handleShareMessenger}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-line bg-canvas hover:border-sky-400 hover:bg-sky-50/50 transition group cursor-pointer"
          >
            <div className="size-9 rounded-xl bg-sky-100 flex items-center justify-center group-hover:scale-105 transition-transform">
              <MessengerIcon size={20} />
            </div>
            <span className="text-xs font-bold text-ink">
              Messenger
            </span>
          </button>

          {/* Zalo */}
          <button
            type="button"
            onClick={handleShareZalo}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-line bg-canvas hover:border-blue-500 hover:bg-blue-50/50 transition group cursor-pointer"
          >
            <div className="size-9 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
              <ZaloIcon size={32} />
            </div>
            <span className="text-xs font-bold text-ink">
              Zalo
            </span>
          </button>
        </div>

        {/* Thanh sao chép liên kết */}
        <div className="flex items-center gap-2 rounded-2xl border border-divider/60 bg-canvas p-1.5 pl-3">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 text-xs text-mauve bg-transparent outline-none truncate"
          />
          <button
            type="button"
            onClick={handleCopyLink}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0 ${
              linkCopied
                ? "bg-emerald-600 text-white"
                : "bg-ink text-white hover:bg-pink"
            }`}
          >
            {linkCopied ? (
              <>
                <TickCircle size={14} variant="Bold" />
                <span>Đã chép</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Sao chép link</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
