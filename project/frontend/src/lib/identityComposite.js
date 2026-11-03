// Phase 7.2 — Ghép ảnh giữ danh tính (identity-preserving composite).
//
// AILab sinh lại cả ảnh nên gương mặt, tông da, trang phục và nền có thể bị đổi.
// Hàm ở đây chỉ lấy VÙNG TÓC từ ảnh AI rồi ghép lên ảnh gốc của người dùng:
//   1. Căn khớp ảnh AI về ảnh gốc theo landmark khuôn mặt (similarity transform)
//   2. Phân vùng 2 ảnh bằng selfie_multiclass (tóc / da mặt / da thân / quần áo)
//   3. Lấy AI ở vùng tóc (mới + cũ), giữ mặt/cổ/áo gốc, làm mềm biên rồi trộn
// Mọi model MediaPipe tải theo nhu cầu (xem visionFileset.js).

import { detectLandmarksPx } from "./faceAnalysis";
import { getCategoryMasks } from "./hairSegmenter";
import {
  ALIGN_LANDMARKS,
  similarityTransform,
  alignmentError,
  buildAlpha,
  blendRgba,
  maskSum,
  computePortraitCrop,
} from "./identityComposite.math";

/** Cạnh dài tối đa khi xử lý ghép (đủ nét để xem/chia sẻ, đủ nhanh trên laptop tầm trung). */
const MAX_SIDE = 1280;
/** Sai số căn khớp tối đa (chuẩn hoá theo khoảng cách 2 khoé mắt ngoài). Lớn hơn = mặt AI méo quá, không ghép. */
const MAX_ALIGN_ERROR = 0.09;
/** Tỉ lệ vùng tóc AI / vùng mặt tối thiểu — nhỏ hơn coi như AI không ra tóc rõ. */
const MIN_HAIR_COVERAGE = 0.15;

async function toBitmap(blob) {
  return createImageBitmap(blob, { imageOrientation: "from-image" });
}

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Vẽ nguồn theo kiểu "cover" vào khung w×h (giữ tỉ lệ, cắt phần thừa, căn giữa). */
function drawCover(ctx, src, w, h) {
  const s = Math.max(w / src.width, h / src.height);
  const dw = src.width * s, dh = src.height * s;
  ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function pick(landmarks) {
  return ALIGN_LANDMARKS.map((i) => landmarks[i]);
}

/**
 * Ghép ảnh giữ danh tính.
 * @param {{ originalBlob: Blob, aiBlob: Blob }} p originalBlob = ĐÚNG ảnh đã gửi lên AI (cùng khung hình)
 * @returns {Promise<{ ok: boolean, reason?: string, blob?: Blob, alignError?: number, hairCoverage?: number }>}
 */
export async function composeIdentityPreserving({ originalBlob, aiBlob }) {
  const origBmp = await toBitmap(originalBlob);
  const aiBmp = await toBitmap(aiBlob);
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(origBmp.width, origBmp.height));
    const W = Math.round(origBmp.width * scale);
    const H = Math.round(origBmp.height * scale);

    const origCanvas = makeCanvas(W, H);
    const octx = origCanvas.getContext("2d", { willReadFrequently: true });
    octx.drawImage(origBmp, 0, 0, W, H);

    // Ảnh AI đưa về cùng khung W×H trước (AILab thường giữ tỉ lệ ảnh gửi đi)
    const aiCanvas = makeCanvas(W, H);
    drawCover(aiCanvas.getContext("2d"), aiBmp, W, H);

    // 1) Căn khớp theo landmark
    const lmO = await detectLandmarksPx(origCanvas);
    const lmA = await detectLandmarksPx(aiCanvas);
    if (!lmO || !lmA) return { ok: false, reason: "no_face" };
    const src = pick(lmA), dst = pick(lmO);
    const t = similarityTransform(src, dst);
    const eyeDist = Math.hypot(lmO[263].x - lmO[33].x, lmO[263].y - lmO[33].y);
    const alignError = alignmentError(t, src, dst, eyeDist);
    if (!(alignError <= MAX_ALIGN_ERROR)) return { ok: false, reason: "align", alignError };

    const warped = makeCanvas(W, H);
    const wctx = warped.getContext("2d", { willReadFrequently: true });
    // x' = a*x - b*y + tx ; y' = b*x + a*y + ty  ->  setTransform(a, b, c=-b, d=a, e=tx, f=ty)
    wctx.setTransform(t.a, t.b, -t.b, t.a, t.tx, t.ty);
    wctx.drawImage(aiCanvas, 0, 0);
    wctx.setTransform(1, 0, 0, 1, 0, 0);

    // 2) Phân vùng cả 2 ảnh
    const mO = await getCategoryMasks(origCanvas, W, H);
    const mA = await getCategoryMasks(warped, W, H);

    const faceArea = maskSum(mO.faceSkin);
    const hairCoverage = faceArea > 0 ? maskSum(mA.hair) / faceArea : 0;
    if (hairCoverage < MIN_HAIR_COVERAGE) return { ok: false, reason: "no_hair", alignError, hairCoverage };

    const n = W * H;
    const keepOrig = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      keepOrig[i] = Math.max(mO.faceSkin[i], mO.bodySkin[i], mO.clothes[i]);
    }

    const origPx = octx.getImageData(0, 0, W, H);
    const aiPx = wctx.getImageData(0, 0, W, H);
    // Pixel nằm ngoài ảnh AI sau khi xoay/dịch có alpha = 0 -> không lấy từ AI
    const aiCoverage = new Float32Array(n);
    for (let i = 0; i < n; i++) aiCoverage[i] = aiPx.data[i * 4 + 3] / 255;

    // 3) Mask + trộn
    const edge = Math.max(2, Math.round(Math.min(W, H) / 200)); // ~4–6px ở 1000px
    const alpha = buildAlpha({
      hairAI: mA.hair,
      hairOrig: mO.hair,
      keepOrig,
      aiCoverage,
      width: W,
      height: H,
      dilatePx: edge,
      blurPx: edge,
    });
    const out = blendRgba(origPx.data, aiPx.data, alpha);
    octx.putImageData(new ImageData(out, W, H), 0, 0);

    const blob = await new Promise((resolve) => origCanvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return { ok: false, reason: "encode", alignError, hairCoverage };
    return { ok: true, blob, alignError, hairCoverage };
  } finally {
    origBmp.close?.();
    aiBmp.close?.();
  }
}

