import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../api/api_client.dart';
import '../../providers/auth_provider.dart';
import '../../theme.dart';

enum _Status { checking, paid, pendingWebhook, cancelled, error }

/// Khớp PaymentSuccessPage.jsx: poll GET /payments/status/{orderCode} mỗi 2s,
/// tối đa 15 lần (~30s chờ webhook PayOS cập nhật PAID), rồi đồng bộ lại user
/// (fetchMe) để cờ Premium có hiệu lực ngay trong app.
class PaymentResultScreen extends ConsumerStatefulWidget {
  final String? orderCode;
  final bool cancelled;
  const PaymentResultScreen({super.key, required this.orderCode, this.cancelled = false});

  @override
  ConsumerState<PaymentResultScreen> createState() => _PaymentResultScreenState();
}

class _PaymentResultScreenState extends ConsumerState<PaymentResultScreen> {
  _Status _status = _Status.checking;
  String _errorMessage = '';
  int _pollCount = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    if (widget.cancelled) {
      _status = _Status.cancelled;
    } else if (widget.orderCode == null || widget.orderCode!.isEmpty) {
      _status = _Status.error;
      _errorMessage = 'Không tìm thấy mã hoá đơn (orderCode) trong yêu cầu.';
    } else {
      _checkStatus();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _checkStatus() async {
    try {
      final res = await ApiClient.instance.dio.get('/payments/status/${widget.orderCode}');
      final paymentStatus = (res.data as Map<String, dynamic>)['status'] as String?;
      if (paymentStatus == 'PAID') {
        await ref.read(authProvider.notifier).fetchMe();
        if (mounted) setState(() => _status = _Status.paid);
        return;
      }
      _pollCount++;
      if (_pollCount >= 15) {
        if (mounted) setState(() => _status = _Status.pendingWebhook);
        return;
      }
      _timer = Timer(const Duration(seconds: 2), _checkStatus);
    } catch (_) {
      _pollCount++;
      if (_pollCount >= 15) {
        if (mounted) {
          setState(() {
            _status = _Status.error;
            _errorMessage = 'Lỗi kết nối kiểm tra trạng thái thanh toán quá lâu.';
          });
        }
        return;
      }
      _timer = Timer(const Duration(seconds: 2), _checkStatus);
    }
  }

  @override
  Widget build(BuildContext context) {
    final (icon, iconColor, title, message) = switch (_status) {
      _Status.checking => (Icons.hourglass_top, AppColors.primary, 'Đang xác nhận thanh toán…', 'Vui lòng chờ trong giây lát, đừng đóng màn hình này.'),
      _Status.paid => (Icons.check_circle, AppColors.lime, 'Thanh toán thành công!', 'Tài khoản của bạn đã được nâng cấp lên Premium.'),
      _Status.pendingWebhook => (Icons.schedule, AppColors.magenta, 'Đang chờ xác nhận từ PayOS', 'Giao dịch của bạn đã ghi nhận nhưng hệ thống chưa cập nhật kịp. Kiểm tra lại ở mục Cá nhân sau ít phút.'),
      _Status.cancelled => (Icons.cancel_outlined, AppColors.magenta, 'Đã huỷ thanh toán', 'Bạn đã huỷ giao dịch. Không có khoản nào bị trừ.'),
      _Status.error => (Icons.error_outline, Colors.red, 'Không thể xác nhận thanh toán', _errorMessage),
    };

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _status == _Status.checking
                  ? const SizedBox(height: 64, width: 64, child: CircularProgressIndicator(strokeWidth: 3))
                  : Icon(icon, size: 72, color: iconColor),
              const SizedBox(height: 22),
              Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700)),
              const SizedBox(height: 10),
              Text(message, textAlign: TextAlign.center, style: const TextStyle(fontSize: 13.5, color: AppColors.mauve, height: 1.5)),
              const SizedBox(height: 28),
              if (_status != _Status.checking)
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => context.go(_status == _Status.paid ? '/scan' : '/pricing'),
                    child: Text(_status == _Status.paid ? 'Vào ứng dụng' : 'Quay lại gói dịch vụ'),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
