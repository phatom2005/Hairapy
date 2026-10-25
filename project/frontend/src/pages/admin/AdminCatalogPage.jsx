import { useEffect, useState, useCallback, useMemo } from "react";
import Cropper from "react-easy-crop";
import api from "../../lib/api";
import { Card, Badge, Button } from "../../components/ui";
import { getCroppedImg } from "../../lib/cropImage.js";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import { HAIR_COLORS } from "../../lib/hairColors";
import {
  ModelPhotosPanel,
  SampleComparisonModal,
  BatchSampleModal,
  VariantModal,
  RoadmapBanner,
} from "../../components/admin/SampleGenerator";
import { dataUrlToFile } from "../../lib/sampleUtils";

const FACE_SHAPES = ["Oval", "Round", "Square", "Heart", "Oblong", "Diamond"];
const HAIR_LENGTHS = ["Ngắn", "Vừa", "Dài"];
const GENDERS = ["Nam", "Nữ", "Unisex"];

export default function AdminCatalogPage() {
  const [catalog, setCatalog] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);

  // Bộ lọc
  const [filters, setFilters] = useState({
    keyword: "",
    faceShape: "",
    hairLength: "",
    gender: "",
    premiumOnly: "",
  });
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [noAiSampleOnly, setNoAiSampleOnly] = useState(false);

  // AI Styles whitelist từ backend
  const [aiStyles, setAiStyles] = useState([]);

  // Ảnh người mẫu lưu trong state + sessionStorage
  const [models, setModels] = useState(() => {
    try {
      return {
        male: sessionStorage.getItem("hairapy_admin_model_male") || null,
        female: sessionStorage.getItem("hairapy_admin_model_female") || null,
      };
    } catch {
      return { male: null, female: null };
    }
  });

  const handleModelChange = (gender, dataUrl) => {
    setModels((prev) => ({ ...prev, [gender]: dataUrl }));
    try {
      sessionStorage.setItem(`hairapy_admin_model_${gender}`, dataUrl);
    } catch (e) {
      console.warn("Không thể lưu model vào sessionStorage:", e);
    }
  };

  // Trạng thái modal form thêm/sửa
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // States crop ảnh
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [cropInteracted, setCropInteracted] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    tag: "",
    faceShapes: ["Oval"],
    hairLength: "Vừa",
    gender: "Unisex",
    description: "",
    premiumOnly: false,
    ailabProStyle: "",
    ailabColor: "",
  });

  // State sub-variants thu gọn/mở rộng
  const [expandedBaseIds, setExpandedBaseIds] = useState(new Set());

  // State các modal chức năng AI
  const [sampleGeneratingId, setSampleGeneratingId] = useState(null);
  const [sampleModalData, setSampleModalData] = useState(null); // { item, candidateUrl }
  const [sampleModalLoading, setSampleModalLoading] = useState(false);

  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [variantModalBaseStyle, setVariantModalBaseStyle] = useState(null);

  // Debounce ô tìm kiếm 400ms
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedKeyword(filters.keyword.trim());
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [filters.keyword]);

  // Lấy danh sách mã AI styles
  useEffect(() => {
    let active = true;
    api
      .get("/admin/catalog/ai-styles")
      .then((res) => {
        if (active) setAiStyles(res.data || []);
      })
      .catch((err) => console.error("Lỗi lấy danh sách ai-styles:", err));
    return () => {
      active = false;
    };
  }, []);

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(0);
  };

  const hasFilter =
    filters.keyword ||
    filters.faceShape ||
    filters.hairLength ||
    filters.gender ||
    filters.premiumOnly ||
    noAiSampleOnly;

  const clearFilters = () => {
    setFilters({ keyword: "", faceShape: "", hairLength: "", gender: "", premiumOnly: "" });
    setDebouncedKeyword("");
    setNoAiSampleOnly(false);
    setPage(0);
  };

  const { faceShape, hairLength, gender, premiumOnly } = filters;

  const fetchCatalog = useCallback(() => {
    setLoading(true);
    const params = { page, size: 20 };
    if (debouncedKeyword) params.keyword = debouncedKeyword;
    if (faceShape) params.faceShape = faceShape;
    if (hairLength) params.hairLength = hairLength;
    if (gender) params.gender = gender;
    if (premiumOnly) params.premiumOnly = premiumOnly;
    api
      .get("/admin/catalog", { params })
      .then((res) => {
        setCatalog(res.data.content || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalElements(res.data.totalElements ?? 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [page, debouncedKeyword, faceShape, hairLength, gender, premiumOnly]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchCatalog();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchCatalog]);

  // Mở modal thêm mới
  const handleOpenAdd = () => {
    setEditingItem(null);
    setImageFile(null);
    setImagePreview(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropInteracted(false);
    setFormData({
      name: "",
      tag: "",
      faceShapes: ["Oval"],
      hairLength: "Vừa",
      gender: "Unisex",
      description: "",
      premiumOnly: false,
      ailabProStyle: "",
      ailabColor: "",
    });
    setIsOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setImageFile(null);
    setImagePreview(item.imageUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropInteracted(false);
    setFormData({
      name: item.name,
      tag: item.tag || "",
      faceShapes: item.faceShape ? item.faceShape.split(",").map((s) => s.trim()) : ["Oval"],
      hairLength: item.hairLength || "Vừa",
      gender: item.gender || "Unisex",
      description: item.description || "",
      premiumOnly: item.premiumOnly,
      ailabProStyle: item.ailabProStyle || "",
      ailabColor: item.ailabColor || "",
    });
    setIsOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropInteracted(true);
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Vui lòng điền tên kiểu tóc.");
      return;
    }
    if (!editingItem && !imageFile) {
      alert("Vui lòng chọn ảnh kiểu tóc.");
      return;
    }

    try {
      const fd = new FormData();
      fd.append("name", formData.name.trim());
      if (formData.tag) fd.append("tag", formData.tag.trim());
      fd.append("faceShape", formData.faceShapes.join(","));
      fd.append("hairLength", formData.hairLength);
      fd.append("gender", formData.gender);
      if (formData.description) fd.append("description", formData.description.trim());
      fd.append("premiumOnly", formData.premiumOnly);
      if (formData.ailabProStyle) fd.append("ailabProStyle", formData.ailabProStyle);
      if (formData.ailabColor) fd.append("ailabColor", formData.ailabColor);

      if (croppedAreaPixels && cropInteracted) {
        if (imageFile || editingItem) {
          try {
            let activeUrl = imagePreview;
            if (!imageFile && editingItem) {
              const corsUrl = `${editingItem.imageUrl}${editingItem.imageUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
              const response = await fetch(corsUrl);
              const blob = await response.blob();
              activeUrl = URL.createObjectURL(blob);
            }
            const croppedImageBlob = await getCroppedImg(activeUrl, croppedAreaPixels);
            fd.append("image", croppedImageBlob, "cropped-hair.jpg");
          } catch (cropErr) {
            console.error("Lỗi khi crop ảnh cũ:", cropErr);
            alert("Lưu ý: Không thể crop trực tiếp ảnh cũ do chính sách CORS. Vui lòng tải lại ảnh mới để căn chỉnh.");
            return;
          }
        }
      }

      const config = {};
      const apiCall = editingItem
        ? api.put(`/admin/catalog/${editingItem.id}`, fd, config)
        : api.post("/admin/catalog", fd, config);

      await apiCall;
      setIsOpen(false);
      setImageFile(null);
      setImagePreview(null);
      fetchCatalog();
    } catch (err) {
      console.error("Lỗi khi lưu kiểu tóc:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Không xác định";
      alert(`Thao tác thất bại: ${errMsg}`);
    }
  };

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmHidePrompt, setConfirmHidePrompt] = useState(null);
  const [hideLoading, setHideLoading] = useState(false);

  // Bật/tắt hiển thị
  const handleToggleActive = async (id, currentActive) => {
    try {
      await api.patch(`/admin/catalog/${id}/active`, { active: !currentActive });
      setCatalog((prev) =>
        prev.map((item) => (item.id === id ? { ...item, active: !currentActive } : item))
      );
    } catch (err) {
      console.error("Lỗi cập nhật hiển thị:", err);
      alert("Không thể cập nhật trạng thái hiển thị.");
    }
  };

  const handleDelete = (item) => {
    if ((item.savedCount || 0) > 0) {
      setConfirmHidePrompt({ id: item.id, name: item.name, savedCount: item.savedCount });
    } else {
      setConfirmDelete({ id: item.id, name: item.name });
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/catalog/${confirmDelete.id}`);
      setConfirmDelete(null);
      fetchCatalog();
    } catch (err) {
      console.error("Lỗi khi xóa kiểu tóc:", err);
      if (err.response?.status === 409) {
        const savedCount = err.response.data?.savedCount || 1;
        const toHide = { id: confirmDelete.id, name: confirmDelete.name, savedCount };
        setConfirmDelete(null);
        setConfirmHidePrompt(toHide);
      } else {
        alert(err.response?.data?.message || err.response?.data?.error || "Xóa kiểu tóc thất bại.");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConfirmHide = async () => {
    if (!confirmHidePrompt) return;
    setHideLoading(true);
    try {
      await api.patch(`/admin/catalog/${confirmHidePrompt.id}/active`, { active: false });
      setConfirmHidePrompt(null);
      fetchCatalog();
    } catch (err) {
      console.error("Lỗi khi ẩn kiểu tóc:", err);
      alert("Ẩn kiểu tóc thất bại.");
    } finally {
      setHideLoading(false);
    }
  };

  // --- Chức năng Tạo ảnh mẫu AI đơn lẻ ---
  const handleGenerateSample = async (item) => {
    let modelDataUrl;
    if (item.gender === "Nam") {
      modelDataUrl = models.male;
    } else if (item.gender === "Nữ") {
      modelDataUrl = models.female;
    } else {
      modelDataUrl = models.female || models.male;
    }

    if (!modelDataUrl) {
      alert(`Vui lòng tải ảnh người mẫu ${item.gender === "Nam" ? "Nam" : "Nữ"} ở khung phía trên trước khi tạo ảnh mẫu.`);
      return;
    }

    setSampleGeneratingId(item.id);
    try {
      const file = dataUrlToFile(modelDataUrl, "sample-model.jpg");
      const fd = new FormData();
      fd.append("image", file);
      if (item.ailabColor) {
        fd.append("hairColor", item.ailabColor);
      }

      const res = await api.post(`/admin/catalog/${item.id}/sample`, fd);
      const taskId = res.data.taskId;

      let done = false;
      let attempts = 0;
      while (!done && attempts < 30) {
        await new Promise((r) => setTimeout(r, 3000));
        attempts++;
        const pollRes = await api.get(`/admin/catalog/${item.id}/sample/${taskId}`);
        if (pollRes.data.status === "DONE") {
          done = true;
          setSampleModalData({
            item,
            candidateUrl: pollRes.data.imageUrl,
          });
        } else if (pollRes.data.status === "ERROR") {
          done = true;
          alert(`Tạo ảnh mẫu thất bại: ${pollRes.data.error || "Lỗi AI"}`);
        }
      }
      if (!done) {
        alert("Quá thời gian chờ phản hồi từ AILab (90s). Vui lòng thử lại sau.");
      }
    } catch (err) {
      console.error("Lỗi khi tạo ảnh mẫu:", err);
      alert(err.response?.data?.error || err.message || "Tạo ảnh mẫu thất bại.");
    } finally {
      setSampleGeneratingId(null);
    }
  };

  const handleApplySample = async (candidateUrl, activateStyle) => {
    if (!sampleModalData) return;
    setSampleModalLoading(true);
    const { item } = sampleModalData;
    try {
      await api.put(`/admin/catalog/${item.id}/sample`, { imageUrl: candidateUrl });
      if (activateStyle && !item.active) {
        await api.patch(`/admin/catalog/${item.id}/active`, { active: true });
      }
      setSampleModalData(null);
      fetchCatalog();
    } catch (err) {
      console.error("Lỗi áp dụng ảnh mẫu:", err);
      alert(err.response?.data?.error || "Áp dụng ảnh mẫu thất bại.");
    } finally {
      setSampleModalLoading(false);
    }
  };

  // --- Biến thể màu ---
  const handleOpenVariantModal = (baseStyle) => {
    setVariantModalBaseStyle(baseStyle);
  };

  const handleCreateVariants = async (baseStyleId, colors) => {
    const res = await api.post(`/admin/catalog/${baseStyleId}/variants`, { colors });
    const createdCount = res.data.created?.length || 0;
    const skippedCount = res.data.skipped?.length || 0;
    alert(`Đã tạo thành công ${createdCount} biến thể màu mới.${skippedCount > 0 ? ` (Bỏ qua ${skippedCount} màu đã có)` : ""}`);
    fetchCatalog();
  };

  const toggleExpand = (baseId) => {
    setExpandedBaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(baseId)) next.delete(baseId);
      else next.add(baseId);
      return next;
    });
  };

  // Phân loại nhóm kiểu gốc và biến thể trên trang hiện tại
  const { baseStyles, variantsByBase, orphanedVariants } = useMemo(() => {
    const bases = [];
    const varMap = {};
    const baseIdSet = new Set();

    catalog.forEach((item) => {
      if (!item.baseStyleId) {
        bases.push(item);
        baseIdSet.add(item.id);
      }
    });

    const orphans = [];
    catalog.forEach((item) => {
      if (item.baseStyleId) {
        if (baseIdSet.has(item.baseStyleId)) {
          varMap[item.baseStyleId] = varMap[item.baseStyleId] || [];
          varMap[item.baseStyleId].push(item);
        } else {
          orphans.push(item);
        }
      }
    });

    return { baseStyles: bases, variantsByBase: varMap, orphanedVariants: orphans };
  }, [catalog]);

  // Danh sách hiển thị theo bộ lọc "Chưa có ảnh AI"
  const stylesWithoutAi = useMemo(() => {
    return catalog.filter((i) => !i.sampleByAi);
  }, [catalog]);

  const displayedCatalog = useMemo(() => {
    if (!noAiSampleOnly) return catalog;
    return catalog.filter((i) => !i.sampleByAi);
  }, [catalog, noAiSampleOnly]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-ink">Kho kiểu tóc</h2>
          <p className="text-sm text-mauve">Quản lý kho mẫu tóc gợi ý, ảnh mẫu AI và biến thể màu</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl px-4 text-xs font-bold"
            onClick={() => setBatchModalOpen(true)}
            disabled={stylesWithoutAi.length === 0}
          >
            ⚡ Tạo hàng loạt ảnh AI ({stylesWithoutAi.length})
          </Button>
          <Button size="sm" variant="brand" className="rounded-xl px-4 text-xs font-bold" onClick={handleOpenAdd}>
            + Thêm kiểu tóc mới
          </Button>
        </div>
      </div>

      {/* Accordion Lộ trình */}
      <RoadmapBanner />

      {/* Panel ảnh người mẫu */}
      <ModelPhotosPanel models={models} onModelChange={handleModelChange} />

      {/* Bộ lọc */}
      <Card className="border border-divider/10 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Tìm theo tên hoặc tag..."
            value={filters.keyword}
            onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
            className="min-w-[200px] flex-1 rounded-2xl border-2 border-line bg-white px-3.5 py-2 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-brand"
          />
          {[
            { key: "faceShape", label: "Dáng mặt", options: FACE_SHAPES.map((v) => [v, v]) },
            { key: "hairLength", label: "Độ dài", options: HAIR_LENGTHS.map((v) => [v, v]) },
            { key: "gender", label: "Giới tính", options: GENDERS.map((v) => [v, v]) },
            { key: "premiumOnly", label: "Giới hạn", options: [["false", "FREE"], ["true", "PREMIUM"]] },
          ].map(({ key, label, options }) => (
            <select
              key={key}
              aria-label={label}
              value={filters[key]}
              onChange={(e) => setFilter(key, e.target.value)}
              className="rounded-2xl border-2 border-line bg-white px-3 py-2 text-xs font-semibold text-ink outline-none transition focus:border-brand"
            >
              <option value="">{label}: tất cả</option>
              {options.map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          ))}

          {/* Quick filter: Chưa có ảnh mẫu AI */}
          <label className="flex items-center gap-2 px-3 py-2 rounded-2xl border-2 border-line bg-white cursor-pointer select-none">
            <input
              type="checkbox"
              className="size-4 rounded text-brand focus:ring-brand"
              checked={noAiSampleOnly}
              onChange={(e) => setNoAiSampleOnly(e.target.checked)}
            />
            <span className="text-xs font-bold text-amber-700">Chưa có ảnh AI</span>
          </label>

          {hasFilter && (
            <Button size="sm" variant="ghost" className="rounded-xl text-xs" onClick={clearFilters}>
              Xóa bộ lọc
            </Button>
          )}
        </div>
        <p className="mt-2.5 text-xs font-semibold text-muted">
          {hasFilter ? `Tìm thấy ${displayedCatalog.length} kiểu tóc` : `Tổng ${totalElements} kiểu tóc`}
        </p>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden border border-divider/10" padded={false}>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="size-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          </div>
        ) : displayedCatalog.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted">
            {hasFilter ? "Không có kiểu tóc nào khớp bộ lọc" : "Kho kiểu tóc hiện tại trống"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="px-5 py-4">Hình ảnh</th>
                  <th className="px-5 py-4">Tên kiểu tóc</th>
                  <th className="px-5 py-4 text-center">Ảnh mẫu</th>
                  <th className="px-5 py-4">Mã AI & Màu</th>
                  <th className="px-5 py-4">Dáng mặt</th>
                  <th className="px-5 py-4">Độ dài</th>
                  <th className="px-5 py-4">Giới tính</th>
                  <th className="px-5 py-4">Giới hạn</th>
                  <th className="px-5 py-4 text-center">Hiển thị</th>
                  <th className="px-5 py-4 text-center">Đang lưu</th>
                  <th className="px-5 py-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {/* Render theo kiểu gốc lồng biến thể nếu không bật filter làm phẳng */}
                {!noAiSampleOnly && baseStyles.length > 0
                  ? baseStyles.map((item) => {
                      const variants = variantsByBase[item.id] || [];
                      const isExpanded = expandedBaseIds.has(item.id);
                      const isInactive = !item.active;

                      return (
                        <div key={item.id} className="contents">
                          {/* Row kiểu gốc */}
                          <tr
                            className={`transition-colors ${
                              isInactive ? "opacity-65 bg-gray-50/70" : "hover:bg-canvas/50"
                            }`}
                          >
                            <td className="px-5 py-3">
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="size-12 rounded-xl object-cover border border-line"
                              />
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-ink">{item.name}</span>
                                {isInactive && (
                                  <span className="inline-block rounded-md bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-700">
                                    Đang ẩn
                                  </span>
                                )}
                              </div>
                              {variants.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(item.id)}
                                  className="text-xs font-bold text-brand hover:underline mt-1 flex items-center gap-1 cursor-pointer"
                                >
                                  {isExpanded ? `▼ Thu gọn` : `▶ Xem ${variants.length} biến thể màu`}
                                </button>
                              )}
                            </td>
                            <td className="px-5 py-3 text-center">
                              {item.sampleByAi ? (
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                                  AI ✓
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                                  Ảnh cũ — nên tạo lại
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-xs">
                              <span className="font-mono text-ink font-semibold block">{item.ailabProStyle || "—"}</span>
                              {item.ailabColor && (
                                <span className="text-mauve text-[11px] block">Màu: {item.ailabColor}</span>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              {item.faceShape ? (
                                <div className="flex flex-wrap gap-1">
                                  {item.faceShape.split(",").map((s) => (
                                    <span
                                      key={s.trim()}
                                      className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand"
                                    >
                                      {s.trim()}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-mauve font-medium text-xs">{item.hairLength || "—"}</td>
                            <td className="px-5 py-3">
                              <Badge
                                variant={
                                  item.gender === "Nam" ? "new" : item.gender === "Nữ" ? "premium" : "neutral"
                                }
                              >
                                {item.gender || "Unisex"}
                              </Badge>
                            </td>
                            <td className="px-5 py-3">
                              {item.premiumOnly ? (
                                <Badge variant="premium">Trả phí</Badge>
                              ) : (
                                <Badge variant="neutral">FREE</Badge>
                              )}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleActive(item.id, item.active)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                                  item.active ? "bg-emerald-500" : "bg-gray-300"
                                }`}
                                title={item.active ? "Đang hiển thị cho khách — bấm để ẩn" : "Đang ẩn — bấm để hiển thị"}
                              >
                                <span
                                  className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                                    item.active ? "translate-x-6" : "translate-x-1"
                                  }`}
                                />
                              </button>
                            </td>
                            <td className="px-5 py-3 text-center font-bold text-ink">{item.savedCount || 0}</td>
                            <td className="px-5 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="px-2.5 py-1 text-xs rounded-xl font-bold text-brand hover:border-brand cursor-pointer whitespace-nowrap"
                                  disabled={sampleGeneratingId === item.id}
                                  onClick={() => handleGenerateSample(item)}
                                >
                                  {sampleGeneratingId === item.id ? "Đang tạo..." : "✨ Tạo mẫu AI"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="px-2.5 py-1 text-xs rounded-xl font-bold cursor-pointer whitespace-nowrap"
                                  onClick={() => handleOpenVariantModal(item)}
                                >
                                  + Màu
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="px-2.5 py-1 text-xs rounded-xl cursor-pointer"
                                  onClick={() => handleOpenEdit(item)}
                                >
                                  Sửa
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="px-2.5 py-1 text-xs rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                                  onClick={() => handleDelete(item)}
                                >
                                  Xóa
                                </Button>
                              </div>
                            </td>
                          </tr>

                          {/* Render sub-variants lồng dưới kiểu gốc nếu mở rộng */}
                          {isExpanded &&
                            variants.map((v) => (
                              <tr key={v.id} className="bg-canvas/35 border-t border-line/50">
                                <td className="px-5 py-2.5 pl-10">
                                  <img
                                    src={v.imageUrl}
                                    alt={v.name}
                                    className="size-9 rounded-lg object-cover border border-line"
                                  />
                                </td>
                                <td className="px-5 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted text-xs">↳</span>
                                    <span className="text-xs font-semibold text-ink">{v.name}</span>
                                    {!v.active && (
                                      <span className="inline-block rounded-md bg-gray-200 px-1 py-0.5 text-[9px] font-bold text-gray-700">
                                        Đang ẩn
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-5 py-2.5 text-center">
                                  {v.sampleByAi ? (
                                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                                      AI ✓
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                                      Chưa có ảnh AI
                                    </span>
                                  )}
                                </td>
                                <td className="px-5 py-2.5 text-xs text-mauve">
                                  Màu: <strong>{v.ailabColor}</strong>
                                </td>
                                <td className="px-5 py-2.5 text-xs text-muted">—</td>
                                <td className="px-5 py-2.5 text-xs text-muted">{v.hairLength || "—"}</td>
                                <td className="px-5 py-2.5 text-xs text-muted">{v.gender || "—"}</td>
                                <td className="px-5 py-2.5 text-xs text-muted">—</td>
                                <td className="px-5 py-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleActive(v.id, v.active)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                                      v.active ? "bg-emerald-500" : "bg-gray-300"
                                    }`}
                                    title={v.active ? "Ẩn" : "Hiện"}
                                  >
                                    <span
                                      className={`inline-block size-3.5 transform rounded-full bg-white transition-transform ${
                                        v.active ? "translate-x-4.5" : "translate-x-0.5"
                                      }`}
                                    />
                                  </button>
                                </td>
                                <td className="px-5 py-2.5 text-center text-xs font-bold text-ink">{v.savedCount || 0}</td>
                                <td className="px-5 py-2.5 text-center">
                                  <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="px-2 py-0.5 text-[11px] rounded-lg font-bold text-brand hover:border-brand cursor-pointer"
                                      disabled={sampleGeneratingId === v.id}
                                      onClick={() => handleGenerateSample(v)}
                                    >
                                      {sampleGeneratingId === v.id ? "Đang tạo..." : "✨ Tạo ảnh AI"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="px-2 py-0.5 text-[11px] rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                                      onClick={() => handleDelete(v)}
                                    >
                                      Xóa
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </div>
                      );
                    })
                  : displayedCatalog.map((item) => {
                      const isInactive = !item.active;
                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            isInactive ? "opacity-65 bg-gray-50/70" : "hover:bg-canvas/50"
                          }`}
                        >
                          <td className="px-5 py-3">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="size-12 rounded-xl object-cover border border-line"
                            />
                          </td>
                          <td className="px-5 py-3 font-semibold text-ink">
                            <div className="flex items-center gap-1.5">
                              <span>{item.name}</span>
                              {isInactive && (
                                <span className="inline-block rounded-md bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-700">
                                  Đang ẩn
                                </span>
                              )}
                              {item.baseStyleId && (
                                <span className="inline-block rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                                  Biến thể
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center">
                            {item.sampleByAi ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                                AI ✓
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                                Ảnh cũ — nên tạo lại
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-xs">
                            <span className="font-mono text-ink font-semibold block">{item.ailabProStyle || "—"}</span>
                            {item.ailabColor && (
                              <span className="text-mauve text-[11px] block">Màu: {item.ailabColor}</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-xs">
                            {item.faceShape || "—"}
                          </td>
                          <td className="px-5 py-3 text-mauve font-medium text-xs">{item.hairLength || "—"}</td>
                          <td className="px-5 py-3">
                            <Badge variant={item.gender === "Nam" ? "new" : item.gender === "Nữ" ? "premium" : "neutral"}>
                              {item.gender || "Unisex"}
                            </Badge>
                          </td>
                          <td className="px-5 py-3">
                            {item.premiumOnly ? <Badge variant="premium">Trả phí</Badge> : <Badge variant="neutral">FREE</Badge>}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(item.id, item.active)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                                item.active ? "bg-emerald-500" : "bg-gray-300"
                              }`}
                              title={item.active ? "Ẩn" : "Hiện"}
                            >
                              <span
                                className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                                  item.active ? "translate-x-6" : "translate-x-1"
                                }`}
                              />
                            </button>
                          </td>
                          <td className="px-5 py-3 text-center font-bold text-ink">{item.savedCount || 0}</td>
                          <td className="px-5 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="px-2.5 py-1 text-xs rounded-xl font-bold text-brand hover:border-brand cursor-pointer whitespace-nowrap"
                                disabled={sampleGeneratingId === item.id}
                                onClick={() => handleGenerateSample(item)}
                              >
                                {sampleGeneratingId === item.id ? "Đang tạo..." : "✨ Tạo mẫu AI"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="px-2.5 py-1 text-xs rounded-xl cursor-pointer"
                                onClick={() => handleOpenEdit(item)}
                              >
                                Sửa
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="px-2.5 py-1 text-xs rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                                onClick={() => handleDelete(item)}
                              >
                                Xóa
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                {/* Render các biến thể mồ côi nếu có */}
                {!noAiSampleOnly &&
                  orphanedVariants.map((item) => (
                    <tr key={item.id} className="hover:bg-canvas/50">
                      <td className="px-5 py-3">
                        <img src={item.imageUrl} alt={item.name} className="size-10 rounded-lg object-cover" />
                      </td>
                      <td className="px-5 py-3 font-semibold text-ink">
                        {item.name} <span className="text-[10px] text-muted">(Biến thể)</span>
                      </td>
                      <td className="px-5 py-3 text-center">{item.sampleByAi ? "AI ✓" : "Chưa có"}</td>
                      <td className="px-5 py-3 text-xs">{item.ailabColor}</td>
                      <td className="px-5 py-3 text-xs">{item.faceShape}</td>
                      <td className="px-5 py-3 text-xs">{item.hairLength}</td>
                      <td className="px-5 py-3 text-xs">{item.gender}</td>
                      <td className="px-5 py-3 text-xs">{item.premiumOnly ? "Trả phí" : "FREE"}</td>
                      <td className="px-5 py-3 text-center">{item.active ? "Hiện" : "Ẩn"}</td>
                      <td className="px-5 py-3 text-center">{item.savedCount || 0}</td>
                      <td className="px-5 py-3 text-center">
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(item)}>Xóa</Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs font-semibold text-muted">
            Trang {page + 1} / {totalPages} (Tổng: {totalElements} kết quả)
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-2 rounded-xl text-xs"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Trước
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-2 rounded-xl text-xs"
              disabled={page >= totalPages - 1 || loading}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Sau
            </Button>
          </div>
        </div>
      )}

      {/* Modal Thêm/Sửa kiểu tóc */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
              <h3 className="font-display text-xl font-bold text-ink">
                {editingItem ? "Chỉnh sửa kiểu tóc" : "Thêm kiểu tóc mới"}
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-muted hover:text-ink text-xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tên kiểu tóc */}
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-mauve">Tên kiểu tóc *</span>
                <input
                  type="text"
                  placeholder="Ví dụ: Undercut Hiện Đại"
                  required
                  className="w-full rounded-2xl border-2 border-line bg-white px-4 py-2.5 text-base text-ink outline-none transition focus:border-brand"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </label>

              {/* Tag */}
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-mauve">Nhãn tag (nếu có)</span>
                <input
                  type="text"
                  placeholder="Ví dụ: Mới, Xu Hướng, Thịnh Hành"
                  className="w-full rounded-2xl border-2 border-line bg-white px-4 py-2.5 text-base text-ink outline-none transition focus:border-brand"
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                />
              </label>

              {/* Mã kiểu AI (AILab Pro) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-mauve">Mã kiểu AI (AILab Pro)</span>
                  <select
                    value={formData.ailabProStyle || ""}
                    onChange={(e) => setFormData({ ...formData, ailabProStyle: e.target.value })}
                    className="w-full rounded-2xl border-2 border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand"
                  >
                    <option value="">-- Chưa gán mã AI --</option>
                    <optgroup label="Kiểu Nam">
                      {aiStyles
                        .filter((s) => s.group === "Nam")
                        .map((s) => {
                          const isUsedByOther = s.usedBy && s.usedBy !== editingItem?.name;
                          return (
                            <option key={s.code} value={s.code} disabled={isUsedByOther}>
                              {s.code} {isUsedByOther ? `(đang dùng bởi: ${s.usedBy})` : ""}
                            </option>
                          );
                        })}
                    </optgroup>
                    <optgroup label="Kiểu Nữ">
                      {aiStyles
                        .filter((s) => s.group === "Nữ")
                        .map((s) => {
                          const isUsedByOther = s.usedBy && s.usedBy !== editingItem?.name;
                          return (
                            <option key={s.code} value={s.code} disabled={isUsedByOther}>
                              {s.code} {isUsedByOther ? `(đang dùng bởi: ${s.usedBy})` : ""}
                            </option>
                          );
                        })}
                    </optgroup>
                  </select>
                </label>

                {/* Màu tóc AI */}
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-mauve">Màu tóc AI</span>
                  <select
                    value={formData.ailabColor || ""}
                    onChange={(e) => setFormData({ ...formData, ailabColor: e.target.value })}
                    className="w-full rounded-2xl border-2 border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand"
                  >
                    <option value="">Màu gốc (không đổi màu)</option>
                    {HAIR_COLORS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label} ({c.value})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Upload ảnh & Crop */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-mauve">Hình ảnh kiểu tóc *</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageChange}
                  className="text-xs file:mr-3 file:rounded-xl file:border-0 file:bg-brand/10 file:px-3 file:py-1.5 file:font-semibold file:text-brand hover:file:bg-brand/20 cursor-pointer"
                />

                {imagePreview && (
                  <div className="mt-2 space-y-3">
                    <div className="relative h-64 w-full rounded-2xl overflow-hidden border-2 border-line bg-slate-900">
                      <Cropper
                        image={imagePreview}
                        crop={crop}
                        zoom={zoom}
                        aspect={3 / 4}
                        onCropChange={(c) => {
                          setCrop(c);
                          setCropInteracted(true);
                        }}
                        onZoomChange={(z) => {
                          setZoom(z);
                          setCropInteracted(true);
                        }}
                        onCropComplete={onCropComplete}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-muted">Thu phóng:</span>
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.1}
                        value={zoom}
                        onChange={(e) => {
                          setZoom(Number(e.target.value));
                          setCropInteracted(true);
                        }}
                        className="flex-1 cursor-pointer accent-brand"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Dáng mặt phù hợp */}
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-mauve">Dáng mặt phù hợp</span>
                <div className="flex flex-wrap gap-2">
                  {FACE_SHAPES.map((shape) => {
                    const isChecked = formData.faceShapes.includes(shape);
                    return (
                      <button
                        type="button"
                        key={shape}
                        onClick={() => {
                          const next = isChecked
                            ? formData.faceShapes.filter((s) => s !== shape)
                            : [...formData.faceShapes, shape];
                          setFormData({ ...formData, faceShapes: next.length > 0 ? next : ["Oval"] });
                        }}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                          isChecked
                            ? "bg-brand text-white shadow-xs"
                            : "bg-canvas border border-line text-ink/70 hover:border-brand/40"
                        }`}
                      >
                        {shape}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Độ dài & Giới tính */}
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-mauve">Độ dài</span>
                  <select
                    value={formData.hairLength}
                    onChange={(e) => setFormData({ ...formData, hairLength: e.target.value })}
                    className="w-full rounded-2xl border-2 border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand"
                  >
                    {HAIR_LENGTHS.map((len) => (
                      <option key={len} value={len}>
                        {len}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-mauve">Giới tính</span>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full rounded-2xl border-2 border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand"
                  >
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Mô tả */}
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-mauve">Mô tả kiểu tóc</span>
                <textarea
                  rows="3"
                  placeholder="Mô tả phong cách, điểm nhấn..."
                  className="w-full rounded-2xl border-2 border-line bg-white p-3 text-sm text-ink outline-none transition focus:border-brand"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </label>

              {/* Premium Only */}
              <label className="flex items-center gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  className="size-4 rounded border-2 border-line text-brand focus:ring-brand"
                  checked={formData.premiumOnly}
                  onChange={(e) => setFormData({ ...formData, premiumOnly: e.target.checked })}
                />
                <span className="text-sm font-semibold text-ink">Chỉ dành cho tài khoản Trả phí (Gói Tuần / Tháng)</span>
              </label>

              <div className="flex justify-end gap-3 pt-3 border-t border-line">
                <Button type="button" variant="outline" className="rounded-xl px-5" onClick={() => setIsOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" variant="brand" className="rounded-xl px-5 font-bold">
                  Lưu thông tin
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal So sánh ảnh mẫu AI đơn */}
      {sampleModalData && (
        <SampleComparisonModal
          open={!!sampleModalData}
          item={sampleModalData.item}
          candidateUrl={sampleModalData.candidateUrl}
          loading={sampleModalLoading}
          onApply={handleApplySample}
          onRegenerate={() => handleGenerateSample(sampleModalData.item)}
          onClose={() => setSampleModalData(null)}
        />
      )}

      {/* Modal Tạo ảnh mẫu hàng loạt */}
      <BatchSampleModal
        open={batchModalOpen}
        stylesWithoutAi={stylesWithoutAi}
        models={models}
        onFinish={() => {
          setBatchModalOpen(false);
          fetchCatalog();
        }}
        onClose={() => setBatchModalOpen(false)}
      />

      {/* Modal Thêm biến thể màu */}
      {variantModalBaseStyle && (
        <VariantModal
          open={!!variantModalBaseStyle}
          baseStyle={variantModalBaseStyle}
          existingVariants={variantsByBase[variantModalBaseStyle.id] || []}
          onSubmit={handleCreateVariants}
          onClose={() => setVariantModalBaseStyle(null)}
        />
      )}

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Xóa kiểu tóc"
        message={`Bạn có chắc chắn muốn xóa kiểu tóc "${confirmDelete?.name}" khỏi kho không?`}
        confirmText="Xóa kiểu tóc"
        danger
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={!!confirmHidePrompt}
        title="Không thể xoá kiểu tóc"
        message={`Có ${confirmHidePrompt?.savedCount} người đang lưu kiểu "${confirmHidePrompt?.name}". Bạn có muốn ẩn kiểu tóc này thay vì xoá để tránh mất dữ liệu của người dùng?`}
        confirmText="Ẩn kiểu tóc"
        loading={hideLoading}
        onConfirm={handleConfirmHide}
        onCancel={() => setConfirmHidePrompt(null)}
      />
    </div>
  );
}
