import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Design tokens lấy đúng từ project/frontend/src/index.css để 2 bản
/// web + mobile đồng bộ màu/thương hiệu.
class AppColors {
  static const brand = Color(0xFF1039DA);
  static const primary = Color(0xFF2A4AE8);
  static const magenta = Color(0xFFB1008D);
  static const lime = Color(0xFFD0EE88);
  static const pink = Color(0xFFFF57CF);
  static const ink = Color(0xFF1A1A1A);
  static const mauve = Color(0xFF56414C);
  static const muted = Color(0xFF89707D);
  static const line = Color(0xFFE8E8E8);
  static const divider = Color(0xFFDCBFCD);
  static const canvas = Color(0xFFF9F9F9);
}

/// Bóng đổ dùng chung cho card/nút để giao diện có chiều sâu thay vì phẳng.
class AppShadows {
  /// Bóng nhẹ cho card thường.
  static List<BoxShadow> get card => [
        BoxShadow(
          color: const Color(0xFF1A1A1A).withValues(alpha: 0.06),
          blurRadius: 18,
          offset: const Offset(0, 6),
        ),
      ];

  /// Bóng màu thương hiệu cho card nổi bật (hero, nút chính).
  static List<BoxShadow> glow(Color color) => [
        BoxShadow(
          color: color.withValues(alpha: 0.32),
          blurRadius: 24,
          offset: const Offset(0, 10),
        ),
      ];
}

/// Decoration dựng sẵn: dùng AppDecor.card() thay cho Container trắng + viền lặp lại nhiều nơi.
class AppDecor {
  static BoxDecoration card({double radius = 20, Color color = Colors.white}) => BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: AppColors.line.withValues(alpha: 0.7)),
        boxShadow: AppShadows.card,
      );
}

ThemeData buildAppTheme() {
  return ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: AppColors.canvas,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      primary: AppColors.primary,
      secondary: AppColors.magenta,
      surface: Colors.white,
    ),
    // Dung Google Fonts thay vi khai bao fontFamily suong -- truoc do
    // 'BeVietnamPro' khong co file font that nen Flutter am tham fallback
    // ve font he thong (Roboto), khac voi web (dung Be Vietnam Pro that).
    fontFamily: GoogleFonts.beVietnamPro().fontFamily,
    textTheme: GoogleFonts.beVietnamProTextTheme(ThemeData.light().textTheme),
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.canvas,
      foregroundColor: AppColors.ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: true,
      titleTextStyle: AppFonts.display(fontSize: 15, color: AppColors.ink),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: AppColors.ink,
      contentTextStyle: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
    navigationBarTheme: NavigationBarThemeData(
      height: 68,
      elevation: 0,
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      indicatorColor: AppColors.primary.withValues(alpha: 0.12),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return TextStyle(
          fontSize: 11.5,
          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
          color: selected ? AppColors.primary : AppColors.muted,
        );
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        return IconThemeData(
          color: states.contains(WidgetState.selected) ? AppColors.primary : AppColors.muted,
        );
      }),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(52),
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.line, width: 1.5),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.line, width: 1.5),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
      ),
    ),
  );
}


/// Font hien thi (Unbounded) cho cac tieu de lon -- tuong duong class
/// "h-display" ben web (vd: "Chao, Nguyen", "Quet khuon mat ngay").
/// Dung AppFonts.display(...) thay vi TextStyle thuong cho nhung cho nay.
class AppFonts {
  static TextStyle display({
    double fontSize = 19,
    FontWeight fontWeight = FontWeight.w700,
    Color? color,
  }) {
    return GoogleFonts.unbounded(fontSize: fontSize, fontWeight: fontWeight, color: color);
  }
}
