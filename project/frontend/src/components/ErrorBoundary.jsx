import { Component } from "react";
import { trackEvent } from "../lib/analytics";

/**
 * Error Boundary cấp App — bắt lỗi render bất kỳ ở bất kỳ page nào, tránh màn hình
 * trắng hoàn toàn khi có exception không lường trước (React chỉ hỗ trợ Error Boundary
 * qua class component, chưa có hook tương đương).
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary] Lỗi không lường trước:", error, errorInfo);
    try {
      sessionStorage.setItem("last_app_error", JSON.stringify({
        message: error?.message || String(error),
        stack: error?.stack,
        time: new Date().toISOString(),
      }));
    } catch {}
    trackEvent("exception", { description: `render: ${error?.name || "Error"}`, fatal: true, page_path: window.location.pathname });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
          <h1 className="text-2xl font-bold text-ink">Đã có lỗi xảy ra</h1>
          <p className="max-w-md text-sm text-mauve">
            Hairapy gặp sự cố ngoài dự kiến. Vui lòng thử tải lại trang — nếu vẫn lỗi, hãy quay lại sau ít phút.
          </p>

          {isLocal && this.state.error && (
            <div className="w-full max-w-xl text-left bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-mono overflow-auto max-h-60 whitespace-pre-wrap select-all">
              <div className="font-bold mb-1 text-red-800">
                {this.state.error.name}: {this.state.error.message}
              </div>
              <div className="text-[11px] opacity-75">
                {this.state.error.stack}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReload}
              className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 cursor-pointer"
            >
              Tải lại trang
            </button>
            <a
              href="/"
              className="rounded-full border border-line bg-white px-6 py-2.5 text-sm font-semibold text-ink transition hover:bg-canvas cursor-pointer"
            >
              Về trang chủ
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
