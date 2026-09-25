import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';
import '../../theme.dart';

/// Web nhận `token` qua query string khi người dùng bấm link trong email
/// (ResetPasswordPage.jsx: useSearchParams().get("token")). Mobile không mở được
/// deep-link đó, nên cho người dùng dán thủ công mã token từ email vào đây.
class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  ConsumerState<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  final _tokenCtrl = TextEditingController();
  final _pwCtrl = TextEditingController();
  final _pw2Ctrl = TextEditingController();
  String? _localError;
  bool _done = false;

  @override
  void dispose() {
    _tokenCtrl.dispose();
    _pwCtrl.dispose();
    _pw2Ctrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _localError = null);
    if (_tokenCtrl.text.trim().isEmpty || _pwCtrl.text.isEmpty) {
      setState(() => _localError = 'Vui lòng nhập đầy đủ mã token và mật khẩu mới');
      return;
    }
    if (_pwCtrl.text != _pw2Ctrl.text) {
      setState(() => _localError = 'Mật khẩu xác nhận không khớp');
      return;
    }
    final ok = await ref.read(authProvider.notifier).resetPassword(
          token: _tokenCtrl.text.trim(),
          newPassword: _pwCtrl.text,
          confirmPassword: _pw2Ctrl.text,
        );
    if (ok && mounted) setState(() => _done = true);
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final error = _localError ?? auth.error;

    return Scaffold(
      appBar: AppBar(leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop())),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(28, 4, 28, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Đặt lại mật khẩu',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: AppColors.ink)),
              const SizedBox(height: 6),
              const Text('Dán mã token nhận được trong email và đặt mật khẩu mới.',
                  style: TextStyle(fontSize: 13.5, color: AppColors.mauve)),
              const SizedBox(height: 24),
              if (_done) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.lime.withValues(alpha: 0.25),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Text(
                    'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.',
                    style: TextStyle(fontSize: 13, color: AppColors.ink, height: 1.5),
                  ),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => context.go('/login'),
                  child: const Text('Về màn Đăng nhập'),
                ),
              ] else ...[
                const Text('Mã token', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                const SizedBox(height: 6),
                TextField(controller: _tokenCtrl, maxLines: 2),
                const SizedBox(height: 14),
                const Text('Mật khẩu mới', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                const SizedBox(height: 6),
                TextField(controller: _pwCtrl, obscureText: true),
                const SizedBox(height: 14),
                const Text('Nhập lại mật khẩu mới', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                const SizedBox(height: 6),
                TextField(controller: _pw2Ctrl, obscureText: true),
                if (error != null) ...[
                  const SizedBox(height: 10),
                  Text(error, style: const TextStyle(color: Colors.red, fontSize: 13)),
                ],
                const SizedBox(height: 22),
                ElevatedButton(
                  onPressed: auth.isLoading ? null : _submit,
                  child: auth.isLoading
                      ? const SizedBox(
                          height: 20, width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Đặt lại mật khẩu'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
