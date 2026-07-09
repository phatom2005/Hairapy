import { Component } from "react";

/**
 * Error Boundary cấp App — bắt lỗi render bất kỳ ở bất kỳ page nào, tránh màn hình
 * trắng hoàn toàn khi có exception không lường trước (React chỉ hỗ trợ Error Boundary
 * qua class component, chưa có hook tương đương).
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log ra console để dev debug — chưa có Sentry ở FE, chỉ backend đang dùng Sentry.
    console.error("[ErrorBoundary] Lỗi không lường trước:", error, errorInfo);
  }

  handleReload = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
          <h1 className="text-2xl font-bold text-ink">Đã có lỗi xảy ra</h1>
          <p className="max-w-md text-sm text-mauve">
            Hairapy gặp sự cố ngoài dự kiến. Vui lòng thử tải lại trang — nếu vẫn lỗi, hãy quay lại sau ít phút.
          </p>
          <button
            onClick={this.handleReload}
            className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 cursor-pointer"
          >
            Về trang chủ
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
