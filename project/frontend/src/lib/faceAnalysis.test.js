import { describe, it, expect } from "vitest";
import { classifyFaceShape } from "./faceAnalysis";

describe("classifyFaceShape", () => {
  it("phân loại Oval khi tỷ lệ cân đối, không lệch rõ nhóm nào", () => {
    const { faceShape } = classifyFaceShape({
      foreheadWidth: 88, cheekboneWidth: 90, jawWidth: 82, faceLength: 125,
    }); // r1=125/90=1.389 (giữa 1.15-1.6), r2=88/82=1.073 (<1.15), r3=90/85=1.059 (<1.1)
    expect(faceShape).toBe("Oval");
  });

  it("phân loại Round khi mặt ngắn/rộng và hàm mềm", () => {
    const { faceShape } = classifyFaceShape({
      foreheadWidth: 85, cheekboneWidth: 100, jawWidth: 75, faceLength: 105,
    }); // r1=105/100=1.05 (<=1.15), jawToCheek=75/100=0.75 (<=0.88) -> Round
    expect(faceShape).toBe("Round");
  });

  it("phân loại Square khi mặt ngắn/rộng và hàm gần vuông", () => {
    const { faceShape } = classifyFaceShape({
      foreheadWidth: 90, cheekboneWidth: 100, jawWidth: 92, faceLength: 108,
    }); // r1=108/100=1.08 (<=1.15), jawToCheek=92/100=0.92 (>0.88) -> Square
    expect(faceShape).toBe("Square");
  });

  it("phân loại Oblong khi mặt dài rõ rệt", () => {
    const { faceShape } = classifyFaceShape({
      foreheadWidth: 80, cheekboneWidth: 85, jawWidth: 78, faceLength: 145,
    }); // r1=145/85=1.706 (>=1.6) -> Oblong
    expect(faceShape).toBe("Oblong");
  });

  it("phân loại Heart khi trán rộng hơn hàm rõ rệt", () => {
    const { faceShape } = classifyFaceShape({
      foreheadWidth: 95, cheekboneWidth: 92, jawWidth: 70, faceLength: 125,
    }); // r1=125/92=1.358 (giữa 1.15-1.6), r2=95/70=1.357 (>=1.15) -> Heart
    expect(faceShape).toBe("Heart");
  });

  it("phân loại Diamond khi gò má nổi bật hơn hẳn trán và hàm", () => {
    const { faceShape } = classifyFaceShape({
      foreheadWidth: 75, cheekboneWidth: 100, jawWidth: 72, faceLength: 130,
    }); // r1=130/100=1.3, r2=75/72=1.042 (<1.15), r3=100/73.5=1.361 (>=1.1) -> Diamond
    expect(faceShape).toBe("Diamond");
  });

  it("ném lỗi khi kích thước khuôn mặt không hợp lệ (bằng 0)", () => {
    expect(() =>
      classifyFaceShape({ foreheadWidth: 0, cheekboneWidth: 0, jawWidth: 0, faceLength: 0 })
    ).toThrow();
  });
});
