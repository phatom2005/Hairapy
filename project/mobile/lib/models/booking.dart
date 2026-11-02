/// Khớp MyBookingResponse — GET /bookings/my (Page -> "content").
class MyBooking {
  final int id;
  final int? salonId;
  final String salonName;
  final String? salonAddress;
  final String? salonPhone;
  final String? hairstyleName;
  final String? tryOnImageUrl;
  final DateTime? preferredTime;
  final String status; // PENDING | CONFIRMED | REJECTED | COMPLETED | NO_SHOW | CANCELLED | EXPIRED
  final String? note;
  final String? salonNote;
  final DateTime? createdAt;

  MyBooking({
    required this.id,
    required this.salonName,
    required this.status,
    this.salonId,
    this.salonAddress,
    this.salonPhone,
    this.hairstyleName,
    this.tryOnImageUrl,
    this.preferredTime,
    this.note,
    this.salonNote,
    this.createdAt,
  });

  factory MyBooking.fromJson(Map<String, dynamic> json) => MyBooking(
        id: (json['id'] as num).toInt(),
        salonId: (json['salonId'] as num?)?.toInt(),
        salonName: json['salonName'] as String? ?? 'Salon',
        salonAddress: json['salonAddress'] as String?,
        salonPhone: json['salonPhone'] as String?,
        hairstyleName: json['hairstyleName'] as String?,
        tryOnImageUrl: json['tryOnImageUrl'] as String?,
        preferredTime: DateTime.tryParse(json['preferredTime']?.toString() ?? ''),
        status: json['status'] as String? ?? 'PENDING',
        note: json['note'] as String?,
        salonNote: json['salonNote'] as String?,
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? ''),
      );

  /// Huỷ được khi đang chờ/đã xác nhận và chưa tới giờ hẹn (khớp BookingController.cancelBooking).
  bool canCancel(DateTime now) =>
      (status == 'PENDING' || status == 'CONFIRMED') && preferredTime != null && preferredTime!.isAfter(now);
}

const Map<String, String> kBookingStatusLabels = {
  'PENDING': 'Chờ salon xác nhận',
  'CONFIRMED': 'Đã xác nhận',
  'REJECTED': 'Salon từ chối',
  'COMPLETED': 'Đã hoàn thành',
  'NO_SHOW': 'Không đến',
  'CANCELLED': 'Đã huỷ',
  'EXPIRED': 'Hết hạn',
};
