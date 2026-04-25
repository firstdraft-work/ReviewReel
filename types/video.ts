export type ReviewScript = {
  hook: string;
  socialProof: string[];
  cta: string;
  language: "en" | "zh";
  tone: string;
  keywords: string[];
  businessCategory: "food" | "beauty" | "repair" | "fitness" | "education" | "general";
};

export type VideoJobStatus = "pending" | "processing" | "done" | "failed";

export type VideoTemplateId = "bold-food" | "clean-service" | "warm-local" | "neon-night" | "minimal-pro" | "retro-diner";

export type VideoJobStepKey = "script" | "images" | "voice" | "video";

export type VideoJobStepStatus = "queued" | "processing" | "done" | "failed" | "skipped";

export type VideoJobStep = {
  status: VideoJobStepStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
};

export type VideoJob = {
  id: string;
  status: VideoJobStatus;
  steps: Record<VideoJobStepKey, VideoJobStep>;
  input: {
    businessName: string;
    reviews: string[];
    imageUrls: string[];
    templateId: VideoTemplateId;
  };
  output: {
    script?: ReviewScript;
    images: string[];
    audioUrl: string;
    voiceProvider: string;
    videoUrl: string;
  };
  error?: string;
  metrics: {
    totalMs?: number;
  };
  createdAt: string;
  updatedAt: string;
};

export type GenerateScriptInput = {
  businessName: string;
  reviews: string[];
};

export type GenerateImagesInput = {
  script: ReviewScript;
};

export type GenerateVoiceInput = {
  script: string;
  language?: ReviewScript["language"];
};

export type GenerateVideoInput = {
  images: string[];
  audioUrl?: string;
  subtitles: string[];
};

export type GeneratePipelineInput = GenerateScriptInput & {
  imageUrls?: string[];
  templateId?: VideoTemplateId;
};
