import '../config/plans.dart';

/// Khớp MyPaymentResponse — GET /payments/my (Page -> "content"), mới nhất trước.
class PaymentRecord {
  final int orderCode;
  final String plan; // PRO | PREMIUM
  final int amount; // VND
  final String status; // PENDING | PAID | CANCELLED
  final DateTime? createdAt;
  final DateTime? paidAt;

  PaymentRecord({
    required this.orderCode,
    required this.plan,
    required this.amount,
    required this.status,
    this.createdAt,
    this.paidAt,
  });

  factory PaymentRecord.fromJson(Map<String, dynamic> json) => PaymentRecord(
        orderCode: (json['orderCode'] as num?)?.toInt() ?? 0,
        plan: json['plan'] as String? ?? 'FREE',
        amount: (json['amount'] as num?)?.toInt() ?? 0,
        status: json['status'] as String? ?? 'PENDING',
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? ''),
        paidAt: DateTime.tryParse(json['paidAt']?.toString() ?? ''),
      );

  String get planName => planLabel(plan);
  String get statusLabel => kPaymentStatusLabels[status] ?? status;

  /// Ngày hiển thị: ngày thanh toán nếu đã trả, không thì ngày tạo đơn.
  DateTime? get displayDate => paidAt ?? createdAt;
}

const Map<String, String> kPaymentStatusLabels = {
  'PAID': 'Thành công',
  'PENDING': 'Chờ thanh toán',
  'CANCELLED': 'Đã huỷ',
};

/// 99000 -> "99.000đ"
String formatVnd(int v) {
  final neg = v < 0;
  final s = v.abs().toString();
  final buf = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buf.write('.');
    buf.write(s[i]);
  }
  return '${neg ? '-' : ''}${buf.toString()}đ';
}

/// Đọc response phân trang ({content: [...]}) hoặc mảng thuần.
List<PaymentRecord> parsePaymentPage(dynamic data) {
  final list = data is Map ? (data['content'] as List? ?? const []) : (data is List ? data : const []);
  return list.whereType<Map>().map((e) => PaymentRecord.fromJson(Map<String, dynamic>.from(e))).toList();
}
