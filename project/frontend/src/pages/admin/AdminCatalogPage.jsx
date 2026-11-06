import { useEffect, useState, useCallback, useMemo, Fragment } from "react";
import {
  Flash,
  TickCircle,
  MagicStar,
  ArrowRight3,
  Add,
  ArrowDown2,
  Edit2,
  Trash,
  SearchNormal1,
  Profile,
  CloseCircle,
} from "iconsax-reactjs";
import Cropper from "react-easy-crop";
import api from "../../lib/api";
import { Card, Badge, Button } from "../../components/ui";
import { getCroppedImg } from "../../lib/cropImage.js";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import { HAIR_COLORS, COLOR_LABELS, COLOR_BY_VALUE, swatchBg } from "../../lib/hairColors";
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

  // Thu gọn / mở rộng bảng công cụ AI (đỡ chiếm chỗ màn hình)
  const [showAiTools, setShowAiTools] = useState(false);

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

  // Submit form - Giữ nguyên 100% logic Cropper và CORS theo yêu cầu
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
      alert(`Vui lòng tải ảnh người mẫu ${item.gender === "Nam" ? "Nam" : "Nữ"} ở khung cài đặt AI trước khi tạo ảnh mẫu.`);
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

  // Danh sách kiểu tóc chưa có ảnh AI
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
          <p className="text-sm text-mauve">Quản lý danh mục mẫu tóc gợi ý, tạo ảnh mẫu AI và biến thể màu sắc</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            className="rounded-2xl px-4 py-2 text-xs font-bold border-line hover:border-brand/40 shadow-2xs"
            onClick={() => setBatchModalOpen(true)}
            disabled={stylesWithoutAi.length === 0}
          >
            <Flash size={15} variant="Bold" className="mr-1.5 inline -mt-0.5 text-amber-500" />
            Tạo hàng loạt ảnh AI ({stylesWithoutAi.length})
          </Button>
          <Button
            size="sm"
            variant="brand"
            className="rounded-2xl px-4 py-2 text-xs font-bold shadow-xs hover:shadow-md transition-all"
            onClick={handleOpenAdd}
          >
            <Add size={16} className="mr-1 inline -mt-0.5" /> Thêm kiểu tóc mới
          </Button>
        </div>
      </div>

      {/* AI Tools Collapsible Banner (Giải phóng không gian màn hình) */}
      <div className="rounded-3xl border border-line bg-gradient-to-r from-canvas via-white to-brand/5 p-4 shadow-2xs transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
              <Profile size={22} variant="Bulk" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-ink">Người mẫu AI chuẩn:</span>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${
                  models.male ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}>
                  Nam: {models.male ? "Sẵn sàng ✓" : "Chưa tải ✗"}
                </span>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${
                  models.female ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}>
                  Nữ: {models.female ? "Sẵn sàng ✓" : "Chưa tải ✗"}
                </span>
              </div>
              <p className="text-[11px] text-mauve mt-0.5">Ảnh làm khuôn mặt gốc để AILab tạo ảnh mẫu catalog chân thực, đồng bộ</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAiTools(!showAiTools)}
            className="inline-flex items-center justify-center gap-1.5 self-start sm:self-center px-3.5 py-1.5 rounded-xl border border-line bg-white hover:border-brand/40 text-xs font-bold text-ink cursor-pointer transition shadow-2xs whitespace-nowrap"
          >
            {showAiTools ? "Thu gọn công cụ" : "Cài đặt ảnh mẫu & Lộ trình"}
            <ArrowDown2 size={13} className={`transition-transform duration-200 ${showAiTools ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Nội dung khi mở rộng */}
        {showAiTools && (
          <div className="mt-4 pt-4 border-t border-line space-y-4">
            <RoadmapBanner />
            <ModelPhotosPanel models={models} onModelChange={handleModelChange} />
          </div>
        )}
      </div>

      {/* Bộ lọc */}
      <Card className="border border-line bg-white p-4 rounded-3xl shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <SearchNormal1 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="search"
              placeholder="Tìm theo tên kiểu tóc, mã AI hoặc tag..."
              value={filters.keyword}
              onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
              className="w-full rounded-2xl border-2 border-line bg-canvas/30 pl-10 pr-4 py-2 text-xs font-medium text-ink outline-none transition placeholder:text-muted focus:border-brand focus:bg-white"
            />
          </div>

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
              className="rounded-2xl border-2 border-line bg-white px-3 py-2 text-xs font-semibold text-ink outline-none transition hover:border-line focus:border-brand cursor-pointer"
            >
              <option value="">{label}: Tất cả</option>
              {options.map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          ))}

          {/* Quick filter: Chưa có ảnh mẫu AI */}
          <label className="flex items-center gap-2 px-3 py-2 rounded-2xl border-2 border-line bg-white cursor-pointer select-none hover:border-amber-300 transition">
            <input
              type="checkbox"
              className="size-4 rounded text-brand focus:ring-brand cursor-pointer"
              checked={noAiSampleOnly}
              onChange={(e) => setNoAiSampleOnly(e.target.checked)}
            />
            <span className="text-xs font-bold text-amber-700">Chưa có ảnh AI</span>
          </label>

          {hasFilter && (
            <Button size="sm" variant="ghost" className="rounded-xl text-xs text-mauve hover:text-ink" onClick={clearFilters}>
              Xóa bộ lọc
            </Button>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between text-xs font-semibold text-muted">
          <span>{hasFilter ? `Tìm thấy ${displayedCatalog.length} kiểu tóc khớp bộ lọc` : `Tổng cộng ${totalElements} kiểu tóc trong kho`}</span>
          {noAiSampleOnly && <span className="text-amber-700 font-bold">Chế độ lọc: Chỉ hiển thị kiểu chưa phủ ảnh AI</span>}
        </div>
      </Card>

      {/* Table Card */}
      <Card className="overflow-hidden border border-line bg-white shadow-xs rounded-3xl" padded={false}>
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <div className="size-9 animate-spin rounded-full border-3 border-brand border-t-transparent" />
            <p className="text-xs font-medium text-mauve">Đang tải danh sách kiểu tóc...</p>
          </div>
        ) : displayedCatalog.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-muted gap-2">
            <p className="text-sm font-semibold">{hasFilter ? "Không có kiểu tóc nào khớp bộ lọc" : "Kho kiểu tóc hiện tại trống"}</p>
            {hasFilter && (
              <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={clearFilters}>
                Bỏ bộ lọc tìm kiếm
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[1200px]">
              <thead>
                <tr className="border-b border-line bg-canvas/70 text-[11px] font-bold uppercase tracking-wider text-muted">
                  <th className="px-4 py-3.5 w-16">Hình ảnh</th>
                  <th className="px-4 py-3.5 min-w-[220px]">Tên kiểu tóc</th>
                  <th className="px-4 py-3.5 text-center min-w-[120px]">Ảnh mẫu</th>
                  <th className="px-4 py-3.5 min-w-[140px]">Mã AI & Màu</th>
                  <th className="px-4 py-3.5 min-w-[170px]">Dáng mặt phù hợp</th>
                  <th className="px-4 py-3.5 min-w-[80px]">Độ dài</th>
                  <th className="px-4 py-3.5 min-w-[90px]">Giới tính</th>
                  <th className="px-4 py-3.5 text-center min-w-[90px]">Gói</th>
                  <th className="px-4 py-3.5 text-center min-w-[90px]">Hiển thị</th>
                  <th className="px-4 py-3.5 text-center min-w-[80px]">Đang lưu</th>
                  <th className="px-4 py-3.5 text-right min-w-[240px]">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {/* 1. Render theo kiểu gốc lồng biến thể màu */}
                {!noAiSampleOnly && baseStyles.length > 0
                  ? baseStyles.map((item) => {
                      const variants = variantsByBase[item.id] || [];
                      const isExpanded = expandedBaseIds.has(item.id);
                      const isInactive = !item.active;

                      return (
                        <Fragment key={item.id}>
                          {/* Hàng kiểu tóc gốc */}
                          <tr
                            className={`transition-colors ${
                              isInactive ? "opacity-65 bg-gray-50/70" : "hover:bg-canvas/50"
                            }`}
                          >
                            <td className="px-4 py-3">
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="size-12 rounded-xl object-cover border border-line shadow-2xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-ink text-sm">{item.name}</span>
                                {isInactive && (
                                  <span className="inline-block rounded-md bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-700">
                                    Đang ẩn
                                  </span>
                                )}
                                {item.tag && (
                                  <span className="inline-block rounded-md bg-canvas px-1.5 py-0.5 text-[10px] font-semibold text-mauve border border-line">
                                    {item.tag}
                                  </span>
                                )}
                              </div>
                              {variants.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(item.id)}
                                  className="text-xs font-bold text-brand hover:underline mt-1.5 flex items-center gap-1 cursor-pointer transition select-none"
                                >
                                  <ArrowDown2 size={12} className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                                  {isExpanded ? "Thu gọn biến thể" : `Xem ${variants.length} biến thể màu`}
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {item.sampleByAi ? (
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 shadow-2xs">
                                  <TickCircle size={13} variant="Bold" className="mr-1 shrink-0" /> AI
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                                  Ảnh mẫu cũ
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <span className="font-mono text-ink font-semibold block">{item.ailabProStyle || "—"}</span>
                              {item.ailabColor ? (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span
                                    className="size-2.5 rounded-full border border-black/10 shrink-0"
                                    style={{ background: swatchBg(COLOR_BY_VALUE[item.ailabColor]?.tones) }}
                                  />
                                  <span className="text-[11px] text-mauve font-medium">
                                    {COLOR_LABELS[item.ailabColor] || item.ailabColor}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-muted block">Màu gốc</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
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
                            <td className="px-4 py-3 text-mauve font-medium text-xs">{item.hairLength || "—"}</td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={
                                  item.gender === "Nam" ? "new" : item.gender === "Nữ" ? "premium" : "neutral"
                                }
                              >
                                {item.gender || "Unisex"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {item.premiumOnly ? (
                                <Badge variant="premium">Trả phí</Badge>
                              ) : (
                                <Badge variant="neutral">FREE</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleActive(item.id, item.active)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-brand/30 ${
                                  item.active ? "bg-emerald-500" : "bg-gray-300"
                                }`}
                                title={item.active ? "Đang hiển thị cho khách — Bấm để ẩn" : "Đang ẩn — Bấm để hiển thị"}
                              >
                                <span
                                  className={`inline-block size-4 transform rounded-full bg-white shadow-xs transition-transform ${
                                    item.active ? "translate-x-6" : "translate-x-1"
                                  }`}
                                />
                              </button>
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-ink text-xs">{item.savedCount || 0}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="px-2.5 py-1 text-xs rounded-xl font-bold text-brand hover:border-brand cursor-pointer whitespace-nowrap"
                                  disabled={sampleGeneratingId === item.id}
                                  onClick={() => handleGenerateSample(item)}
                                >
                                  {sampleGeneratingId === item.id ? (
                                    "Đang tạo..."
                                  ) : (
                                    <>
                                      <MagicStar size={13} variant="Bold" className="mr-1 inline -mt-0.5" />
                                      Tạo mẫu AI
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="px-2.5 py-1 text-xs rounded-xl font-bold cursor-pointer whitespace-nowrap hover:border-ink/30"
                                  onClick={() => handleOpenVariantModal(item)}
                                >
                                  + Màu
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="px-2.5 py-1 text-xs rounded-xl cursor-pointer hover:border-ink/30"
                                  onClick={() => handleOpenEdit(item)}
                                >
                                  <Edit2 size={12} className="mr-1 inline -mt-0.5" />
                                  Sửa
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="px-2 py-1 text-xs rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                                  onClick={() => handleDelete(item)}
                                >
                                  <Trash size={12} className="mr-1 inline -mt-0.5" />
                                  Xóa
                                </Button>
                              </div>
                            </td>
                          </tr>

                          {/* Danh sách biến thể màu lồng dưới kiểu gốc khi mở rộng */}
                          {isExpanded &&
                            variants.map((v) => (
                              <tr key={v.id} className="bg-canvas/35 hover:bg-canvas/60 transition-colors border-t border-line/50">
                                <td className="px-4 py-2.5 pl-8">
                                  <img
                                    src={v.imageUrl}
                                    alt={v.name}
                                    className="size-9 rounded-lg object-cover border border-line shadow-2xs"
                                  />
                                </td>
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <ArrowRight3 size={13} className="shrink-0 text-muted" />
                                    <span className="text-xs font-semibold text-ink">{v.name}</span>
                                    {!v.active && (
                                      <span className="inline-block rounded-md bg-gray-200 px-1 py-0.5 text-[9px] font-bold text-gray-700">
                                        Đang ẩn
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  {v.sampleByAi ? (
                                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                                      <TickCircle size={12} variant="Bold" className="mr-1" />AI
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                                      Chưa có ảnh AI
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="size-2.5 rounded-full border border-black/10 shrink-0"
                                      style={{ background: swatchBg(COLOR_BY_VALUE[v.ailabColor]?.tones) }}
                                    />
                                    <span className="text-ink font-medium">
                                      {COLOR_LABELS[v.ailabColor] || v.ailabColor}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-xs text-muted">—</td>
                                <td className="px-4 py-2.5 text-xs text-mauve">{v.hairLength || "—"}</td>
                                <td className="px-4 py-2.5 text-xs">
                                  <Badge variant={v.gender === "Nam" ? "new" : v.gender === "Nữ" ? "premium" : "neutral"}>
                                    {v.gender || "Unisex"}
                                  </Badge>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  {v.premiumOnly ? <Badge variant="premium">Trả phí</Badge> : <Badge variant="neutral">FREE</Badge>}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleActive(v.id, v.active)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                                      v.active ? "bg-emerald-500" : "bg-gray-300"
                                    }`}
                                    title={v.active ? "Đang hiển thị — Bấm để ẩn" : "Đang ẩn — Bấm để hiển thị"}
                                  >
                                    <span
                                      className={`inline-block size-3.5 transform rounded-full bg-white transition-transform ${
                                        v.active ? "translate-x-4.5" : "translate-x-0.5"
                                      }`}
                                    />
                                  </button>
                                </td>
                                <td className="px-4 py-2.5 text-center text-xs font-bold text-ink">{v.savedCount || 0}</td>
                                <td className="px-4 py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="px-2 py-0.5 text-[11px] rounded-lg font-bold text-brand hover:border-brand cursor-pointer whitespace-nowrap"
                                      disabled={sampleGeneratingId === v.id}
                                      onClick={() => handleGenerateSample(v)}
                                    >
                                      {sampleGeneratingId === v.id ? "Đang tạo..." : <><MagicStar size={12} variant="Bold" className="mr-1 inline -mt-0.5" />Tạo ảnh AI</>}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="px-2 py-0.5 text-[11px] rounded-lg cursor-pointer hover:border-ink/30"
                                      onClick={() => handleOpenEdit(v)}
                                    >
                                      <Edit2 size={11} className="mr-1 inline -mt-0.5" />Sửa
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="px-2 py-0.5 text-[11px] rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                                      onClick={() => handleDelete(v)}
                                    >
                                      <Trash size={11} className="mr-1 inline -mt-0.5" />Xóa
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </Fragment>
                      );
                    })
                  : /* 2. Render danh sách phẳng (khi bật filter Chưa có ảnh AI) */
                    displayedCatalog.map((item) => {
                      const isInactive = !item.active;
                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            isInactive ? "opacity-65 bg-gray-50/70" : "hover:bg-canvas/50"
                          }`}
                        >
                          <td className="px-4 py-3">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="size-12 rounded-xl object-cover border border-line shadow-2xs"
                            />
                          </td>
                          <td className="px-4 py-3 font-semibold text-ink">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-bold">{item.name}</span>
                              {isInactive && (
                                <span className="inline-block rounded-md bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-700">
                                  Đang ẩn
                                </span>
                              )}
                              {item.baseStyleId && (
                                <span className="inline-block rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                                  Biến thể
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.sampleByAi ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                                <TickCircle size={13} variant="Bold" className="mr-1" />AI
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                                Ảnh cũ
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <span className="font-mono text-ink font-semibold block">{item.ailabProStyle || "—"}</span>
                            {item.ailabColor ? (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className="size-2.5 rounded-full border border-black/10 shrink-0"
                                  style={{ background: swatchBg(COLOR_BY_VALUE[item.ailabColor]?.tones) }}
                                />
                                <span className="text-[11px] text-mauve font-medium">
                                  {COLOR_LABELS[item.ailabColor] || item.ailabColor}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted block">Màu gốc</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
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
                          <td className="px-4 py-3 text-mauve font-medium text-xs">{item.hairLength || "—"}</td>
                          <td className="px-4 py-3">
                            <Badge variant={item.gender === "Nam" ? "new" : item.gender === "Nữ" ? "premium" : "neutral"}>
                              {item.gender || "Unisex"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.premiumOnly ? <Badge variant="premium">Trả phí</Badge> : <Badge variant="neutral">FREE</Badge>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(item.id, item.active)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                                item.active ? "bg-emerald-500" : "bg-gray-300"
                              }`}
                              title={item.active ? "Đang hiển thị — Bấm để ẩn" : "Đang ẩn — Bấm để hiển thị"}
                            >
                              <span
                                className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                                  item.active ? "translate-x-6" : "translate-x-1"
                                }`}
                              />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-ink text-xs">{item.savedCount || 0}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="px-2.5 py-1 text-xs rounded-xl font-bold text-brand hover:border-brand cursor-pointer whitespace-nowrap"
                                disabled={sampleGeneratingId === item.id}
                                onClick={() => handleGenerateSample(item)}
                              >
                                {sampleGeneratingId === item.id ? "Đang tạo..." : <><MagicStar size={13} variant="Bold" className="mr-1 inline -mt-0.5" />Tạo mẫu AI</>}
                              </Button>
                              {!item.baseStyleId && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="px-2.5 py-1 text-xs rounded-xl font-bold cursor-pointer whitespace-nowrap hover:border-ink/30"
                                  onClick={() => handleOpenVariantModal(item)}
                                >
                                  + Màu
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="px-2.5 py-1 text-xs rounded-xl cursor-pointer hover:border-ink/30"
                                onClick={() => handleOpenEdit(item)}
                              >
                                <Edit2 size={12} className="mr-1 inline -mt-0.5" />Sửa
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="px-2 py-1 text-xs rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                                onClick={() => handleDelete(item)}
                              >
                                <Trash size={12} className="mr-1 inline -mt-0.5" />Xóa
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                {/* 3. Render các biến thể mồ côi (có baseStyleId nhưng base nằm ở trang khác) */}
                {!noAiSampleOnly &&
                  orphanedVariants.map((item) => (
                    <tr key={item.id} className="hover:bg-canvas/50 transition-colors bg-amber-50/20">
                      <td className="px-4 py-3">
                        <img src={item.imageUrl} alt={item.name} className="size-11 rounded-lg object-cover border border-line" />
                      </td>
                      <td className="px-4 py-3 font-semibold text-ink">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{item.name}</span>
                          <span className="inline-block rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                            Biến thể
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.sampleByAi ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                            <TickCircle size={12} variant="Bold" className="mr-1" />AI
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                            Chưa có AI
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="size-2.5 rounded-full border border-black/10 shrink-0"
                            style={{ background: swatchBg(COLOR_BY_VALUE[item.ailabColor]?.tones) }}
                          />
                          <span className="text-ink font-medium">
                            {COLOR_LABELS[item.ailabColor] || item.ailabColor}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 text-xs text-mauve">{item.hairLength || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={item.gender === "Nam" ? "new" : item.gender === "Nữ" ? "premium" : "neutral"}>
                          {item.gender || "Unisex"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.premiumOnly ? <Badge variant="premium">Trả phí</Badge> : <Badge variant="neutral">FREE</Badge>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item.id, item.active)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                            item.active ? "bg-emerald-500" : "bg-gray-300"
                          }`}
                          title={item.active ? "Đang hiển thị — Bấm để ẩn" : "Đang ẩn — Bấm để hiển thị"}
                        >
                          <span
                            className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                              item.active ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-ink text-xs">{item.savedCount || 0}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="px-2 py-1 text-xs rounded-xl font-bold text-brand hover:border-brand cursor-pointer whitespace-nowrap"
                            disabled={sampleGeneratingId === item.id}
                            onClick={() => handleGenerateSample(item)}
                          >
                            {sampleGeneratingId === item.id ? "Đang tạo..." : <><MagicStar size={12} variant="Bold" className="mr-1 inline -mt-0.5" />Tạo ảnh AI</>}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="px-2 py-1 text-xs rounded-xl cursor-pointer hover:border-ink/30"
                            onClick={() => handleOpenEdit(item)}
                          >
                            <Edit2 size={12} className="mr-1 inline -mt-0.5" />Sửa
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="px-2 py-1 text-xs rounded-xl text-rose-600 hover:bg-rose-50"
                            onClick={() => handleDelete(item)}
                          >
                            <Trash size={12} className="mr-1 inline -mt-0.5" />Xóa
                          </Button>
                        </div>
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
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs font-semibold text-muted">
            Trang {page + 1} / {totalPages} (Tổng cộng: {totalElements} kiểu tóc)
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-2 rounded-2xl text-xs font-semibold border-line hover:border-brand/40"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Trước
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-2 rounded-2xl text-xs font-semibold border-line hover:border-brand/40"
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
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4 shrink-0">
              <div>
                <h3 className="font-display text-xl font-bold text-ink">
                  {editingItem ? "Chỉnh sửa kiểu tóc" : "Thêm kiểu tóc mới"}
                </h3>
                <p className="text-xs text-mauve">
                  {editingItem ? `Cập nhật thông tin cho "${editingItem.name}"` : "Khai báo kiểu tóc mới vào danh mục catalog"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-muted hover:text-ink text-xl font-bold p-1 rounded-xl hover:bg-canvas transition cursor-pointer"
              >
                <CloseCircle size={24} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Tên & Tag */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-mauve uppercase tracking-wider">Tên kiểu tóc *</span>
                  <input
                    type="text"
                    placeholder="Ví dụ: Undercut Hiện Đại"
                    required
                    className="w-full rounded-2xl border-2 border-line bg-white px-3.5 py-2 text-sm text-ink outline-none transition focus:border-brand"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-mauve uppercase tracking-wider">Nhãn tag (nếu có)</span>
                  <input
                    type="text"
                    placeholder="Ví dụ: Xu Hướng, Mới, Thịnh Hành"
                    className="w-full rounded-2xl border-2 border-line bg-white px-3.5 py-2 text-sm text-ink outline-none transition focus:border-brand"
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                  />
                </label>
              </div>

              {/* Mã kiểu AI & Màu tóc AI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-mauve uppercase tracking-wider">Mã kiểu AI (AILab Pro)</span>
                  <select
                    value={formData.ailabProStyle || ""}
                    onChange={(e) => setFormData({ ...formData, ailabProStyle: e.target.value })}
                    className="w-full rounded-2xl border-2 border-line bg-white px-3 py-2 text-xs font-semibold text-ink outline-none transition focus:border-brand cursor-pointer"
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

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-mauve uppercase tracking-wider">Màu tóc AI</span>
                  <select
                    value={formData.ailabColor || ""}
                    onChange={(e) => setFormData({ ...formData, ailabColor: e.target.value })}
                    className="w-full rounded-2xl border-2 border-line bg-white px-3 py-2 text-xs font-semibold text-ink outline-none transition focus:border-brand cursor-pointer"
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

              {/* Upload ảnh & Cropper (Giữ nguyên logic) */}
              <div className="flex flex-col gap-2 rounded-2xl border border-line bg-canvas/30 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-mauve uppercase tracking-wider">Hình ảnh kiểu tóc *</span>
                  <span className="text-[11px] text-muted font-medium">Tỷ lệ chuẩn 3:4</span>
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageChange}
                  className="text-xs file:mr-3 file:rounded-xl file:border-0 file:bg-brand/10 file:px-3 file:py-1.5 file:font-semibold file:text-brand hover:file:bg-brand/20 cursor-pointer"
                />

                {imagePreview && (
                  <div className="mt-2 space-y-3">
                    <div className="relative h-64 w-full rounded-2xl overflow-hidden border-2 border-line bg-slate-900 shadow-inner">
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
                    <div className="flex items-center gap-3 px-1">
                      <span className="text-xs font-semibold text-muted shrink-0">Thu phóng:</span>
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
                <span className="text-xs font-bold text-mauve uppercase tracking-wider">Dáng mặt phù hợp</span>
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
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
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
                  <span className="text-xs font-bold text-mauve uppercase tracking-wider">Độ dài</span>
                  <select
                    value={formData.hairLength}
                    onChange={(e) => setFormData({ ...formData, hairLength: e.target.value })}
                    className="w-full rounded-2xl border-2 border-line bg-white px-3 py-2 text-xs font-semibold text-ink outline-none transition focus:border-brand cursor-pointer"
                  >
                    {HAIR_LENGTHS.map((len) => (
                      <option key={len} value={len}>
                        {len}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-mauve uppercase tracking-wider">Giới tính</span>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full rounded-2xl border-2 border-line bg-white px-3 py-2 text-xs font-semibold text-ink outline-none transition focus:border-brand cursor-pointer"
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
                <span className="text-xs font-bold text-mauve uppercase tracking-wider">Mô tả kiểu tóc</span>
                <textarea
                  rows="3"
                  placeholder="Mô tả phong cách, điểm nhấn, cách chăm sóc..."
                  className="w-full rounded-2xl border-2 border-line bg-white p-3 text-xs text-ink outline-none transition focus:border-brand resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </label>

              {/* Premium Only */}
              <label className="flex items-center gap-2.5 cursor-pointer py-1.5 px-3 rounded-xl bg-canvas border border-line">
                <input
                  type="checkbox"
                  className="size-4 rounded text-brand focus:ring-brand cursor-pointer"
                  checked={formData.premiumOnly}
                  onChange={(e) => setFormData({ ...formData, premiumOnly: e.target.checked })}
                />
                <span className="text-xs font-bold text-ink">Chỉ dành cho tài khoản Trả phí (Gói Tuần / Tháng)</span>
              </label>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-3 border-t border-line shrink-0">
                <Button type="button" variant="outline" className="rounded-2xl px-5 text-xs font-semibold" onClick={() => setIsOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" variant="brand" className="rounded-2xl px-6 text-xs font-bold shadow-xs">
                  {editingItem ? "Lưu thay đổi" : "Tạo kiểu tóc"}
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
