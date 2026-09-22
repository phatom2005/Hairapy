import { useEffect, useState, useCallback } from "react";
import api from "../../lib/api";
import { Card, Badge, Button, Input } from "../../components/ui";

const DISTRICT_OPTS = ["Quận 1", "Quận 3", "Quận 7", "Bình Thạnh", "Gò Vấp", "Phú Nhuận"];
const SERVICE_OPTS = ["Cắt tóc", "Nhuộm tóc", "Uốn/Duỗi tóc", "Phục hồi tóc", "Combo trọn gói"];

export default function AdminSalonsPage() {
  const [salons, setSalons] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    name: "",
    address: "",
    district: DISTRICT_OPTS[0],
    services: [],
    priceFrom: "",
    rating: "",
    verified: false,
    phone: "",
  };
  const [formData, setFormData] = useState(emptyForm);

  const fetchSalons = useCallback(() => {
    setLoading(true);
    api
      .get("/admin/salons", { params: { page, size: 10 } })
      .then((res) => {
        setSalons(res.data.content || []);
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
      if (active) fetchSalons();
    });
    return () => {
      active = false;
    };
  }, [fetchSalons]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setImageFile(null);
    setImagePreview(null);
    setFormData(emptyForm);
    setIsOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setImageFile(null);
    setImagePreview(item.imageUrl);
    setFormData({
      name: item.name,
      address: item.address,
      district: item.district || DISTRICT_OPTS[0],
      services: item.serviceTypes ? item.serviceTypes.split(",").map((s) => s.trim()) : [],
      priceFrom: item.priceFrom ?? "",
      rating: item.rating ?? "",
      verified: !!item.verified,
      phone: item.phone || "",
    });
    setIsOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const toggleService = (service) => {
    setFormData((prev) => {
      const has = prev.services.includes(service);
      return {
        ...prev,
        services: has ? prev.services.filter((s) => s !== service) : [...prev.services, service],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.address.trim() || !formData.priceFrom) {
      alert("Vui lòng điền đủ Tên salon, Địa chỉ và Giá khởi điểm.");
      return;
    }
    if (!editingItem && !imageFile) {
      alert("Vui lòng chọn ảnh salon.");
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("address", formData.address);
      fd.append("district", formData.district);
      fd.append("serviceTypes", formData.services.join(","));
      fd.append("priceFrom", formData.priceFrom);
      if (formData.rating !== "") fd.append("rating", formData.rating);
      fd.append("verified", formData.verified);
      if (formData.phone) fd.append("phone", formData.phone);
      if (imageFile) fd.append("image", imageFile);

      const apiCall = editingItem
        ? api.put(`/admin/salons/${editingItem.id}`, fd)
        : api.post("/admin/salons", fd);

      await apiCall;
      setIsOpen(false);
      setImageFile(null);
      setImagePreview(null);
      fetchSalons();
    } catch (err) {
      console.error("Lỗi khi lưu salon:", err);
      const errMsg = err.response?.data?.message || err.message || "Không xác định";
      alert(`Thao tác thất bại. Chi tiết lỗi: ${errMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa salon "${name}"?`)) return;

    api
      .delete(`/admin/salons/${id}`)
      .then(() => fetchSalons())
      .catch((err) => {
        console.error(err);
        alert("Xóa salon thất bại.");
      });
  };

  const formatVnd = (v) => (v == null ? "-" : `${Number(v).toLocaleString("vi-VN")}đ`);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-ink">Salon đối tác</h2>
          <p className="text-sm text-mauve">Quản lý danh sách salon hiển thị ở trang Salon công khai</p>
        </div>
        <Button size="sm" variant="brand" className="rounded-xl" onClick={handleOpenAdd}>
          + Thêm salon mới
        </Button>
      </div>

      <Card className="overflow-hidden border border-divider/10" padded={false}>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="size-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          </div>
        ) : salons.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted">
            Chưa có salon nào trong hệ thống
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="px-6 py-4">Hình ảnh</th>
                  <th className="px-6 py-4">Tên salon</th>
                  <th className="px-6 py-4">Quận</th>
                  <th className="px-6 py-4">Giá từ</th>
                  <th className="px-6 py-4">Đánh giá</th>
                  <th className="px-6 py-4">Xác thực</th>
                  <th className="px-6 py-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {salons.map((item) => (
                  <tr key={item.id} className="hover:bg-canvas/50 transition-colors">
                    <td className="px-6 py-3">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="size-12 rounded-xl object-cover border border-line"
                      />
                    </td>
                    <td className="px-6 py-3 font-semibold text-ink">{item.name}</td>
                    <td className="px-6 py-3 text-mauve">{item.district}</td>
                    <td className="px-6 py-3 text-mauve">{formatVnd(item.priceFrom)}</td>
                    <td className="px-6 py-3 text-mauve">{item.rating?.toFixed(1) ?? "0.0"} ★</td>
                    <td className="px-6 py-3">
                      {item.verified ? (
                        <Badge variant="new">Đã xác thực</Badge>
                      ) : (
                        <Badge variant="neutral">Chưa xác thực</Badge>
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

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl border border-divider/10 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display text-xl font-bold text-ink mb-6">
              {editingItem ? "Cập nhật salon" : "Thêm salon mới"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Tên salon *"
                placeholder="Ví dụ: The Barber House"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <Input
                label="Địa chỉ *"
                placeholder="Số nhà, đường..."
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />

              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-mauve px-1">Quận / Huyện *</span>
                <select
                  className="w-full rounded-3xl border-2 border-line bg-white py-4 px-5 text-base text-ink outline-none transition focus:border-brand"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                >
                  {DISTRICT_OPTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-mauve px-1">Loại dịch vụ</span>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_OPTS.map((s) => (
                    <label
                      key={s}
                      className={`cursor-pointer rounded-full border-2 px-3.5 py-1.5 text-xs font-semibold transition ${
                        formData.services.includes(s)
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-line text-mauve"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={formData.services.includes(s)}
                        onChange={() => toggleService(s)}
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Giá khởi điểm (VNĐ) *"
                  type="number"
                  min="0"
                  placeholder="Ví dụ: 150000"
                  value={formData.priceFrom}
                  onChange={(e) => setFormData({ ...formData, priceFrom: e.target.value })}
                  required
                />
                <Input
                  label="Đánh giá (0-5)"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  placeholder="Ví dụ: 4.5"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                />
              </div>

              <Input
                label="Số điện thoại (tùy chọn)"
                placeholder="09xxxxxxxx"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />

              <label className="flex items-center gap-2.5 px-1">
                <input
                  type="checkbox"
                  className="size-4 rounded accent-brand"
                  checked={formData.verified}
                  onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
                />
                <span className="text-sm font-semibold text-mauve">Đánh dấu salon đã xác thực</span>
              </label>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-mauve">
                  Hình ảnh {editingItem ? "(chọn ảnh mới nếu muốn thay)" : "*"}
                </span>
                <label className="cursor-pointer rounded-2xl border-2 border-dashed border-line bg-canvas px-4 py-3 text-center text-sm text-muted transition hover:border-brand hover:bg-brand/5">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  {imageFile ? imageFile.name : "Nhấn để chọn ảnh..."}
                </label>
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Xem trước"
                    className="mt-2 h-40 w-full rounded-2xl border border-line object-cover"
                  />
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl px-5 py-2.5 text-sm font-bold"
                  onClick={() => setIsOpen(false)}
                  disabled={saving}
                >
                  Hủy
                </Button>
                <Button type="submit" className="rounded-2xl px-5 py-2.5 text-sm font-bold" disabled={saving}>
                  {saving ? "Đang lưu..." : editingItem ? "Lưu thay đổi" : "Thêm salon"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
