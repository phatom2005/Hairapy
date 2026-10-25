import { useState, useEffect, useRef } from "react";
import api from "../../lib/api";
import { Card, Button, Badge } from "../ui";
import { HAIR_COLORS, swatchBg } from "../../lib/hairColors";
import { normalizeImage, dataUrlToFile } from "../../lib/sampleUtils";

/**
 * 1. Panel ảnh người mẫu Nam / Nữ
 */
export function ModelPhotosPanel({ models, onModelChange }) {
  const handleUpload = async (gender, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await normalizeImage(file);
      onModelChange(gender, dataUrl);
    } catch (err) {
      console.error("Lỗi khi xử lý ảnh người mẫu:", err);
      alert("Không thể đọc file ảnh. Vui lòng thử ảnh khác.");
    }
  };

  return (
    <Card className="border border-divider/15 bg-canvas/30 p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line pb-3">
          <div>
            <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <span>👤</span> Ảnh người mẫu chuẩn cho AI
            </h3>
            <p className="text-xs text-mauve">
              Ảnh dùng làm khuôn mặt gốc để AILab tạo ảnh mẫu catalog chân thực, đồng bộ.
            </p>
          </div>
          <span className="text-xs font-semibold text-muted bg-white px-3 py-1 rounded-full border border-line">
            Lưu trong phiên làm việc
          </span>
        </div>

        {/* 2 upload slots */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Nam */}
          <div className="flex items-center gap-4 p-3 rounded-2xl border border-line bg-white">
            <div className="size-20 rounded-xl overflow-hidden bg-canvas border border-line shrink-0 flex items-center justify-center">
              {models.male ? (
                <img src={models.male} alt="Người mẫu Nam" className="size-full object-cover" />
              ) : (
                <span className="text-2xl text-muted">👨</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-ink">Người mẫu Nam</span>
                {models.male && <Badge variant="new">Đã sẵn sàng</Badge>}
              </div>
              <p className="text-xs text-muted mt-0.5">Dùng cho các kiểu tóc Nam & Unisex</p>
              <label className="mt-2 inline-block">
                <span className="cursor-pointer text-xs font-bold text-brand hover:underline">
                  {models.male ? "Đổi ảnh khác" : "+ Tải ảnh người mẫu Nam"}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleUpload("male", e)}
                />
              </label>
            </div>
          </div>

          {/* Nữ */}
          <div className="flex items-center gap-4 p-3 rounded-2xl border border-line bg-white">
            <div className="size-20 rounded-xl overflow-hidden bg-canvas border border-line shrink-0 flex items-center justify-center">
              {models.female ? (
                <img src={models.female} alt="Người mẫu Nữ" className="size-full object-cover" />
              ) : (
                <span className="text-2xl text-muted">👩</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-ink">Người mẫu Nữ</span>
                {models.female && <Badge variant="premium">Đã sẵn sàng</Badge>}
              </div>
              <p className="text-xs text-muted mt-0.5">Dùng cho các kiểu tóc Nữ & Unisex</p>
              <label className="mt-2 inline-block">
                <span className="cursor-pointer text-xs font-bold text-brand hover:underline">
                  {models.female ? "Đổi ảnh khác" : "+ Tải ảnh người mẫu Nữ"}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleUpload("female", e)}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Hướng dẫn tiêu chuẩn ảnh */}
        <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-3 text-xs text-amber-900 leading-relaxed">
          <strong>Tiêu chuẩn ảnh mẫu:</strong> Ảnh chính diện, phông nền trơn sáng, đủ sáng, <strong>tóc ngắn hoặc buộc gọn ra sau</strong> (để AI thay tóc rõ nhất), khuôn mặt chiếm ≥ 1/3 khung hình. <em>Chỉ dùng ảnh của người đã đồng ý bằng văn bản hoặc ảnh người mẫu do AI tạo có quyền thương mại.</em>
        </div>
      </div>
    </Card>
  );
}

/**
 * 2. Dialog so sánh ảnh cũ | ảnh AI mới
 */
