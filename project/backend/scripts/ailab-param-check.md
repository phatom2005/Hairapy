# Kiểm tra tham số AILab `hairstyle-editor-pro` (Phase 7.1)

Mục tiêu: chọn cấu hình gửi AILab giữ **gương mặt** và **trang phục** giống ảnh gốc nhất. Từ Phase 7.2, web đã tự ghép lại mặt/áo gốc, nên bước này chỉ để giảm số ca ghép thất bại (mặt AI méo quá, căn khớp không được).

> Mỗi lần gọi tốn credit AILab. Chỉ chạy khi cần, tối đa khoảng 5 ảnh × số cấu hình cần so sánh.

## 1. Đọc tài liệu trước

Mở tài liệu chính thức của AILab cho **Hairstyle Changer Pro / hairstyle-editor-pro** (ailabtools.com → API docs). Ghi lại vào bảng dưới **đúng như docs viết**:

| Tham số | Giá trị đang gửi (`HairSwapService`) | Ý nghĩa theo docs | Giá trị cho phép |
|---|---|---|---|
| `task_type` | `async` | | |
| `auto` | `1` | | |
| `hair_style` | mã kiểu từ catalog | | |
| `image_size` | `1` | | |
| `color` | mã màu (tuỳ chọn) | | |
| (tham số khác nếu docs có, ví dụ liên quan giữ khuôn mặt) | không gửi | | |

Tham số nào docs không mô tả rõ thì **không thêm vào code**.

## 2. Bộ ảnh thử cố định

Chuẩn bị 5 ảnh chân dung (có sự đồng ý của người trong ảnh, không đưa vào repo):

1. Nữ, tóc dài, áo sáng màu
2. Nữ, tóc ngắn
3. Nam, tóc ngắn, áo tối màu
4. Nam, có kính
5. Ảnh chụp xa nửa người (kiểm tra bước cắt khung đầu + vai ở web)

Ảnh nên chụp thẳng, đủ sáng, cạnh ngắn ≥ 400px.

## 3. Cách chạy

Dùng Postman hoặc `curl` (thay `<KEY>` bằng key thật **trên máy bạn**, không dán vào chat/repo):

```bash
curl -X POST https://www.ailabapi.com/api/portrait/effects/hairstyle-editor-pro \
  -H "ailabapi-api-key: <KEY>" \
  -F "task_type=async" -F "auto=1" -F "hair_style=<MÃ KIỂU>" -F "image_size=1" \
  -F "image=@anh1.jpg"
# -> lấy task_id, rồi:
curl "https://www.ailabapi.com/api/common/query-async-task-result?task_id=<TASK_ID>" \
  -H "ailabapi-api-key: <KEY>"
```

Lặp lại với từng cấu hình cần so sánh (ví dụ `auto=0` và `auto=1` nếu docs cho phép).

## 4. Chấm điểm

Với mỗi ảnh × cấu hình, chấm 0–2 (0 = sai rõ, 1 = hơi khác, 2 = giữ đúng):

| Ảnh | Cấu hình | Mặt giữ giống | Áo giữ nguyên | Tóc đúng kiểu | Ghi chú |
|---|---|---|---|---|---|
| 1 | auto=1 | | | | |
| 1 | ... | | | | |

Chọn cấu hình có tổng điểm "Mặt giữ giống" + "Tóc đúng kiểu" cao nhất. Nếu khác cấu hình hiện tại, đổi trong `HairSwapService.submitTask` (hoặc đưa ra biến môi trường) và ghi kết quả bảng này vào commit message.

## 5. Kiểm tra ghép ảnh trên web (sau khi deploy)

Trên trang Thử tóc, bật **"Giữ nguyên gương mặt & trang phục"**, thử lại 5 ảnh trên:

- Mặt, tông da, áo, nền phải giống ảnh gốc; chỉ phần tóc thay đổi.
- Xem sự kiện GA4 `identity_composite`: tỉ lệ `ok=0` và `reason` (`align`, `no_hair`, `no_face`) cho biết ca nào AI làm méo mặt quá nhiều.
