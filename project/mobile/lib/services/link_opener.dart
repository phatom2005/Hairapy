import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

/// Mở link ngoài app (trình duyệt, Google Maps, gọi điện). Lỗi -> báo snackbar, không crash.
Future<void> openExternalUrl(BuildContext context, String url) async {
  final messenger = ScaffoldMessenger.of(context);
  final uri = Uri.tryParse(url);
  var ok = false;
  if (uri != null) {
    try {
      ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      ok = false;
    }
  }
  if (!ok) {
    messenger.showSnackBar(const SnackBar(content: Text('Không mở được liên kết trên máy này.')));
  }
}

/// Gọi điện tới số [phone] (bỏ khoảng trắng/dấu chấm).
Future<void> callPhone(BuildContext context, String phone) =>
    openExternalUrl(context, 'tel:${phone.replaceAll(RegExp(r'[^0-9+]'), '')}');

/// Mở Google Maps theo toạ độ (ưu tiên) hoặc địa chỉ.
Future<void> openMaps(BuildContext context, {double? lat, double? lng, String? address}) {
  final query = (lat != null && lng != null) ? '$lat,$lng' : Uri.encodeComponent(address ?? '');
  return openExternalUrl(context, 'https://www.google.com/maps/search/?api=1&query=$query');
}
