import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Buildings,
  Call,
  Location,
  Money,
  DocumentText,
  DocumentUpload,
  Export,
  Save2,
  TickCircle,
  Danger,
  LocationDiscover,
  Clock,
  MagicStar,
} from "iconsax-reactjs";
import { Card, Button, Input } from "../../components/ui";
import api from "../../lib/api";

export default function SalonProfilePage() {
  const queryClient = useQueryClient();

  const [notification, setNotification] = useState(null);
  const [formData, setFormData] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const {
    data: salon,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["salon-owner-profile"],
    queryFn: async () => {
      const res = await api.get("/salon-owner/salon");
      // Khởi tạo formData từ dữ liệu fetch
      setFormData({
        description: res.data.description || "",
        phone: res.data.phone || "",
        priceFrom: res.data.priceFrom || 0,
        serviceTypes: res.data.serviceTypes || "",
        address: res.data.address || "",
        latitude: res.data.latitude || "",
        longitude: res.data.longitude || "",
      });
      return res.data;
    },
    staleTime: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: async (submitData) => {
      const form = new FormData();
      if (submitData.description !== undefined)
        form.append("description", submitData.description);
      if (submitData.phone) form.append("phone", submitData.phone);
      if (submitData.priceFrom !== undefined)
        form.append("priceFrom", submitData.priceFrom);
      if (submitData.serviceTypes !== undefined)
        form.append("serviceTypes", submitData.serviceTypes);
      if (submitData.address) form.append("address", submitData.address);
      if (submitData.latitude) form.append("latitude", submitData.latitude);
      if (submitData.longitude) form.append("longitude", submitData.longitude);
      if (selectedImage) form.append("image", selectedImage);

      const res = await api.put("/salon-owner/salon", form, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["salon-owner-profile"], updated);
      queryClient.invalidateQueries({ queryKey: ["salon-owner-stats"] });
      setSelectedImage(null);
      setImagePreview(null);
      setNotification({
        type: "success",
        message: "Cập nhật hồ sơ salon thành công!",
      });
      setTimeout(() => setNotification(null), 4000);
    },
    onError: (err) => {
      setNotification({
        type: "error",
        message:
          err.response?.data?.message ||
          "Có lỗi xảy ra khi cập nhật hồ sơ. Vui lòng thử lại.",
      });
      setTimeout(() => setNotification(null), 5000);
    },
  });

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Trình duyệt không hỗ trợ định vị GPS.");
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGettingLocation(false);
        setFormData((prev) => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        }));
        setNotification({
          type: "success",
          message: "Đã lấy toạ độ GPS từ thiết bị hiện tại!",
        });
        setTimeout(() => setNotification(null), 3000);
      },
      () => {
        setIsGettingLocation(false);
        alert("Không thể truy cập toạ độ GPS. Vui lòng cấp quyền truy cập vị trí.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData) return;
    updateMutation.mutate(formData);
  };

  if (isLoading || !formData) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-line/20 rounded-2xl" />
        <div className="h-96 bg-line/20 rounded-2xl" />
      </div>
    );
  }

  if (isError || !salon) {
    return (
      <Card className="p-8 text-center text-mauve border border-line">
        <p className="text-sm">Không thể tải thông tin hồ sơ salon.</p>
        <p className="text-xs text-muted mt-1">Vui lòng thử lại sau.</p>
      </Card>
    );
  }

  const currentDisplayImage = imagePreview || salon.imageUrl;

  return (
    <div className="space-y-6 max-w-4xl">
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
            <TickCircle size={20} variant="Bold" className="text-emerald-400 shrink-0" />
          ) : (
            <Danger size={20} variant="Bold" className="text-red-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-mauve flex items-center gap-2">
            <Buildings size={24} className="text-primary" />
            Hồ sơ Salon
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Quản lý thông tin hiển thị của salon trên Hairapy và cấu hình thông tin liên hệ.
          </p>
        </div>

        <a
          href={`/salons/${salon.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-card border border-line text-xs font-medium text-mauve hover:text-primary hover:border-primary/50 transition-colors w-fit"
        >
          <Export size={16} />
          Xem trang salon công khai
        </a>
      </div>

      {/* Trạng thái đối tác */}
      <Card className="p-4 border border-line bg-card/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            <MagicStar size={20} variant="Bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-mauve">
                Trạng thái Đối tác Hairapy
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  salon.partnerExpired
                    ? "bg-red-950/80 text-red-300 border border-red-800"
                    : "bg-emerald-950/80 text-emerald-300 border border-emerald-800"
                }`}
              >
                {salon.partnerExpired ? "Hết hạn" : "Đang hoạt động"}
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
              <Clock size={14} />
              {salon.partnerUntil ? (
                <>
                  Hạn gói: {new Date(salon.partnerUntil).toLocaleDateString("vi-VN")} (còn{" "}
                  <strong className="text-mauve font-medium">
                    {salon.daysLeft} ngày
                  </strong>
                  )
                </>
              ) : (
                "Chưa kích hoạt gói đối tác"
              )}
            </p>
          </div>
        </div>

        <div className="text-xs text-muted">
          Lượt xem trang:{" "}
          <strong className="text-mauve font-semibold font-mono">
            {salon.viewCount || 0}
          </strong>
        </div>
      </Card>

      {/* Form cập nhật thông tin */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 border border-line space-y-5">
          {/* Ảnh đại diện Salon */}
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">
              Ảnh đại diện Salon
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="w-32 h-32 rounded-2xl bg-card border border-line overflow-hidden shrink-0 relative group">
                {currentDisplayImage ? (
                  <img
                    src={currentDisplayImage}
                    alt={salon.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted">
                    <Buildings size={40} className="opacity-30" />
                  </div>
                )}
              </div>

              <div className="space-y-2 text-center sm:text-left">
                <input
                  type="file"
                  id="salon-image-upload"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleImageChange}
                />
                <label
                  htmlFor="salon-image-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-line text-xs font-medium text-mauve hover:text-primary hover:border-primary/50 cursor-pointer transition-colors"
                >
                  <DocumentUpload size={16} />
                  {selectedImage ? "Chọn ảnh khác" : "Tải ảnh mới lên"}
                </label>
                <p className="text-[11px] text-muted">
                  Định dạng PNG, JPG, WebP. Tối đa 5MB. Ảnh rõ nét mặt tiền hoặc không gian cắt tóc.
                </p>
                {selectedImage && (
                  <p className="text-xs text-primary font-medium">
                    Đã chọn: {selectedImage.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-line/40">
            {/* Tên Salon (Read-only / info) */}
            <div>
              <label className="block text-xs text-muted mb-1.5">Tên Salon</label>
              <Input
                type="text"
                value={salon.name || ""}
                disabled
                className="bg-card/40 opacity-70 cursor-not-allowed text-xs sm:text-sm font-medium"
              />
              <span className="text-[10px] text-muted mt-1 block">
                Tên thương hiệu cố định. Nếu cần thay đổi vui lòng liên hệ admin.
              </span>
            </div>

            {/* Số điện thoại */}
            <div>
              <label className="block text-xs text-muted mb-1.5 flex items-center gap-1.5">
                <Call size={14} className="text-muted" />
                Số điện thoại liên hệ
              </label>
              <Input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="Ví dụ: 0912345678"
                className="text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Địa chỉ & Toạ độ GPS */}
          <div className="space-y-3 pt-4 border-t border-line/40">
            <div>
              <label className="block text-xs text-muted mb-1.5 flex items-center gap-1.5">
                <Location size={14} className="text-muted" />
                Địa chỉ chi tiết
              </label>
              <Input
                type="text"
                required
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/TP"
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-xs text-muted mb-1.5">
                  Toạ độ GPS (Vĩ độ / Kinh độ)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.000001"
                    placeholder="Latitude"
                    value={formData.latitude}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        latitude: e.target.value ? Number(e.target.value) : "",
                      })
                    }
                    className="text-xs font-mono"
                  />
                  <Input
                    type="number"
                    step="0.000001"
                    placeholder="Longitude"
                    value={formData.longitude}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        longitude: e.target.value ? Number(e.target.value) : "",
                      })
                    }
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGetLocation}
                  disabled={isGettingLocation}
                  className="w-full text-xs flex items-center justify-center gap-2"
                >
                  <LocationDiscover size={14} className="text-primary" />
                  {isGettingLocation ? "Đang lấy vị trí..." : "Lấy vị trí GPS hiện tại"}
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted">
              Toạ độ chính xác giúp salon hiển thị ưu tiên khi khách hàng tìm kiếm tiệm tóc gần nhất trên bản đồ.
            </p>
          </div>

          {/* Dịch vụ & Giá */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-line/40">
            <div>
              <label className="block text-xs text-muted mb-1.5 flex items-center gap-1.5">
                <Money size={14} className="text-muted" />
                Giá khởi điểm tham khảo (VNĐ)
              </label>
              <Input
                type="number"
                min="0"
                step="10000"
                value={formData.priceFrom}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priceFrom: Number(e.target.value) || 0,
                  })
                }
                placeholder="150000"
                className="text-xs sm:text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-muted mb-1.5">
                Dịch vụ cung cấp (phân cách dấu phẩy)
              </label>
              <Input
                type="text"
                value={formData.serviceTypes}
                onChange={(e) =>
                  setFormData({ ...formData, serviceTypes: e.target.value })
                }
                placeholder="Cắt tóc, Uốn sóng, Nhuộm tẩy, Phục hồi Keratin"
                className="text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Mô tả giới thiệu */}
          <div className="pt-4 border-t border-line/40">
            <label className="block text-xs text-muted mb-1.5 flex items-center gap-1.5">
              <DocumentText size={14} className="text-muted" />
              Mô tả giới thiệu salon
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Giới thiệu về không gian tiệm, đội ngũ stylist, các công nghệ tạo kiểu tóc nổi bật..."
              className="w-full bg-surface border border-line rounded-xl p-3 text-xs sm:text-sm text-mauve focus:outline-none focus:border-primary resize-y"
            />
          </div>
        </Card>

        {/* Nút lưu */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 bg-primary text-black font-semibold text-sm px-6 py-2.5 shadow-lg shadow-primary/20 hover:opacity-95"
          >
            <Save2 size={16} />
            {updateMutation.isPending ? "Đang lưu thông tin..." : "Lưu thay đổi"}
          </Button>
        </div>
      </form>
    </div>
  );
}
