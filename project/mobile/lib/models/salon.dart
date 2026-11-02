/// Khớp SalonPublicResponse — GET /salons (công khai).
/// Field mới (partner, description, stylePrice, distanceKm, toạ độ) đều tuỳ chọn.
class Salon {
  final int id;
  final String name;
  final String address;
  final String district;
  final String? serviceTypes; // CHUỖI phân tách dấu phẩy: "Cắt tóc,Nhuộm tóc"
  final int priceFrom;
  final double rating;
  final bool verified;
  final String imageUrl;
  final String? phone;
  final double? latitude;
  final double? longitude;
  final String? description;

  /// Đang là salon đối tác (nhận đặt lịch online).
  final bool partner;

  /// Giá salon tự đặt cho kiểu tóc đang lọc (khi gọi kèm hairstyleId).
  final int? stylePrice;
  final double? distanceKm;

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
    this.latitude,
    this.longitude,
    this.description,
    this.partner = false,
    this.stylePrice,
    this.distanceKm,
  });

  List<String> get services => splitServiceTypes(serviceTypes);

  factory Salon.fromJson(Map<String, dynamic> json) => Salon(
        id: (json['id'] as num).toInt(),
        name: json['name'] as String? ?? '',
        address: json['address'] as String? ?? '',
        district: json['district'] as String? ?? '',
        serviceTypes: json['serviceTypes'] as String?,
        priceFrom: (json['priceFrom'] as num?)?.toInt() ?? 0,
        rating: (json['rating'] as num?)?.toDouble() ?? 0,
        verified: json['verified'] as bool? ?? false,
        imageUrl: json['imageUrl'] as String? ?? '',
        phone: json['phone'] as String?,
        latitude: (json['latitude'] as num?)?.toDouble(),
        longitude: (json['longitude'] as num?)?.toDouble(),
        description: json['description'] as String?,
        partner: json['partner'] as bool? ?? false,
        stylePrice: (json['stylePrice'] as num?)?.toInt(),
        distanceKm: (json['distanceKm'] as num?)?.toDouble(),
      );
}

/// Tách "Cắt tóc, Uốn,Nhuộm" -> ["Cắt tóc","Uốn","Nhuộm"] (bỏ phần rỗng).
List<String> splitServiceTypes(String? raw) =>
    (raw ?? '').split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();

/// Một kiểu tóc salon nhận làm — SalonHairstyleItem.
class SalonHairstyleItem {
  final int id;
  final String name;
  final String imageUrl;
  final int? price;

  SalonHairstyleItem({required this.id, required this.name, required this.imageUrl, this.price});

  factory SalonHairstyleItem.fromJson(Map<String, dynamic> json) => SalonHairstyleItem(
        id: (json['id'] as num).toInt(),
        name: json['name'] as String? ?? '',
        imageUrl: json['imageUrl'] as String? ?? '',
        price: (json['price'] as num?)?.toInt(),
      );
}

/// GET /salons/{id} — SalonDetailResponse.
class SalonDetail {
  final Salon salon;
  final List<SalonHairstyleItem> hairstyles;

  SalonDetail({required this.salon, required this.hairstyles});

  factory SalonDetail.fromJson(Map<String, dynamic> json) => SalonDetail(
        salon: Salon.fromJson(json),
        hairstyles: ((json['hairstyles'] as List?) ?? const [])
            .map((e) => SalonHairstyleItem.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}
