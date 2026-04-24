import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8080);
const ffmpegBin = process.env.FFMPEG_PATH || "ffmpeg";
const mediaRoot = process.env.MEDIA_DIR || path.join(__dirname, "media");
const fontFile = process.env.FONT_FILE || "";
const rendererToken = process.env.RENDERER_TOKEN || process.env.VIDEO_RENDERER_TOKEN || "";

await mkdir(mediaRoot, { recursive: true });

createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/health") {
      sendJson(response, 200, { ok: true, provider: "reviewreel-renderer:ffmpeg" });
      return;
    }

    if (request.method === "GET" && request.url?.startsWith("/media/")) {
      await sendMedia(request.url, response);
      return;
    }

    if (request.method !== "POST" || request.url !== "/render") {
      sendJson(response, 404, { error: "Not found." });
      return;
    }

    if (rendererToken && request.headers.authorization !== `Bearer ${rendererToken}`) {
      sendJson(response, 401, { error: "Unauthorized." });
      return;
    }

    const input = await readJsonBody(request);
    const result = await renderVideo(input, publicBaseUrl(request));
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Renderer failed.",
    });
  }
}).listen(port, () => {
  console.log(`ReviewReel renderer listening on http://localhost:${port}`);
});

async function renderVideo(input, baseUrl) {
  const id = `${Date.now()}-${randomUUID()}`;
  const workDir = path.join("/tmp", `reviewreel-render-${id}`);
  await mkdir(workDir, { recursive: true });

  try {
    const output = input.output ?? {};
    const width = Number(output.width || 1080);
    const height = Number(output.height || 1920);
    const sceneSeconds = 5;
    const subtitles = normalizeSubtitles(input);
    const colors = templateColors(input.templateId);
    const imagePaths = await downloadImages(input.imageUrls ?? [], workDir);
    const segmentPaths = [];

    for (let index = 0; index < 3; index += 1) {
      const segmentPath = path.join(workDir, `segment-${index}.mp4`);
      await renderSegment({
        color: colors[index],
        imagePath: imagePaths[index],
        outputPath: segmentPath,
        subtitle: subtitles[index],
        width,
        height,
        seconds: sceneSeconds,
        textFile: path.join(workDir, `subtitle-${index}.txt`),
      });
      segmentPaths.push(segmentPath);
    }

    const concatFile = path.join(workDir, "concat.txt");
    await writeFile(concatFile, segmentPaths.map((segmentPath) => `file '${segmentPath.replaceAll("'", "'\\''")}'`).join("\n"));

    const videoOnlyPath = path.join(workDir, "video-only.mp4");
    await execFileAsync(ffmpegBin, [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatFile,
      "-c",
      "copy",
      videoOnlyPath,
    ]);

    const outputName = `reviewreel-${id}.mp4`;
    const outputPath = path.join(mediaRoot, outputName);
    const audioPath = input.audioUrl ? await downloadAsset(input.audioUrl, workDir, "audio") : "";

    if (audioPath) {
      await execFileAsync(ffmpegBin, [
        "-y",
        "-i",
        videoOnlyPath,
        "-i",
        audioPath,
        "-map",
        "0:v",
        "-map",
        "1:a",
        "-t",
        "15",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-shortest",
        "-movflags",
        "+faststart",
        outputPath,
      ]);
    } else {
      await execFileAsync(ffmpegBin, ["-y", "-i", videoOnlyPath, "-c", "copy", "-movflags", "+faststart", outputPath]);
    }

    return {
      videoUrl: `${baseUrl}/media/${outputName}`,
      images: [],
      provider: "reviewreel-renderer:ffmpeg",
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function renderSegment(options) {
  await writeFile(options.textFile, options.subtitle || "");

  const drawText = [
    "drawbox=x=70:y=1320:w=940:h=360:color=black@0.52:t=fill",
    `drawtext=${fontOption()}textfile='${escapeFilterPath(options.textFile)}':x=110:y=1385:fontsize=58:fontcolor=white:line_spacing=18:box=0`,
  ].join(",");

  if (options.imagePath) {
    const args = [
      "-y",
      "-loop",
      "1",
      "-t",
      String(options.seconds),
      "-i",
      options.imagePath,
      "-vf",
      `scale=${options.width}:${options.height}:force_original_aspect_ratio=increase,crop=${options.width}:${options.height},${drawText}`,
      "-r",
      "30",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      options.outputPath,
    ];
    await execFfmpegWithTextFallback(args, options.outputPath, [
      "-y",
      "-loop",
      "1",
      "-t",
      String(options.seconds),
      "-i",
      options.imagePath,
      "-vf",
      `scale=${options.width}:${options.height}:force_original_aspect_ratio=increase,crop=${options.width}:${options.height}`,
      "-r",
      "30",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      options.outputPath,
    ]);
    return;
  }

  const args = [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=${options.color}:s=${options.width}x${options.height}:d=${options.seconds}:r=30`,
    "-vf",
    drawText,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    options.outputPath,
  ];
  await execFfmpegWithTextFallback(args, options.outputPath, [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=${options.color}:s=${options.width}x${options.height}:d=${options.seconds}:r=30`,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    options.outputPath,
  ]);
}

async function execFfmpegWithTextFallback(args, outputPath, fallbackArgs) {
  try {
    await execFileAsync(ffmpegBin, args);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("No such filter: 'drawtext'")) {
      throw error;
    }
    console.warn(`drawtext is unavailable; rendering ${path.basename(outputPath)} without subtitles.`);
    await execFileAsync(ffmpegBin, fallbackArgs);
  }
}

async function downloadImages(urls, workDir) {
  const imageUrls = urls.filter((url) => typeof url === "string" && /^https?:\/\//.test(url)).slice(0, 3);
  const paths = [];

  for (const [index, url] of imageUrls.entries()) {
    paths[index] = await downloadAsset(url, workDir, `image-${index}`);
  }

  return paths;
}

async function downloadAsset(url, workDir, name) {
  if (!/^https?:\/\//.test(url)) {
    return "";
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download asset ${url}: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const extension = extensionForContentType(contentType, url);
  const filePath = path.join(workDir, `${name}.${extension}`);
  await writeFile(filePath, Buffer.from(await response.arrayBuffer()));
  return filePath;
}

function normalizeSubtitles(input) {
  const fromInput = Array.isArray(input.subtitles) ? input.subtitles.filter(Boolean) : [];
  const script = input.script ?? {};
  const fallback = [
    script.hook,
    Array.isArray(script.socialProof) ? script.socialProof.join(" / ") : "",
    script.cta,
  ].filter(Boolean);
  const values = fromInput.length ? fromInput : fallback;

  while (values.length < 3) {
    values.push(values[values.length - 1] || input.businessName || "ReviewReel");
  }

  return values.slice(0, 3).map((value) => wrapText(String(value), /[\u3400-\u9fff]/.test(String(value)) ? 11 : 24));
}

function wrapText(value, maxChars) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const hasCjk = /[\u3400-\u9fff]/.test(normalized);
  if (!hasCjk) {
    const words = normalized.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines.slice(0, 4).join("\n");
  }

  return [...normalized].reduce((lines, char) => {
    const current = lines[lines.length - 1] ?? "";
    if (current.length >= maxChars) {
      lines.push(char);
    } else {
      lines[lines.length - 1] = current + char;
    }
    return lines;
  }, [""]).slice(0, 4).join("\n");
}

function templateColors(templateId) {
  if (templateId === "clean-service") {
    return ["#0f766e", "#2563eb", "#111827"];
  }

  if (templateId === "warm-local") {
    return ["#b45309", "#be123c", "#166534"];
  }

  return ["#dc2626", "#7c2d12", "#111827"];
}

function extensionForContentType(contentType, url) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("mpeg") || contentType.includes("mp3")) return "mp3";
  if (contentType.includes("wav")) return "wav";
  if (contentType.includes("mp4")) return "mp4";
  const match = new URL(url).pathname.match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1] || "bin";
}

