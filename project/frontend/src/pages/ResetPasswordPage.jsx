import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthShell, AuthHeading } from "../components/auth/AuthShell";
import { Button, Input } from "../components/ui";
import { AnimatedContent } from "../components/animated";
import { LockIcon, ArrowRight } from "../components/icons";
import api from "../lib/api";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError("Liên kết không hợp lệ. Vui lòng yêu cầu đặt lại mật khẩu lại.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { token, newPassword, confirmPassword });
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.response?.data?.message || "Liên kết không hợp lệ hoặc đã hết hạn.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell>
        <AnimatedContent>
          <div className="flex flex-col gap-8">
            <AuthHeading title="Đặt lại mật khẩu thành công" subtitle="Đang chuyển tới trang đăng nhập..." />
          </div>
        </AnimatedContent>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AnimatedContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <AuthHeading title="Đặt mật khẩu mới" subtitle="Nhập mật khẩu mới cho tài khoản của bạn." />
          <Input
            label="Mật khẩu mới"
            togglePassword
            icon={<LockIcon />}
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
          <Input
            label="Xác nhận mật khẩu mới"
            togglePassword
            icon={<LockIcon />}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
          {error && <p className="text-center text-sm font-semibold text-rose-600">{error}</p>}
          <Button type="submit" variant="brand" className="w-full" disabled={loading} icon={<ArrowRight />}>
            {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
          </Button>
          <Link to="/login" className="text-center text-sm font-semibold text-mauve hover:text-ink">
            Quay lại đăng nhập
          </Link>
        </form>
      </AnimatedContent>
    </AuthShell>
  );
}
