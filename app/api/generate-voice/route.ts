import { NextResponse } from "next/server";
import { mediaRuntimeUnsupportedResponse } from "@/lib/deployment";
import { generateVoiceover } from "@/lib/tts";
import type { GenerateVoiceInput } from "@/types/video";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateVoiceInput;

    if (!body.script?.trim()) {
      return NextResponse.json({ error: "Script text is required." }, { status: 400 });
    }

    const unsupportedResponse = mediaRuntimeUnsupportedResponse({ allowCloudTtsOnly: true });
    if (unsupportedResponse) {
      return unsupportedResponse;
    }

    const voiceover = await generateVoiceover(body.script, { language: body.language });

    return NextResponse.json({ audioUrl: voiceover.audioUrl, provider: voiceover.provider });
  } catch {
    return NextResponse.json({ audioUrl: "", warning: "TTS failed; video will render without audio." });
  }
}
