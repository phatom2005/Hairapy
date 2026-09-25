/// Khớp UserMeResponse bên backend (AuthService.java).
class AppUser {
  final String email;
  final String role; // FREE | PREMIUM | ADMIN | TESTER
  final String? fullName;
  final String? phone;
  final String? dateOfBirth;

  AppUser({
    required this.email,
    required this.role,
    this.fullName,
    this.phone,
    this.dateOfBirth,
  });

  bool get isPremium => role == 'PREMIUM' || role == 'ADMIN' || role == 'TESTER';

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        email: json['email'] as String,
        role: json['role'] as String,
        fullName: json['fullName'] as String?,
        phone: json['phone'] as String?,
        dateOfBirth: json['dateOfBirth'] as String?,
      );
}
