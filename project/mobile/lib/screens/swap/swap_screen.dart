import 'dart:async';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gal/gal.dart';
import 'package:go_router/go_router.dart';
import 'package:path_provider/path_provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../api/api_client.dart';
import '../../config/feature_flags.dart';
import '../../models/hairstyle.dart';
import '../../providers/auth_provider.dart';
import '../../providers/scan_state_provider.dart';
import '../../screens/scan/scan_screen.dart' show usageSummaryProvider;
import '../../services/share_card_generator.dart';
import '../../theme.dart';
import '../../widgets/feedback_sheet.dart';

enum _Phase { idle, submitting, polling, done, error }

/// Cac dong text luan phien trong luc AI xu ly -- khop cam giac co tien do
/// that (submit -> AI phan tich -> ghep tong) thay vi 1 dong tinh lap lai,
/// giup thoi gian cho AI Pro (30-60s theo comment ben web) do nong ruot hon.
const _kSwapLoadingMessages = [
  'Đang gửi ảnh cho AI...',
  'AI đang phân tích khuôn mặt...',
  'Đang ghép kiểu tóc mới...',
  'Sắp xong rồi, chờ chút nhé...',
];

/// Khớp HairSwapController.java: submit ảnh (multipart) -> nhận taskId ngay,
/// rồi tự poll GET /swap/status/{taskId} mỗi ~3s cho tới khi DONE/ERROR —
/// không có request nào chặn quá lâu, và lỗi AI timeout tự hoàn lượt ở backend.
class SwapScreen extends ConsumerStatefulWidget {
  final Hairstyle? hairstyle;
  const SwapScreen({super.key, this.hairstyle});

  @override
  ConsumerState<SwapScreen> createState() => _SwapScreenState();
}

class _SwapScreenState extends ConsumerState<SwapScreen> {
  _Phase _phase = _Phase.idle;
  String? _resultImage;
  String? _error;
  bool _refunded = false;
  Timer? _pollTimer;
  // Giới hạn số lần poll (3s/lần → tối đa ~3 phút) và số lỗi mạng liên tiếp được bỏ qua,
  // tránh poll vô hạn khi backend kẹt ở PENDING hoặc mạng chập chờn nhất thời.
  static const _maxPollAttempts = 60;
  static const _maxPollNetworkErrors = 3;
  int _pollAttempts = 0;
  int _pollNetworkErrors = 0;

  Timer? _loadingTextTimer;
  int _loadingIndex = 0;

  bool _sharing = false;
  bool _saving = false;
  // Đã lưu/chia sẻ ảnh kết quả chưa — nếu chưa mà thoát thì hỏi xác nhận (ảnh không được lưu ở server)
  bool _saved = false;
  bool _feedbackShown = false;

