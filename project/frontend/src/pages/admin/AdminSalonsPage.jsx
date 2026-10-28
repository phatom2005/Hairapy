import { useEffect, useState, useCallback } from "react";
import { Star1 } from "iconsax-reactjs";
import {
  Building2,
  UserCheck,
  UserPlus,
  CreditCard,
  Eye,
  EyeOff,
  Clock,
  Sparkles,
  History,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import api from "../../lib/api";
import { Card, Badge, Button, Input } from "../../components/ui";
import ConfirmDialog from "../../components/admin/ConfirmDialog";

const DISTRICT_OPTS = [
  "Quận 1",
  "Quận 3",
  "Quận 7",
  "Bình Thạnh",
  "Gò Vấp",
  "Phú Nhuận",
];
const SERVICE_OPTS = [
  "Cắt tóc",
  "Nhuộm tóc",
  "Uốn/Duỗi tóc",
  "Phục hồi tóc",
  "Combo trọn gói",
];

export default function AdminSalonsPage() {
  const [salons, setSalons] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Modal Add / Edit
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);

  // Modal Gán chủ salon
  const [assignModal, setAssignModal] = useState({
    open: false,
    salon: null,
    email: "",
    saving: false,
    error: "",
  });

  // Modal Ghi nhận thanh toán gói đối tác (mô phỏng)
  const [paymentModal, setPaymentModal] = useState({
    open: false,
    salon: null,
    months: 1,
    amount: 500000,
    note: "Gia hạn gói đối tác qua Chuyển khoản (Mô phỏng)",
    saving: false,
    error: "",
    history: [],
    loadingHistory: false,
  });

  // Notification toast
  const [notification, setNotification] = useState(null);

  const showToast = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const emptyForm = {
    name: "",
    address: "",
    district: DISTRICT_OPTS[0],
    services: [],
    priceFrom: "",
    rating: "",
    verified: false,
    phone: "",
    latitude: "",
    longitude: "",
  };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const fetchSalons = useCallback(() => {
    setLoading(true);
    api
      .get("/admin/salons", { params: { page, size: 10 } })
      .then((res) => {
        const now = Date.now();
        const items = (res.data.content || []).map((s) => {
          const partnerUntil = s.partnerUntil ? new Date(s.partnerUntil) : null;
          const isPartnerActive = partnerUntil ? partnerUntil.getTime() > now : false;
          const daysLeft = partnerUntil
            ? Math.ceil((partnerUntil.getTime() - now) / (1000 * 60 * 60 * 24))
            : null;
          return { ...s, partnerUntil, isPartnerActive, daysLeft };
        });
        setSalons(items);
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
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setEditingItem(null);
    setImageFile(null);
    setImagePreview(null);
    setFormData(emptyForm);
    setIsOpen(true);
  };

  const handleOpenEdit = (item) => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setEditingItem(item);
    setImageFile(null);
    setImagePreview(item.imageUrl);
    setFormData({
      name: item.name,
      address: item.address,
      district: item.district || DISTRICT_OPTS[0],
      services: item.serviceTypes
        ? item.serviceTypes.split(",").map((s) => s.trim())
        : [],
      priceFrom: item.priceFrom ?? "",
      rating: item.rating ?? "",
      verified: !!item.verified,
      phone: item.phone || "",
      latitude: item.latitude ?? "",
      longitude: item.longitude ?? "",
    });
    setIsOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Vui lòng chọn file ảnh hợp lệ (jpg, png, webp...)");
        e.target.value = "";
        return;
      }
      setImageFile(file);
      setImagePreview((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    }
  };

  const toggleService = (service) => {
    setFormData((prev) => {
      const has = prev.services.includes(service);
      return {
        ...prev,
        services: has
          ? prev.services.filter((s) => s !== service)
          : [...prev.services, service],
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
      if (formData.latitude !== "" && formData.latitude !== null)
        fd.append("latitude", formData.latitude);
      if (formData.longitude !== "" && formData.longitude !== null)
        fd.append("longitude", formData.longitude);
      if (imageFile) fd.append("image", imageFile);

      const apiCall = editingItem
        ? api.put(`/admin/salons/${editingItem.id}`, fd)
        : api.post("/admin/salons", fd);

      await apiCall;
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
      setIsOpen(false);
      setImageFile(null);
      setImagePreview(null);
      showToast(
        "success",
        editingItem ? "Đã cập nhật salon!" : "Đã thêm salon mới!"
      );
      fetchSalons();
    } catch (err) {
      console.error("Lỗi khi lưu salon:", err);
      const errMsg =
        err.response?.data?.message || err.message || "Không xác định";
      alert(`Thao tác thất bại. Chi tiết lỗi: ${errMsg}`);
    } finally {
      setSaving(false);
    }
  };

  // Toggle active (ẩn / hiện)
  const handleToggleActive = async (id, currentActive) => {
    try {
      await api.patch(`/admin/salons/${id}/active`);
      showToast(
        "success",
        currentActive ? "Đã ẩn salon khỏi trang công khai." : "Đã kích hoạt hiển thị salon."
      );
      fetchSalons();
    } catch (err) {
      console.error(err);
      showToast("error", "Không thể thay đổi trạng thái salon.");
    }
  };

  // Xóa salon
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = (id, name) => {
    setConfirmDelete({ id, name });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/salons/${confirmDelete.id}`);
      setConfirmDelete(null);
      showToast("success", "Đã xóa salon thành công.");
      fetchSalons();
    } catch (err) {
      console.error(err);
      alert("Xóa salon thất bại.");
    } finally {
      setDeleting(false);
    }
  };

  // Mở modal Gán chủ
  const handleOpenAssign = (salon) => {
    setAssignModal({
      open: true,
      salon,
      email: salon.ownerEmail || "",
      saving: false,
      error: "",
    });
  };

  const handleSaveAssign = async (e) => {
    e.preventDefault();
    if (!assignModal.email.trim()) {
      setAssignModal((prev) => ({
        ...prev,
        error: "Vui lòng nhập email người dùng.",
      }));
      return;
    }
    setAssignModal((prev) => ({ ...prev, saving: true, error: "" }));
    try {
      await api.put(`/admin/salons/${assignModal.salon.id}/owner`, {
        email: assignModal.email.trim(),
      });
      setAssignModal((prev) => ({ ...prev, open: false, saving: false }));
      showToast("success", "Đã gán chủ salon thành công!");
      fetchSalons();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Gán chủ salon thất bại.";
      setAssignModal((prev) => ({ ...prev, saving: false, error: msg }));
    }
  };

  // Mở modal Ghi nhận thanh toán mô phỏng
  const handleOpenPayment = async (salon) => {
    setPaymentModal({
      open: true,
      salon,
      months: 1,
      amount: 500000,
      note: "Gia hạn gói đối tác qua Chuyển khoản (Mô phỏng)",
      saving: false,
      error: "",
      history: [],
      loadingHistory: true,
    });

    try {
      const res = await api.get(`/admin/salons/${salon.id}/partner-payments`);
      setPaymentModal((prev) => ({
        ...prev,
        history: res.data || [],
        loadingHistory: false,
      }));
    } catch (err) {
      console.error(err);
      setPaymentModal((prev) => ({ ...prev, loadingHistory: false }));
    }
  };

  const handleMonthsChange = (m) => {
    const months = parseInt(m, 10) || 1;
    setPaymentModal((prev) => ({
      ...prev,
      months,
      amount: months * 500000,
    }));
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    setPaymentModal((prev) => ({ ...prev, saving: true, error: "" }));
    try {
      await api.post(
        `/admin/salons/${paymentModal.salon.id}/partner-payments`,
        {
          months: paymentModal.months,
          amount: paymentModal.amount,
          note: paymentModal.note,
        }
      );
      setPaymentModal((prev) => ({ ...prev, open: false, saving: false }));
      showToast(
        "success",
        `Đã gia hạn thêm ${paymentModal.months} tháng gói đối tác!`
      );
      fetchSalons();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Ghi nhận thanh toán thất bại.";
      setPaymentModal((prev) => ({ ...prev, saving: false, error: msg }));
    }
  };

  const formatVnd = (v) =>
    v == null ? "-" : `${Number(v).toLocaleString("vi-VN")}đ`;

  return (
    <div className="space-y-6">
      {/* Toast thông báo */}
      {notification && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm transition-all duration-300 ${
            notification.type === "success"
              ? "bg-emerald-950 border border-emerald-800 text-emerald-200"
              : "bg-red-950 border border-red-800 text-red-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-ink flex items-center gap-2">
            <Building2 className="w-7 h-7 text-primary" />
            Salon đối tác
          </h2>
          <p className="text-sm text-mauve">
            Quản lý danh sách salon, quyền chủ salon và trạng thái gói đối tác.
          </p>
        </div>
        <Button
          size="sm"
          variant="brand"
          className="rounded-xl flex items-center gap-1.5"
          onClick={handleOpenAdd}
        >
          + Thêm salon mới
        </Button>
      </div>

      {/* Table Card */}
      <Card
        className="overflow-hidden border border-divider/10"
        padded={false}
      >
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
                  <th className="px-5 py-4">Salon</th>
                  <th className="px-5 py-4">Khu vực</th>
                  <th className="px-5 py-4">Chủ sở hữu</th>
                  <th className="px-5 py-4">Gói Đối tác</th>
                  <th className="px-5 py-4">Hiển thị</th>
                  <th className="px-5 py-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {salons.map((item) => {
                  const partnerUntil = item.partnerUntil;
                  const isPartnerActive = item.isPartnerActive;
                  const daysLeft = item.daysLeft;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-canvas/50 transition-colors"
                    >
                      {/* Salon Info */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="size-12 rounded-xl object-cover border border-line shrink-0"
                          />
                          <div>
                            <div className="font-semibold text-ink flex items-center gap-1.5">
                              {item.name}
                              {item.verified && (
                                <Badge variant="new" className="text-[10px] py-0 px-1.5">
                                  ✓
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted mt-0.5 flex items-center gap-2">
                              <span>Từ {formatVnd(item.priceFrom)}</span>
                              <span>•</span>
                              <span className="inline-flex items-center gap-0.5">
                                {item.rating?.toFixed(1) ?? "0.0"}{" "}
                                <Star1
                                  size={10}
                                  variant="Bold"
                                  className="text-amber-500"
                                />
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Khu vực */}
                      <td className="px-5 py-3.5 text-mauve text-xs">
                        <div className="font-medium text-ink">{item.district}</div>
                        <div className="text-muted truncate max-w-[180px]" title={item.address}>
                          {item.address}
                        </div>
                      </td>

                      {/* Chủ sở hữu */}
                      <td className="px-5 py-3.5 text-xs">
                        {item.ownerEmail ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-ink text-xs bg-card px-2 py-1 rounded-md border border-line">
                              {item.ownerEmail}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenAssign(item)}
                              title="Đổi chủ salon"
                              className="text-primary hover:underline"
                            >
                              Đổi
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenAssign(item)}
                            className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Gán chủ
                          </button>
                        )}
                      </td>

                      {/* Gói đối tác */}
                      <td className="px-5 py-3.5 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {isPartnerActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-800 text-emerald-300 font-semibold text-[11px]">
                                <Sparkles className="w-3 h-3 text-emerald-400" />
                                Còn {daysLeft} ngày
                              </span>
                            ) : partnerUntil ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/70 border border-red-800 text-red-300 font-medium text-[11px]">
                                Hết hạn
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-card border border-line text-muted text-[11px]">
                                Chưa kích hoạt
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenPayment(item)}
                              className="text-primary hover:underline text-[11px] font-medium"
                              title="Ghi nhận thanh toán mô phỏng"
                            >
                              Gia hạn
                            </button>
                          </div>

                          {partnerUntil && (
                            <div className="text-[10px] text-muted flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Hạn: {partnerUntil.toLocaleDateString("vi-VN")}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Active toggle */}
                      <td className="px-5 py-3.5 text-xs">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item.id, item.active)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                            item.active
                              ? "bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-900/60"
                              : "bg-card border-line text-muted hover:text-ink"
                          }`}
                          title={
                            item.active
                              ? "Bấm để ẩn salon khỏi trang công khai"
                              : "Bấm để kích hoạt hiển thị salon"
                          }
                        >
                          {item.active ? (
                            <>
                              <Eye className="w-3.5 h-3.5 text-emerald-400" />
                              Hiện
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-muted" />
                              Ẩn
                            </>
                          )}
                        </button>
                      </td>

                      {/* Action buttons */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="px-2.5 py-1 text-xs rounded-lg"
                            onClick={() => handleOpenEdit(item)}
                          >
                            Sửa
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="px-2.5 py-1 text-xs rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleDelete(item.id, item.name)}
                          >
                            Xóa
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs font-semibold text-muted">
            Trang {page + 1} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-1.5 rounded-xl text-xs"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Trước
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-1.5 rounded-xl text-xs"
              disabled={page >= totalPages - 1 || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      )}

      {/* MODAL GÁN CHỦ SALON */}
      {assignModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 border border-line space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink">Gán chủ sở hữu</h3>
                <p className="text-xs text-muted">
                  Salon: <strong className="text-ink">{assignModal.salon?.name}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveAssign} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Email tài khoản Hairapy của chủ salon
                </label>
                <Input
                  type="email"
                  required
                  placeholder="chusalon@example.com"
                  value={assignModal.email}
                  onChange={(e) =>
                    setAssignModal({ ...assignModal, email: e.target.value })
                  }
                  className="text-sm"
                />
                <p className="text-[11px] text-muted mt-1.5">
                  Tài khoản được gán sẽ được cấp quyền{" "}
                  <code className="text-primary font-mono font-semibold">
                    SALON_OWNER
                  </code>{" "}
                  để đăng nhập cổng quản lý riêng.
                </p>
              </div>

              {assignModal.error && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200">
                  {assignModal.error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-line/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setAssignModal({ ...assignModal, open: false })
                  }
                  disabled={assignModal.saving}
                  className="text-xs"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  disabled={assignModal.saving}
                  className="text-xs"
                >
                  {assignModal.saving ? "Đang gán..." : "Xác nhận gán"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL GHI NHẬN THANH TOÁN (MÔ PHỎNG) */}
      {paymentModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <Card className="w-full max-w-lg p-6 border border-line space-y-4 my-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink">
                  Ghi nhận thanh toán gói đối tác (Mô phỏng)
                </h3>
                <p className="text-xs text-muted">
                  Salon: <strong className="text-ink">{paymentModal.salon?.name}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Số tháng gia hạn (1 - 12)
                  </label>
                  <select
                    value={paymentModal.months}
                    onChange={(e) => handleMonthsChange(e.target.value)}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-primary"
                  >
                    {[1, 2, 3, 6, 12].map((m) => (
                      <option key={m} value={m}>
                        {m} tháng ({formatVnd(m * 500000)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Số tiền ghi nhận (VNĐ)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="10000"
                    required
                    value={paymentModal.amount}
                    onChange={(e) =>
                      setPaymentModal({
                        ...paymentModal,
                        amount: Number(e.target.value) || 0,
                      })
                    }
                    className="text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Ghi chú giao dịch
                </label>
                <Input
                  type="text"
                  value={paymentModal.note}
                  onChange={(e) =>
                    setPaymentModal({ ...paymentModal, note: e.target.value })
                  }
                  placeholder="Ví dụ: Chuyển khoản VietQR, đợt khuyến mãi Q4..."
                  className="text-sm"
                />
              </div>

              {paymentModal.error && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200">
                  {paymentModal.error}
                </div>
              )}

              {/* Lịch sử các lần gia hạn trước */}
              <div className="pt-3 border-t border-line/40">
                <div className="text-xs font-semibold text-ink flex items-center gap-1.5 mb-2">
                  <History className="w-3.5 h-3.5 text-muted" />
                  Lịch sử thanh toán của salon này
                </div>
                {paymentModal.loadingHistory ? (
                  <p className="text-xs text-muted">Đang tải lịch sử...</p>
                ) : paymentModal.history.length === 0 ? (
                  <p className="text-xs text-muted italic">
                    Chưa có lịch sử thanh toán nào trước đó.
                  </p>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {paymentModal.history.map((h) => (
                      <div
                        key={h.id}
                        className="text-xs p-2 rounded-lg bg-card/60 border border-line flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold text-primary">
                            +{h.months} tháng
                          </span>{" "}
                          • {formatVnd(h.amount)}
                          {h.note && (
                            <span className="text-muted block text-[10px]">
                              {h.note}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted text-right">
                          {new Date(h.createdAt).toLocaleDateString("vi-VN")}
                          <span className="block text-muted/60">{h.createdBy}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setPaymentModal({ ...paymentModal, open: false })
                  }
                  disabled={paymentModal.saving}
                  className="text-xs"
                >
                  Đóng
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  disabled={paymentModal.saving}
                  className="text-xs flex items-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  {paymentModal.saving ? "Đang lưu..." : "Xác nhận ghi nhận"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL THÊM / SỬA SALON */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <Card className="w-full max-w-lg p-6 border border-line space-y-4 my-8">
            <h3 className="text-lg font-bold text-ink">
              {editingItem ? "Chỉnh sửa Salon" : "Thêm Salon mới"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Tên Salon *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="Ví dụ: Salon 30Shine"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Quận / Khu vực *
                  </label>
                  <select
                    value={formData.district}
                    onChange={(e) =>
                      setFormData({ ...formData, district: e.target.value })
                    }
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-primary"
                  >
                    {DISTRICT_OPTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Số điện thoại
                  </label>
                  <Input
                    type="tel"
                    placeholder="0912345678"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Địa chỉ chi tiết *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="123 Nguyễn Huệ, Phường Bến Nghé..."
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Giá từ (VNĐ) *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="5000"
                    required
                    placeholder="150000"
                    value={formData.priceFrom}
                    onChange={(e) =>
                      setFormData({ ...formData, priceFrom: e.target.value })
                    }
                    className="text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Đánh giá ban đầu (0 - 5.0)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    placeholder="4.8"
                    value={formData.rating}
                    onChange={(e) =>
                      setFormData({ ...formData, rating: e.target.value })
                    }
                    className="text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Toạ độ GPS (Vĩ độ)
                  </label>
                  <Input
                    type="number"
                    step="0.000001"
                    placeholder="Latitude"
                    value={formData.latitude}
                    onChange={(e) =>
                      setFormData({ ...formData, latitude: e.target.value })
                    }
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Toạ độ GPS (Kinh độ)
                  </label>
                  <Input
                    type="number"
                    step="0.000001"
                    placeholder="Longitude"
                    value={formData.longitude}
                    onChange={(e) =>
                      setFormData({ ...formData, longitude: e.target.value })
                    }
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Dịch vụ cung cấp
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {SERVICE_OPTS.map((s) => {
                    const selected = formData.services.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleService(s)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                          selected
                            ? "bg-primary/20 border-primary text-primary font-semibold"
                            : "bg-surface border-line text-muted hover:border-primary/50"
                        }`}
                      >
                        {selected ? "✓ " : "+ "}
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Upload ảnh */}
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Hình ảnh salon {editingItem ? "(để trống nếu giữ ảnh cũ)" : "*"}
                </label>
                <div className="flex items-center gap-4">
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="size-16 rounded-xl object-cover border border-line shrink-0"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="text-xs text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border file:border-line file:bg-surface file:text-ink hover:file:bg-card cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="salon-verified"
                  checked={formData.verified}
                  onChange={(e) =>
                    setFormData({ ...formData, verified: e.target.checked })
                  }
                  className="rounded border-line text-primary focus:ring-primary"
                />
                <label htmlFor="salon-verified" className="text-xs text-ink">
                  Đánh dấu Salon đã xác thực uy tín (Verified badge)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-line/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={saving}
                  className="text-xs"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  disabled={saving}
                  className="text-xs"
                >
                  {saving ? "Đang lưu..." : editingItem ? "Cập nhật" : "Tạo mới"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Xóa salon đối tác"
        message={`Bạn có chắc muốn xóa salon "${confirmDelete?.name}"? Thao tác này sẽ xóa liên kết và không thể hoàn tác.`}
        confirmText="Xác nhận xóa"
        variant="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
