import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../config/plans.dart';
import '../models/salon.dart';
import '../providers/auth_provider.dart';
import '../theme.dart';
import '../utils/booking_time.dart';

/// Mở form đặt lịch tại [salon]. Khớp BookingForm.jsx bên web (POST /bookings).
/// [tryOnImageUrl] phải là ảnh nằm trong lịch sử thử tóc của chính user (backend kiểm tra).
/// Trả true nếu gửi thành công.
Future<bool> showBookingSheet(
  BuildContext context, {
  required Salon salon,
  int? hairstyleId,
  String? hairstyleName,
  String? tryOnImageUrl,
  String? faceShape,
}) async {
  final ok = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (_) => _BookingSheet(
      salon: salon,
      hairstyleId: hairstyleId,
      hairstyleName: hairstyleName,
      tryOnImageUrl: tryOnImageUrl,
      faceShape: faceShape,
    ),
  );
  return ok == true;
}

class _BookingSheet extends ConsumerStatefulWidget {
  final Salon salon;
  final int? hairstyleId;
  final String? hairstyleName;
  final String? tryOnImageUrl;
  final String? faceShape;

  const _BookingSheet({
    required this.salon,
    this.hairstyleId,
    this.hairstyleName,
    this.tryOnImageUrl,
    this.faceShape,
  });

  @override
  ConsumerState<_BookingSheet> createState() => _BookingSheetState();
}

class _BookingSheetState extends ConsumerState<_BookingSheet> {
  late final TextEditingController _nameCtrl;
  late final TextEditingController _phoneCtrl;
  final _noteCtrl = TextEditingController();
  DateTime? _time;
  bool _consent = false;
  bool _sending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authProvider).user;
    _nameCtrl = TextEditingController(text: user?.fullName ?? '');
    _phoneCtrl = TextEditingController(text: user?.phone ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickTime() async {
    final now = DateTime.now();
    final initial = _time ?? now.add(const Duration(days: 1));
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime(initial.year, initial.month, initial.day),
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: now.add(const Duration(days: 30)),
      helpText: 'Chọn ngày hẹn',
    );
    if (date == null || !mounted) return;
    final t = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: initial.hour < 8 ? 9 : initial.hour, minute: 0),
      helpText: 'Chọn giờ hẹn',
    );
    if (t == null) return;
    setState(() {
      _time = DateTime(date.year, date.month, date.day, t.hour, t.minute);
      _error = null;
    });
  }

  Future<void> _submit() async {
    final name = _nameCtrl.text.trim();
    final phone = normalizePhone(_phoneCtrl.text.trim());
    String? err;
    if (name.length < 2) {
      err = 'Vui lòng nhập họ tên (ít nhất 2 ký tự).';
    } else if (!isValidVnPhone(phone)) {
      err = 'Số điện thoại chưa đúng (ví dụ 0912345678).';
    } else if (_time == null) {
      err = 'Vui lòng chọn ngày giờ hẹn.';
    } else {
      err = validatePreferredTime(_time!, DateTime.now());
    }
    if (err == null && !_consent) {
      err = 'Bạn cần đồng ý chia sẻ thông tin với salon để gửi yêu cầu.';
    }
    if (err != null) {
      setState(() => _error = err);
      return;
    }

    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ApiClient.instance.dio.post('/bookings', data: {
        'salonId': widget.salon.id,
        'hairstyleId': widget.hairstyleId,
        'tryOnImageUrl': widget.tryOnImageUrl,
        'faceShape': widget.faceShape,
        'preferredTime': toBackendLocalDateTime(_time!),
        'customerName': name,
        'customerPhone': phone,
        'note': _noteCtrl.text.trim().isEmpty ? null : _noteCtrl.text.trim(),
        'consent': true,
      });
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _sending = false;
        _error = friendlyApiError(e, 'Không gửi được yêu cầu đặt lịch. Vui lòng thử lại.');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 12, 20, 20 + bottomInset),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: AppColors.line, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 14),
            Text('Đặt lịch tại ${widget.salon.name}',
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(widget.salon.address, style: const TextStyle(fontSize: 12.5, color: AppColors.muted)),
            if (widget.tryOnImageUrl != null) ...[
              const SizedBox(height: 14),
              Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: CachedNetworkImage(
                      imageUrl: widget.tryOnImageUrl!,
                      width: 64,
                      height: 80,
                      fit: BoxFit.cover,
                      errorWidget: (context, url, error) => const SizedBox(width: 64, height: 80),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Ảnh thử kiểu ${widget.hairstyleName ?? 'tóc'} sẽ được gửi kèm để salon hiểu đúng kiểu bạn muốn.',
                      style: const TextStyle(fontSize: 12.5, color: AppColors.mauve, height: 1.4),
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 16),
            TextField(
              controller: _nameCtrl,
              enabled: !_sending,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(labelText: 'Họ và tên'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _phoneCtrl,
              enabled: !_sending,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Số điện thoại', hintText: '0912345678'),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _sending ? null : _pickTime,
              icon: const Icon(Icons.event_outlined, size: 18),
              label: Text(_time == null ? 'Chọn ngày giờ hẹn' : 'Hẹn lúc ${formatDateTime(_time!)}'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _noteCtrl,
              enabled: !_sending,
              maxLines: 2,
              maxLength: 300,
              decoration: const InputDecoration(labelText: 'Ghi chú cho salon (không bắt buộc)'),
            ),
            CheckboxListTile(
              value: _consent,
              onChanged: _sending ? null : (v) => setState(() => _consent = v ?? false),
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              title: const Text(
                'Tôi đồng ý chia sẻ ảnh thử tóc, dáng mặt và số điện thoại với salon để được tư vấn.',
                style: TextStyle(fontSize: 12.5, height: 1.35),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 4),
              Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 12.5, fontWeight: FontWeight.w600)),
            ],
            const SizedBox(height: 12),
            SizedBox(
              height: 50,
              child: ElevatedButton(
                onPressed: _sending ? null : _submit,
                child: _sending
                    ? const SizedBox(
                        height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Gửi yêu cầu đặt lịch'),
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Salon sẽ xác nhận qua email. Bạn xem trạng thái trong Cá nhân → Lịch hẹn salon.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11.5, color: AppColors.muted),
            ),
          ],
        ),
      ),
    );
  }
}
