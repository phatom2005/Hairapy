// Phase 7.2 — Toán thuần cho "ghép ảnh giữ danh tính" (không phụ thuộc DOM/MediaPipe để unit test được).
//
// Ý tưởng: AILab sinh lại CẢ ẢNH nên mặt/áo/nền bị đổi. Ta chỉ lấy VÙNG TÓC từ ảnh AI,
// còn mặt, cổ, trang phục lấy lại từ ảnh gốc của người dùng.

/** Điểm landmark MediaPipe FaceMesh dùng để căn khớp: khoé mắt (4), chóp mũi, 2 khoé miệng. */
export const ALIGN_LANDMARKS = [33, 133, 362, 263, 1, 61, 291];

/**
 * Phép biến đổi tương tự 2D (scale + xoay + dịch) đưa tập điểm src về dst theo bình phương tối thiểu.
 * Kết quả: x' = a*x - b*y + tx ; y' = b*x + a*y + ty
 * @param {{x:number,y:number}[]} src
 * @param {{x:number,y:number}[]} dst
 */
export function similarityTransform(src, dst) {
  const n = Math.min(src.length, dst.length);
  if (n < 2) throw new Error("Cần ít nhất 2 điểm để căn khớp");
  let msx = 0, msy = 0, mdx = 0, mdy = 0;
  for (let i = 0; i < n; i++) {
    msx += src[i].x; msy += src[i].y; mdx += dst[i].x; mdy += dst[i].y;
  }
  msx /= n; msy /= n; mdx /= n; mdy /= n;
  let sxx = 0, sxy = 0, norm = 0;
  for (let i = 0; i < n; i++) {
    const sx = src[i].x - msx, sy = src[i].y - msy;
    const dx = dst[i].x - mdx, dy = dst[i].y - mdy;
    sxx += sx * dx + sy * dy;
    sxy += sx * dy - sy * dx;
    norm += sx * sx + sy * sy;
  }
  if (norm === 0) throw new Error("Các điểm nguồn trùng nhau");
  const a = sxx / norm;
  const b = sxy / norm;
  return { a, b, tx: mdx - (a * msx - b * msy), ty: mdy - (b * msx + a * msy) };
}

export function applyTransform(t, p) {
  return { x: t.a * p.x - t.b * p.y + t.tx, y: t.b * p.x + t.a * p.y + t.ty };
}

/** Sai số căn khớp trung bình, chuẩn hoá theo scaleRef (vd khoảng cách 2 khoé mắt ngoài). */
export function alignmentError(t, src, dst, scaleRef) {
  const n = Math.min(src.length, dst.length);
  if (!n || !scaleRef) return Infinity;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const p = applyTransform(t, src[i]);
    sum += Math.hypot(p.x - dst[i].x, p.y - dst[i].y);
  }
  return sum / n / scaleRef;
}

/** Lọc max (giãn vùng) tách 2 chiều, bán kính r pixel. */
export function dilate(mask, width, height, r) {
  if (r <= 0) return Float32Array.from(mask);
  const tmp = new Float32Array(mask.length);
  const out = new Float32Array(mask.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let m = 0;
      const x0 = Math.max(0, x - r), x1 = Math.min(width - 1, x + r);
      for (let k = x0; k <= x1; k++) if (mask[row + k] > m) m = mask[row + k];
      tmp[row + x] = m;
    }
  }
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let m = 0;
      const y0 = Math.max(0, y - r), y1 = Math.min(height - 1, y + r);
      for (let k = y0; k <= y1; k++) if (tmp[k * width + x] > m) m = tmp[k * width + x];
      out[y * width + x] = m;
    }
  }
  return out;
}

/** Làm mềm biên bằng box blur tách 2 chiều (chạy 2 lần ~ gần Gaussian), bán kính r. */
export function boxBlur(mask, width, height, r) {
  if (r <= 0) return Float32Array.from(mask);
  let src = Float32Array.from(mask);
  const tmp = new Float32Array(mask.length);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < height; y++) {
      const row = y * width;
      let acc = 0, count = 0;
      for (let k = 0; k <= Math.min(r, width - 1); k++) { acc += src[row + k]; count++; }
      for (let x = 0; x < width; x++) {
        tmp[row + x] = acc / count;
        const add = x + r + 1, rem = x - r;
        if (add < width) { acc += src[row + add]; count++; }
        if (rem >= 0) { acc -= src[row + rem]; count--; }
      }
    }
    const out = new Float32Array(mask.length);
    for (let x = 0; x < width; x++) {
      let acc = 0, count = 0;
      for (let k = 0; k <= Math.min(r, height - 1); k++) { acc += tmp[k * width + x]; count++; }
      for (let y = 0; y < height; y++) {
        out[y * width + x] = acc / count;
        const add = y + r + 1, rem = y - r;
        if (add < height) { acc += tmp[add * width + x]; count++; }
        if (rem >= 0) { acc -= tmp[rem * width + x]; count--; }
      }
    }
    src = out;
  }
  return src;
}

