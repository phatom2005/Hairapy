import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PROFILE_IMG } from "../lib/figmaAssets";
import { Button, Card, Input } from "../components/ui";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { UserIcon, CameraIcon } from "../components/icons";
import useAuthStore from "../store/useAuthStore";
import api from "../lib/api";

const NAV = ["Thông tin cá nhân", "Thông báo", "Bảo mật", "Gói dịch vụ"];

export default function SettingsPage() {
  const [active, setActive] = useState(NAV[0]);
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuthStore();

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [dob, setDob] = useState(user?.dateOfBirth || "");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

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
      setSaveMessage({ type: "success", text: "Đã lưu thay đổi." });
    } catch (err) {
      const msg = err.response?.data?.message
        || (err.response?.data?.errors && Object.values(err.response.data.errors).join(", "))
        || "Không thể lưu thay đổi. Vui lòng thử lại.";
      setSaveMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-6 px-6 py-12 sm:px-16 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <Card className="h-fit p-5">
          <h1 className="mb-6 text-2xl font-bold text-ink">Cài đặt</h1>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <button key={item} onClick={() => setActive(item)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-base transition ${
                  active === item ? "bg-brand text-white" : "text-mauve hover:bg-canvas"}`}>
                <UserIcon size={16} /> {item}
              </button>
            ))}
            <div className="my-2 h-px bg-divider/30" />
            <button onClick={() => {
              logout();
              navigate("/login");
            }}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-base text-[#ba1a1a] hover:bg-[#ba1a1a]/5">
              Đăng xuất
            </button>
          </nav>
        </Card>

        {/* Panel */}
        <Card className="flex flex-col gap-10 p-8 sm:p-12">
          {/* Avatar */}
          <div className="flex flex-col gap-4">
            <div className="relative w-40">
              <div className="overflow-hidden rounded-full border-4 border-[#f3f3f3] shadow">
                <img src={PROFILE_IMG} alt="Avatar" className="size-40 object-cover" />
              </div>
              <button className="absolute bottom-2 right-2 flex size-10 items-center justify-center rounded-full bg-pink text-white shadow-lg">
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
              <Input label="Email" type="email" defaultValue={user?.email || ""} readOnly />
              <Input label="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input label="Ngày sinh" type="date" value={dob || ""} onChange={(e) => setDob(e.target.value)} />
            </div>
            {saveMessage && (
              <p className={saveMessage.type === "success" ? "text-sm text-green-600" : "text-sm text-red-600"}>
                {saveMessage.text}
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" variant="brand" className="px-12" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
