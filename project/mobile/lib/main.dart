import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'router.dart';
import 'theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // Dùng font đã đóng gói trong thư mục google_fonts/, không tải từ internet lúc chạy.
  GoogleFonts.config.allowRuntimeFetching = false;
  runApp(const ProviderScope(child: HairapyApp()));
}

class HairapyApp extends ConsumerWidget {
  const HairapyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'Hairapy',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      routerConfig: router,
    );
  }
}