/**
 * Đưa độ tin cậy mềm của model về gần nhị phân: < lo coi như 0, > hi coi như 1, giữa thì tuyến tính.
 * Lý do: mép tóc / sợi tóc mảnh model chỉ cho ~0.3–0.6; trộn thẳng theo số này sẽ để lại
 * "bóng ma" nửa trong suốt của tóc cũ (vệt mái trên trán, quầng quanh đỉnh đầu).
 */
export function ramp(x, lo = 0.2, hi = 0.5) {
  if (x <= lo) return 0;
  if (x >= hi) return 1;
  return (x - lo) / (hi - lo);
}

function rampAll(mask) {
  const out = new Float32Array(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = ramp(mask[i]);
  return out;
}

/**
 * Mask alpha (0..1): 1 = lấy pixel ảnh AI, 0 = giữ pixel ảnh gốc.
 *  - take    = tóc AI ∪ tóc gốc. Tóc gốc giãn GẤP ĐÔI để xoá sạch cả sợi mảnh/quầng mép tóc cũ.
 *  - protect = (da mặt ∪ da thân ∪ quần áo của ảnh GỐC) nhưng KHÔNG bảo vệ pixel nào còn dính tóc cũ
 *              (kể cả sợi tóc mảnh lẫn trên trán) và không bảo vệ chỗ tóc AI phủ lên (mái che trán).
 *  - alpha   = take * (1 - protect), làm mềm biên blurPx, nhân aiCoverage (ngoài vùng ảnh AI = 0)
 * Các mask là Float32Array độ tin cậy 0..1 cùng kích thước width*height.
 */
export function buildAlpha({ hairAI, hairOrig, keepOrig, aiCoverage, width, height, dilatePx = 4, blurPx = 4 }) {
  const n = width * height;
  const hA = rampAll(hairAI);
  const hO = rampAll(hairOrig);
  const keep = rampAll(keepOrig);
  const hAD = dilate(hA, width, height, dilatePx);
  const hOD = dilate(hO, width, height, dilatePx * 2);
  const hAProtectD = dilate(hA, width, height, Math.max(1, dilatePx >> 1));
  const alpha = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const take = Math.max(hAD[i], hOD[i]);
    const protect = keep[i] * (1 - hO[i]) * (1 - hAProtectD[i]);
    alpha[i] = take * (1 - protect);
  }
  const soft = boxBlur(alpha, width, height, blurPx);
  if (aiCoverage) {
    for (let i = 0; i < n; i++) soft[i] *= aiCoverage[i];
  }
  return soft;
}

/** Trộn 2 ảnh RGBA theo alpha (0 = gốc, 1 = AI). Trả Uint8ClampedArray mới, alpha kênh = 255. */
export function blendRgba(orig, ai, alpha) {
  const out = new Uint8ClampedArray(orig.length);
  for (let i = 0, p = 0; p < alpha.length; p++, i += 4) {
    const t = alpha[p];
    out[i] = orig[i] + (ai[i] - orig[i]) * t;
    out[i + 1] = orig[i + 1] + (ai[i + 1] - orig[i + 1]) * t;
    out[i + 2] = orig[i + 2] + (ai[i + 2] - orig[i + 2]) * t;
    out[i + 3] = 255;
  }
  return out;
}

/** Tổng độ tin cậy của 1 mask (dùng tính tỉ lệ vùng). */
export function maskSum(mask) {
  let s = 0;
  for (let i = 0; i < mask.length; i++) s += mask[i];
  return s;
}

/**
 * 7.1: khung cắt "đầu + vai" cho ảnh chụp xa (mặt nhỏ trong khung). Trả null nếu mặt đã đủ lớn
 * (ảnh selfie bình thường) — không cắt để khỏi đổi bố cục người dùng đã chọn.
 * @param {{imgW:number,imgH:number,face:{x:number,y:number,w:number,h:number}}} p (đơn vị pixel)
 */
export function computePortraitCrop({ imgW, imgH, face }) {
  if (!face || face.h <= 0 || face.w <= 0) return null;
  if (face.h / imgH >= 0.25) return null; // mặt đã chiếm >= 25% chiều cao -> giữ nguyên
  // Khung 3:4, mặt chiếm ~40% chiều cao khung
  let h = Math.min(imgH, face.h / 0.4);
  let w = Math.min(imgW, h * 0.75);
  h = Math.min(h, w / 0.75);
  const cx = face.x + face.w / 2;
  // Đỉnh khung cao hơn đỉnh mặt ~0.9 lần chiều cao mặt (chừa chỗ cho tóc)
  let x = Math.round(cx - w / 2);
  let y = Math.round(face.y - face.h * 0.9);
  x = Math.max(0, Math.min(imgW - w, x));
  y = Math.max(0, Math.min(imgH - h, y));
  return { x, y, w: Math.round(w), h: Math.round(h) };
}
