import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access } from "node:fs/promises";
import { promisify } from "node:util";
import { ensureGeneratedDir, generatedPath, publicGeneratedUrl, publicUrlToFilePath } from "@/lib/storage";
import { createPosterPng } from "@/lib/png";
import { getVideoTemplate } from "@/lib/templates";
import type { VideoTemplateId } from "@/types/video";

const execFileAsync = promisify(execFile);
const ffmpegBin = process.env.FFMPEG_PATH || "ffmpeg";

type SceneImage = {
  title: string;
  eyebrow: string;
  color: string;
  sourceImageUrl?: string;
};

export async function createSceneImages(script: {
  hook: string;
  socialProof: string[];
  cta: string;
}, sourceImageUrls: string[] = [], templateId?: VideoTemplateId) {
  await ensureGeneratedDir();
  const chinese = /[\u3400-\u9fff]/.test([script.hook, ...script.socialProof, script.cta].join(""));
  const sourceImages = sourceImageUrls.filter((url) => url.startsWith("/generated/"));
  const template = getVideoTemplate(templateId);
  const labels = chinese ? template.labels.zh : template.labels.en;

  const scenes: SceneImage[] = [
    { title: script.hook, eyebrow: labels[0], color: template.sceneColors[0], sourceImageUrl: sourceImages[0] },
    { title: script.socialProof.slice(0, 2).join(chinese ? " / " : "  •  "), eyebrow: labels[1], color: template.sceneColors[1], sourceImageUrl: sourceImages[1] ?? sourceImages[0] },
    { title: script.cta, eyebrow: labels[2], color: template.sceneColors[2], sourceImageUrl: sourceImages[2] ?? sourceImages[0] },
  ];

  const urls: string[] = [];

  for (const [index, scene] of scenes.entries()) {
    const fileName = `scene-${Date.now()}-${index}-${randomUUID()}.png`;
    const output = generatedPath(fileName);

    await createPosterPng(output, {
      ...scene,
      backgroundImagePath: scene.sourceImageUrl ? publicUrlToFilePath(scene.sourceImageUrl) : undefined,
      footer: template.footer,
      imageOverlayOpacity: template.imageOverlayOpacity,
      panelOpacity: template.panelOpacity,
    });

    urls.push(publicGeneratedUrl(fileName));
  }

  return urls;
}

export async function createSilentVoiceover() {
  await ensureGeneratedDir();

  const fileName = `voice-${Date.now()}-${randomUUID()}.mp3`;
  const output = generatedPath(fileName);

  await execFileAsync(ffmpegBin, [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "anullsrc=r=44100:cl=mono",
    "-t",
    "15",
    "-q:a",
    "9",
    "-acodec",
    "libmp3lame",
    output,
  ]);

  return publicGeneratedUrl(fileName);
}

export async function composeVideo(input: {
  images: string[];
  audioUrl?: string;
  subtitles: string[];
}) {
  await ensureGeneratedDir();

  const imagePaths = input.images.slice(0, 3).map(publicUrlToFilePath);
  if (imagePaths.length !== 3) {
    throw new Error("Exactly 3 generated images are required.");
  }

  await Promise.all(imagePaths.map((filePath) => access(filePath)));

  const audioPath = input.audioUrl ? publicUrlToFilePath(input.audioUrl) : null;
  const hasAudio = audioPath ? await fileExists(audioPath) : false;
  const fileName = `reviewreel-${Date.now()}-${randomUUID()}.mp4`;
  const output = generatedPath(fileName);
  const filter = imagePaths
    .map((_, index) => `[${index}:v]scale=1080:1920,zoompan=z='min(zoom+0.001,1.06)':d=150:s=1080x1920:fps=30[v${index}]`)
    .join(";");

  const args = [
    "-y",
    "-loop",
    "1",
    "-t",
    "5",
    "-i",
    imagePaths[0],
    "-loop",
    "1",
    "-t",
    "5",
    "-i",
    imagePaths[1],
    "-loop",
    "1",
    "-t",
    "5",
    "-i",
    imagePaths[2],
  ];

  if (hasAudio && audioPath) {
    args.push("-i", audioPath);
  }

  args.push(
    "-filter_complex",
    `${filter};[v0][v1][v2]concat=n=3:v=1:a=0,format=yuv420p[v]`,
    "-map",
    "[v]",
  );

  if (hasAudio) {
    args.push("-map", "3:a");
  }

  args.push("-t", "15", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", output);

  try {
    await execFileAsync(ffmpegBin, args, { maxBuffer: 1024 * 1024 * 10 });
  } catch {
    await execFileAsync(ffmpegBin, args, { maxBuffer: 1024 * 1024 * 10 });
  }

  return publicGeneratedUrl(fileName);
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
