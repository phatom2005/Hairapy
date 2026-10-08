import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../config/app_links.dart';
import '../../theme.dart';

/// Màn hình hiển thị nội dung pháp lý (Chính sách bảo mật, Điều khoản sử dụng) qua WebView.
class LegalWebViewScreen extends StatefulWidget {
  final String title;
  final String url;

  const LegalWebViewScreen({
    super.key,
    required this.title,
    required this.url,
  });

  @override
  State<LegalWebViewScreen> createState() => _LegalWebViewScreenState();
}

class _LegalWebViewScreenState extends State<LegalWebViewScreen> {
  late final WebViewController _controller;
  bool _loading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(NavigationDelegate(
        // Chỉ cho phép điều hướng trong domain Hairapy (trang Điều khoản/Privacy).
        // Link ra ngoài (nếu có) bị chặn để WebView này không trở thành trình duyệt tự do.
        onNavigationRequest: (request) {
          final uri = Uri.tryParse(request.url);
          if (uri == null) return NavigationDecision.prevent;
          final allowedHost = Uri.parse(kWebBaseUrl).host; // hairapy.io.vn
          final isAllowed = uri.scheme == 'about' ||
              (uri.scheme == 'https' &&
                  (uri.host == allowedHost || uri.host == 'www.$allowedHost'));
          return isAllowed ? NavigationDecision.navigate : NavigationDecision.prevent;
        },
        onPageStarted: (_) {
          if (mounted) setState(() => _loading = true);
        },
        onPageFinished: (_) {
          if (mounted) setState(() => _loading = false);
        },
        onWebResourceError: (error) {
          if (mounted) {
            setState(() {
              _loading = false;
              _errorMessage = 'Không thể tải trang (${error.description})';
            });
          }
        },
      ))
      ..loadRequest(_safeUri(widget.url));
  }

  /// URL đầu vào luôn phải thuộc domain Hairapy (https); sai thì rơi về trang chủ.
  Uri _safeUri(String raw) {
    final allowedHost = Uri.parse(kWebBaseUrl).host;
    final uri = Uri.tryParse(raw);
    if (uri != null &&
        uri.scheme == 'https' &&
        (uri.host == allowedHost || uri.host == 'www.$allowedHost')) {
      return uri;
    }
    return Uri.parse(kWebBaseUrl);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              setState(() {
                _loading = true;
                _errorMessage = null;
              });
              _controller.reload();
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          if (_errorMessage != null)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: AppColors.muted),
                    const SizedBox(height: 16),
                    Text(
                      _errorMessage!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 14, color: AppColors.muted),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () {
                        setState(() {
                          _loading = true;
                          _errorMessage = null;
                        });
                        _controller.reload();
                      },
                      child: const Text('Thử lại'),
                    ),
                  ],
                ),
              ),
            )
          else
            WebViewWidget(controller: _controller),
          if (_loading)
            const Center(
              child: CircularProgressIndicator(),
            ),
        ],
      ),
    );
  }
}