export function SampleComparisonModal({ open, item, candidateUrl, loading, onApply, onRegenerate, onClose }) {
  const [activateStyle, setActivateStyle] = useState(true);

  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
          <div>
            <h3 className="font-display text-xl font-bold text-ink">So sánh ảnh mẫu AI</h3>
            <p className="text-xs text-mauve">Kiểu tóc: <strong className="text-ink">{item.name}</strong> ({item.ailabProStyle || "Chưa gán mã AI"})</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink text-xl font-bold p-1">✕</button>
        </div>

        {/* Comparison images */}
        <div className="grid grid-cols-2 gap-4 my-auto">
          {/* Ảnh hiện tại */}
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-muted mb-2 uppercase tracking-wider">Ảnh hiện tại</span>
            <div className="aspect-[3/4] w-full rounded-2xl overflow-hidden border-2 border-line bg-canvas">
              <img src={item.imageUrl} alt={item.name} className="size-full object-cover" />
            </div>
            <span className="text-[11px] text-muted mt-1.5 font-medium">
              {item.sampleByAi ? "Đã là ảnh AI" : "Ảnh cũ (chưa qua AI)"}
            </span>
          </div>

          {/* Ảnh AI mới */}
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-brand mb-2 uppercase tracking-wider flex items-center gap-1">
              <span>✨</span> Ảnh AI mới tạo
            </span>
            <div className="aspect-[3/4] w-full rounded-2xl overflow-hidden border-2 border-brand bg-canvas shadow-md">
              <img src={candidateUrl} alt="Ứng viên AI" className="size-full object-cover" />
            </div>
            <span className="text-[11px] text-emerald-700 font-bold mt-1.5">
              Tạo bởi AILab Pro
            </span>
          </div>
        </div>

        {/* Checkbox hiện kiểu nếu đang ẩn */}
        {!item.active && (
          <label className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 cursor-pointer">
            <input
              type="checkbox"
              className="size-4 rounded text-brand focus:ring-brand"
              checked={activateStyle}
              onChange={(e) => setActivateStyle(e.target.checked)}
            />
            <span className="text-xs font-semibold text-emerald-900">
              Kiểu này đang ẩn — Kích hoạt hiển thị cho khách ngay sau khi áp dụng ảnh mẫu này
            </span>
          </label>
        )}

        <div className="flex justify-between items-center gap-3 pt-4 border-t border-line mt-4">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl px-4 text-xs font-bold text-rose-600 hover:bg-rose-50"
            onClick={onClose}
            disabled={loading}
          >
            Hủy bỏ
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl px-4 text-xs font-bold"
              onClick={onRegenerate}
              disabled={loading}
            >
              🔄 Tạo lại
            </Button>
            <Button
              variant="brand"
              size="sm"
              className="rounded-xl px-5 text-xs font-bold shadow-md"
              onClick={() => onApply(candidateUrl, activateStyle)}
              disabled={loading}
            >
              {loading ? "Đang lưu..." : "✓ Dùng ảnh này"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 3. Dialog tạo hàng loạt ảnh mẫu cho các kiểu chưa có ảnh AI
 */
export function BatchSampleModal({ open, stylesWithoutAi, models, onFinish, onClose }) {
  const [stage, setStage] = useState("confirm"); // "confirm" | "running" | "review"
  const [currentIndex, setCurrentIndex] = useState(0);
  const [candidates, setCandidates] = useState([]); // [{ style, candidateUrl, status: 'DONE'|'ERROR' }]
  const [errorLog, setErrorLog] = useState([]);
  const abortRef = useRef(false);

  // Reset state khi mở modal
  useEffect(() => {
    if (open) {
      setStage("confirm");
      setCurrentIndex(0);
      setCandidates([]);
      setErrorLog([]);
      abortRef.current = false;
    }
  }, [open]);

  const runBatch = async () => {
    setStage("running");
    abortRef.current = false;
    const results = [];

    for (let i = 0; i < stylesWithoutAi.length; i++) {
      if (abortRef.current) break;
      setCurrentIndex(i);
      const style = stylesWithoutAi[i];

      // Chọn người mẫu phù hợp
      let modelDataUrl = style.gender === "Nam" ? models.male : models.female;
      if (style.gender === "Unisex") {
        modelDataUrl = models.female || models.male;
      }

      if (!modelDataUrl) {
        setErrorLog((prev) => [...prev, `${style.name}: Thiếu ảnh người mẫu ${style.gender}`]);
        continue;
      }

      try {
        const file = dataUrlToFile(modelDataUrl, "batch-model.jpg");
        const fd = new FormData();
        fd.append("image", file);
        if (style.ailabColor) {
          fd.append("hairColor", style.ailabColor);
        }

        const submitRes = await api.post(`/admin/catalog/${style.id}/sample`, fd);
        const taskId = submitRes.data.taskId;

        // Poll tối đa 30 lần (mỗi 3s)
        let done = false;
        let pollCount = 0;
        while (!done && pollCount < 30 && !abortRef.current) {
          await new Promise((r) => setTimeout(r, 3000));
          pollCount++;
          const checkRes = await api.get(`/admin/catalog/${style.id}/sample/${taskId}`);
          if (checkRes.data.status === "DONE") {
            done = true;
            results.push({ style, candidateUrl: checkRes.data.imageUrl, approved: false });
            setCandidates([...results]);
          } else if (checkRes.data.status === "ERROR") {
            done = true;
            setErrorLog((prev) => [...prev, `${style.name}: ${checkRes.data.error || "Lỗi AI"}`]);
          }
        }
      } catch (err) {
        console.error(`Lỗi tạo mẫu hàng loạt cho ${style.name}:`, err);
        setErrorLog((prev) => [...prev, `${style.name}: ${err.response?.data?.error || err.message}`]);
      }
    }

    setStage("review");
  };

  const handleStop = () => {
    abortRef.current = true;
  };

  const handleApplySingle = async (item, index) => {
    try {
      await api.put(`/admin/catalog/${item.style.id}/sample`, { imageUrl: item.candidateUrl });
      await api.patch(`/admin/catalog/${item.style.id}/active`, { active: true });
      setCandidates((prev) => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error(err);
      alert("Lỗi khi áp dụng ảnh mẫu.");
    }
  };

  const handleApplyAll = async () => {
    for (const item of candidates) {
      try {
        await api.put(`/admin/catalog/${item.style.id}/sample`, { imageUrl: item.candidateUrl });
        await api.patch(`/admin/catalog/${item.style.id}/active`, { active: true });
      } catch (err) {
        console.error("Lỗi khi áp dụng ảnh cho", item.style.name, err);
      }
    }
    onFinish();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
          <div>
            <h3 className="font-display text-xl font-bold text-ink">Tạo ảnh mẫu AI hàng loạt</h3>
            <p className="text-xs text-mauve">Tự động gọi AILab tuần tự cho các kiểu chưa có ảnh AI</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink text-xl font-bold p-1">✕</button>
        </div>

        {stage === "confirm" && (
          <div className="space-y-4 my-auto py-4">
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-amber-900 text-sm leading-relaxed">
              <p className="font-bold text-base flex items-center gap-1.5 mb-1">
                <span>⚠️</span> Cảnh báo chi phí AILab
              </p>
              Hệ thống sẽ thực hiện tạo ảnh mẫu cho <strong>{stylesWithoutAi.length}</strong> kiểu tóc chưa có ảnh AI.
              Mỗi kiểu tóc sẽ tiêu tốn khoảng <strong>1 credit AILab thật</strong>. Quá trình chạy hoàn toàn <strong>tuần tự</strong> (mỗi kiểu mất 20–40 giây).
            </div>

            <div className="p-4 rounded-2xl border border-line bg-canvas/30 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted">Tổng số kiểu cần tạo:</span>
                <span className="text-ink font-bold">{stylesWithoutAi.length} kiểu</span>
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted">Người mẫu Nam:</span>
                <span className={models.male ? "text-emerald-700 font-bold" : "text-rose-600 font-bold"}>
                  {models.male ? "Đã sẵn sàng" : "Chưa tải lên!"}
                </span>
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted">Người mẫu Nữ:</span>
                <span className={models.female ? "text-emerald-700 font-bold" : "text-rose-600 font-bold"}>
                  {models.female ? "Đã sẵn sàng" : "Chưa tải lên!"}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" className="rounded-xl px-5" onClick={onClose}>
                Hủy
              </Button>
              <Button
                variant="brand"
                className="rounded-xl px-5 font-bold"
                disabled={!models.male && !models.female}
                onClick={runBatch}
              >
                Bắt đầu tạo hàng loạt
              </Button>
            </div>
          </div>
        )}

        {stage === "running" && (
          <div className="space-y-6 my-auto py-6 text-center">
            <div className="size-16 animate-spin rounded-full border-4 border-brand border-t-transparent mx-auto" />
            <div>
              <h4 className="font-bold text-lg text-ink">
                Đang xử lý kiểu {currentIndex + 1} / {stylesWithoutAi.length}
              </h4>
              <p className="text-xs text-mauve mt-1">
                Đang tạo ảnh cho: <strong>{stylesWithoutAi[currentIndex]?.name}</strong>
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-line rounded-full h-3 overflow-hidden">
              <div
                className="bg-brand h-full transition-all duration-300"
                style={{ width: `${Math.round(((currentIndex + 1) / stylesWithoutAi.length) * 100)}%` }}
              />
            </div>

            <div className="text-xs font-bold text-muted">
              Đã tạo thành công: {candidates.length} kiểu
            </div>

            <Button
              variant="outline"
              className="rounded-xl px-6 text-xs font-bold text-rose-600 hover:bg-rose-50"
              onClick={handleStop}
            >
              ⏹ Dừng tiến trình
            </Button>
          </div>
        )}

        {stage === "review" && (
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-ink">
                Hàng chờ duyệt kết quả ({candidates.length} ảnh đã tạo)
              </span>
              {candidates.length > 0 && (
                <Button
                  size="sm"
                  variant="brand"
                  className="rounded-xl px-4 text-xs font-bold"
                  onClick={handleApplyAll}
                >
                  ✓ Dùng tất cả & Hiện kiểu
                </Button>
              )}
            </div>

            {candidates.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm border border-line rounded-2xl">
                Không có ảnh mẫu nào được tạo thành công trong lượt này.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {candidates.map((c, idx) => (
                  <div key={idx} className="p-2.5 rounded-2xl border border-line bg-canvas/30 flex flex-col">
                    <img src={c.candidateUrl} alt={c.style.name} className="aspect-[3/4] w-full rounded-xl object-cover border border-line" />
                    <span className="text-xs font-bold text-ink mt-2 truncate">{c.style.name}</span>
                    <div className="flex gap-1.5 mt-2">
                      <Button
                        size="sm"
                        variant="brand"
                        className="flex-1 py-1 text-[11px] rounded-lg"
                        onClick={() => handleApplySingle(c, idx)}
                      >
                        Dùng
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="py-1 text-[11px] rounded-lg text-muted hover:text-rose-600"
                        onClick={() => setCandidates((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        Bỏ
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {errorLog.length > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                <strong>Nhật ký lỗi ({errorLog.length}):</strong>
                <ul className="list-disc pl-4 mt-1 space-y-0.5 max-h-24 overflow-y-auto">
                  {errorLog.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-line">
              <Button variant="outline" className="rounded-xl px-5 text-xs font-bold" onClick={onFinish}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 4. Modal thêm biến thể màu cho kiểu tóc gốc
 */
export function VariantModal({ open, baseStyle, existingVariants = [], onSubmit, onClose }) {
  const [selectedColors, setSelectedColors] = useState([]);
  const [loading, setLoading] = useState(false);

  // Tập hợp các màu đã có
  const existingColorSet = new Set(
    existingVariants
      .map((v) => v.ailabColor)
      .filter(Boolean)
  );
  if (baseStyle?.ailabColor) {
    existingColorSet.add(baseStyle.ailabColor);
  }

  // Đề xuất biến thể theo quy tắc của plan
  const handleSuggest = () => {
    const isMale = baseStyle?.gender === "Nam";
    const tag = (baseStyle?.tag || "").toLowerCase();
    const isViral = tag.includes("viral") || tag.includes("thịnh hành");

    let suggestions = isMale ? ["brown", "lightBrown", "grey"] : ["brown", "lightBrown", "burgundy"];
    if (isViral) {
      suggestions = [...suggestions, "blonde", "platinumBlonde", "pink"];
    }

    // Lọc các màu chưa có và tối đa 6 màu
    const valid = suggestions.filter((c) => !existingColorSet.has(c)).slice(0, 6);
    setSelectedColors(valid);
  };

  const toggleColor = (colorVal) => {
    if (existingColorSet.has(colorVal)) return;
    setSelectedColors((prev) =>
      prev.includes(colorVal)
        ? prev.filter((c) => c !== colorVal)
        : prev.length < 6
        ? [...prev, colorVal]
        : prev
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedColors.length === 0) {
      alert("Vui lòng chọn ít nhất 1 màu biến thể.");
      return;
    }
    setLoading(true);
    try {
      await onSubmit(baseStyle.id, selectedColors);
      onClose();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Không thể tạo biến thể màu.");
    } finally {
      setLoading(false);
    }
  };

  if (!open || !baseStyle) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
          <div>
            <h3 className="font-display text-xl font-bold text-ink">Thêm biến thể màu</h3>
            <p className="text-xs text-mauve">Kiểu gốc: <strong className="text-ink">{baseStyle.name}</strong> (Tối đa 6 màu mỗi lần)</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink text-xl font-bold p-1">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">
              Chọn màu ({selectedColors.length}/6 đã chọn)
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-xl px-3 py-1 text-xs font-bold text-brand"
              onClick={handleSuggest}
            >
              💡 Gợi ý biến thể phù hợp
            </Button>
          </div>

          {/* Palette */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {HAIR_COLORS.map((c) => {
              const isExisting = existingColorSet.has(c.value);
              const isSelected = selectedColors.includes(c.value);

              return (
                <button
                  type="button"
                  key={c.value}
                  disabled={isExisting}
                  onClick={() => toggleColor(c.value)}
                  className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all ${
                    isExisting
                      ? "opacity-40 bg-gray-100 border-line cursor-not-allowed"
                      : isSelected
                      ? "border-brand bg-brand/10 font-bold ring-2 ring-brand/30"
                      : "border-line hover:border-brand/50 bg-white"
                  }`}
                >
                  <span
                    className="size-5 rounded-full shadow-inner border border-black/10 shrink-0"
                    style={{ background: swatchBg(c.tones) }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-ink truncate block">{c.label}</span>
                    {isExisting && <span className="text-[10px] text-muted block">Đã có</span>}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-line">
            <Button type="button" variant="outline" className="rounded-xl px-5 text-sm" onClick={onClose} disabled={loading}>
              Hủy
            </Button>
            <Button type="submit" variant="brand" className="rounded-xl px-5 text-sm font-bold" disabled={loading || selectedColors.length === 0}>
              {loading ? "Đang tạo..." : `Tạo ${selectedColors.length} biến thể`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * 5. Accordion lộ trình tạo ảnh mẫu
 */
export function RoadmapBanner() {
  const [open, setOpen] = useState(false);

  return (
    <Card className="border border-line bg-gradient-to-r from-canvas to-brand/5 p-4">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🗺️</span>
          <div>
            <h4 className="font-display text-sm font-bold text-ink">Gợi ý lộ trình phủ ảnh mẫu AI & biến thể màu</h4>
            <p className="text-xs text-mauve">Chiến lược tối ưu credit AILab để catalog đạt 100–140 mẫu tóc phong phú</p>
          </div>
        </div>
        <button type="button" className="text-xs font-bold text-brand hover:underline p-1">
          {open ? "Thu gọn ▲" : "Xem chi tiết ▼"}
        </button>
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t border-line text-xs text-ink/80 leading-relaxed space-y-2">
          <p>
            <strong>• Đợt 1:</strong> Tạo ảnh mẫu cho 47 kiểu tóc gốc bằng ảnh người mẫu chuẩn (đảm bảo mọi kiểu gốc đều có ảnh AI minh hoạ thực tế).
          </p>
          <p>
            <strong>• Đợt 2:</strong> Thêm 2–3 biến thể màu cho ~20–30 kiểu được thử nhiều nhất (tham khảo mục Top kiểu tóc trong <em>Admin Dashboard</em>) → Nâng quy mô danh mục lên <strong>~100–140 mục</strong> mà kiểu nào khách thử cũng giống mẫu.
          </p>
          <p className="text-muted italic">
            * Ước tính: 1 ảnh mẫu ≈ 1 credit AILab thật (cộng thêm các lần tạo lại nếu cần tinh chỉnh).
          </p>
        </div>
      )}
    </Card>
  );
}
