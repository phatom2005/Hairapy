import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../config/app_links.dart';
import '../../providers/auth_provider.dart';
import '../../screens/scan/scan_screen.dart' show usageSummaryProvider;
import '../../theme.dart';

/// Khớp SettingsPage.jsx: sửa hồ sơ (PUT /auth/me) + xem quota hiện tại (GET /usage/me).
class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  late final TextEditingController _nameCtrl;
  late final TextEditingController _phoneCtrl;
  bool _saved = false;

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
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saved = false);
    final ok = await ref.read(authProvider.notifier).updateProfile(
          fullName: _nameCtrl.text.trim(),
          phone: _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
        );
    if (ok && mounted) setState(() => _saved = true);
  }

  Future<void> _confirmDeleteAccount(BuildContext context) async {
    final passwordCtrl = TextEditingController();
    bool deleting = false;
    String? localError;

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Xác nhận xoá tài khoản', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Hành động này KHÔNG THỂ HOÀN TÁC. Toàn bộ hồ sơ cá nhân, lịch sử quét khuôn mặt, ảnh đã lưu và danh sách kiểu tóc yêu thích của bạn sẽ bị xoá vĩnh viễn khỏi hệ thống.',
                      style: TextStyle(fontSize: 13, color: AppColors.muted, height: 1.4),
                    ),
                    const SizedBox(height: 16),
                    const Text('Nhập mật khẩu để xác nhận (bỏ trống nếu đăng nhập Google/Facebook):',
                        style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: passwordCtrl,
                      obscureText: true,
                      enabled: !deleting,
                      decoration: const InputDecoration(
                        hintText: 'Mật khẩu hiện tại',
                        isDense: true,
                      ),
                    ),
                    if (localError != null) ...[
                      const SizedBox(height: 10),
                      Text(localError!, style: const TextStyle(color: Colors.red, fontSize: 12.5)),
                    ],
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: deleting ? null : () => Navigator.of(dialogCtx).pop(),
                  child: const Text('Huỷ'),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: deleting
                      ? null
                      : () async {
                          setDialogState(() {
                            deleting = true;
                            localError = null;
                          });

                          final ok = await ref.read(authProvider.notifier).deleteAccount(passwordCtrl.text);

                          if (!dialogCtx.mounted) return;

                          if (ok) {
                            Navigator.of(dialogCtx).pop();
                            if (context.mounted) {
                              context.go('/');
                            }
                          } else {
                            final err = ref.read(authProvider).error ?? 'Mật khẩu không đúng hoặc không thể xoá.';
                            setDialogState(() {
                              deleting = false;
                              localError = err;
                            });
                          }
                        },
                  child: deleting
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Xoá vĩnh viễn'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final user = auth.user;
    final usageAsync = ref.watch(usageSummaryProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Cài đặt tài khoản')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        children: [
          const Text('Hồ sơ cá nhân', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          const Text('Email', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 6),
          TextField(
            enabled: false,
            controller: TextEditingController(text: user?.email ?? ''),
          ),
          const SizedBox(height: 14),
          const Text('Họ và tên', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 6),
          TextField(controller: _nameCtrl, textCapitalization: TextCapitalization.words),
          const SizedBox(height: 14),
          const Text('Số điện thoại', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 6),
          TextField(controller: _phoneCtrl, keyboardType: TextInputType.phone),
          if (auth.error != null) ...[
            const SizedBox(height: 10),
            Text(auth.error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
          ],
          if (_saved) ...[
            const SizedBox(height: 10),
            const Text('Đã lưu thay đổi.', style: TextStyle(color: AppColors.primary, fontSize: 13, fontWeight: FontWeight.w600)),
          ],
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: auth.isLoading ? null : _save,
            child: auth.isLoading
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Lưu thay đổi'),
          ),
          const SizedBox(height: 28),
          const Text('Hạn mức sử dụng hôm nay', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          usageAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => const Text('Không tải được dữ liệu quota', style: TextStyle(color: AppColors.muted, fontSize: 12.5)),
            data: (u) => Column(
              children: [
                _QuotaRow(label: 'Quét khuôn mặt', used: u.faceScan.used, limit: u.faceScan.limit, unlimited: u.faceScan.unlimited),
                const SizedBox(height: 10),
                _QuotaRow(label: 'Thử kiểu tóc', used: u.hairSwap.used, limit: u.hairSwap.limit, unlimited: u.hairSwap.unlimited),
              ],
            ),
          ),
          const SizedBox(height: 28),
          const Text('Pháp lý & Điều khoản', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.line),
            ),
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.privacy_tip_outlined, color: AppColors.mauve),
                  title: const Text('Chính sách bảo mật', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                  trailing: const Icon(Icons.chevron_right, size: 20, color: AppColors.muted),
                  onTap: () => context.push('/legal', extra: {
                    'title': 'Chính sách bảo mật',
                    'url': kPrivacyUrl,
                  }),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.description_outlined, color: AppColors.mauve),
                  title: const Text('Điều khoản sử dụng', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                  trailing: const Icon(Icons.chevron_right, size: 20, color: AppColors.muted),
                  onTap: () => context.push('/legal', extra: {
                    'title': 'Điều khoản sử dụng',
                    'url': kTermsUrl,
                  }),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),
          const Text('Vùng nguy hiểm', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.red)),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.red,
              side: const BorderSide(color: Colors.red),
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
            icon: const Icon(Icons.delete_forever_outlined),
            label: const Text('Xoá tài khoản'),
            onPressed: () => _confirmDeleteAccount(context),
          ),
        ],
      ),
    );
  }
}

class _QuotaRow extends StatelessWidget {
  final String label;
  final int used;
  final int limit;
  final bool unlimited;
  const _QuotaRow({required this.label, required this.used, required this.limit, required this.unlimited});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.line)),
      child: Row(
        children: [
          Expanded(child: Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
          Text(unlimited ? 'Không giới hạn' : '$used / $limit',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.primary)),
        ],
      ),
    );
  }
}
