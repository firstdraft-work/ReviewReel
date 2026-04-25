import { describe, expect, it } from "vitest";
import { defaultTemplateId, getVideoTemplate, videoTemplates } from "@/lib/templates";

describe("getVideoTemplate", () => {
  it("returns bold-food template for bold-food id", () => {
    const template = getVideoTemplate("bold-food");
    expect(template.id).toBe("bold-food");
    expect(template.name).toBe("Bold Food");
  });

  it("returns clean-service template for clean-service id", () => {
    const template = getVideoTemplate("clean-service");
    expect(template.id).toBe("clean-service");
  });

  it("returns warm-local template for warm-local id", () => {
    const template = getVideoTemplate("warm-local");
    expect(template.id).toBe("warm-local");
  });

  it("returns neon-night template for neon-night id", () => {
    const template = getVideoTemplate("neon-night");
    expect(template.id).toBe("neon-night");
    expect(template.sceneColors).toHaveLength(3);
  });

  it("returns minimal-pro template for minimal-pro id", () => {
    const template = getVideoTemplate("minimal-pro");
    expect(template.id).toBe("minimal-pro");
    expect(template.sceneColors).toHaveLength(3);
  });

  it("returns retro-diner template for retro-diner id", () => {
    const template = getVideoTemplate("retro-diner");
    expect(template.id).toBe("retro-diner");
    expect(template.sceneColors).toHaveLength(3);
  });

  it("returns default template for unknown id", () => {
    const template = getVideoTemplate("nonexistent");
    expect(template.id).toBe(defaultTemplateId);
  });

  it("returns default template for undefined id", () => {
    const template = getVideoTemplate(undefined);
    expect(template.id).toBe(defaultTemplateId);
  });

  it("every template has 3 scene colors", () => {
    for (const template of Object.values(videoTemplates)) {
      expect(template.sceneColors).toHaveLength(3);
    }
  });

  it("every template has en and zh labels with 3 items each", () => {
    for (const template of Object.values(videoTemplates)) {
      expect(template.labels.en).toHaveLength(3);
      expect(template.labels.zh).toHaveLength(3);
    }
  });

  it("every template has opacity values between 0 and 1", () => {
    for (const template of Object.values(videoTemplates)) {
      expect(template.imageOverlayOpacity).toBeGreaterThan(0);
      expect(template.imageOverlayOpacity).toBeLessThan(1);
      expect(template.panelOpacity).toBeGreaterThan(0);
      expect(template.panelOpacity).toBeLessThan(1);
    }
  });
});
