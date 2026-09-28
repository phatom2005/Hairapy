import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { PROFILE_IMG } from "../lib/figmaAssets";
import { Button, Card, Input, Badge } from "../components/ui";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import {
  UserIcon,
  CameraIcon,
  MailIcon,
  ShieldIcon,
  StarIcon,
  LockIcon,
  CheckIcon,
  ArrowRight,
} from "../components/icons";
import useAuthStore from "../store/useAuthStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

const NAV_ITEMS = [
  { id: "Thông tin cá nhân", label: "Thông tin cá nhân", icon: UserIcon },
  { id: "Thông báo", label: "Thông báo", icon: MailIcon },
  { id: "Bảo mật", label: "Bảo mật", icon: ShieldIcon },
  { id: "Gói dịch vụ", label: "Gói dịch vụ", icon: StarIcon },
];

export default function SettingsPage() {
  const [active, setActive] = useState(NAV_ITEMS[0].id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, token, logout, updateUser } = useAuthStore();

  // Luôn nạp thông tin cá nhân mới nhất từ server khi mở Settings
  const { data: profileData } = useQuery({
    queryKey: ["auth-me"],
    queryFn: async () => {
      const { data } = await api.get("/auth/me");
      updateUser(data);
      return data;
    },
    enabled: !!token,
    staleTime: 30_000,
  });

  const currentUser = profileData || user;
  const [fullName, setFullName] = useState(currentUser?.fullName || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [dob, setDob] = useState(currentUser?.dateOfBirth || "");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  // Đồng bộ form khi user trong store hoặc profileData thay đổi
  useEffect(() => {
    const cur = profileData || user;
    if (cur) {
      setFullName(cur.fullName || "");
      setPhone(cur.phone || "");
      setDob(cur.dateOfBirth || "");
    }
  }, [profileData, user?.fullName, user?.phone, user?.dateOfBirth]);

  // Lấy thông tin quota / subscription của user hiện tại
  const { data: usageData } = useQuery({
    queryKey: ["usage-summary"],
    queryFn: async () => {
      const { data } = await api.get("/usage/me");
      return data;
    },
    enabled: !!token,
    staleTime: 30_000,
  });

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    try {
      const { data } = await api.put("/auth/me", {
        fullName,
        phone: phone || null,
        dateOfBirth: dob || null,
      });
      updateUser(data);
      queryClient.setQueryData(["auth-me"], data);
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
      setSaveMessage({ type: "success", text: "Đã lưu thay đổi thông tin cá nhân." });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors && Object.values(err.response.data.errors).join(", ")) ||
        "Không thể lưu thay đổi. Vui lòng thử lại.";
      setSaveMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const effectiveRole = profileData?.role || user?.role || "USER";
  const isPaid = effectiveRole === "PREMIUM" || effectiveRole === "ADMIN" || effectiveRole === "TESTER";

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-6 px-6 py-12 sm:px-16 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <Card className="h-fit p-5">
          <h1 className="mb-6 text-2xl font-bold text-ink">Cài đặt</h1>
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActive(item.id)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-base transition ${
                    active === item.id ? "bg-brand text-white font-medium" : "text-mauve hover:bg-canvas"
                  }`}
                >
                  <IconComp size={18} /> {item.label}
                </button>
              );
            })}
            <div className="my-2 h-px bg-divider/30" />
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-base text-[#ba1a1a] hover:bg-[#ba1a1a]/5"
            >
              Đăng xuất
            </button>
          </nav>
        </Card>

        {/* Panel chính */}
        <Card className="flex flex-col gap-8 p-8 sm:p-12">
          {/* TAB 1: THÔNG TIN CÁ NHÂN */}
          {active === "Thông tin cá nhân" && (
            <>
              {/* Avatar */}
              <div className="flex flex-col gap-4">
                <div className="relative w-40">
                  <div className="overflow-hidden rounded-full border-4 border-[#f3f3f3] shadow">
                    <img src={PROFILE_IMG} alt="Avatar" className="size-40 object-cover" />
                  </div>
                  <button
                    disabled
                    title="Tính năng đang phát triển, sắp ra mắt"
                    className="absolute bottom-2 right-2 flex size-10 items-center justify-center rounded-full bg-pink/60 text-white shadow-lg cursor-not-allowed"
                  >
                    <CameraIcon size={16} />
                  </button>
                </div>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-ink">Thông tin cá nhân</h2>
                  <p className="text-mauve">Cập nhật chi tiết hồ sơ của bạn để có trải nghiệm AI tốt hơn.</p>
                </div>
              </div>

              {/* Form */}
              <form className="flex flex-col gap-8" onSubmit={handleSaveProfile}>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <Input label="Họ và tên" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  <Input label="Email" type="email" value={profileData?.email || user?.email || ""} readOnly />
                  <Input label="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <Input label="Ngày sinh" type="date" value={dob || ""} onChange={(e) => setDob(e.target.value)} />
                </div>
                {saveMessage && (
                  <p className={saveMessage.type === "success" ? "text-sm text-green-600 font-medium" : "text-sm text-red-600 font-medium"}>
                    {saveMessage.text}
                  </p>
                )}
                <div className="flex justify-end">
                  <Button type="submit" variant="brand" className="px-12" disabled={saving}>
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* TAB 2: THÔNG BÁO */}
          {active === "Thông báo" && (
            <div className="flex flex-col gap-6">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-bold tracking-tight text-ink">Cài đặt thông báo</h2>
                  <Badge variant="new">Sắp ra mắt</Badge>
                </div>
                <p className="text-mauve mt-1">Quản lý cách Hairapy gửi thông báo và tin tức mới đến bạn.</p>
              </div>

              <div className="divide-y divide-line rounded-2xl border border-divider/10 bg-canvas/40 p-6 space-y-5">
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <h4 className="font-semibold text-ink">Thông báo kiểu tóc xu hướng</h4>
                    <p className="text-xs text-mauve">Nhận email gợi ý các kiểu tóc thịnh hành phù hợp với dáng mặt của bạn.</p>
                  </div>
                  <input type="checkbox" defaultChecked disabled className="size-5 rounded accent-primary opacity-60 cursor-not-allowed" />
                </div>

                <div className="flex items-center justify-between pt-5">
                  <div>
                    <h4 className="font-semibold text-ink">Nhắc nhở làm mới phong cách</h4>
                    <p className="text-xs text-mauve">Nhắc bạn thử kiểu tóc mới sau mỗi 30-45 ngày.</p>
                  </div>
                  <input type="checkbox" disabled className="size-5 rounded accent-primary opacity-60 cursor-not-allowed" />
                </div>

                <div className="flex items-center justify-between pt-5">
                  <div>
                    <h4 className="font-semibold text-ink">Ưu đãi & Khuyến mãi từ Salon đối tác</h4>
                    <p className="text-xs text-mauve">Nhận voucher giảm giá khi đặt lịch tại các salon uy tín trên hệ thống.</p>
                  </div>
                  <input type="checkbox" defaultChecked disabled className="size-5 rounded accent-primary opacity-60 cursor-not-allowed" />
                </div>
              </div>

              <div className="rounded-xl bg-primary/5 p-4 text-xs font-medium text-primary">
                💡 Hệ thống tùy chỉnh thông báo chi tiết đang được hoàn thiện và sẽ sớm khả dụng trong bản cập nhật tới.
              </div>
            </div>
          )}

          {/* TAB 3: BẢO MẬT */}
          {active === "Bảo mật" && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-ink">Bảo mật tài khoản</h2>
                <p className="text-mauve mt-1">Bảo vệ thông tin cá nhân và quản lý phương thức đăng nhập.</p>
              </div>

              {/* Thông tin đăng nhập */}
              <div className="rounded-2xl border border-divider/10 bg-canvas/40 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <LockIcon size={20} />
                    </span>
                    <div>
                      <h4 className="font-semibold text-ink">Tài khoản đăng nhập</h4>
                      <p className="text-xs text-mauve">{user?.email}</p>
                    </div>
                  </div>
                  <Badge variant="new">Đã kích hoạt</Badge>
                </div>

                <div className="my-2 h-px bg-divider/20" />

                <div className="flex flex-col gap-2">
                  <h4 className="font-semibold text-ink">Đổi mật khẩu</h4>
                  <p className="text-xs text-mauve leading-relaxed">
                    Để đảm bảo an toàn tối đa cho tài khoản của bạn, yêu cầu đổi mật khẩu được xác thực bảo mật qua email đã đăng ký.
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    to="/forgot-password"
                    className="inline-flex items-center gap-2 rounded-xl border border-primary px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 transition"
                  >
                    Gửi liên kết đặt lại mật khẩu qua email <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GÓI DỊCH VỤ */}
          {active === "Gói dịch vụ" && (() => {
            const faceScanRemaining = usageData?.faceScan
              ? Math.max(usageData.faceScan.limit - usageData.faceScan.used, 0)
              : 1;
            const hairSwapRemaining = usageData?.hairSwap
              ? Math.max(usageData.hairSwap.limit - usageData.hairSwap.used, 0)
              : 5;

            return (
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight text-ink">Gói dịch vụ & Hạn mức</h2>
                    <p className="text-mauve mt-1">Chi tiết gói thành viên và số lượt sử dụng AI còn lại hôm nay.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ["usage-summary"] });
                      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-semibold text-mauve hover:text-ink hover:bg-canvas transition shadow-sm cursor-pointer"
                    title="Tải lại số lượt sử dụng mới nhất từ máy chủ"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Làm mới hạn mức
                  </button>
                </div>

                {/* Gói hiện tại */}
                <div className="rounded-2xl border border-divider/10 bg-gradient-to-br from-canvas/80 to-canvas/30 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-mauve">Gói tài khoản hiện tại</p>
                      <h3 className="font-display text-2xl font-extrabold text-ink mt-1">
                        {effectiveRole === "ADMIN"
                          ? "Quản trị viên (ADMIN)"
                          : effectiveRole === "PREMIUM"
                          ? "Thành viên PREMIUM"
                          : effectiveRole === "TESTER"
                          ? "Tài khoản TESTER"
                          : "Thành viên MIỄN PHÍ (FREE)"}
                      </h3>
                    </div>
                    <Badge variant={isPaid ? "premium" : "neutral"}>
                      {effectiveRole}
                    </Badge>
                  </div>

                  <div className="my-6 h-px bg-divider/20" />

                  {/* Hạn mức sử dụng */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-line bg-white/70 p-4">
                      <p className="text-xs font-semibold text-mauve">Phân tích khuôn mặt AI</p>
                      {usageData?.faceScan?.unlimited ? (
                        <p className="text-lg font-bold text-primary mt-1">Không giới hạn</p>
                      ) : (
                        <>
                          <div className="flex items-baseline justify-between mt-1">
                            <p className={`text-lg font-bold ${faceScanRemaining === 0 ? "text-red-500" : "text-ink"}`}>
                              Còn lại: {faceScanRemaining} lượt
                            </p>
                            <span className="text-xs text-mauve font-medium">
                              Đã dùng {usageData?.faceScan?.used ?? 0}/{usageData?.faceScan?.limit ?? 1}
                            </span>
                          </div>
                          <div className="w-full bg-line rounded-full h-1.5 mt-2.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${faceScanRemaining === 0 ? "bg-red-500" : "bg-primary"}`}
                              style={{ width: `${Math.min(100, ((usageData?.faceScan?.used ?? 0) / (usageData?.faceScan?.limit ?? 1)) * 100)}%` }}
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="rounded-xl border border-line bg-white/70 p-4">
                      <p className="text-xs font-semibold text-mauve">Thử kiểu tóc AI (Hair Swap)</p>
                      {usageData?.hairSwap?.unlimited ? (
                        <p className="text-lg font-bold text-primary mt-1">Không giới hạn</p>
                      ) : (
                        <>
                          <div className="flex items-baseline justify-between mt-1">
                            <p className={`text-lg font-bold ${hairSwapRemaining === 0 ? "text-red-500" : "text-ink"}`}>
                              Còn lại: {hairSwapRemaining} lượt
                            </p>
                            <span className="text-xs text-mauve font-medium">
                              Đã dùng {usageData?.hairSwap?.used ?? 0}/{usageData?.hairSwap?.limit ?? 1}
                            </span>
                          </div>
                          <div className="w-full bg-line rounded-full h-1.5 mt-2.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${hairSwapRemaining === 0 ? "bg-red-500" : "bg-primary"}`}
                              style={{ width: `${Math.min(100, ((usageData?.hairSwap?.used ?? 0) / (usageData?.hairSwap?.limit ?? 1)) * 100)}%` }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Quyền lợi kiểu tóc */}
                  <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-mauve">
                    <CheckIcon size={16} className={isPaid ? "text-primary" : "text-muted"} />
                    {isPaid
                      ? "Mở khóa toàn bộ kho kiểu tóc VIP / PRO và kiểu màu nhuộm cao cấp."
                      : "Đang sử dụng các kiểu tóc miễn phí cơ bản trong catalog."}
                  </div>

                  {/* Nút nâng cấp nếu là tài khoản FREE */}
                  {!isPaid && (
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-primary/5 p-4">
                      <div>
                        <p className="text-sm font-bold text-ink">Trải nghiệm không giới hạn với Premium</p>
                        <p className="text-xs text-mauve">Nâng cấp để nhận 5 lượt quét và 20 lượt thử tóc AI mỗi ngày.</p>
                      </div>
                      <Button to="/pricing" variant="brand" className="px-6 py-2.5 text-xs">
                        Nâng cấp ngay
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </Card>
      </div>

      <Footer />
    </div>
  );
}
