import { composeVideo } from "@/lib/ffmpeg";
import type { ReviewScript, VideoTemplateId } from "@/types/video";

type RenderVideoInput = {
  baseUrl?: string;
  businessName?: string;
  reviews?: string[];
  script?: ReviewScript;
  imageUrls: string[];
  audioUrl?: string;
  subtitles: string[];
  templateId?: VideoTemplateId;
};

type RenderVideoResult = {
  videoUrl: string;
  images?: string[];
  provider: string;
};

type RemoteRendererResponse = {
  videoUrl?: string;
  images?: string[];
  provider?: string;
};

export function isRemoteVideoRendererConfigured() {
  return Boolean(process.env.VIDEO_RENDERER_URL && process.env.VIDEO_RENDERER_TOKEN);
}

export async function renderVideo(input: RenderVideoInput): Promise<RenderVideoResult> {
  if (isRemoteVideoRendererConfigured()) {
    return renderRemoteVideo(input);
  }

  return {
    videoUrl: await composeVideo({
      images: input.imageUrls,
      audioUrl: input.audioUrl,
      subtitles: input.subtitles,
    }),
    provider: "local:ffmpeg",
  };
}

async function renderRemoteVideo(input: RenderVideoInput): Promise<RenderVideoResult> {
  const baseUrl = process.env.VIDEO_RENDERER_URL!.replace(/\/+$/, "");
  const renderUrl = baseUrl.endsWith("/render") ? baseUrl : `${baseUrl}/render`;
  const response = await fetch(renderUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.VIDEO_RENDERER_TOKEN}`,
    },
    body: JSON.stringify({
      businessName: input.businessName,
      reviews: input.reviews ?? [],
      script: input.script,
      imageUrls: resolveAssetUrls(input.imageUrls, input.baseUrl),
      audioUrl: input.audioUrl ? resolveAssetUrl(input.audioUrl, input.baseUrl) : "",
      subtitles: input.subtitles,
      templateId: input.templateId,
      output: {
        width: 1080,
        height: 1920,
        durationSeconds: 15,
        format: "mp4",
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Remote video renderer failed (${response.status}): ${body.slice(0, 200)}`);
  }

  const result = (await response.json()) as RemoteRendererResponse;

  if (!result.videoUrl) {
    throw new Error("Remote video renderer response must include videoUrl.");
  }

  return {
    videoUrl: result.videoUrl,
    images: result.images,
    provider: result.provider ?? "remote:video-renderer",
  };
}

function resolveAssetUrls(urls: string[], baseUrl?: string) {
  return urls.map((url) => resolveAssetUrl(url, baseUrl));
}

function resolveAssetUrl(url: string, baseUrl?: string) {
  if (!url.startsWith("/")) {
    return url;
  }

  if (!baseUrl) {
    return url;
  }

  return new URL(url, baseUrl).toString();
}
