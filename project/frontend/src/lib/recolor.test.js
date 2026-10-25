import { describe, it, expect } from "vitest";
import { recolorHair, rgbToHsl } from "./recolor";

describe("recolorHair", () => {
  function makeMockImageData(width, height, fillRgba = [50, 50, 50, 255]) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      data[i * 4] = fillRgba[0];
      data[i * 4 + 1] = fillRgba[1];
      data[i * 4 + 2] = fillRgba[2];
      data[i * 4 + 3] = fillRgba[3];
    }
    return { width, height, data };
  }

  it("pixel có mask=0 (hoặc <= 0.3) thì không đổi màu", () => {
    const src = makeMockImageData(2, 2, [60, 40, 20, 255]);
    const mask = new Float32Array([0, 0.1, 0.2, 0.3]);
    const targetRgb = [230, 80, 50]; // Đỏ cam
    const res = recolorHair(src, mask, targetRgb, 1.0);

    for (let i = 0; i < 16; i++) {
      expect(res.data[i]).toBe(src.data[i]);
    }
  });

  it("intensity = 0 thì toàn bộ ảnh không đổi", () => {
    const src = makeMockImageData(2, 2, [30, 30, 30, 255]);
    const mask = new Float32Array([1.0, 1.0, 1.0, 1.0]);
    const targetRgb = [240, 120, 200]; // Hồng
    const res = recolorHair(src, mask, targetRgb, 0);

    for (let i = 0; i < 16; i++) {
      expect(res.data[i]).toBe(src.data[i]);
    }
  });

  it("mask=1, intensity=1 thì hue xấp xỉ hue màu đích", () => {
    const src = makeMockImageData(1, 1, [40, 40, 40, 255]); // Tóc đen xám
    const mask = new Float32Array([1.0]);
    const targetRgb = [50, 120, 240]; // Xanh dương
    const [targetH] = rgbToHsl(targetRgb[0], targetRgb[1], targetRgb[2]);

    const res = recolorHair(src, mask, targetRgb, 1.0);
    const [resH] = rgbToHsl(res.data[0], res.data[1], res.data[2]);

    // Sai số hue < 0.05
    expect(Math.abs(resH - targetH)).toBeLessThan(0.05);
    // Kênh alpha giữ nguyên 255
    expect(res.data[3]).toBe(255);
  });
});
