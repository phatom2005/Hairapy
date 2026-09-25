/// Khớp entity Salon — GET /salons (danh sách salon đối tác, công khai).
class Salon {
  final int id;
  final String name;
  final String address;
  final String district;
  final String? serviceTypes; // comma-separated: "Cắt tóc,Nhuộm tóc"
  final int priceFrom;
  final double rating;
  final bool verified;
  final String imageUrl;
  final String? phone;

  Salon({
    required this.id,
    required this.name,
    required this.address,
    required this.district,
    required this.priceFrom,
    required this.rating,
    required this.verified,
    required this.imageUrl,
    this.serviceTypes,
    this.phone,
  });

  List<String> get services =>
      (serviceTypes ?? '').split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();

  factory Salon.fromJson(Map<String, dynamic> json) => Salon(
        id: json['id'] as int,
        name: json['name'] as String? ?? '',
        address: json['address'] as String? ?? '',
        district: json['district'] as String? ?? '',
        serviceTypes: json['serviceTypes'] as String?,
        priceFrom: json['priceFrom'] as int? ?? 0,
        rating: (json['rating'] as num?)?.toDouble() ?? 0,
        verified: json['verified'] as bool? ?? false,
        imageUrl: json['imageUrl'] as String? ?? '',
        phone: json['phone'] as String?,
      );
}
