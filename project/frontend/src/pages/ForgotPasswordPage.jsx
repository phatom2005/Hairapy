import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthShell, AuthHeading } from "../components/auth/AuthShell";
import { Button, Input } from "../components/ui";
import { AnimatedContent } from "../components/animated";
import { ArrowRight, MailIcon } from "../components/icons";
import api from "../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch {
      setError("Có lỗi xảy ra. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthShell>
        <AnimatedContent>
          <div className="flex flex-col gap-8">
            <AuthHeading
              title="Kiểm tra email của bạn"
              subtitle={`Nếu ${email} tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu. Liên kết có hiệu lực trong 30 phút.`}
            />
            <Link to="/login">
              <Button variant="brand" className="w-full" icon={<ArrowRight />}>
                Quay lại đăng nhập
              </Button>
            </Link>
          </div>
        </AnimatedContent>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AnimatedContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <AuthHeading
            title="Quên mật khẩu?"
            subtitle="Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu cho bạn."
          />
          <Input
            label="Email"
            type="email"
            icon={<MailIcon />}
            placeholder="ban@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error && <p className="text-center text-sm font-semibold text-rose-600">{error}</p>}
          <Button type="submit" variant="brand" className="w-full" disabled={loading} icon={<ArrowRight />}>
            {loading ? "Đang gửi..." : "Gửi liên kết đặt lại"}
          </Button>
          <Link to="/login" className="text-center text-sm font-semibold text-mauve hover:text-ink">
            Quay lại đăng nhập
          </Link>
        </form>
      </AnimatedContent>
    </AuthShell>
  );
}

