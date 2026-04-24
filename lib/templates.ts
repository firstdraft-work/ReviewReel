import type { VideoTemplateId } from "@/types/video";

export type VideoTemplate = {
  id: VideoTemplateId;
  name: string;
  description: string;
  sceneColors: [string, string, string];
  labels: {
    en: [string, string, string];
    zh: [string, string, string];
  };
  imageOverlayOpacity: number;
  panelOpacity: number;
  footer: string;
};

export const videoTemplates: Record<VideoTemplateId, VideoTemplate> = {
  "bold-food": {
    id: "bold-food",
    name: "Bold Food",
    description: "High-contrast restaurant promo with punchy red and green scenes.",
    sceneColors: ["#e23d28", "#117a65", "#101010"],
    labels: {
      en: ["HOOK", "CUSTOMER LOVE", "READY?"],
      zh: ["开场亮点", "顾客口碑", "马上行动"],
    },
    imageOverlayOpacity: 0.34,
    panelOpacity: 0.42,
    footer: "15s local review ad",
  },
  "clean-service": {
    id: "clean-service",
    name: "Clean Service",
    description: "Calm service-business style with teal, navy, and crisp panels.",
    sceneColors: ["#0f766e", "#1d4ed8", "#111827"],
    labels: {
      en: ["WHY IT WORKS", "TRUSTED BY LOCALS", "BOOK NOW"],
      zh: ["推荐理由", "本地信任", "立即预约"],
    },
    imageOverlayOpacity: 0.42,
    panelOpacity: 0.50,
    footer: "trusted local service",
  },
  "warm-local": {
    id: "warm-local",
    name: "Warm Local",
    description: "Friendly neighborhood style with warm amber and green accents.",
    sceneColors: ["#c2410c", "#4d7c0f", "#7c2d12"],
    labels: {
      en: ["LOCAL FAVORITE", "REAL REVIEWS", "VISIT TODAY"],
      zh: ["街坊爱店", "真实好评", "今天就去"],
    },
    imageOverlayOpacity: 0.30,
    panelOpacity: 0.38,
    footer: "made for neighborhood favorites",
  },
};

export const defaultTemplateId: VideoTemplateId = "bold-food";

export function getVideoTemplate(templateId?: string) {
  if (templateId && templateId in videoTemplates) {
    return videoTemplates[templateId as VideoTemplateId];
  }

  return videoTemplates[defaultTemplateId];
}
