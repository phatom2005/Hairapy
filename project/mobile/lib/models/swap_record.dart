/// Một ảnh kết quả thử tóc trong lịch sử — khớp GET /profile/swaps.
class SwapRecord {
  final int id;
  final String hairstyleName;
  final String imageUrl;
  final DateTime createdAt;

  SwapRecord({
    required this.id,
    required this.hairstyleName,
    required this.imageUrl,
    required this.createdAt,
  });

  factory SwapRecord.fromJson(Map<String, dynamic> json) => SwapRecord(
        id: json['id'] as int,
        hairstyleName: json['hairstyleName'] as String? ?? 'Kiểu tóc',
        imageUrl: json['imageUrl'] as String? ?? '',
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      );
}
