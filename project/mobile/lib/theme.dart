import 'package:flutter/material.dart';

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
    fontFamily: 'BeVietnamPro',
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.canvas,
      foregroundColor: AppColors.ink,
      elevation: 0,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(52),
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
