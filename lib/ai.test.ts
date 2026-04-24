import { describe, expect, it } from "vitest";
import { generateScript, normalizeReviews } from "@/lib/ai";

describe("normalizeReviews", () => {
  it("trims whitespace from each review", () => {
    const result = normalizeReviews(["  hello  ", " world "]);
    expect(result).toEqual(["hello", "world"]);
  });

  it("removes empty strings", () => {
    const result = normalizeReviews(["", "valid", "   ", "also valid"]);
    expect(result).toEqual(["valid", "also valid"]);
  });

  it("limits to 5 reviews", () => {
    const reviews = Array.from({ length: 8 }, (_, i) => `Review ${i}`);
    const result = normalizeReviews(reviews);
    expect(result).toHaveLength(5);
  });

  it("truncates reviews longer than 320 characters", () => {
    const long = "a".repeat(400);
    const result = normalizeReviews([long]);
    expect(result[0].length).toBe(320);
  });
});

describe("generateScript", () => {
  it("throws when business name is empty", () => {
    expect(() => generateScript({ businessName: "", reviews: ["Great!"] })).toThrow("Business name is required.");
  });

  it("throws when reviews are empty", () => {
    expect(() => generateScript({ businessName: "Test", reviews: [] })).toThrow("Add at least one review.");
  });

  it("generates an English script for English input", () => {
    const script = generateScript({
      businessName: "Sunset Tacos",
      reviews: ["Best tacos in town, five stars!"],
    });

    expect(script.language).toBe("en");
    expect(script.hook).toContain("Sunset Tacos");
    expect(script.socialProof).toHaveLength(3);
    expect(script.cta).toContain("Sunset Tacos");
  });

  it("generates a Chinese script for Chinese input", () => {
    const script = generateScript({
      businessName: "拉州拉面馆",
      reviews: ["牛肉面汤头很香，分量特别足"],
    });

    expect(script.language).toBe("zh");
    expect(script.hook).toContain("拉州拉面馆");
    expect(script.cta).toContain("拉州拉面馆");
    expect(script.businessCategory).toBe("food");
  });

  it("detects food category from Chinese restaurant name", () => {
    const script = generateScript({
      businessName: "兰州拉面馆",
      reviews: ["好吃"],
    });

    expect(script.businessCategory).toBe("food");
  });

  it("detects beauty category from keywords", () => {
    const script = generateScript({
      businessName: "美甲店",
      reviews: ["效果好"],
    });

    expect(script.businessCategory).toBe("beauty");
  });

  it("detects repair category from keywords", () => {
    const script = generateScript({
      businessName: "手机维修",
      reviews: ["修得快"],
    });

    expect(script.businessCategory).toBe("repair");
  });

  it("detects fitness category from keywords", () => {
    const script = generateScript({
      businessName: "健身中心",
      reviews: ["教练专业"],
    });

    expect(script.businessCategory).toBe("fitness");
  });

  it("detects education category from keywords", () => {
    const script = generateScript({
      businessName: "英语培训",
      reviews: ["老师负责"],
    });

    expect(script.businessCategory).toBe("education");
  });

  it("falls back to general category", () => {
    const script = generateScript({
      businessName: "ABC Services",
      reviews: ["Great service!"],
    });

    expect(script.businessCategory).toBe("general");
  });

  it("generates food-specific CTA for Chinese food business", () => {
    const script = generateScript({
      businessName: "兰州拉面",
      reviews: ["好吃"],
    });

    expect(script.cta).toContain("吃一碗");
  });

  it("generates beauty-specific CTA", () => {
    const script = generateScript({
      businessName: "美容院",
      reviews: ["效果好"],
    });

    expect(script.cta).toContain("预约");
  });

  it("extracts food keywords from Chinese reviews", () => {
    const script = generateScript({
      businessName: "拉面馆",
      reviews: ["汤头很香，分量特别足"],
    });

    expect(script.keywords.length).toBeGreaterThan(0);
  });

  it("pads social proof to 3 items when fewer reviews provided", () => {
    const script = generateScript({
      businessName: "Test Shop",
      reviews: ["One review only"],
    });

    expect(script.socialProof).toHaveLength(3);
  });
});
