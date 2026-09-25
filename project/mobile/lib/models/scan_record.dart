/// Khớp ScanHistoryResponse — GET /profile/scans (trường "scans").
class ScanRecord {
  final int id;
  final String faceShape;
  final String imageUrl;
  final String hairType;
  final DateTime createdAt;

  ScanRecord({
    required this.id,
    required this.faceShape,
    required this.imageUrl,
    required this.hairType,
    required this.createdAt,
  });

  factory ScanRecord.fromJson(Map<String, dynamic> json) => ScanRecord(
        id: json['id'] as int,
        faceShape: json['faceShape'] as String? ?? '',
        imageUrl: json['imageUrl'] as String? ?? '',
        hairType: json['hairType'] as String? ?? '',
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      );
}
