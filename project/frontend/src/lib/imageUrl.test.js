import { describe, expect, it } from "vitest";
import { optimizedImage } from "./imageUrl";

const CLD = "https://res.cloudinary.com/demo/image/upload/v1712345678/hairapy/catalog/side-part.jpg";

describe("optimizedImage", () => {
  it("chèn f_auto,q_auto và độ rộng cho ảnh Cloudinary", () => {
    expect(optimizedImage(CLD, 560)).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_560/v1712345678/hairapy/catalog/side-part.jpg",
    );
  });

  it("không đụng tới ảnh không phải Cloudinary", () => {
    const p = "https://placehold.co/400x500?text=Bob";
    expect(optimizedImage(p, 400)).toBe(p);
    expect(optimizedImage("", 400)).toBe("");
    expect(optimizedImage(null, 400)).toBe(null);
  });

  it("giữ nguyên URL đã có biến đổi (vd. watermark)", () => {
    const wm = "https://res.cloudinary.com/demo/image/upload/l_hairapy_wm,o_60/v1/hairapy/swap/x.jpg";
    expect(optimizedImage(wm, 400)).toBe(wm);
  });
});
