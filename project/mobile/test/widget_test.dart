import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:mobile/main.dart';

void main() {
  testWidgets('App khởi động ra màn Login khi chưa đăng nhập', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: HairapyApp()));
    await tester.pumpAndSettle();
    expect(find.text('Hairapy'), findsWidgets);
  });
}
