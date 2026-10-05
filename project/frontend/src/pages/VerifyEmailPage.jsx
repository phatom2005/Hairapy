import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthShell, AuthHeading } from "../components/auth/AuthShell";
import { Button } from "../components/ui";
import { AnimatedContent } from "../components/animated";
import { ArrowRight } from "../components/icons";
import api from "../lib/api";

// Trang đích của link trong email: /verify-email?token=...
export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  // verifying | success | error
  const [status, setStatus] = useState(token ? "verifying" : "error");
  const [errorMessage, setErrorMessage] = useState(
    token ? "" : "Liên kết xác minh không hợp lệ."
  );
  // Chống gọi API 2 lần (React StrictMode chạy effect 2 lần ở dev)
  const calledRef = useRef(false);

  useEffect(() => {
    if (!token || calledRef.current) return;
    calledRef.current = true;

    api
      .post("/auth/verify-email", { token })
      .then(() => {
        setStatus("success");
        setTimeout(
          () =>
            navigate("/login", {
              replace: true,
              state: { message: "Xác minh email thành công! Hãy đăng nhập để bắt đầu." },
            }),
          2500
        );
      })
      .catch((err) => {
        setErrorMessage(
          err.response?.data?.message || "Liên kết không hợp lệ hoặc đã hết hạn."
        );
        setStatus("error");
      });
  }, [token, navigate]);

  return (
    <AuthShell>
      <AnimatedContent>
        <div className="flex flex-col gap-8">
          {status === "verifying" && (
            <AuthHeading title="Đang xác minh email..." subtitle="Vui lòng đợi trong giây lát." />
          )}
          {status === "success" && (
            <>
              <AuthHeading
                title="Xác minh email thành công"
                subtitle="Tài khoản của bạn đã được kích hoạt. Đang chuyển tới trang đăng nhập..."
              />
              <Link to="/login">
                <Button variant="brand" className="w-full" icon={<ArrowRight />}>
                  Đăng nhập ngay
                </Button>
              </Link>
            </>
          )}
          {status === "error" && (
            <>
              <AuthHeading title="Không thể xác minh email" subtitle={errorMessage} />
              <p className="text-center text-sm text-mauve">
                Đăng nhập bằng tài khoản của bạn để được gửi lại email xác minh mới.
              </p>
              <Link to="/login">
                <Button variant="brand" className="w-full" icon={<ArrowRight />}>
                  Tới trang đăng nhập
                </Button>
              </Link>
            </>
          )}
        </div>
      </AnimatedContent>
    </AuthShell>
  );
}
