import { useEffect, useRef, useState, useCallback } from "react";
import { HAIR_COLORS, COLOR_BY_VALUE, swatchBg } from "../lib/hairColors";
import { getHairMask } from "../lib/hairSegmenter";
import { recolorHair } from "../lib/recolor";
import { trackEvent } from "../lib/analytics";
import useAuthStore from "../store/useAuthStore";
import { Button } from "./ui";

export default function HairColorStudio({ imageUrl, onPickAiColor, className = "" }) {
  const { user } = useAuthStore();
  const isPaid = user?.role === "ADMIN" || user?.role === "TESTER" || (user?.plan && user.plan !== "FREE");

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const maskCacheRef = useRef(new Map()); // url -> { mask, width, height, originalData }

  const [activeColor, setActiveColor] = useState(null);
  const [intensity, setIntensity] = useState(0.7);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Trạng thái cho Touch Drag trên mobile
  const [touchGhost, setTouchGhost] = useState(null); // { color, x, y }
  const touchStartPos = useRef({ x: 0, y: 0 });
  const touchActiveColor = useRef(null);

  /**
   * Load và chuẩn bị ảnh lên canvas (scale max 1024px để xử lý nhanh)
   */
  useEffect(() => {
    let cancelled = false;

    const loadImage = async () => {
      if (!imageUrl || !canvasRef.current) return;

      try {
        const img = new Image();
        if (!imageUrl.startsWith("blob:") && !imageUrl.startsWith("data:")) {
          img.crossOrigin = "anonymous";
        }

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error("Không thể tải ảnh để thử màu."));
          img.src = imageUrl;
        });

        if (cancelled) return;

        const maxDim = 1024;
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;

        if (w > maxDim || h > maxDim) {
          if (w >= h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        const originalData = ctx.getImageData(0, 0, w, h);

        // Bản sao đã thu nhỏ đúng w×h để đưa vào model tách tóc (không dùng ảnh gốc full-res → lệch kích thước mask)
        const segCanvas = document.createElement("canvas");
        segCanvas.width = w;
        segCanvas.height = h;
        segCanvas.getContext("2d").drawImage(img, 0, 0, w, h);

        // Lưu trữ ảnh gốc vào cache
        const cached = maskCacheRef.current.get(imageUrl) || {};
        maskCacheRef.current.set(imageUrl, {
          ...cached,
          width: w,
          height: h,
          originalData,
          segCanvas,
        });

        setImageLoaded(true);
        setActiveColor(null);
        setErrorMsg(null);
      } catch (err) {
        if (!cancelled) {
          console.error("Lỗi chuẩn bị canvas:", err);
          setErrorMsg("Không thể chuẩn bị ảnh. Vui lòng thử lại với ảnh khác.");
        }
      }
    };

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  /**
   * Thực hiện render màu lên canvas
   */
  const renderColor = useCallback(
    async (colorObj, intVal, method = "tap") => {
      if (!imageUrl || !canvasRef.current) return;
      const cached = maskCacheRef.current.get(imageUrl);
      if (!cached?.originalData) return;

      if (!colorObj) {
        // Khôi phục ảnh gốc
        const ctx = canvasRef.current.getContext("2d", { willReadFrequently: true });
        ctx.putImageData(cached.originalData, 0, 0);
        setActiveColor(null);
        return;
      }

      let mask = cached.mask;

      if (!mask) {
        setIsSegmenting(true);
        setErrorMsg(null);
        try {
          mask = await getHairMask(cached.segCanvas, cached.width, cached.height);
          maskCacheRef.current.set(imageUrl, { ...cached, mask });
        } catch (err) {
          console.error("Lỗi nhận diện tóc:", err);
          setErrorMsg(err.message || "Thiết bị của bạn chưa hỗ trợ xem trước màu — hãy dùng nút Tạo bằng AI");
          setIsSegmenting(false);
          return;
        } finally {
          setIsSegmenting(false);
        }
      }

      try {
        const coloredData = recolorHair(cached.originalData, mask, colorObj.rgb, intVal);
        const ctx = canvasRef.current.getContext("2d", { willReadFrequently: true });
        ctx.putImageData(coloredData, 0, 0);
        setActiveColor(colorObj);
        trackEvent("color_preview", { hair_color: colorObj.value, method });
      } catch (err) {
        console.error("Lỗi tô màu:", err);
        setErrorMsg("Lỗi khi áp dụng màu tóc.");
      }
    },
    [imageUrl]
  );

  /**
   * Đổi màu theo value
   */
  const applyColorByValue = (val, method = "tap") => {
    const colorObj = COLOR_BY_VALUE[val];
    if (colorObj) {
      renderColor(colorObj, intensity, method);
    }
  };

  /**
   * Thay đổi thanh trượt độ đậm
   */
  const handleIntensityChange = (newInt) => {
    setIntensity(newInt);
    if (activeColor) {
      renderColor(activeColor, newInt, "slider");
    }
  };

  /**
   * Tải ảnh về máy (thêm watermark mờ nếu là Free user)
   */
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Tạo canvas tạm để xuất ảnh
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext("2d");
    ctx.drawImage(canvas, 0, 0);

    if (!isPaid) {
      // Vẽ watermark Hairapy mờ ở góc dưới phải
      const fontSize = Math.max(14, Math.round(canvas.width * 0.035));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.textAlign = "right";
      ctx.fillText("Hairapy", canvas.width - 20 + 1, canvas.height - 20 + 1);
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.fillText("Hairapy", canvas.width - 20, canvas.height - 20);
    }

    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hairapy-mau-${activeColor?.value || "goc"}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, "image/jpeg", 0.92);
  };

  // ================= Touch / Pointer Event Drag & Drop =================
  const handlePointerDown = (e, color) => {
    touchStartPos.current = { x: e.clientX, y: e.clientY };
    touchActiveColor.current = color;

    const handlePointerMove = (moveEvt) => {
      const dx = moveEvt.clientX - touchStartPos.current.x;
      const dy = moveEvt.clientY - touchStartPos.current.y;
      if (Math.hypot(dx, dy) > 8) {
        setTouchGhost({
          color: touchActiveColor.current,
          x: moveEvt.clientX,
          y: moveEvt.clientY,
        });

        // Kiểm tra xem ngón tay có đang ở trên canvas không
        const elem = document.elementFromPoint(moveEvt.clientX, moveEvt.clientY);
        if (canvasRef.current && (elem === canvasRef.current || containerRef.current?.contains(elem))) {
          setIsDragOver(true);
        } else {
          setIsDragOver(false);
        }
      }
    };

    const handlePointerUp = (upEvt) => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      const dx = upEvt.clientX - touchStartPos.current.x;
      const dy = upEvt.clientY - touchStartPos.current.y;
      const isDrag = Math.hypot(dx, dy) > 8;

      if (isDrag) {
        const dropElem = document.elementFromPoint(upEvt.clientX, upEvt.clientY);
        if (canvasRef.current && (dropElem === canvasRef.current || containerRef.current?.contains(dropElem))) {
          renderColor(touchActiveColor.current, intensity, "drag");
        }
      } else {
        // Chạm nhẹ (tap)
        renderColor(touchActiveColor.current, intensity, "tap");
      }

      setTouchGhost(null);
      setIsDragOver(false);
      touchActiveColor.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      {/* Vùng Canvas Preview */}
      <div
        ref={containerRef}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const val = e.dataTransfer.getData("text/plain");
          if (val) applyColorByValue(val, "drag");
        }}
        className={`relative flex items-center justify-center overflow-hidden rounded-3xl border-2 transition-all bg-black/5 min-h-[380px] max-h-[620px] ${
          isDragOver
            ? "border-primary ring-4 ring-primary/20 scale-[1.01]"
            : "border-line"
        }`}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={
            activeColor
              ? `Xem trước màu tóc ${activeColor.label}`
              : "Ảnh gốc chưa áp dụng màu"
          }
          className="max-h-[580px] w-auto max-w-full object-contain rounded-2xl"
        />

        {/* Overlay khi kéo màu vào ảnh */}
        {isDragOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary/20 backdrop-blur-xs text-white p-4 text-center pointer-events-none transition-all">
            <div className="size-14 rounded-full bg-white text-primary flex items-center justify-center text-2xl shadow-lg mb-2">
              🎨
            </div>
            <p className="font-display text-lg font-bold drop-shadow-md">
              Thả vào đây để đổi màu tóc
            </p>
          </div>
        )}

        {/* Overlay khi AI đang segment mặt nạ tóc */}
        {isSegmenting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs text-white p-4 text-center transition-all">
            <div className="size-10 rounded-full border-3 border-white border-t-transparent animate-spin mb-3" />
            <p className="text-sm font-semibold">Đang nhận diện vùng tóc...</p>
            <p className="text-xs text-white/80 mt-1">Lần đầu mất 1–2 giây để tải mô hình AI trên máy</p>
          </div>
        )}

        {/* Lỗi */}
        {errorMsg && (
          <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-red-600/90 p-3 text-center text-xs font-semibold text-white backdrop-blur-sm shadow-md">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Floating touch ghost theo ngón tay trên mobile */}
      {touchGhost && (
        <div
          style={{
            position: "fixed",
            left: touchGhost.x - 24,
            top: touchGhost.y - 48,
            pointerEvents: "none",
            zIndex: 9999,
          }}
          className="flex size-12 items-center justify-center rounded-full border-2 border-white shadow-2xl scale-125 transition-transform"
        >
          <div
            className="size-full rounded-full"
            style={{ background: swatchBg(touchGhost.color.tones) }}
          />
        </div>
      )}

      {/* Thanh công cụ điều khiển màu */}
      <div className="rounded-3xl border border-line bg-canvas p-5 shadow-sm flex flex-col gap-4">
        {/* Tiêu đề & Trạng thái màu */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="font-display font-bold text-ink">Bảng thử màu tóc tức thì</h4>
            <p className="text-xs text-mauve">
              Kéo thả hoặc bấm chọn màu để xem trước miễn phí trên trình duyệt
            </p>
          </div>
          {activeColor && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              Đang thử: {activeColor.label}
            </span>
          )}
        </div>

        {/* Bảng các ô màu */}
        <div className="flex flex-wrap gap-2.5">
          {HAIR_COLORS.map((c) => {
            const isSelected = activeColor?.value === c.value;
            return (
              <button
                key={c.value}
                type="button"
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", c.value);
                }}
                onPointerDown={(e) => handlePointerDown(e, c)}
                aria-label={`Màu ${c.label}`}
                title={`Kéo hoặc bấm để thử màu ${c.label}`}
                style={{ background: swatchBg(c.tones) }}
                className={`group relative size-10 rounded-full border-2 shadow-sm transition hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing ${
                  isSelected
                    ? "border-primary ring-3 ring-primary/40 scale-105"
                    : "border-line"
                }`}
              >
                {isSelected && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-xs drop-shadow-md">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Thanh trượt Độ đậm & Các nút bấm */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-line/60 pt-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted shrink-0">Độ đậm:</span>
            <input
              type="range"
              min="0.3"
              max="1.0"
              step="0.05"
              value={intensity}
              onChange={(e) => handleIntensityChange(parseFloat(e.target.value))}
              disabled={!activeColor}
              className="h-1.5 w-32 cursor-pointer accent-primary disabled:opacity-40"
            />
            <span className="text-xs font-bold text-ink w-8">
              {Math.round(intensity * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeColor && (
              <button
                type="button"
                onClick={() => renderColor(null, intensity, "reset")}
                className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-mauve hover:text-ink transition-colors cursor-pointer"
              >
                Bỏ màu
              </button>
            )}
            <button
              type="button"
              onClick={handleDownload}
              disabled={!imageLoaded}
              className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink hover:border-primary hover:text-primary transition-colors cursor-pointer disabled:opacity-40"
            >
              Tải ảnh này
            </button>
            {activeColor && onPickAiColor && (
              <Button
                onClick={() => onPickAiColor(activeColor.value)}
                size="sm"
                className="text-xs font-bold shadow-sm"
              >
                Tạo ảnh đẹp bằng AI với màu này →
              </Button>
            )}
          </div>
        </div>

        <p className="text-[11px] text-muted italic">
          * Xem trước nhanh trên máy bạn — kết quả AI sẽ tự nhiên và hoà hợp ánh sáng hơn.
        </p>
      </div>
    </div>
  );
}
