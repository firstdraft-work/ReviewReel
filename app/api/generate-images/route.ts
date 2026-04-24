import { NextResponse } from "next/server";
import { mediaRuntimeUnsupportedResponse } from "@/lib/deployment";
import { createSceneImages } from "@/lib/ffmpeg";
import type { GenerateImagesInput } from "@/types/video";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateImagesInput;

    if (!body.script?.hook || !Array.isArray(body.script.socialProof) || !body.script.cta) {
      return NextResponse.json({ error: "A complete script is required." }, { status: 400 });
    }

    const unsupportedResponse = mediaRuntimeUnsupportedResponse();
    if (unsupportedResponse) {
      return unsupportedResponse;
    }

    const images = await createSceneImages(body.script);

    return NextResponse.json({ images });
  } catch {
    return NextResponse.json(
      {
        images: [
          "/generated/fallback-hook.png",
          "/generated/fallback-proof.png",
          "/generated/fallback-cta.png",
        ],
        warning: "Image generation failed; fallback image URLs returned.",
      },
      { status: 200 },
    );
  }
}
