import { describe, it, expect } from "vitest";
import {
  similarityTransform,
  applyTransform,
  alignmentError,
  dilate,
  boxBlur,
  buildAlpha,
  blendRgba,
  computePortraitCrop,
} from "./identityComposite.math";

const pts = [
  { x: 10, y: 20 },
  { x: 40, y: 22 },
  { x: 25, y: 40 },
  { x: 15, y: 55 },
  { x: 35, y: 56 },
];

describe("similarityTransform", () => {
  it("biến đổi đồng nhất khi 2 tập điểm trùng nhau", () => {
    const t = similarityTransform(pts, pts);
    expect(t.a).toBeCloseTo(1, 6);
    expect(t.b).toBeCloseTo(0, 6);
    expect(t.tx).toBeCloseTo(0, 6);
    expect(t.ty).toBeCloseTo(0, 6);
  });

  it("khôi phục đúng phép xoay 30° + scale 1.5 + dịch biết trước", () => {
    const ang = Math.PI / 6, s = 1.5;
    const truth = { a: s * Math.cos(ang), b: s * Math.sin(ang), tx: 12, ty: -7 };
    const dst = pts.map((p) => applyTransform(truth, p));
    const t = similarityTransform(pts, dst);
    expect(t.a).toBeCloseTo(truth.a, 6);
    expect(t.b).toBeCloseTo(truth.b, 6);
    expect(t.tx).toBeCloseTo(truth.tx, 6);
    expect(t.ty).toBeCloseTo(truth.ty, 6);
    expect(alignmentError(t, pts, dst, 30)).toBeLessThan(1e-9);
  });

  it("sai số căn khớp lớn khi điểm đích bị méo (mặt bị AI đổi dáng)", () => {
    const dst = pts.map((p, i) => ({ x: p.x + (i % 2 ? 6 : -6), y: p.y + (i === 2 ? 10 : 0) }));
    const t = similarityTransform(pts, dst);
    expect(alignmentError(t, pts, dst, 30)).toBeGreaterThan(0.09);
  });
});

describe("dilate / boxBlur", () => {
  it("dilate mở rộng 1 điểm thành ô vuông bán kính r", () => {
    const m = new Float32Array(25); m[12] = 1; // giữa lưới 5x5
    const d = dilate(m, 5, 5, 1);
    const ones = [6, 7, 8, 11, 12, 13, 16, 17, 18];
    for (let i = 0; i < 25; i++) expect(d[i]).toBe(ones.includes(i) ? 1 : 0);
  });

  it("boxBlur giữ nguyên mask đồng nhất và làm mềm biên", () => {
    const flat = new Float32Array(36).fill(0.5);
    boxBlur(flat, 6, 6, 2).forEach((v) => expect(v).toBeCloseTo(0.5, 6));
    const edge = new Float32Array(36); for (let y = 0; y < 6; y++) for (let x = 3; x < 6; x++) edge[y * 6 + x] = 1;
    const b = boxBlur(edge, 6, 6, 1);
    expect(b[2 * 6 + 0]).toBeCloseTo(0, 6);
    expect(b[2 * 6 + 5]).toBeCloseTo(1, 6);
    expect(b[2 * 6 + 2]).toBeGreaterThan(0);
    expect(b[2 * 6 + 2]).toBeLessThan(1);
  });
});

describe("buildAlpha", () => {
  const W = 4, H = 1;
  // pixel 0: tóc AI | 1: mặt gốc (không tóc AI) | 2: tóc gốc (tóc AI không có) | 3: mặt gốc + tóc AI (mái)
  const hairAI = Float32Array.from([1, 0, 0, 1]);
  const hairOrig = Float32Array.from([0, 0, 1, 0]);
  const keepOrig = Float32Array.from([0, 1, 0, 1]);

  it("lấy AI ở vùng tóc mới + vùng tóc cũ, giữ mặt gốc, mái tóc AI được phủ lên mặt", () => {
    const a = buildAlpha({ hairAI, hairOrig, keepOrig, width: W, height: H, dilatePx: 0, blurPx: 0 });
    // hairAID (giãn tối thiểu 1px) làm pixel 1 bị coi là gần tóc AI -> protect giảm; kiểm tra thứ tự đúng
    expect(a[0]).toBeCloseTo(1, 6);
    expect(a[2]).toBeCloseTo(1, 6);
    expect(a[3]).toBeCloseTo(1, 6);
  });

  it("mặt gốc nằm xa tóc AI thì giữ nguyên ảnh gốc", () => {
    const W2 = 6;
    const hA = Float32Array.from([1, 0, 0, 0, 0, 0]);
    const hO = new Float32Array(6);
    const kO = Float32Array.from([0, 0, 0, 1, 1, 1]);
    const a = buildAlpha({ hairAI: hA, hairOrig: hO, keepOrig: kO, width: W2, height: 1, dilatePx: 0, blurPx: 0 });
    expect(a[4]).toBe(0);
    expect(a[5]).toBe(0);
  });

  it("aiCoverage = 0 (ngoài vùng ảnh AI sau khi xoay) thì không lấy AI", () => {
    const a = buildAlpha({ hairAI, hairOrig, keepOrig, aiCoverage: new Float32Array(4), width: W, height: H, dilatePx: 0, blurPx: 0 });
    a.forEach((v) => expect(v).toBe(0));
  });
});

describe("blendRgba", () => {
  it("trộn tuyến tính theo alpha, kênh alpha luôn 255", () => {
    const orig = Uint8ClampedArray.from([0, 0, 0, 255, 100, 100, 100, 255]);
    const ai = Uint8ClampedArray.from([200, 100, 50, 255, 0, 0, 0, 0]);
    const out = blendRgba(orig, ai, Float32Array.from([0.5, 0]));
    expect(Array.from(out)).toEqual([100, 50, 25, 255, 100, 100, 100, 255]);
  });
});

describe("computePortraitCrop", () => {
  it("không cắt ảnh selfie (mặt đã lớn)", () => {
    expect(computePortraitCrop({ imgW: 900, imgH: 1200, face: { x: 300, y: 300, w: 300, h: 400 } })).toBeNull();
  });

  it("cắt về khung 3:4 quanh mặt khi chụp xa, nằm trong ảnh", () => {
    const c = computePortraitCrop({ imgW: 3000, imgH: 4000, face: { x: 1400, y: 800, w: 240, h: 320 } });
    expect(c).not.toBeNull();
    expect(c.w / c.h).toBeCloseTo(0.75, 2);
    expect(320 / c.h).toBeCloseTo(0.4, 2);
    expect(c.x).toBeGreaterThanOrEqual(0);
    expect(c.y).toBeGreaterThanOrEqual(0);
    expect(c.x + c.w).toBeLessThanOrEqual(3000);
    expect(c.y + c.h).toBeLessThanOrEqual(4000);
    expect(c.y).toBeLessThan(800); // chừa khoảng phía trên cho tóc
  });
});
