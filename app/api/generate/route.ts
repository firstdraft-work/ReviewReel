import { NextResponse } from "next/server";
import { generateScript, normalizeReviews } from "@/lib/ai";
import { createSceneImages } from "@/lib/ffmpeg";
import { mediaRuntimeUnsupportedResponse } from "@/lib/deployment";
import { createVideoJob, markJobStep, updateVideoJob } from "@/lib/jobs";
import { defaultTemplateId, getVideoTemplate } from "@/lib/templates";
import { generateVoiceover } from "@/lib/tts";
import { isRemoteVideoRendererConfigured, renderVideo } from "@/lib/video-renderer";
import type { GeneratePipelineInput } from "@/types/video";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    const body = (await request.json()) as GeneratePipelineInput;
    const input = {
      businessName: body.businessName?.trim() ?? "",
      reviews: normalizeReviews(Array.isArray(body.reviews) ? body.reviews : []),
      imageUrls: Array.isArray(body.imageUrls)
        ? body.imageUrls.filter((url) => typeof url === "string" && isSupportedAssetUrl(url)).slice(0, 5)
        : [],
      templateId: getVideoTemplate(body.templateId).id ?? defaultTemplateId,
    };

    if (!input.businessName) {
      return NextResponse.json({ error: "Business name is required." }, { status: 400 });
    }

    if (input.reviews.length === 0) {
      return NextResponse.json({ error: "Add at least one review." }, { status: 400 });
    }

    const unsupportedResponse = mediaRuntimeUnsupportedResponse({ allowRemotePipeline: true });
    if (unsupportedResponse) {
      return unsupportedResponse;
    }

    let job = createVideoJob(input);
    job = updateVideoJob(job.id, { status: "processing" });
    let currentStep: "script" | "images" | "voice" | "video" | null = null;

    try {
      currentStep = "script";
      markJobStep(job.id, "script", "processing");
      const script = generateScript(input);
      job = updateVideoJob(job.id, { output: { script } });
      markJobStep(job.id, "script", "done");

      currentStep = "images";
      markJobStep(job.id, "images", "processing");
      const useRemoteRenderer = isRemoteVideoRendererConfigured();
      const images = useRemoteRenderer ? input.imageUrls : await createSceneImages(script, input.imageUrls, input.templateId);
      job = updateVideoJob(job.id, { output: { images } });
      markJobStep(job.id, "images", useRemoteRenderer ? "skipped" : "done");

      currentStep = "voice";
      markJobStep(job.id, "voice", "processing");
      const voiceover = await generateVoiceover([script.hook, ...script.socialProof, script.cta].join(" "), {
        language: script.language,
      });
      const audioUrl = voiceover.audioUrl;
      job = updateVideoJob(job.id, { output: { audioUrl, voiceProvider: voiceover.provider } });
      markJobStep(job.id, "voice", audioUrl ? "done" : "skipped");

      currentStep = "video";
      markJobStep(job.id, "video", "processing");
      const renderedVideo = await renderVideo({
        baseUrl: new URL(request.url).origin,
        businessName: input.businessName,
        reviews: input.reviews,
        script,
        imageUrls: images,
        audioUrl,
        subtitles: [script.hook, script.socialProof.join(" "), script.cta],
        templateId: input.templateId,
      });
      const videoUrl = renderedVideo.videoUrl;
      if (renderedVideo.images) {
        job = updateVideoJob(job.id, { output: { images: renderedVideo.images } });
      }
      markJobStep(job.id, "video", "done");
      currentStep = null;

      job = updateVideoJob(job.id, {
        status: "done",
        output: { videoUrl },
        metrics: { totalMs: Date.now() - startedAt },
      });

      return NextResponse.json({ job });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Generation failed.";
      if (currentStep) {
        markJobStep(job.id, currentStep, "failed", message);
      }
      job = updateVideoJob(job.id, {
        status: "failed",
        error: message,
        metrics: { totalMs: Date.now() - startedAt },
      });

      return NextResponse.json({ job, error: message }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request." },
      { status: 400 },
    );
  }
}

function isSupportedAssetUrl(url: string) {
  if (url.startsWith("/generated/")) {
    return true;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
