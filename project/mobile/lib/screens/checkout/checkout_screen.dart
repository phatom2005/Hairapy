import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../api/api_client.dart';
import '../../theme.dart';

/// Khớp CheckoutPage.jsx: POST /payments/create {plan} -> {checkoutUrl}, rồi mở
/// trang thanh toán VietQR của PayOS. Bên web chỉ redirect cả trang; mobile mở
/// WebView TRONG APP và tự bắt điều hướng về returnUrl/cancelUrl (baseUrl +
/// "/payment/success" hoặc "/payment/cancel", xem PaymentService.java) để lấy
/// orderCode mà không cần rời khỏi app.
class CheckoutScreen extends StatefulWidget {
  final String plan; // "PRO" | "PREMIUM"
  const CheckoutScreen({super.key, required this.plan});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  bool _loading = false;
  String? _error;

  bool get _isPremium => widget.plan.toUpperCase() == 'PREMIUM';
  String get _planName => _isPremium ? 'Gói Tháng' : 'Gói Tuần';
  String get _planPrice => _isPremium ? '99.000đ' : '49.000đ';
  String get _planPeriod => _isPremium ? '30 ngày' : '7 ngày';

  Future<void> _startPayment() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ApiClient.instance.dio.post('/payments/create', data: {'plan': widget.plan});
      final checkoutUrl = (res.data as Map<String, dynamic>)['checkoutUrl'] as String?;
      if (checkoutUrl == null || checkoutUrl.isEmpty) {
        throw Exception('Không nhận được URL thanh toán từ hệ thống.');
      }
      if (!mounted) return;
      final result = await Navigator.of(context).push<Map<String, dynamic>>(
        MaterialPageRoute(builder: (_) => _PayOsWebView(checkoutUrl: checkoutUrl)),
      );
      if (!mounted) return;
      if (result != null) {
        context.go('/payment-result', extra: result);
      }
    } catch (e) {
      setState(() => _error = 'Đã xảy ra lỗi khi khởi tạo thanh toán. Vui lòng thử lại sau.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Thanh toán')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.line),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_planName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 2),
                          Text('Premium · $_planPeriod', style: const TextStyle(fontSize: 11.5, color: AppColors.muted)),
                        ],
                      ),
                    ),
                    Text(_planPrice, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.primary)),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 160, height: 160,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.line, width: 1.5, style: BorderStyle.solid),
                      ),
                      child: const Icon(Icons.qr_code_2, size: 96, color: AppColors.ink),
                    ),
                    const SizedBox(height: 16),
                    const Text('Bấm nút bên dưới để mở trang quét mã VietQR của PayOS',
                        textAlign: TextAlign.center, style: TextStyle(fontSize: 12.5, color: AppColors.muted)),
                  ],
                ),
              ),
              if (_error != null) ...[
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13), textAlign: TextAlign.center),
                ),
              ],
              ElevatedButton(
                onPressed: _loading ? null : _startPayment,
                child: _loading
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Thanh toán qua PayOS / VietQR'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PayOsWebView extends StatefulWidget {
  final String checkoutUrl;
  const _PayOsWebView({required this.checkoutUrl});

  @override
  State<_PayOsWebView> createState() => _PayOsWebViewState();
}

class _PayOsWebViewState extends State<_PayOsWebView> {
  late final WebViewController _controller;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(NavigationDelegate(
        onPageStarted: (_) => setState(() => _loading = true),
        onPageFinished: (_) => setState(() => _loading = false),
        onNavigationRequest: (request) {
          final uri = Uri.tryParse(request.url);
          if (uri == null) return NavigationDecision.navigate;
          if (uri.path.contains('/payment/success') || uri.path.contains('/payment/cancel')) {
            final orderCode = uri.queryParameters['orderCode'];
            Navigator.of(context).pop({
              'orderCode': orderCode,
              'cancelled': uri.path.contains('/payment/cancel'),
            });
            return NavigationDecision.prevent;
          }
          return NavigationDecision.navigate;
        },
      ))
      ..loadRequest(Uri.parse(widget.checkoutUrl));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('PayOS / VietQR'),
        leading: IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.of(context).pop()),
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_loading) const Center(child: CircularProgressIndicator()),
        ],
      ),
    );
  }
}