/**
 * 7.1: chuẩn bị ảnh gửi lên AI — xoay đúng EXIF, nếu chụp xa (mặt nhỏ) thì cắt về khung đầu + vai,
 * cạnh dài tối đa 1280px, JPEG 0.9. Ảnh trả về cũng là ảnh gốc dùng để ghép (cùng khung hình với ảnh AI).
 * Lỗi bất kỳ -> trả null để caller dùng cách chuẩn hoá cũ.
 * @returns {Promise<{ file: File, width: number, height: number, cropped: boolean } | null>}
 */
export async function prepareSwapInput(file) {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      const probeScale = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
      const pw = Math.round(bmp.width * probeScale), ph = Math.round(bmp.height * probeScale);
      const probe = makeCanvas(pw, ph);
      probe.getContext("2d").drawImage(bmp, 0, 0, pw, ph);

      let crop = null;
      const lm = await detectLandmarksPx(probe);
      if (lm) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of lm) {
          if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
        }
        const c = computePortraitCrop({
          imgW: pw, imgH: ph, face: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
        });
        if (c) crop = { x: c.x / probeScale, y: c.y / probeScale, w: c.w / probeScale, h: c.h / probeScale };
      }

      const sx = crop ? crop.x : 0, sy = crop ? crop.y : 0;
      const sw = crop ? crop.w : bmp.width, sh = crop ? crop.h : bmp.height;
      const s = Math.min(1, MAX_SIDE / Math.max(sw, sh));
      const w = Math.round(sw * s), h = Math.round(sh * s);
      const canvas = makeCanvas(w, h);
      canvas.getContext("2d").drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) return null;
      return { file: new File([blob], "photo.jpg", { type: "image/jpeg" }), width: w, height: h, cropped: !!crop };
    } finally {
      bmp.close?.();
    }
  } catch (err) {
    console.warn("Không chuẩn bị được ảnh gửi AI, dùng cách cũ:", err);
    return null;
  }
}
