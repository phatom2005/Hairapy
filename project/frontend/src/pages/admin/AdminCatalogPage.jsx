import { useEffect, useState, useCallback } from "react";
import api from "../../lib/api";
import { Card, Badge, Button, Input } from "../../components/ui";

const FACE_SHAPES = ["Oval", "Round", "Square", "Heart", "Oblong", "Diamond"];
const HAIR_LENGTHS = ["Ngắn", "Vừa", "Dài"];

export default function AdminCatalogPage() {
  const [catalog, setCatalog] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Trạng thái modal form
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    tag: "",
    faceShape: "Oval",
    hairLength: "Vừa",
    description: "",
    imageUrl: "",
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
    fetchCatalog();
  }, [fetchCatalog]);

  // Mở modal thêm mới
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      tag: "",
      faceShape: "Oval",
      hairLength: "Vừa",
      description: "",
      imageUrl: "",
      premiumOnly: false,
    });
    setIsOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      tag: item.tag || "",
      faceShape: item.faceShape || "Oval",
      hairLength: item.hairLength || "Vừa",
      description: item.description || "",
      imageUrl: item.imageUrl,
      premiumOnly: item.premiumOnly,
    });
    setIsOpen(true);
  };

  // Submit form
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.imageUrl.trim()) {
      alert("Vui lòng điền đầy đủ Tên và Ảnh kiểu tóc.");
      return;
    }

    const apiCall = editingItem
      ? api.put(`/admin/catalog/${editingItem.id}`, formData)
      : api.post("/admin/catalog", formData);

    apiCall
      .then(() => {
        setIsOpen(false);
        fetchCatalog();
      })
      .catch((err) => {
        console.error(err);
        alert("Thao tác thất bại. Vui lòng thử lại.");
      });
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
                    <td className="px-6 py-3 text-mauve font-medium">{item.faceShape || "-"}</td>
                    <td className="px-6 py-3 text-mauve font-medium">{item.hairLength || "-"}</td>
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

              <Input
                label="URL Hình ảnh *"
                placeholder="Nhập link ảnh kiểu tóc..."
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                required
              />

              <Input
                label="Nhãn tag (tùy chọn)"
                placeholder="Ví dụ: Thịnh hành, Mới, Bán chạy..."
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-4">
                {/* Dáng khuôn mặt */}
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-mauve">Dáng mặt hợp</span>
                  <select
                    className="w-full rounded-3xl border-2 border-line bg-white py-3.5 px-5 text-base text-ink outline-none transition focus:border-brand"
                    value={formData.faceShape}
                    onChange={(e) => setFormData({ ...formData, faceShape: e.target.value })}
                  >
                    {FACE_SHAPES.map((shape) => (
                      <option key={shape} value={shape}>
                        {shape}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Độ dài tóc */}
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-mauve">Độ dài tóc</span>
                  <select
                    className="w-full rounded-3xl border-2 border-line bg-white py-3.5 px-5 text-base text-ink outline-none transition focus:border-brand"
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
