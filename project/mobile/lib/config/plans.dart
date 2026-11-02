/// Tên gói & quyền lợi — một nguồn duy nhất, khớp src/lib/plans.js bên web
/// và UsageService.getDailyLimit bên backend.
library;

const Map<String, String> kPlanLabels = {
  'FREE': 'Miễn phí',
  'PRO': 'Gói Tuần',
  'PREMIUM': 'Gói Tháng',
};

String planLabel(String? plan) => kPlanLabels[plan ?? 'FREE'] ?? 'Miễn phí';

/// Số lượt thử tóc AI mỗi ngày theo gói.
const Map<String, int> kHairSwapPerDay = {'FREE': 1, 'PRO': 5, 'PREMIUM': 8};

/// "dd/MM/yyyy" từ DateTime (không phụ thuộc package intl).
String formatDate(DateTime d) =>
    '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';

/// "HH:mm dd/MM/yyyy"
String formatDateTime(DateTime d) =>
    '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')} ${formatDate(d)}';