  void _triggerFeedbackOnce() {
    if (_feedbackShown) return;
    _feedbackShown = true;
    // Trễ 2 giây để người dùng kịp nhìn kết quả rồi mới hỏi đánh giá
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        showFeedbackSheet(context, ref, 'HAIR_SWAP');
      }
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _loadingTextTimer?.cancel();
    super.dispose();
  }

  void _startLoadingCycle() {
    _loadingIndex = 0;
    _loadingTextTimer?.cancel();
    _loadingTextTimer = Timer.periodic(const Duration(milliseconds: 2200), (_) {
      if (!mounted) return;
      setState(() => _loadingIndex = (_loadingIndex + 1) % _kSwapLoadingMessages.length);
    });
  }

  void _stopLoadingCycle() {
    _loadingTextTimer?.cancel();
    _loadingTextTimer = null;
  }

  Future<void> _submit() async {
    final hairstyle = widget.hairstyle;
    final image = ref.read(scanStateProvider).image;
    if (hairstyle == null || hairstyle.ailabProStyle == null) {
      setState(() {
        _phase = _Phase.error;
        _error = 'Kiểu tóc này chưa có dữ liệu AI (ailabProStyle). Vui lòng chọn kiểu khác.';
      });
      return;
    }
    if (image == null) return; // nút Bắt đầu đã bị disable trong trường hợp này

    setState(() {
      _phase = _Phase.submitting;
      _error = null;
      _refunded = false;
    });
    _pollAttempts = 0;
    _pollNetworkErrors = 0;
    _startLoadingCycle();

    try {
      final formData = FormData.fromMap({
        'image': await MultipartFile.fromFile(image.path),
        'hairStyle': hairstyle.ailabProStyle,
        'hairstyleId': hairstyle.id,
      });
      final res = await ApiClient.instance.dio.post('/swap/submit', data: formData);
      final taskId = (res.data as Map<String, dynamic>)['taskId'] as String;
      if (!mounted) return; // người dùng đã thoát màn hình trong lúc upload
      setState(() => _phase = _Phase.polling);
      _poll(taskId);
    } on DioException catch (e) {
      _stopLoadingCycle();
      if (!mounted) return;
      final data = e.response?.data;
      String message = e.response == null
          ? 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.'
          : 'Không thể xử lý ảnh bằng AI. Vui lòng thử lại sau.';
      bool refunded = false;
      if (data is Map) {
        if (data['error'] is String) message = data['error'] as String;
        refunded = data['refunded'] == true;
      }
      setState(() {
        _phase = _Phase.error;
        _error = message;
        _refunded = refunded;
      });
    } catch (_) {
      // Lỗi ngoài Dio (đọc file ảnh lỗi, phản hồi sai định dạng...) — nếu không bắt thì
      // màn hình kẹt mãi ở trạng thái "đang xử lý".
      _stopLoadingCycle();
      if (!mounted) return;
      setState(() {
        _phase = _Phase.error;
        _error = 'Không thể xử lý ảnh. Vui lòng chọn ảnh khác hoặc thử lại.';
      });
    }
  }

  void _poll(String taskId) {
    _pollTimer?.cancel();
    _pollTimer = Timer(const Duration(seconds: 3), () async {
      if (!mounted) return;
      _pollAttempts++;
      if (_pollAttempts > _maxPollAttempts) {
        _stopLoadingCycle();
        setState(() {
          _phase = _Phase.error;
          _error = 'AI xử lý quá lâu. Vui lòng thử lại sau.';
        });
        return;
      }
      try {
        final res = await ApiClient.instance.dio.get('/swap/status/$taskId');
        // Màn hình đã đóng trong lúc chờ phản hồi → dừng hẳn, không poll tiếp
        // (trước đây timer bị tạo lại sau khi dispose nên poll mãi ở nền).
        if (!mounted) return;
        _pollNetworkErrors = 0;
        final data = res.data as Map<String, dynamic>;
        final status = data['status'] as String?;
        if (status == 'DONE') {
          _stopLoadingCycle();
          ref.invalidate(usageSummaryProvider);
          // Rung nhe bao hieu ket qua da san sang -- diem nhan nho, khong can
          // nguoi dung phai nhin man hinh cham cham cho biet xong chua.
          HapticFeedback.mediumImpact();
          setState(() {
            _phase = _Phase.done;
            _resultImage = data['image'] as String?;
          });
          _triggerFeedbackOnce();
          return;
        }
        if (status == 'ERROR') {
          _stopLoadingCycle();
          ref.invalidate(usageSummaryProvider);
          setState(() {
            _phase = _Phase.error;
            _error = data['error'] as String? ?? 'AI xử lý quá lâu, lượt của bạn đã được hoàn lại.';
            _refunded = data['refunded'] == true;
          });
          return;
        }
        // PENDING -> tiếp tục poll
        _poll(taskId);
      } catch (_) {
        if (!mounted) return;
        // Cho phép vài lần lỗi mạng thoáng qua (đổi sóng, vào hầm...) rồi mới báo lỗi
        if (++_pollNetworkErrors < _maxPollNetworkErrors) {
          _poll(taskId);
          return;
        }
        _stopLoadingCycle();
        setState(() {
          _phase = _Phase.error;
          _error = 'Mất kết nối khi kiểm tra trạng thái xử lý. Vui lòng thử lại.';
        });
      }
    });
  }

  Future<void> _share(File beforeImage) async {
    final resultUrl = _resultImage;
    if (resultUrl == null || _sharing) return;
    setState(() => _sharing = true);
    try {
      await ShareCardGenerator.shareBeforeAfter(
        beforeImage: beforeImage,
        afterImageUrl: resultUrl,
        styleName: widget.hairstyle?.name ?? 'Kiểu tóc mới',
      );
      _saved = true;
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Không thể tạo ảnh để chia sẻ. Vui lòng thử lại.')),
        );
      }
    } finally {
      if (mounted) setState(() => _sharing = false);
    }
  }

  /// Tải ảnh kết quả về máy → lưu vào thư viện ảnh (album Hairapy).
  Future<void> _saveToGallery() async {
    final url = _resultImage;
    if (url == null || _saving) return;
    setState(() => _saving = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final dir = await getTemporaryDirectory();
      final path = '${dir.path}/hairapy_${DateTime.now().millisecondsSinceEpoch}.jpg';
      await Dio().download(
        url,
        path,
        options: Options(
          receiveTimeout: const Duration(seconds: 30),
          sendTimeout: const Duration(seconds: 15),
        ),
      );
      if (!await Gal.hasAccess()) {
        final granted = await Gal.requestAccess();
        if (!granted) {
          messenger.showSnackBar(
            const SnackBar(content: Text('Hairapy cần quyền truy cập ảnh để lưu. Hãy cấp quyền trong Cài đặt.')),
          );
          return;
        }
      }
      await Gal.putImage(path, album: 'Hairapy');
      _saved = true;
      messenger.showSnackBar(const SnackBar(content: Text('Đã lưu ảnh vào thư viện.')));
    } catch (_) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Không lưu được ảnh. Kiểm tra mạng và thử lại.')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  /// Rời màn có cần xác nhận không: đang xử lý AI, hoặc đã có kết quả nhưng chưa lưu/chia sẻ.
  bool get _needsLeaveConfirm =>
      _phase == _Phase.submitting || _phase == _Phase.polling || (_phase == _Phase.done && !_saved);

  Future<void> _confirmLeave() async {
    if (!_needsLeaveConfirm) {
      _doLeave();
      return;
    }
    final processing = _phase == _Phase.submitting || _phase == _Phase.polling;
    final leave = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(processing ? 'AI đang xử lý' : 'Ảnh chưa được lưu'),
        content: Text(processing
            ? 'Thoát bây giờ bạn sẽ không nhận được kết quả của lượt này.'
            : 'Kết quả không được lưu trên hệ thống. Thoát bây giờ bạn sẽ mất ảnh này.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Ở lại')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Vẫn thoát')),
        ],
      ),
    );
    if (leave == true && mounted) _doLeave();
  }

  void _doLeave() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/catalog');
    }
  }

  @override
  Widget build(BuildContext context) {
    final hairstyle = widget.hairstyle;
    final image = ref.watch(scanStateProvider).image;
    final user = ref.watch(authProvider).user;

    if (hairstyle != null && hairstyle.premiumOnly && (user == null || !user.isPremium)) {
      // Phòng hờ vào thẳng route (deep link) mà chưa qua chốt chặn ở Catalog/Results.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        if (!kEnableExternalPayment) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Tính năng này dành cho thành viên Premium.')),
          );
          if (context.canPop()) {
            context.pop();
          } else {
            context.go('/catalog');
          }
          return;
        }
        context.pushReplacement('/pricing');
      });
    }

    return PopScope(
      // Chặn back hệ thống/thao tác vuốt khi cần xác nhận, rồi tự hỏi người dùng
      canPop: !_needsLeaveConfirm,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _confirmLeave();
      },
      child: Scaffold(
        appBar: AppBar(
          leading: BackButton(onPressed: _confirmLeave),
          title: Text(hairstyle?.name ?? 'Thử kiểu tóc'),
        ),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: _buildBody(context, image),
          ),
        ),
      ),
    );
  }

  Widget _buildBody(BuildContext context, File? image) {
    if (image == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.image_search, size: 56, color: AppColors.muted),
            const SizedBox(height: 16),
            const Text('Chưa có ảnh khuôn mặt', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 8),
            const Text('Quét khuôn mặt trước để dùng ảnh đó thử kiểu tóc.',
                textAlign: TextAlign.center, style: TextStyle(color: AppColors.muted, fontSize: 13)),
            const SizedBox(height: 20),
            ElevatedButton(
              // Mang theo kieu toc dang chon sang man Scan -- ScanScreen se tu
              // quay lai day (thay vi di Results) sau khi phan tich xong, nen
              // khong lam mat lua chon cua nguoi dung nua.
              onPressed: () => context.push('/scan', extra: widget.hairstyle),
              child: const Text('Đi tới Quét khuôn mặt'),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        Expanded(
          child: Container(
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24)),
            clipBehavior: Clip.antiAlias,
            child: switch (_phase) {
              _Phase.done => _resultImage != null
                  ? CachedNetworkImage(imageUrl: _resultImage!, fit: BoxFit.cover, width: double.infinity)
                  : const Center(child: Text('Không có ảnh kết quả')),
              _Phase.submitting || _Phase.polling => Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.file(image, fit: BoxFit.cover),
                    Container(
                      color: Colors.black.withValues(alpha: 0.45),
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const CircularProgressIndicator(color: Colors.white),
                            const SizedBox(height: 14),
                            AnimatedSwitcher(
                              duration: const Duration(milliseconds: 300),
                              child: Text(
                                _kSwapLoadingMessages[_loadingIndex],
                                key: ValueKey(_loadingIndex),
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              _ => Image.file(image, fit: BoxFit.cover, width: double.infinity),
            },
          ),
        ),
        const SizedBox(height: 16),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Column(
              children: [
                Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.red, fontWeight: FontWeight.w600)),
                if (_refunded) const Padding(
                  padding: EdgeInsets.only(top: 4),
                  child: Text('Lượt thử tóc của bạn đã được hoàn lại.', style: TextStyle(color: AppColors.muted, fontSize: 12)),
                ),
              ],
            ),
          ),
        if (_phase == _Phase.done) ...[
          Row(
            // KHONG dung crossAxisAlignment: stretch (xem ghi chu loi layout cu) -- moi nut co SizedBox(height: 52) rieng.
            children: [
              Expanded(
                child: SizedBox(
                  height: 52,
                  child: ElevatedButton.icon(
                    onPressed: _saving ? null : _saveToGallery,
                    style: ElevatedButton.styleFrom(
                      textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                    ),
                    icon: _saving
                        ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.download_rounded, size: 18),
                    label: Text(_saving ? 'Đang lưu...' : 'Lưu ảnh', maxLines: 1, overflow: TextOverflow.ellipsis),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: SizedBox(
                  height: 52,
                  child: OutlinedButton.icon(
                    onPressed: _sharing ? null : () => _share(image),
                    style: OutlinedButton.styleFrom(
                      textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                    ),
                    icon: _sharing
                        ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.ios_share, size: 18),
                    label: Text(_sharing ? 'Đang tạo ảnh...' : 'Chia sẻ', maxLines: 1, overflow: TextOverflow.ellipsis),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            height: 44,
            child: TextButton(
              onPressed: _confirmLeave,
              child: const Text('Xem thêm kiểu khác', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
            ),
          ),
          const SizedBox(height: 12),
          Center(
            child: TextButton.icon(
              onPressed: () => showFeedbackSheet(context, ref, 'HAIR_SWAP'),
              icon: const Icon(Icons.star_rate_rounded, color: Colors.amber, size: 18),
              label: const Text(
                'Đánh giá trải nghiệm thử kiểu tóc',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.mauve),
              ),
            ),
          ),
        ]
        else
          ElevatedButton(
            onPressed: (_phase == _Phase.submitting || _phase == _Phase.polling) ? null : _submit,
            child: (_phase == _Phase.submitting || _phase == _Phase.polling)
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(_phase == _Phase.error ? 'Thử lại' : 'Bắt đầu ghép kiểu tóc'),
          ),
      ],
    );
  }
}
