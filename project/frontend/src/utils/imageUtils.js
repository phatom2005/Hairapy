// Giới hạn cạnh dài nhất khi gửi ảnh lên AI. AILab yêu cầu ảnh < 4096x4096 và <= 5MB;
// 1600px đủ nét cho nhận diện mặt/đổi tóc nhưng nhẹ hơn nhiều (~200-400KB thay vì 2-5MB).
const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.9;

/**
 * Chuẩn hóa ảnh trước khi gửi lên backend/AI:
 *  - Áp dụng đúng hướng xoay EXIF (ảnh selfie điện thoại thường lưu nằm ngang + cờ xoay;
 *    trình duyệt tự xoay khi hiển thị nên MediaPipe thấy mặt, nhưng AI phía server đọc
 *    byte gốc thì thấy mặt bị xoay 90° → lỗi "No face detected").
 *  - Thu nhỏ cạnh dài về tối đa MAX_SIDE, xuất JPEG.
 * Nếu trình duyệt không hỗ trợ hoặc có lỗi → trả lại file gốc (không chặn luồng chính).
 */
export async function normalizeImage(file) {
  try {
    if (!file || typeof createImageBitmap !== "function") return file;

    // imageOrientation "from-image": bitmap đã được xoay theo EXIF
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) return file;

    return new File([blob], "photo.jpg", { type: "image/jpeg" });
  } catch (err) {
    console.warn("Không chuẩn hóa được ảnh, dùng ảnh gốc:", err);
    return file;
  }
}
