import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Danger, TickCircle } from "iconsax-reactjs";
import { trackEvent } from "../lib/analytics";
import { useEffect, useRef, useState, useMemo } from "react";
import { normalizeImage } from "../utils/imageUtils";
import { Link, useSearchParams } from "react-router-dom";
import { CheckIcon, DownloadIcon, UploadIcon, ShareIcon } from "../components/icons";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import QuotaBadge from "../components/QuotaBadge";
import { Button, Card, Badge } from "../components/ui";
import api from "../lib/api";
import useAuthStore from "../store/useAuthStore";
import { useScanStore, useHasHydrated } from "../store/useScanStore";
import FeedbackWidget from "../components/FeedbackWidget";
import AiReportButton from "../components/AiReportButton";
import PremiumGateModal from "../components/PremiumGateModal";
import AiStylistPanel from "../components/AiStylistPanel";
import HairColorStudio from "../components/HairColorStudio";
import ShareModal from "../components/ShareModal";

import { COLOR_BY_VALUE } from "../lib/hairColors";

const FACE_SHAPE_MAP = {
  Oval: "Trái xoan",
  Round: "Tròn",
  Square: "Vuông",
  Heart: "Trái tim",
  Oblong: "Dài",
  Diamond: "Kim cương",
};

export default function SwapPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const hairstyleId = searchParams.get("hairstyleId");
  const fileInputRef = useRef(null);

  const hasHydrated = useHasHydrated();
  const {
    imageFile,
    previewUrl,
    selectedHairstyle,
    analysisResult,
    gender,
    setImage,
    setSelectedHairstyle,
    hydrateFromHistory,
  } = useScanStore();

  const { user } = useAuthStore();

  const [selectedStyle, setSelectedStyle] = useState(selectedHairstyle);
  const [loading, setLoading] = useState(false);
  const [hairColor, setHairColor] = useState("");
  const [resultImage, setResultImage] = useState(null);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [showCompare, setShowCompare] = useState(true);
  const [activeStudioColor, setActiveStudioColor] = useState(null);
  const colorStudioRef = useRef(null);

  // Lưu lịch sử các kiểu đã thử trong phiên (tối đa 10)
  const [sessionResults, setSessionResults] = useState([]);

  // Modal cảnh báo gói trả phí
  const [premiumGateStyle, setPremiumGateStyle] = useState(null);
  const [showPremiumGate, setShowPremiumGate] = useState(false);

  // Modal chia sẻ mạng xã hội (Hybrid Share)
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareData, setShareData] = useState(null);

  const pollTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, []);

  const faceShapeVi = analysisResult?.faceShape
    ? FACE_SHAPE_MAP[analysisResult.faceShape] || null
    : null;

  // Lấy danh sách kiểu tóc phù hợp hoặc toàn bộ
  const { data: styles = [] } = useQuery({
    queryKey: ["hairstyles-swap", faceShapeVi, gender],
    queryFn: async () => {
      const params = {};
      if (faceShapeVi) params.faceShape = faceShapeVi;
      if (gender) params.gender = gender;
      const { data } = await api.get("/hairstyles", { params });
      return data;
    },
  });

  const { data: chosenHairstyle = null } = useQuery({
    queryKey: ["hairstyle-chosen-swap", hairstyleId],
    queryFn: async () => {
      if (!hairstyleId) return null;
      const { data } = await api.get(`/hairstyles/${hairstyleId}`);
      return data;
    },
    enabled: !!hairstyleId,
  });

  // Query lịch sử quét để lấy ảnh gần nhất nếu có
  const { data: recentScans = [] } = useQuery({
    queryKey: ["profile-scans-recent"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) return [];
      const { data } = await api.get("/profile/scans");
      return data || [];
    },
    enabled: !!localStorage.getItem("token"),
    staleTime: 60_000,
  });

  // Lấy thông tin hạn mức sử dụng (usage summary)
  const { data: usageData } = useQuery({
    queryKey: ["usage-summary"],
    queryFn: async () => {
      const { data } = await api.get("/usage/me");
      return data;
    },
    enabled: !!localStorage.getItem("token"),
    staleTime: 30_000,
  });

  const hairSwapQuota = usageData?.hairSwap;

  const displayedStyles = useMemo(() => {
    const all = [...styles];
    if (chosenHairstyle && !all.some((s) => s.id === chosenHairstyle.id)) {
      all.unshift(chosenHairstyle);
    }
    const groups = new Map();
    for (const item of all) {
      const baseId = item.baseStyleId || item.id;
      if (!groups.has(baseId)) groups.set(baseId, []);
      groups.get(baseId).push(item);
    }
    const list = [];
    for (const variants of groups.values()) {
      variants.sort((a, b) => {
        if (!a.baseStyleId && b.baseStyleId) return -1;
        if (a.baseStyleId && !b.baseStyleId) return 1;
        return a.id - b.id;
      });
      const base = variants.find((v) => !v.baseStyleId) || variants[0];
      list.push(base);
    }
    return list;
  }, [styles, chosenHairstyle]);

  // KHÔNG tự chọn sẵn kiểu tóc — phải do người dùng chọn chủ động
  const activeStyle = selectedStyle || chosenHairstyle || null;

  // Kiểm tra xem kiểu đang chọn đã có kết quả trong phiên chưa
  const existingSessionResult = activeStyle
    ? sessionResults.find((r) => r.styleId === activeStyle.id)
    : null;

  const activeResultImage = resultImage || existingSessionResult?.imageUrl || null;

  const POLL_INTERVAL_MS = 3000;
  const MAX_POLL_ATTEMPTS = 30;

  const handleSwapError = (errMsg) => {
    let message = "Hệ thống AI đang bận, vui lòng thử lại sau ít phút. Lượt của bạn sẽ được hoàn lại nếu AI không trả kết quả.";
    if (typeof errMsg === "string" && errMsg.trim()) {
      message = errMsg;
    } else if (errMsg && typeof errMsg === "object") {
      message = errMsg.message || errMsg.error || JSON.stringify(errMsg);
    }
    setError(message);
    setLoading(false);
  };

  const pollTaskStatus = async (taskId, attempt = 1) => {
    try {
      const { data } = await api.get(`/swap/status/${taskId}`, {
        timeout: 15000,
      });

      if (data.status === "DONE") {
        setResultImage(data.image);
        if (activeStyle) {
          const newEntry = {
            styleId: activeStyle.id,
            styleName: activeStyle.name,
            color: hairColor,
            imageUrl: data.image,
          };
          setSessionResults((prev) => [
            newEntry,
            ...prev.filter((x) => x.styleId !== activeStyle.id || x.color !== hairColor),
          ].slice(0, 10));
        }
        setLoading(false);
        queryClient.invalidateQueries({ queryKey: ["usage-summary"] });
        return;
      }

      if (data.status === "ERROR") {
        handleSwapError(data.error);
        queryClient.invalidateQueries({ queryKey: ["usage-summary"] });
        return;
      }

      if (attempt >= MAX_POLL_ATTEMPTS) {
        setError("AI xử lý quá lâu. Vui lòng thử lại.");
        setLoading(false);
        queryClient.invalidateQueries({ queryKey: ["usage-summary"] });
        return;
      }

      pollTimeoutRef.current = setTimeout(
        () => pollTaskStatus(taskId, attempt + 1),
        POLL_INTERVAL_MS
      );
    } catch (err) {
      console.error("Lỗi khi poll trạng thái hair-swap:", err);
      if (err.response?.status === 404) {
        setError("Tác vụ đã hết hạn. Vui lòng thử lại.");
        setLoading(false);
        queryClient.invalidateQueries({ queryKey: ["usage-summary"] });
        return;
      }
      if (attempt >= MAX_POLL_ATTEMPTS) {
        setError("Không thể kết nối tới máy chủ. Vui lòng thử lại.");
        setLoading(false);
        queryClient.invalidateQueries({ queryKey: ["usage-summary"] });
        return;
      }
      pollTimeoutRef.current = setTimeout(
        () => pollTaskStatus(taskId, attempt + 1),
        POLL_INTERVAL_MS
      );
    }
  };

  /**
   * Tải ảnh kết quả về máy
   */
  const handleDownload = async () => {
    if (downloading) return;

    // Nếu người dùng đang thử màu tóc trên canvas của HairColorStudio
    if (colorStudioRef.current?.hasActiveColor) {
      colorStudioRef.current.download();
      return;
    }

    if (!activeResultImage) return;
    setDownloading(true);
    try {
      const response = await fetch(activeResultImage);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `hairapy-${activeStyle?.name ? activeStyle.name.toLowerCase().replace(/\s+/g, "-") : "hairstyle"}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Lỗi khi tải ảnh:", err);
      window.open(activeResultImage, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  /**
   * Lấy Blob ảnh hiện tại (từ HairColorStudio canvas nếu đang thử màu, hoặc tải từ activeResultImage)
   */
  const getCurrentImageBlob = async () => {
    // 1. Nếu đang có màu tóc được áp dụng trên canvas của HairColorStudio
    if (colorStudioRef.current?.hasActiveColor && colorStudioRef.current?.getBlob) {
      try {
        const blob = await colorStudioRef.current.getBlob();
        if (blob) return blob;
      } catch (e) {
        console.warn("Lỗi lấy blob từ HairColorStudio canvas:", e);
      }
    }

    // 2. Hoặc ảnh kết quả AI Swap / preview
    const targetUrl = activeResultImage || previewUrl;
    if (!targetUrl) return null;

    try {
      const response = await fetch(targetUrl);
      return await response.blob();
    } catch (err) {
      console.error("Lỗi tải blob ảnh:", err);
      return null;
    }
  };

  /**
   * Xử lý chia sẻ Hybrid:
   * - Mobile / OS hỗ trợ Web Share API với files: mở trực tiếp Share Sheet hệ thống (TikTok, Messenger, FB, Zalo...)
   * - Desktop / Trình duyệt thường: mở ShareModal chuyên dụng (Copy ảnh vào clipboard Ctrl+V, TikTok, FB, Messenger...)
   */
  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    setError(null);

    try {
      const blob = await getCurrentImageBlob();
      if (!blob) {
        setError("Chưa có ảnh để chia sẻ. Vui lòng chọn hoặc thử một kiểu tóc trước.");
        return;
      }

      const styleName = activeStyle?.name || "Kiểu tóc mới";
      const colorName = activeStudioColor?.name || "";
      const shareUrl = window.location.href;
      const title = `Kiểu tóc ${styleName} trên Hairapy`;
      const text = `Tôi vừa thử kiểu tóc ${styleName}${colorName ? ` với màu ${colorName}` : ""} trên Hairapy! Thử ngay nhé:`;

      const file = new File(
        [blob],
        `hairapy-${activeStyle?.name ? activeStyle.name.toLowerCase().replace(/\s+/g, "-") : "hairstyle"}.jpg`,
        { type: "image/jpeg" }
      );

      // 1. Kiểm tra nếu trình duyệt hỗ trợ Native Web Share API với files (iOS Safari, Android Chrome)
      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title,
            text,
            url: shareUrl,
            files: [file],
          });
          trackEvent("hair_share", {
            method: "native_share",
            hairstyle_id: activeStyle?.id,
            color: colorName || "default",
          });
          return;
        } catch (shareErr) {
          if (shareErr.name === "AbortError") {
            return;
          }
          console.warn("Native share lỗi hoặc bị huỷ, chuyển sang ShareModal:", shareErr);
        }
      }

      // 2. Fallback cho Desktop hoặc trình duyệt không hỗ trợ chia sẻ file trực tiếp
      const previewBlobUrl = URL.createObjectURL(blob);
      setShareData({
        blob,
        imageUrl: previewBlobUrl,
        styleName,
        colorName,
        shareUrl,
      });
      setShowShareModal(true);

      trackEvent("hair_share", {
        method: "modal_opened",
        hairstyle_id: activeStyle?.id,
        color: colorName || "default",
      });
    } catch (err) {
      console.error("Lỗi khi chuẩn bị chia sẻ ảnh:", err);
      setError("Không thể chuẩn bị ảnh để chia sẻ.");
    } finally {
      setSharing(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const normalized = await normalizeImage(file);
      setImage(normalized);
      setResultImage(null);
    } catch (err) {
      console.error("Lỗi nén ảnh:", err);
      setImage(file);
    }
  };

  const handleUseRecentScan = async () => {
    if (recentScans.length === 0) return;
    try {
      setLoading(true);
      await hydrateFromHistory(recentScans[0]);
      setResultImage(null);
      setError(null);
    } catch (err) {
      console.error("Lỗi tải ảnh lịch sử:", err);
      setError("Không thể tải ảnh quét gần nhất. Vui lòng tải ảnh lên từ máy.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (overrideColor) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Vui lòng đăng nhập để sử dụng tính năng thử kiểu tóc.");
      return;
    }

    if (!imageFile && !previewUrl) {
      setError("Vui lòng tải ảnh khuôn mặt của bạn trước khi thử kiểu tóc.");
      return;
    }

    if (!activeStyle) {
      setError("Vui lòng chọn một kiểu tóc để thử.");
      return;
    }

    if (activeStyle.premiumOnly && user?.plan === "FREE") {
      setPremiumGateStyle(activeStyle);
      setShowPremiumGate(true);
      return;
    }

    const chosenColor = typeof overrideColor === "string" ? overrideColor : hairColor;
    if (typeof overrideColor === "string") {
      setHairColor(overrideColor);
    }

    setLoading(true);
    setError(null);
    setResultImage(null);

    try {
      let uploadFile = imageFile;
      if (!uploadFile && previewUrl) {
        const res = await fetch(previewUrl);
        const blob = await res.blob();
        uploadFile = new File([blob], "input.jpg", { type: blob.type || "image/jpeg" });
      }

      uploadFile = await normalizeImage(uploadFile);

      const formData = new FormData();
      formData.append("image", uploadFile);
      formData.append("hairstyleId", activeStyle.id);
      if (chosenColor) {
        formData.append("hairColor", chosenColor);
      }

      const response = await api.post("/swap/submit", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000,
      });

      const { taskId } = response.data;
      if (!taskId) {
        throw new Error("Không nhận được mã tác vụ từ hệ thống.");
      }

      trackEvent("hair_swap", {
        hairstyle_id: activeStyle.id,
        hair_color: chosenColor || "default",
      });

      pollTimeoutRef.current = setTimeout(
        () => pollTaskStatus(taskId, 1),
        POLL_INTERVAL_MS
      );
    } catch (err) {
      console.error("Lỗi khi gửi yêu cầu đổi tóc:", err);
      const errorData = err.response?.data;

      if (err.response?.status === 403 && errorData?.requiresPremium) {
        setPremiumGateStyle(activeStyle);
        setShowPremiumGate(true);
        setLoading(false);
        return;
      }

      if (err.response?.status === 504 || errorData?.refunded) {
        setError("AI xử lý quá lâu. Lượt của bạn đã được hoàn lại — hãy thử lại nhé!");
        setLoading(false);
        return;
      }

      if (err.response?.status === 429) {
        const limit = errorData?.limit;
        if (user?.plan === "PREMIUM") {
          setError("Bạn đã dùng hết 8 lượt hôm nay. Lượt mới sẽ có lúc 0h.");
        } else if (user?.plan === "PRO") {
          setError(`Bạn đã dùng hết ${limit || 5} lượt hôm nay. Nâng cấp Gói Tháng để có 8 lượt/ngày.`);
        } else {
          setError(`Bạn đã dùng hết ${limit || 1} lượt hôm nay. Nâng cấp để có 5–8 lượt/ngày.`);
        }
        setLoading(false);
        return;
      }

      handleSwapError(errorData?.error);
    }
  };

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="size-8 animate-spin rounded-full border-4 border-pink border-t-transparent" />
      </div>
    );
  }

  const remainingSwaps = hairSwapQuota
    ? Math.max((hairSwapQuota.limit || 1) - (hairSwapQuota.used || 0), 0)
    : null;

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-6 py-12 sm:px-16 lg:grid-cols-[380px_1fr]">
        {/* ASIDE: bộ chọn kiểu tóc và màu sắc */}
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-ink">Chọn kiểu tóc</h2>
              {activeStyle && (
                <span className="text-xs font-semibold text-primary truncate max-w-[160px]">
                  {activeStyle.name}
                </span>
              )}
            </div>

            {displayedStyles.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted">
                Đang tải danh sách kiểu tóc...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
                {displayedStyles.map((s) => {
                  const isActive = activeStyle?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        if (s.premiumOnly && user?.plan === "FREE") {
                          setPremiumGateStyle(s);
                          setShowPremiumGate(true);
                          return;
                        }
                        setSelectedStyle(s);
                        setSelectedHairstyle({
                          id: s.id,
                          name: s.name,
                          imageUrl: s.imageUrl,
                          ailabProStyle: s.ailabProStyle,
                        });
                        setResultImage(null);
                        setError(null);
                      }}
                      className={`relative aspect-square overflow-hidden rounded-xl border-2 transition cursor-pointer ${
                        isActive
                          ? "border-primary font-bold shadow-md"
                          : "border-transparent hover:border-line"
                      }`}
                    >
                      <img
                        src={s.imageUrl}
                        alt={s.name}
                        className="aspect-square w-full object-cover"
                        onError={(e) => {
                          e.target.src = `https://placehold.co/300x300?text=${encodeURIComponent(s.name)}`;
                        }}
                      />
                      {isActive && (
                        <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-primary text-white z-10 shadow">
                          <CheckIcon size={12} />
                        </span>
                      )}
                      {s.premiumOnly && (
                        <span className="absolute left-1 top-1 rounded bg-magenta/90 px-1.5 py-0.5 text-[9px] font-bold text-white z-10 shadow">
                          Trả phí
                        </span>
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

          {error && (
            <div className="text-xs font-semibold text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20 leading-relaxed">
              <span className="flex items-start gap-2">
                <Danger size={16} variant="Bold" className="mt-px shrink-0" />
                <span>{typeof error === "string" ? error : (error?.message || "Đã có lỗi xảy ra")}</span>
              </span>
            </div>
          )}

          {hairColor && (
            <div className="flex items-center justify-between rounded-2xl border border-line bg-canvas p-3 text-xs">
              <span className="text-mauve">
                Màu AI: <b className="text-ink">{COLOR_BY_VALUE[hairColor]?.label || hairColor}</b>
              </span>
              <button
                type="button"
                onClick={() => setHairColor("")}
                className="text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                Về màu gốc
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {hairSwapQuota && !hairSwapQuota.unlimited && (
              <p className={`text-xs ${remainingSwaps === 1 ? "text-amber-500 font-bold" : "text-mauve"}`}>
                Lần thử này dùng 1 lượt (còn {remainingSwaps}/{hairSwapQuota.limit} hôm nay)
              </p>
            )}
            <QuotaBadge feature="HAIR_SWAP" />
            <Button
              onClick={handleApply}
              disabled={loading || !activeStyle || !previewUrl}
              className="w-full justify-center py-3 font-bold"
            >
              {loading
                ? "AI đang tạo kiểu..."
                : !previewUrl
                ? "Vui lòng chọn ảnh trước"
                : !activeStyle
                ? "Chọn 1 kiểu tóc để thử"
                : "Áp dụng kiểu tóc AI"}
            </Button>
          </div>

          {(activeResultImage || (previewUrl && activeStudioColor)) && (
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                onClick={handleDownload}
                disabled={downloading}
                variant="outline"
                className="flex w-full items-center justify-center gap-1.5 py-2.5 text-xs font-bold"
              >
                <DownloadIcon size={16} />
                <span>{downloading ? "Đang tải..." : "Tải ảnh về"}</span>
              </Button>

              <Button
                onClick={handleShare}
                disabled={sharing}
                variant="pink"
                className="flex w-full items-center justify-center gap-1.5 py-2.5 text-xs font-bold shadow-sm"
              >
                <ShareIcon size={16} />
                <span>{sharing ? "Đang xử lý..." : "Chia sẻ"}</span>
              </Button>
            </div>
          )}

          {activeResultImage && !error && (
            <FeedbackWidget feature="HAIR_SWAP" />
          )}

          {activeResultImage && !error && (
            <AiReportButton imageUrl={activeResultImage} hairstyleId={activeStyle?.id} feature="HAIR_SWAP" />
          )}
        </Card>

        <AiStylistPanel hairstyleId={activeStyle?.id} defaultOpen={false} />
      </div>

        {/* PREVIEW KHU VỰC CHÍNH */}
        <div className="flex flex-col gap-6">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />

          {!previewUrl ? (
            /* Panel Chọn ảnh chân dung khi chưa có ảnh */
            <div className="relative overflow-hidden rounded-[32px] border-2 border-dashed border-divider bg-canvas p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[460px]">
              <div className="size-16 rounded-3xl bg-pink/15 text-pink flex items-center justify-center mb-4">
                <UploadIcon size={32} />
              </div>
              <h3 className="font-display text-2xl font-bold text-ink mb-2">
                Chọn ảnh chân dung để bắt đầu
              </h3>
              <p className="text-sm text-mauve max-w-md mb-6 leading-relaxed">
                Tải lên ảnh chụp thẳng góc chính diện của bạn để AI tiến hành ghép các kiểu tóc và màu tóc chân thực nhất.
              </p>

              <div className="flex flex-wrap gap-3 justify-center mb-6">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="pink"
                  className="px-6 py-3 font-bold"
                >
                  Tải ảnh chân dung
                </Button>
                {recentScans.length > 0 && (
                  <Button
                    onClick={handleUseRecentScan}
                    disabled={loading}
                    variant="outline"
                    className="px-6 py-3"
                  >
                    Dùng ảnh quét gần nhất
                  </Button>
                )}
              </div>

              {/* Hướng dẫn chụp ảnh */}
              <div className="rounded-2xl border border-divider/40 bg-white/70 p-4 text-xs text-mauve max-w-md text-left">
                <p className="font-bold text-ink mb-2">Để kết quả thử tóc đẹp nhất:</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <li className="flex items-center gap-1.5"><TickCircle size={13} variant="Bold" className="shrink-0 text-emerald-600" /> Chụp chính diện, rõ mặt</li>
                  <li className="flex items-center gap-1.5"><TickCircle size={13} variant="Bold" className="shrink-0 text-emerald-600" /> Đủ sáng, không ngược sáng</li>
                  <li className="flex items-center gap-1.5"><TickCircle size={13} variant="Bold" className="shrink-0 text-emerald-600" /> Không đeo kính, khẩu trang</li>
                  <li className="flex items-center gap-1.5"><TickCircle size={13} variant="Bold" className="shrink-0 text-emerald-600" /> Vén tóc mái để lộ trán</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Khung Preview khi đã có ảnh */
            <div className="flex flex-col gap-4">
              {/* Header điều khiển preview & Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-canvas p-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2.5 rounded-full ${loading ? "bg-amber-400 animate-pulse" : activeResultImage ? "bg-lime" : "bg-pink"}`}
                  />
                  <span className="text-xs font-bold text-ink">
                    {loading
                      ? "AI đang xử lý..."
                      : activeResultImage
                      ? "Đã tạo kiểu tóc"
                      : "Ảnh gốc sẵn sàng"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {(activeResultImage || (previewUrl && activeStudioColor)) && (
                    <button
                      type="button"
                      onClick={handleShare}
                      disabled={sharing}
                      className="rounded-xl border border-pink/30 bg-pink/10 px-3 py-1.5 text-xs font-bold text-pink hover:bg-pink hover:text-white transition cursor-pointer flex items-center gap-1.5"
                    >
                      <ShareIcon size={14} />
                      <span>Chia sẻ</span>
                    </button>
                  )}

                  {activeResultImage && (
                    <button
                      type="button"
                      onClick={() => setShowCompare(!showCompare)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                        showCompare
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                          : "border-line bg-white text-mauve hover:text-ink hover:border-primary/40"
                      }`}
                    >
                      <span>↔ So sánh Trước / Sau</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          showCompare ? "bg-primary text-white" : "bg-line text-muted"
                        }`}
                      >
                        {showCompare ? "BẬT" : "TẮT"}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-mauve hover:text-ink hover:border-primary transition cursor-pointer"
                  >
                    Đổi ảnh khác
                  </button>
                </div>
              </div>

              {/* Vùng hiển thị chính */}
              <div className="relative">
                <HairColorStudio
                  ref={colorStudioRef}
                  imageUrl={activeResultImage || previewUrl}
                  beforeImage={activeResultImage ? previewUrl : null}
                  showCompare={showCompare && Boolean(activeResultImage)}
                  onColorChange={setActiveStudioColor}
                />

                {/* Overlay khi AI đang tạo kiểu */}
                {loading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[32px] bg-ink/75 backdrop-blur-sm transition-opacity duration-300 z-40">
                    <span className="size-14 animate-spin rounded-full border-4 border-pink border-t-transparent shadow-lg" />
                    <p className="mt-4 font-display font-semibold text-white tracking-wide text-lg">
                      AI đang tạo kiểu tóc mới...
                    </p>
                    <p className="text-xs text-white/70 mt-1 max-w-xs text-center px-4">
                      Thường mất 20–60 giây, bạn có thể rời trang — ảnh sẽ được lưu vào Hồ sơ.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dải thumbnail "Các kiểu đã thử trong phiên này" */}
          {sessionResults.length > 0 && (
            <div className="flex flex-col gap-2.5 rounded-2xl bg-canvas p-4 border border-line">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                Các kiểu đã thử trong phiên này ({sessionResults.length}):
              </p>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {sessionResults.map((sr, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const found = displayedStyles.find((s) => s.id === sr.styleId);
                      if (found) setSelectedStyle(found);
                      setResultImage(sr.imageUrl);
                    }}
                    className="shrink-0 relative group rounded-xl overflow-hidden border-2 border-line hover:border-pink transition cursor-pointer"
                  >
                    <img src={sr.imageUrl} alt={sr.styleName} className="size-16 object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[9px] px-1 truncate text-center">
                      {sr.styleName}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted border-t border-divider/20 pt-2">
                Ảnh đã được lưu trong{" "}
                <Link to="/profile?tab=swaps" className="text-primary font-semibold hover:underline">
                  Hồ sơ → Ảnh đã thử tóc
                </Link>{" "}
                (giữ 30 ngày).
              </p>
            </div>
          )}
        </div>
      </div>

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        imageBlob={shareData?.blob}
        imageUrl={shareData?.imageUrl}
        styleName={shareData?.styleName}
        colorName={shareData?.colorName}
        shareUrl={shareData?.shareUrl}
      />

      <PremiumGateModal
        isOpen={showPremiumGate}
        onClose={() => setShowPremiumGate(false)}
        style={premiumGateStyle}
        reason="style"
      />

      <Footer />
    </div>
  );
}
