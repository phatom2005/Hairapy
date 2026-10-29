import { describe, it, expect, vi } from "vitest";

vi.mock("../../store/useAuthStore", () => ({
  default: () => ({ user: null }),
}));
import { renderToStaticMarkup } from "react-dom/server";
import UserAvatar from "./UserAvatar";

describe("UserAvatar Component & Tiers", () => {
  it("renders basic FREE avatar without frames", () => {
    const html = renderToStaticMarkup(<UserAvatar name="Nguyen Van A" email="vana@example.com" plan="FREE" />);
    expect(html).toContain("A"); // First letter of last word
    expect(html).not.toContain("AvatarFramePro");
    expect(html).toContain("border-white/20");
    expect(html).not.toContain("PREMIUM");
    expect(html).not.toContain("PRO");
  });

  it("renders PRO avatar with AvatarFramePro and PRO badge", () => {
    const html = renderToStaticMarkup(<UserAvatar name="Tran Pro" email="pro@example.com" plan="PRO" size="lg" />);
    // Contains PRO label badge
    expect(html).toContain("PRO");
    // Contains gold and blue gradients for PRO
    expect(html).toContain("from-[#1039da] to-[#ff57cf]");
    // Outer svg has 200 200 viewBox for exact concentric centering
    expect(html).toContain('viewBox="0 0 200 200"');
    // Sanitizes unsafe border classes
    expect(html).not.toContain("border-4 border-white");
  });

  it("renders PREMIUM avatar with AvatarFramePremium and PREMIUM badge", () => {
    const html = renderToStaticMarkup(<UserAvatar name="Vo Quang Trung" email="trung@example.com" plan="PREMIUM" size="lg" />);
    // Contains PREMIUM badge
    expect(html).toContain("PREMIUM");
    // Contains regal gradient
    expect(html).toContain("from-[#17061d] via-[#850069] to-[#17061d]");
    // Contains Haute Tiara viewBox
    expect(html).toContain('viewBox="0 0 200 226"');
  });

  it("scales badge proportionally across all sizes", () => {
    const htmlSm = renderToStaticMarkup(<UserAvatar name="User" plan="PRO" size="sm" />);
    const htmlLg = renderToStaticMarkup(<UserAvatar name="User" plan="PRO" size="lg" />);
    const htmlXl = renderToStaticMarkup(<UserAvatar name="User" plan="PRO" size="xl" />);

    // sm: (36/96) * 1.25 = 0.46875
    expect(htmlSm).toContain("scale(0.46875)");
    // lg: 1.0 * 1.25 = 1.25
    expect(htmlLg).toContain("scale(1.25)");
    // xl: 1.67 * 1.25 = 2.0875
    expect(htmlXl).toContain("scale(2.0875)");
  });

  it("strips ring and border classes that would cause a square box", () => {
    const html = renderToStaticMarkup(
      <UserAvatar
        name="User"
        plan="PRO"
        className="border-2 border-white ring-2 ring-primary/40 group-hover:scale-105"
      />
    );
    expect(html).not.toContain("border-2");
    expect(html).not.toContain("ring-2");
    expect(html).toContain("group-hover:scale-105");
  });

  it("hides bottom star/gem when showLabel is true to prevent badge collision", () => {
    // When showLabel is true, bottom star is omitted so it doesn't collide with the HTML PRO badge
    const htmlWithLabel = renderToStaticMarkup(<UserAvatar name="User" plan="PRO" showLabel={true} />);
    // translate(100, 177) is the bottom star in SVG
    expect(htmlWithLabel).not.toContain("translate(100, 177)");

    // When showLabel is false, bottom star is rendered as a clean 6-o'clock anchor
    const htmlWithoutLabel = renderToStaticMarkup(<UserAvatar name="User" plan="PRO" showLabel={false} />);
    expect(htmlWithoutLabel).toContain("translate(100, 177)");
  });
});
