/**
 * Chuyển đổi RGB [0..255] sang HSL [0..1]
 */
export function rgbToHsl(r, g, b) {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rf:
        h = (gf - bf) / d + (gf < bf ? 6 : 0);
        break;
      case gf:
        h = (bf - rf) / d + 2;
        break;
      case bf:
        h = (rf - gf) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h, s, l];
}

/**
 * Chuyển đổi HSL [0..1] sang RGB [0..255]
 */
export function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      let tNorm = t;
      if (tNorm < 0) tNorm += 1;
      if (tNorm > 1) tNorm -= 1;
      if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm;
      if (tNorm < 1 / 2) return q;
      if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [
    Math.round(Math.min(255, Math.max(0, r * 255))),
    Math.round(Math.min(255, Math.max(0, g * 255))),
    Math.round(Math.min(255, Math.max(0, b * 255))),
  ];
}

/**
 * Hàm nội suy mượt mà smoothstep giữa min và max
 */
export function smoothstep(min, max, x) {
  const t = Math.max(0, Math.min(1, (x - min) / (max - min)));
  return t * t * (3 - 2 * t);
}

/**
 * Tô màu vùng tóc, giữ chi tiết sợi tóc bằng cách giữ độ sáng gốc.
 * @param {ImageData} src   ảnh gốc
 * @param {Float32Array} mask độ tin cậy tóc 0..1 (cùng kích thước width*height)
 * @param {[number,number,number]} rgb màu đích [r, g, b] (0..255)
 * @param {number} intensity 0..1 (thanh trượt "Độ đậm")
 * @returns {ImageData} ảnh mới
 */
export function recolorHair(src, mask, rgb, intensity = 0.7) {
  const { width, height } = src;
  const numPixels = width * height;
  const outData = new Uint8ClampedArray(src.data);

  if (!mask || mask.length < numPixels || intensity <= 0) {
    if (typeof ImageData !== "undefined") {
      return new ImageData(outData, width, height);
    }
    return { width, height, data: outData };
  }

  const [hDst, sDst, lDst] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  const boost = Math.max(0, lDst - 0.6) * 0.35;

  for (let i = 0; i < numPixels; i++) {
    const rawConf = mask[i];
    if (rawConf <= 0.3) {
      continue;
    }

    const alpha = smoothstep(0.3, 0.7, rawConf) * intensity;
    if (alpha <= 0) continue;

    const idx = i * 4;
    const srcR = src.data[idx];
    const srcG = src.data[idx + 1];
    const srcB = src.data[idx + 2];

    const [, , lSrc] = rgbToHsl(srcR, srcG, srcB);
    const lNew = Math.min(1, Math.max(0, lSrc * 0.75 + lDst * 0.25 + boost));

    const [rNew, gNew, bNew] = hslToRgb(hDst, sDst, lNew);

    outData[idx] = Math.round(srcR * (1 - alpha) + rNew * alpha);
    outData[idx + 1] = Math.round(srcG * (1 - alpha) + gNew * alpha);
    outData[idx + 2] = Math.round(srcB * (1 - alpha) + bNew * alpha);
    // Giữ nguyên kênh alpha
    outData[idx + 3] = src.data[idx + 3];
  }

  if (typeof ImageData !== "undefined") {
    return new ImageData(outData, width, height);
  }
  return { width, height, data: outData };
}