function fontOption() {
  return fontFile ? `fontfile='${escapeFilterPath(fontFile)}':` : "";
}

function escapeFilterPath(value) {
  return value.replaceAll("\\", "\\\\").replaceAll(":", "\\:").replaceAll("'", "\\'");
}

function publicBaseUrl(request) {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/+$/, "");
  }

  const proto = request.headers["x-forwarded-proto"] || "http";
  const host = request.headers["x-forwarded-host"] || request.headers.host || `localhost:${port}`;
  return `${proto}://${host}`;
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (Buffer.concat(chunks).length > 2 * 1024 * 1024) {
    throw new Error("Request body is too large.");
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function sendMedia(url, response) {
  const fileName = decodeURIComponent(url.replace(/^\/media\//, ""));
  if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) {
    sendJson(response, 400, { error: "Invalid media path." });
    return;
  }

  const filePath = path.join(mediaRoot, fileName);
  const bytes = await readFile(filePath).catch(() => null);
  if (!bytes) {
    sendJson(response, 404, { error: "Media not found." });
    return;
  }

  response.writeHead(200, {
    "content-type": fileName.endsWith(".mp4") ? "video/mp4" : "application/octet-stream",
    "cache-control": "public, max-age=31536000, immutable",
  });
  createReadStream(filePath).pipe(response);
}

function sendJson(response, status, value) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
}
