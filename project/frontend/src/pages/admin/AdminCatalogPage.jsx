import { useEffect, useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import api from "../../lib/api";
import { Card, Badge, Button, Input } from "../../components/ui";
import { getCroppedImg } from "../../lib/cropImage.js";

const FACE_SHAPES = ["Oval", "Round", "Square", "Heart", "Oblong", "Diamond"];
const HAIR_LENGTHS = ["Ngắn", "Vừa", "Dài"];
const GENDERS = ["Nam", "Nữ", "Unisex"];

export default function AdminCatalogPage() {
  const [catalog, setCatalog] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Trạng thái modal form
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // States cho tính năng Crop ảnh Option A
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
  });

  const fetchCatalog = useCallback(() => {
    setLoading(true);
    api
      .get("/admin/catalog", { params: { page, size: 10 } })
      .then((res) => {
        setCatalog(res.data.content || []);
        setTotalPages(res.data.totalPages || 1);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [page]);

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
    });
    setIsOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setImageFile(null);
    setImagePreview(item.imageUrl); // Hiện ảnh cũ
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropInteracted(false);
    setFormData({
      name: item.name,
      tag: item.tag || "",
      faceShapes: item.faceShape ? item.faceShape.split(",").map(s => s.trim()) : ["Oval"],
      hairLength: item.hairLength || "Vừa",
      gender: item.gender || "Unisex",
      description: item.description || "",
      premiumOnly: item.premiumOnly,
    });
    setIsOpen(true);
  };

  // Xử lý chọn file ảnh
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropInteracted(true); // Vì là file mới tải lên, chắc chắn cần crop
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Submit form — gửi multipart/form-data
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
      fd.append("name", formData.name);
      fd.append("tag", formData.tag);
      fd.append("faceShape", formData.faceShapes.join(","));
      fd.append("hairLength", formData.hairLength);
      fd.append("gender", formData.gender);
      fd.append("description", formData.description);
      fd.append("premiumOnly", formData.premiumOnly);

      // Nếu có croppedAreaPixels (nghĩa là user có thay đổi khung hình) và thực sự có tương tác chỉnh sửa
      if (croppedAreaPixels && cropInteracted) {
        // Trường hợp 1: Có chọn file ảnh mới -> crop bình thường
        // Trường hợp 2: Không chọn file mới nhưng có ảnh cũ và thay đổi zoom/crop -> tải ảnh cũ về và crop
        if (imageFile || editingItem) {
          try {
            // Tải ảnh về dưới dạng blob trước để chắc chắn không bị lỗi CORS "dirty canvas" khi vẽ
            let activeUrl = imagePreview;
            if (!imageFile && editingItem) {
              // Thêm query parameter ngẫu nhiên để tránh trình duyệt lấy cache không có header CORS
              const corsUrl = `${editingItem.imageUrl}${editingItem.imageUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
              const response = await fetch(corsUrl);
              const blob = await response.blob();
              activeUrl = URL.createObjectURL(blob);
            }
            const croppedImageBlob = await getCroppedImg(activeUrl, croppedAreaPixels);
            fd.append("image", croppedImageBlob, "cropped-hair.jpg");
          } catch (cropErr) {
            console.error("Lỗi khi crop ảnh cũ:", cropErr);
            alert("Lưu ý: Không thể crop trực tiếp ảnh cũ từ xa do chính sách CORS của trình duyệt. Vui lòng nhấn vào nút 'Nhấn để chọn ảnh...' và tải lại ảnh lên để thực hiện căn chỉnh.");
            return;
          }
        }
      }

      // Không set Content-Type thủ công — Axios tự detect FormData và thêm boundary
      const config = {}; // Content-Type tự xử lý bởi api.js interceptor
      const apiCall = editingItem
        ? api.put(`/admin/catalog/${editingItem.id}`, fd, config)
        : api.post("/admin/catalog", fd, config);

      await apiCall;
      setIsOpen(false);
      setImageFile(null);
      setImagePreview(null);
      fetchCatalog();
    } catch (err) {
      console.error("Lỗi khi lưu catalog kiểu tóc:", err);
      const errMsg = err.response?.data?.message || err.message || "Không xác định";
      alert(`Thao tác thất bại. Chi tiết lỗi: ${errMsg}`);
    }
  };

  // Xóa kiểu tóc
  const handleDelete = (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa kiểu tóc "${name}" khỏi kho?`)) return;

    api
      .delete(`/admin/catalog/${id}`)
      .then(() => {
        fetchCatalog();
      })
      .catch((err) => {
        console.error(err);
        alert("Xóa kiểu tóc thất bại.");
      });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-ink">Kho kiểu tóc</h2>
          <p className="text-sm text-mauve">Quản lý danh sách kiểu tóc gợi ý và thử nghiệm</p>
        </div>
        <Button size="sm" variant="brand" className="rounded-xl" onClick={handleOpenAdd}>
          + Thêm kiểu tóc mới
        </Button>
      </div>

      {/* Table */}
      <Card className="overflow-hidden border border-divider/10" padded={false}>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="size-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          </div>
        ) : catalog.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted">
            Kho kiểu tóc hiện tại trống
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="px-6 py-4">Hình ảnh</th>
                  <th className="px-6 py-4">Tên kiểu tóc</th>
                  <th className="px-6 py-4">Nhãn tag</th>
                  <th className="px-6 py-4">Dáng mặt</th>
                  <th className="px-6 py-4">Độ dài</th>
                  <th className="px-6 py-4">Giới tính</th>
                  <th className="px-6 py-4">Giới hạn</th>
                  <th className="px-6 py-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {catalog.map((item) => (
                  <tr key={item.id} className="hover:bg-canvas/50 transition-colors">
                    <td className="px-6 py-3">
                      <img
                         src={item.imageUrl}
                        alt={item.name}
                        className="size-12 rounded-xl object-cover border border-line"
                      />
                    </td>
                    <td className="px-6 py-3 font-semibold text-ink">{item.name}</td>
                    <td className="px-6 py-3">
                      {item.tag ? <Badge variant="new">{item.tag}</Badge> : <span className="text-muted">-</span>}
                    </td>
                    <td className="px-6 py-3">
                      {item.faceShape ? (
                        <div className="flex flex-wrap gap-1">
                          {item.faceShape.split(",").map((s) => (
                            <span key={s.trim()} className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                              {s.trim()}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-muted">-</span>}
                    </td>
                    <td className="px-6 py-3 text-mauve font-medium">{item.hairLength || "-"}</td>
                    <td className="px-6 py-3">
                      <Badge variant={item.gender === "Nam" ? "new" : (item.gender === "Nữ" ? "premium" : "neutral")}>
                        {item.gender || "Unisex"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      {item.premiumOnly ? (
                        <Badge variant="premium">PREMIUM</Badge>
                      ) : (
                        <Badge variant="neutral">FREE</Badge>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="px-3.5 py-1.5 text-xs rounded-xl"
                          onClick={() => handleOpenEdit(item)}
                        >
                          Sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="px-3.5 py-1.5 text-xs rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => handleDelete(item.id, item.name)}
                        >
                          Xóa
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
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs font-semibold text-muted">
            Trang {page + 1} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-2 rounded-xl text-xs"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Trước
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-2 rounded-xl text-xs"
              disabled={page === totalPages - 1 || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      )}

      {/* Modal Form Add/Edit */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl border border-divider/10 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display text-xl font-bold text-ink mb-6">
              {editingItem ? "Cập nhật kiểu tóc" : "Thêm kiểu tóc mới"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Tên kiểu tóc *"
                placeholder="Ví dụ: Modern Quiff, Mullet..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              {/* Upload ảnh — Cloudinary */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-mauve">
                  Hình ảnh {editingItem ? "(chọn ảnh mới nếu muốn thay)" : "*"}
                </span>
                <div className="flex items-center gap-4">
                  <label className="flex-1 cursor-pointer rounded-2xl border-2 border-dashed border-line bg-canvas px-4 py-3 text-center text-sm text-muted transition hover:border-brand hover:bg-brand/5">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                    {imageFile ? imageFile.name : "Nhấn để chọn ảnh..."}
                  </label>
                </div>

                {imagePreview && (
                  <div className="mt-2 flex flex-col gap-2">
                    <span className="text-xs font-semibold text-mauve">
                      Cân chỉnh khung hiển thị (Kéo thả ảnh hoặc kéo thanh trượt để Zoom, ảnh sẽ tự động được cắt theo tỷ lệ 4:5 của Bộ sưu tập):
                    </span>
                    {/* Container for React Easy Crop */}
                    <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-line bg-canvas">
                      <Cropper
                        image={imagePreview}
                        crop={crop}
                        zoom={zoom}
                        aspect={4 / 5}
                        onCropChange={(c) => { setCrop(c); setCropInteracted(true); }}
                        onZoomChange={(z) => { setZoom(z); setCropInteracted(true); }}
                        onCropComplete={onCropComplete}
                        style={{
                          containerStyle: {
                            borderRadius: '16px',
                          }
                        }}
                      />
                    </div>
                    {/* Zoom Slider Controls */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted">Zoom:</span>
                      <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-label="Zoom"
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-line accent-brand"
                      />
                      <span className="text-xs font-semibold text-ink">{zoom}x</span>
                    </div>
                  </div>
                )}
              </div>

              <Input
                label="Nhãn tag (tùy chọn)"
                placeholder="Ví dụ: Thịnh hành, Mới, Bán chạy..."
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
              />

              {/* Dáng khuôn mặt — multi-select checkboxes */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-mauve">Dáng mặt phù hợp (chọn nhiều)</span>
                <div className="flex flex-wrap gap-2">
                  {FACE_SHAPES.map((shape) => {
                    const checked = formData.faceShapes.includes(shape);
                    return (
                      <label
                        key={shape}
                        className={`cursor-pointer rounded-full border-2 px-4 py-2 text-sm font-semibold transition ${
                          checked
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-line bg-white text-mauve hover:border-brand/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={checked}
                          onChange={() => {
                            const next = checked
                              ? formData.faceShapes.filter((s) => s !== shape)
                              : [...formData.faceShapes, shape];
                            if (next.length > 0) setFormData({ ...formData, faceShapes: next });
                          }}
                        />
                        {shape}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Độ dài tóc */}
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-mauve">Độ dài</span>
                  <select
                    className="w-full rounded-3xl border-2 border-line bg-white py-3.5 px-4 text-sm text-ink outline-none transition focus:border-brand"
                    value={formData.hairLength}
                    onChange={(e) => setFormData({ ...formData, hairLength: e.target.value })}
                  >
                    {HAIR_LENGTHS.map((len) => (
                      <option key={len} value={len}>
                        {len}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Giới tính phù hợp */}
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-mauve">Giới tính</span>
                  <select
                    className="w-full rounded-3xl border-2 border-line bg-white py-3.5 px-4 text-sm text-ink outline-none transition focus:border-brand"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    {GENDERS.map((genderOpt) => (
                      <option key={genderOpt} value={genderOpt}>
                        {genderOpt}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Mô tả */}
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-mauve">Mô tả kiểu tóc</span>
                <textarea
                  placeholder="Mô tả chi tiết phong cách kiểu tóc..."
                  rows="3"
                  className="w-full rounded-2xl border-2 border-line bg-white p-4 text-base text-ink outline-none transition placeholder:text-muted/50 focus:border-brand"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </label>

              {/* Checkbox Premium Only */}
              <label className="flex items-center gap-3 cursor-pointer py-1">
                <input
                  type="checkbox"
                  className="size-5 rounded border-2 border-line text-brand focus:ring-brand"
                  checked={formData.premiumOnly}
                  onChange={(e) => setFormData({ ...formData, premiumOnly: e.target.checked })}
                />
                <span className="text-sm font-semibold text-ink">Chỉ dành cho tài khoản Premium</span>
              </label>

              {/* Actions Button */}
              <div className="flex gap-3 pt-4 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl px-5 py-2.5 text-sm"
                  onClick={() => setIsOpen(false)}
                >
                  Hủy bỏ
                </Button>
                <Button type="submit" variant="brand" className="rounded-xl px-5 py-2.5 text-sm">
                  Lưu thông tin
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
