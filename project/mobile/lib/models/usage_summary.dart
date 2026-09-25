/// Khớp UsageSummaryResponse — GET /usage/me.
class QuotaInfo {
  final int used;
  final int limit;
  final bool unlimited;

  QuotaInfo({required this.used, required this.limit, required this.unlimited});

  bool get isExhausted => !unlimited && used >= limit;

  factory QuotaInfo.fromJson(Map<String, dynamic> json) => QuotaInfo(
        used: json['used'] as int? ?? 0,
        limit: json['limit'] as int? ?? 1,
        unlimited: json['unlimited'] as bool? ?? false,
      );
}

class UsageSummary {
  final QuotaInfo faceScan;
  final QuotaInfo hairSwap;

  UsageSummary({required this.faceScan, required this.hairSwap});

  factory UsageSummary.fromJson(Map<String, dynamic> json) => UsageSummary(
        faceScan: QuotaInfo.fromJson(json['faceScan'] as Map<String, dynamic>),
        hairSwap: QuotaInfo.fromJson(json['hairSwap'] as Map<String, dynamic>),
      );
}
