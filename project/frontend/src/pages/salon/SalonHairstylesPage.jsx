import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Scissors,
  Search,
  Filter,
  Check,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Card, Button, Input } from "../../components/ui";
import api from "../../lib/api";

export default function SalonHairstylesPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [lengthFilter, setLengthFilter] = useState("ALL");
  const [notification, setNotification] = useState(null);

  // State cục bộ lưu thay đổi: { [hairstyleId]: { offered: boolean, price: number | null } }
  const [localChanges, setLocalChanges] = useState({});

  const {
    data: hairstyles = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["salon-owner-hairstyles"],
    queryFn: async () => {
      const res = await api.get("/salon-owner/hairstyles");
      return res.data;
    },
    staleTime: 60_000,
  });

  // Mutation lưu danh sách kiểu tóc
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.put("/salon-owner/hairstyles", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salon-owner-hairstyles"] });
      queryClient.invalidateQueries({ queryKey: ["salon-owner-stats"] });
      setLocalChanges({});
      setNotification({
        type: "success",
        message: "Đã cập nhật danh mục kiểu tóc thành công!",
      });
      setTimeout(() => setNotification(null), 4000);
    },
    onError: (err) => {
      setNotification({
        type: "error",
        message:
          err.response?.data?.message ||
          "Có lỗi xảy ra khi lưu. Vui lòng thử lại.",
      });
      setTimeout(() => setNotification(null), 5000);
    },
  });

  // Helper lấy trạng thái hiện tại của 1 kiểu tóc (kết hợp dữ liệu server + local changes)
  const getItemState = (item) => {
    if (localChanges[item.id] !== undefined) {
      return {
        offered: localChanges[item.id].offered,
        price: localChanges[item.id].price,
      };
    }
    return {
      offered: !!item.offered,
      price: item.price !== null && item.price !== undefined ? item.price : null,
    };
  };

  const handleToggleOffered = (item) => {
    const current = getItemState(item);
    setLocalChanges((prev) => ({
      ...prev,
      [item.id]: {
        offered: !current.offered,
        price: current.price,
      },
    }));
  };

  const handlePriceChange = (item, rawVal) => {
    const num = rawVal === "" ? null : parseInt(rawVal.replace(/\D/g, ""), 10);
    const current = getItemState(item);
    setLocalChanges((prev) => ({
      ...prev,
      [item.id]: {
        offered: current.offered,
        price: Number.isNaN(num) ? null : num,
      },
    }));
  };

  const handleSelectAllFiltered = (enable) => {
    const updates = { ...localChanges };
    filteredHairstyles.forEach((h) => {
      const curr = getItemState(h);
      updates[h.id] = {
        offered: enable,
        price: curr.price,
      };
    });
    setLocalChanges(updates);
  };

  const handleSave = () => {
    // Thu thập toàn bộ danh sách những kiểu tóc được chọn offered
    const payload = hairstyles
      .map((h) => {
        const state = getItemState(h);
        if (!state.offered) return null;
        return {
          hairstyleId: h.id,
          price: state.price,
        };
      })
      .filter(Boolean);

    saveMutation.mutate(payload);
  };

  // Lọc danh sách kiểu tóc
  const filteredHairstyles = hairstyles.filter((h) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!h.name.toLowerCase().includes(q)) return false;
    }
    if (genderFilter !== "ALL" && h.gender !== genderFilter) {
      return false;
    }
    if (lengthFilter !== "ALL" && h.hairLength !== lengthFilter) {
      return false;
    }
    return true;
  });

  // Thống kê
  const offeredCount = hairstyles.reduce((acc, h) => {
    return acc + (getItemState(h).offered ? 1 : 0);
  }, 0);

  const hasUnsavedChanges = Object.keys(localChanges).length > 0;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-line/20 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-line/20 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="p-8 text-center text-mauve border border-line">
        <p className="text-sm">Không thể tải danh sách kiểu tóc.</p>
        <p className="text-xs text-muted mt-1">Vui lòng thử lại sau.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Thông báo toast nổi */}
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

      {/* Header & Quick stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-mauve flex items-center gap-2">
            <Scissors className="w-6 h-6 text-primary" />
            Kiểu tóc phục vụ
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Chọn các kiểu tóc mà salon có chuyên môn thực hiện và cấu hình giá
            tham khảo cho khách hàng.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-card border border-line text-xs">
            <span className="text-muted">Đang nhận làm: </span>
            <span className="font-semibold text-primary">
              {offeredCount} / {hairstyles.length}
            </span>
          </div>

          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saveMutation.isPending}
            className={`flex items-center gap-2 font-medium text-sm transition-all ${
              hasUnsavedChanges
                ? "bg-primary text-black hover:opacity-90 shadow-lg shadow-primary/20"
                : "opacity-50 cursor-not-allowed"
            }`}
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>
      </div>

      {/* Thanh bộ lọc & tìm kiếm */}
      <Card className="p-4 border border-line bg-card/60 backdrop-blur-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Ô tìm kiếm */}
          <div className="relative">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Tìm theo tên kiểu tóc..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs sm:text-sm"
            />
          </div>

          {/* Lọc giới tính */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted shrink-0" />
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs sm:text-sm text-mauve focus:outline-none focus:border-primary"
            >
              <option value="ALL">Mọi giới tính</option>
              <option value="MEN">Nam</option>
              <option value="WOMEN">Nữ</option>
              <option value="UNISEX">Unisex</option>
            </select>
          </div>

          {/* Lọc độ dài */}
          <div>
            <select
              value={lengthFilter}
              onChange={(e) => setLengthFilter(e.target.value)}
              className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs sm:text-sm text-mauve focus:outline-none focus:border-primary"
            >
              <option value="ALL">Mọi độ dài</option>
              <option value="SHORT">Tóc ngắn</option>
              <option value="MEDIUM">Tóc vừa (ngang vai)</option>
              <option value="LONG">Tóc dài</option>
            </select>
          </div>
        </div>

        {/* Nút chọn nhanh */}
        <div className="flex items-center justify-between pt-2 border-t border-line/40 text-xs text-muted">
          <span>Tìm thấy {filteredHairstyles.length} kiểu tóc phù hợp</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSelectAllFiltered(true)}
              className="text-primary hover:underline"
            >
              Chọn tất cả đang lọc
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => handleSelectAllFiltered(false)}
              className="text-mauve/70 hover:underline"
            >
              Bỏ chọn tất cả
            </button>
          </div>
        </div>
      </Card>

      {/* Grid danh sách kiểu tóc */}
      {filteredHairstyles.length === 0 ? (
        <Card className="p-10 text-center border border-line">
          <Scissors className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
          <p className="text-sm text-mauve">Không tìm thấy kiểu tóc nào phù hợp.</p>
          <p className="text-xs text-muted mt-1">
            Hãy thử tìm bằng từ khoá khác hoặc bỏ bớt các bộ lọc.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHairstyles.map((h) => {
            const state = getItemState(h);
            const isOffered = state.offered;

            return (
              <div
                key={h.id}
                className={`relative rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col ${
                  isOffered
                    ? "bg-surface/80 border-primary/40 shadow-sm shadow-primary/5"
                    : "bg-surface/30 border-line/60 opacity-75 hover:opacity-100"
                }`}
              >
                <div className="p-4 flex gap-4 items-start">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-xl bg-card border border-line overflow-hidden shrink-0 relative">
                    {h.imageUrl ? (
                      <img
                        src={h.imageUrl}
                        alt={h.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted">
                        <Scissors className="w-6 h-6 opacity-40" />
                      </div>
                    )}
                  </div>

                  {/* Thông tin */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3
                        className="font-semibold text-sm text-mauve truncate"
                        title={h.name}
                      >
                        {h.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleToggleOffered(h)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                          isOffered
                            ? "bg-primary border-primary text-black"
                            : "border-line bg-card text-transparent hover:border-primary/60"
                        }`}
                        title={
                          isOffered ? "Bỏ nhận làm" : "Chọn nhận làm kiểu này"
                        }
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-card border border-line text-muted">
                        {h.gender === "MEN"
                          ? "Nam"
                          : h.gender === "WOMEN"
                          ? "Nữ"
                          : "Unisex"}
                      </span>
                      {h.hairLength && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-card border border-line text-muted">
                          {h.hairLength === "SHORT"
                            ? "Tóc ngắn"
                            : h.hairLength === "MEDIUM"
                            ? "Tóc vừa"
                            : "Tóc dài"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Phần cấu hình giá cho kiểu tóc */}
                {isOffered && (
                  <div className="px-4 pb-4 pt-2 border-t border-line/40 bg-card/40 mt-auto">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] text-muted flex items-center gap-1">
                        Giá tham khảo (VNĐ)
                        <span
                          title="Giá thực tế salon áp dụng cho mẫu tóc này. Nếu để trống, hệ thống dùng giá khởi điểm của salon."
                          className="cursor-help inline-block"
                        >
                          <HelpCircle className="w-3 h-3 text-muted/70" />
                        </span>
                      </label>
                      <input
                        type="text"
                        placeholder="Theo giá salon"
                        value={
                          state.price !== null && state.price !== undefined
                            ? Number(state.price).toLocaleString("vi-VN")
                            : ""
                        }
                        onChange={(e) => handlePriceChange(h, e.target.value)}
                        className="w-32 bg-surface border border-line rounded-lg px-2.5 py-1 text-right text-xs text-mauve focus:outline-none focus:border-primary font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating save bar if there are unsaved changes */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface/95 backdrop-blur-md border border-primary/50 shadow-2xl px-5 py-3 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="text-xs text-mauve">
            Bạn có thay đổi chưa lưu cho danh mục tóc.
          </div>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-primary text-black font-semibold text-xs px-4 py-1.5 h-auto flex items-center gap-1.5 shadow-md"
          >
            <Save className="w-3.5 h-3.5" />
            {saveMutation.isPending ? "Đang lưu..." : "Lưu ngay"}
          </Button>
        </div>
      )}
    </div>
  );
}
