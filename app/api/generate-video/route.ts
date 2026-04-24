import { NextResponse } from "next/server";
import { mediaRuntimeUnsupportedResponse } from "@/lib/deployment";
import { renderVideo } from "@/lib/video-renderer";
import type { GenerateVideoInput } from "@/types/video";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateVideoInput;

    if (!Array.isArray(body.images) || body.images.length < 3) {
      return NextResponse.json({ error: "Three generated images are required." }, { status: 400 });
    }

    const unsupportedResponse = mediaRuntimeUnsupportedResponse({ allowRemoteRendererOnly: true });
    if (unsupportedResponse) {
      return unsupportedResponse;
    }

    const renderedVideo = await renderVideo({
      baseUrl: new URL(request.url).origin,
      imageUrls: body.images,
      audioUrl: body.audioUrl,
      subtitles: Array.isArray(body.subtitles) ? body.subtitles : [],
    });

    return NextResponse.json({ videoUrl: renderedVideo.videoUrl, provider: renderedVideo.provider });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Video generation failed." },
      { status: 500 },
    );
  }
}
