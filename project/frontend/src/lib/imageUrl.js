const CLOUDINARY_HOST = "res.cloudinary.com";

/**
 * Ảnh Cloudinary: chèn tham số biến đổi để Cloudinary trả đúng kích thước hiển thị
 * + định dạng tốt nhất cho trình duyệt (WebP/AVIF) + nén tự động.
 * Ảnh nguồn khác (placehold.co, Unsplash...) hoặc URL đã có biến đổi thì trả nguyên.
 *
 * @param {string} url   URL ảnh gốc
 * @param {number} width chiều rộng mong muốn (px thật, nên = kích thước hiển thị x2 cho màn retina)
 */
export function optimizedImage(url, width) {
  if (!url || typeof url !== "string") return url;
  // So khớp CHÍNH XÁC tên miền (không dùng includes: "evil.com/res.cloudinary.com/..." cũng chứa chuỗi đó)
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== CLOUDINARY_HOST) return url;
  if (!parsed.pathname.includes("/image/upload/")) return url;
  // Đã có biến đổi ngay sau /upload/ (vd. watermark, f_auto) thì không chèn thêm
  if (/\/image\/upload\/(?!v\d+\/)[^/]*[a-z]_[^/]*\//.test(url)) return url;
  const w = Math.max(1, Math.round(width || 0));
  parsed.pathname = parsed.pathname.replace("/image/upload/", `/image/upload/f_auto,q_auto,c_limit,w_${w}/`);
  return parsed.toString();
}
