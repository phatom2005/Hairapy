import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../api/api_client.dart';
import '../../providers/auth_provider.dart';
import '../../theme.dart';

/// Kiểm tra form đổi mật khẩu phía app, khớp ChangePasswordRequest (mật khẩu mới >= 8 ký tự).
/// Trả về thông báo lỗi, hoặc null nếu hợp lệ.
String? validatePasswordChange({
  required bool needCurrent,
  required String current,
  required String next,
  required String confirm,
}) {
  if (needCurrent && current.isEmpty) return 'Vui lòng nhập mật khẩu hiện tại.';
  if (next.length < 8) return 'Mật khẩu mới phải có ít nhất 8 ký tự.';
  if (next != confirm) return 'Mật khẩu xác nhận không khớp.';
  if (needCurrent && next == current) return 'Mật khẩu mới phải khác mật khẩu hiện tại.';
  return null;
}

/// PUT /auth/me/password. Tài khoản đăng nhập Google/Facebook chưa có mật khẩu (hasPassword=false)
/// thì không cần mật khẩu hiện tại — màn này thành "Đặt mật khẩu".
class ChangePasswordScreen extends ConsumerStatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  ConsumerState<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends ConsumerState<ChangePasswordScreen> {
  final _currentCtrl = TextEditingController();
  final _newCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _obscure = true;
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _currentCtrl.dispose();
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit(bool needCurrent) async {
    final err = validatePasswordChange(
      needCurrent: needCurrent,
      current: _currentCtrl.text,
      next: _newCtrl.text,
      confirm: _confirmCtrl.text,
    );
    if (err != null) {
      setState(() => _error = err);
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ApiClient.instance.dio.put('/auth/me/password', data: {
        'currentPassword': needCurrent ? _currentCtrl.text : null,
        'newPassword': _newCtrl.text,
        'confirmPassword': _confirmCtrl.text,
      });
      // Cập nhật hasPassword (tài khoản Google vừa đặt mật khẩu)
      await ref.read(authProvider.notifier).fetchMe();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(needCurrent ? 'Đã đổi mật khẩu.' : 'Đã đặt mật khẩu cho tài khoản.')),
      );
      context.pop();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _sending = false;
        _error = friendlyApiError(e, 'Không đổi được mật khẩu. Vui lòng thử lại.');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final needCurrent = user?.hasPassword ?? true;
    final title = needCurrent ? 'Đổi mật khẩu' : 'Đặt mật khẩu';

    InputDecoration deco(String label) => InputDecoration(
          labelText: label,
          suffixIcon: IconButton(
            icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 20),
            onPressed: () => setState(() => _obscure = !_obscure),
          ),
        );

    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        children: [
          if (!needCurrent) ...[
            const Text(
              'Bạn đang đăng nhập bằng Google/Facebook. Đặt mật khẩu để có thể đăng nhập bằng email và mật khẩu.',
              style: TextStyle(fontSize: 13, color: AppColors.mauve, height: 1.4),
            ),
            const SizedBox(height: 16),
          ],
          if (needCurrent) ...[
            TextField(
              controller: _currentCtrl,
              obscureText: _obscure,
              enabled: !_sending,
              autofillHints: const [AutofillHints.password],
              decoration: deco('Mật khẩu hiện tại'),
            ),
            const SizedBox(height: 12),
          ],
          TextField(
            controller: _newCtrl,
            obscureText: _obscure,
            enabled: !_sending,
            autofillHints: const [AutofillHints.newPassword],
            decoration: deco('Mật khẩu mới (ít nhất 8 ký tự)'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _confirmCtrl,
            obscureText: _obscure,
            enabled: !_sending,
            decoration: deco('Nhập lại mật khẩu mới'),
            onSubmitted: (_) {
              if (!_sending) _submit(needCurrent);
            },
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13, fontWeight: FontWeight.w600)),
          ],
          const SizedBox(height: 20),
          SizedBox(
            height: 50,
            child: ElevatedButton(
              onPressed: _sending ? null : () => _submit(needCurrent),
              child: _sending
                  ? const SizedBox(
                      height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text(title),
            ),
          ),
        ],
      ),
    );
  }
}
