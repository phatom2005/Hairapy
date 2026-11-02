import 'package:flutter/material.dart';

/// 21 màu tóc AILab hỗ trợ (tham số "color" của POST /swap/submit) — khớp
/// HairSwapService.COLOR_LABELS_VI bên backend. [code] gửi lên server, [label] hiển thị.
class HairColorOption {
  final String code;
  final String label;
  final Color swatch;
  const HairColorOption(this.code, this.label, this.swatch);
}

const List<HairColorOption> kHairColors = [
  HairColorOption('black', 'Đen', Color(0xFF1B1B1B)),
  HairColorOption('brown', 'Nâu', Color(0xFF5A3825)),
  HairColorOption('lightBrown', 'Nâu sáng', Color(0xFF9A6B45)),
  HairColorOption('blonde', 'Vàng', Color(0xFFD9B45A)),
  HairColorOption('platinumBlonde', 'Bạch kim', Color(0xFFE8DFC8)),
  HairColorOption('red', 'Đỏ', Color(0xFFB0302A)),
  HairColorOption('burgundy', 'Đỏ rượu', Color(0xFF6E1A33)),
  HairColorOption('orange', 'Cam', Color(0xFFD9772B)),
  HairColorOption('pink', 'Hồng', Color(0xFFE88BB0)),
  HairColorOption('purple', 'Tím', Color(0xFF6B3FA0)),
  HairColorOption('blue', 'Xanh dương', Color(0xFF2F64C8)),
  HairColorOption('green', 'Xanh lá', Color(0xFF2E8B57)),
  HairColorOption('grey', 'Xám', Color(0xFF8A8A8A)),
  HairColorOption('silver', 'Bạc', Color(0xFFC0C0C8)),
  HairColorOption('white', 'Trắng', Color(0xFFF2F2F2)),
  HairColorOption('lightBlue', 'Xanh nhạt', Color(0xFF7FB8E6)),
  HairColorOption('lightPurple', 'Tím nhạt', Color(0xFFB79AE0)),
  HairColorOption('darkBlue', 'Xanh đậm', Color(0xFF1C2D5C)),
  HairColorOption('darkGreen', 'Xanh rêu', Color(0xFF2F4A35)),
  HairColorOption('gradient', 'Ombre', Color(0xFFA06A9E)),
  HairColorOption('multicolored', 'Nhiều màu', Color(0xFFC9A227)),
];
