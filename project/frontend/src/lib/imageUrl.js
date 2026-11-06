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
  if (!url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) return url;
  // Đã có biến đổi ngay sau /upload/ (vd. watermark, f_auto) thì không chèn thêm
  if (/\/image\/upload\/(?!v\d+\/)[^/]*[a-z]_[^/]*\//.test(url)) return url;
  const w = Math.max(1, Math.round(width || 0));
  return url.replace("/image/upload/", `/image/upload/f_auto,q_auto,c_limit,w_${w}/`);
}
