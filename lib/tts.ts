import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { promisify } from "node:util";
import { createSilentVoiceover } from "@/lib/ffmpeg";
import { ensureGeneratedDir, generatedPath, publicGeneratedUrl, saveGeneratedAsset } from "@/lib/storage";
import type { ReviewScript } from "@/types/video";

const execFileAsync = promisify(execFile);
const ffmpegBin = process.env.FFMPEG_PATH || "ffmpeg";

type VoiceoverResult = {
  audioUrl: string;
  provider: string;
};

type RemoteVoiceoverResponse = {
  audioUrl?: string;
  audioBase64?: string;
  contentType?: string;
  provider?: string;
};

export async function generateVoiceover(
  script: string,
  options: { language?: ReviewScript["language"] } = {},
): Promise<VoiceoverResult> {
  const provider = process.env.TTS_PROVIDER || (process.env.VERCEL === "1" ? "cloud" : "system");
  const language = options.language ?? inferLanguage(script);

  if (provider === "silent") {
    return createSilentResult("silent");
  }

  if (provider === "cloud" || provider === "remote") {
    return createRemoteVoiceover(script, language);
  }

  try {
    return await createSystemVoiceover(script, language);
  } catch {
    return createSilentResult("silent-fallback");
  }
}

export function isRendererTtsAvailable() {
  return Boolean(process.env.VIDEO_RENDERER_URL && process.env.VIDEO_RENDERER_TOKEN);
}

export async function generateVoiceoverFromRenderer(
  script: string,
  language: ReviewScript["language"],
): Promise<VoiceoverResult> {
  const baseUrl = process.env.VIDEO_RENDERER_URL!.replace(/\/+$/, "");
  const ttsUrl = baseUrl.endsWith("/tts") ? baseUrl : `${baseUrl}/tts`;

  const response = await fetch(ttsUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.VIDEO_RENDERER_TOKEN}`,
    },
    body: JSON.stringify({
      script: compressForVoiceover(script, language),
      language,
      targetDurationSeconds: 15,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Renderer TTS failed (${response.status}): ${body.slice(0, 200)}`);
  }

  const result = (await response.json()) as RemoteVoiceoverResponse;

  if (!result.audioUrl) {
    throw new Error("Renderer TTS response must include audioUrl.");
  }

  return {
    audioUrl: result.audioUrl,
    provider: result.provider ?? "renderer:edge-tts",
  };
}

export function isCloudTtsConfigured() {
  return Boolean(process.env.TTS_ENDPOINT_URL && process.env.TTS_API_KEY);
}

async function createRemoteVoiceover(script: string, language: ReviewScript["language"]): Promise<VoiceoverResult> {
  if (!isCloudTtsConfigured()) {
    throw new Error("Cloud TTS requires TTS_ENDPOINT_URL and TTS_API_KEY.");
  }

  const response = await fetch(process.env.TTS_ENDPOINT_URL!, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.TTS_API_KEY}`,
    },
    body: JSON.stringify({
      script: compressForVoiceover(script, language),
      language,
      format: "mp3",
      targetDurationSeconds: 15,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Cloud TTS failed (${response.status}): ${body.slice(0, 200)}`);
  }

  const result = (await response.json()) as RemoteVoiceoverResponse;

  if (result.audioUrl) {
    return {
      audioUrl: result.audioUrl,
      provider: result.provider ?? "cloud:remote-url",
    };
  }

  if (result.audioBase64) {
    const contentType = result.contentType ?? "audio/mpeg";
    const extension = contentType.includes("wav") ? "wav" : "mp3";
    const audioUrl = await saveGeneratedAsset({
      bytes: Buffer.from(result.audioBase64, "base64"),
      fileName: `voice-${Date.now()}-${randomUUID()}.${extension}`,
      contentType,
    });

    return {
      audioUrl,
      provider: result.provider ?? "cloud:remote-base64",
    };
  }

  throw new Error("Cloud TTS response must include audioUrl or audioBase64.");
}

async function createSystemVoiceover(script: string, language: ReviewScript["language"]): Promise<VoiceoverResult> {
  await ensureGeneratedDir();

  const id = `${Date.now()}-${randomUUID()}`;
  const aiffPath = generatedPath(`voice-${id}.aiff`);
  const mp3Name = `voice-${id}.mp3`;
  const mp3Path = generatedPath(mp3Name);
  const voice = selectVoice(language);
  const rate = language === "zh" ? "185" : "178";

  try {
    await execFileAsync("say", ["-v", voice, "-r", rate, "-o", aiffPath, compressForVoiceover(script, language)]);
    await execFileAsync(ffmpegBin, [
      "-y",
      "-i",
      aiffPath,
      "-t",
      "15",
      "-q:a",
      "4",
      "-acodec",
      "libmp3lame",
      mp3Path,
    ]);
  } finally {
    await unlink(aiffPath).catch(() => undefined);
  }

  return {
    audioUrl: publicGeneratedUrl(mp3Name),
    provider: `system:${voice}`,
  };
}

async function createSilentResult(provider: string): Promise<VoiceoverResult> {
  return {
    audioUrl: await createSilentVoiceover(),
    provider,
  };
}

function selectVoice(language: ReviewScript["language"]) {
  if (language === "zh") {
    return process.env.TTS_VOICE_ZH || "Tingting";
  }

  return process.env.TTS_VOICE_EN || "Samantha";
}

function inferLanguage(script: string): ReviewScript["language"] {
  return /[\u3400-\u9fff]/.test(script) ? "zh" : "en";
}

function compressForVoiceover(script: string, language: ReviewScript["language"]) {
  const normalized = script.replace(/\s+/g, " ").trim();
  const limit = language === "zh" ? 92 : 220;

  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, limit).replace(/[，。,.!！?？、：:；;]\s*$/, "")}${language === "zh" ? "。" : "."}`;
}
