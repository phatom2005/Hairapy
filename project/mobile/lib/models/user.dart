/// Khớp UserMeResponse bên backend (AuthService.java).
/// Backend chỉ THÊM field ở cuối nên các field mới đều nullable để app không vỡ khi thiếu.
class AppUser {
  final String email;

  /// USER | PREMIUM | ADMIN | TESTER | SALON_OWNER — vai trò hiển thị, KHÔNG dùng để xét quyền lợi gói.
  final String role;
  final String? fullName;
  final String? phone;
  final String? dateOfBirth;

  /// FREE | PRO (Gói Tuần) | PREMIUM (Gói Tháng) — gói đang thực sự hưởng.
  final String? plan;

  /// Hạn gói, ISO "yyyy-MM-ddTHH:mm:ss" theo giờ VN; null nếu Miễn phí.
  final String? planEndDate;

  /// LOCAL | GOOGLE | FACEBOOK
  final String? provider;
  final bool hasPassword;
  final int? salonId;
  final int? id;

  AppUser({
    required this.email,
    required this.role,
    this.fullName,
    this.phone,
    this.dateOfBirth,
    this.plan,
    this.planEndDate,
    this.provider,
    this.hasPassword = true,
    this.salonId,
    this.id,
  });

  bool get isStaff => role == 'ADMIN' || role == 'TESTER';

  bool get isSalonOwner => role == 'SALON_OWNER';

  /// Quyền lợi trả phí xét theo GÓI (plan), không theo role: chủ salon đã mua gói
  /// có role SALON_OWNER nhưng vẫn phải được coi là Premium. Bản backend cũ chưa
  /// trả `plan` thì dựa vào role PREMIUM như trước.
  bool get isPremium {
    if (isStaff) return true;
    final p = plan;
    if (p != null) return p == 'PRO' || p == 'PREMIUM';
    return role == 'PREMIUM';
  }

  DateTime? get planEndsAt => planEndDate == null ? null : DateTime.tryParse(planEndDate!);

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        email: json['email'] as String,
        role: json['role'] as String? ?? 'USER',
        fullName: json['fullName'] as String?,
        phone: json['phone'] as String?,
        dateOfBirth: json['dateOfBirth'] as String?,
        plan: json['plan'] as String?,
        planEndDate: json['planEndDate']?.toString(),
        provider: json['provider'] as String?,
        hasPassword: json['hasPassword'] as bool? ?? true,
        salonId: (json['salonId'] as num?)?.toInt(),
        id: (json['id'] as num?)?.toInt(),
      );
}
