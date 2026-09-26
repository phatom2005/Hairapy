import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';
import '../../theme.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _pwCtrl = TextEditingController();
  final _pw2Ctrl = TextEditingController();
  String? _localError;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _pwCtrl.dispose();
    _pw2Ctrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _localError = null);
    if (_nameCtrl.text.trim().isEmpty || _emailCtrl.text.trim().isEmpty || _pwCtrl.text.isEmpty) {
      setState(() => _localError = 'Vui lòng điền đầy đủ các thông tin bắt buộc');
      return;
    }
    if (_pwCtrl.text != _pw2Ctrl.text) {
      setState(() => _localError = 'Mật khẩu xác nhận không khớp');
      return;
    }
    final ok = await ref.read(authProvider.notifier).register(
          fullName: _nameCtrl.text.trim(),
          email: _emailCtrl.text.trim(),
          password: _pwCtrl.text,
          confirmPassword: _pw2Ctrl.text,
        );
    if (ok && mounted) context.go('/home');
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final error = _localError ?? auth.error;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.canPop() ? context.pop() : context.go('/login'),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(28, 4, 28, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Tạo tài khoản',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: AppColors.ink)),
              const SizedBox(height: 6),
              const Text('Bắt đầu hành trình tìm kiểu tóc hợp với bạn',
                  style: TextStyle(fontSize: 13.5, color: AppColors.mauve)),
              const SizedBox(height: 24),
              const Text('Họ và tên', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 6),
              TextField(controller: _nameCtrl, textCapitalization: TextCapitalization.words),
              const SizedBox(height: 14),
              const Text('Email', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 6),
              TextField(controller: _emailCtrl, keyboardType: TextInputType.emailAddress),
              const SizedBox(height: 14),
              const Text('Mật khẩu', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 6),
              TextField(controller: _pwCtrl, obscureText: true),
              const SizedBox(height: 14),
              const Text('Nhập lại mật khẩu', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 6),
              TextField(controller: _pw2Ctrl, obscureText: true),
              if (error != null) ...[
                const SizedBox(height: 12),
                Text(error, style: const TextStyle(color: Colors.red, fontSize: 13)),
              ],
              const SizedBox(height: 22),
              ElevatedButton(
                onPressed: auth.isLoading ? null : _submit,
                child: auth.isLoading
                    ? const SizedBox(
                        height: 20, width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Tạo tài khoản'),
              ),
              const SizedBox(height: 18),
              Center(
                child: TextButton(
                  onPressed: () => context.go('/login'),
                  child: const Text.rich(
                    TextSpan(
                      text: 'Đã có tài khoản? ',
                      style: TextStyle(color: AppColors.mauve, fontSize: 13),
                      children: [
                        TextSpan(text: 'Đăng nhập', style: TextStyle(color: AppColors.magenta, fontWeight: FontWeight.w700)),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
