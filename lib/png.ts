import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ffmpegBin = process.env.FFMPEG_PATH || "ffmpeg";

type PosterOptions = {
  eyebrow: string;
  title: string;
  color: string;
  backgroundImagePath?: string;
  footer?: string;
  imageOverlayOpacity?: number;
  panelOpacity?: number;
};

const posterWidth = 1080;
const posterHeight = 1920;
const quickLookSize = 1920;
const posterX = (quickLookSize - posterWidth) / 2;

export async function createPosterPng(outputPath: string, options: PosterOptions) {
  const outputDir = path.dirname(outputPath);
  await mkdir(outputDir, { recursive: true });

  const id = randomUUID();
  const svgPath = path.join(outputDir, `poster-${id}.svg`);
  const quickLookPath = `${svgPath}.png`;
  const svg = await buildPosterSvg(options);

  await writeFile(svgPath, svg);

  try {
    await execFileAsync("qlmanage", ["-t", "-s", String(quickLookSize), "-o", outputDir, svgPath]);
    await execFileAsync(ffmpegBin, [
      "-y",
      "-i",
      quickLookPath,
      "-vf",
      `crop=${posterWidth}:${posterHeight}:${posterX}:0`,
      outputPath,
    ]);
  } finally {
    await Promise.all([unlink(svgPath).catch(() => undefined), unlink(quickLookPath).catch(() => undefined)]);
  }
}

async function buildPosterSvg(options: PosterOptions) {
  const hasCjk = /[\u3400-\u9fff]/.test(options.title);
  const titleLines = wrapDisplayText(options.title, hasCjk ? 8.5 : 14).slice(0, 5);
  const titleSize = titleLines.length > 3 ? 76 : 88;
  const lineHeight = Math.round(titleSize * 1.16);
  const titleBlockHeight = titleLines.length * lineHeight;
  const titleY = Math.round((posterHeight - titleBlockHeight) / 2 - 40);
  const dark = shade(options.color, -42);
  const darker = shade(options.color, -76);
  const light = shade(options.color, 32);

  const backgroundImage = options.backgroundImagePath ? await buildEmbeddedImage(options.backgroundImagePath) : "";
  const imageOverlayOpacity = options.imageOverlayOpacity ?? 0.34;
  const panelOpacity = options.panelOpacity ?? 0.4;
  const footer = options.footer ?? "15s local review ad";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${quickLookSize}" height="${quickLookSize}" viewBox="0 0 ${quickLookSize} ${quickLookSize}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${light}"/>
      <stop offset="54%" stop-color="${options.color}"/>
      <stop offset="100%" stop-color="${darker}"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.26"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000000" flood-opacity="0.24"/>
    </filter>
  </defs>
  <rect width="${quickLookSize}" height="${quickLookSize}" fill="#f7f2e8"/>
  <g transform="translate(${posterX} 0)">
    <rect width="${posterWidth}" height="${posterHeight}" fill="url(#bg)"/>
    ${backgroundImage}
    ${backgroundImage ? `<rect width="${posterWidth}" height="${posterHeight}" fill="#000000" opacity="${imageOverlayOpacity}"/>` : ""}
    <circle cx="910" cy="210" r="270" fill="#ffffff" opacity="0.12"/>
    <circle cx="130" cy="1650" r="330" fill="#000000" opacity="0.14"/>
    <rect x="64" y="108" width="952" height="1704" rx="42" fill="none" stroke="#ffffff" stroke-opacity="0.28" stroke-width="4"/>
    <rect x="104" y="170" width="${Math.min(650, estimateWidth(options.eyebrow, 42) + 52)}" height="84" rx="12" fill="#000000" opacity="0.23"/>
    <text x="132" y="224" font-family="${fontStack()}" font-size="42" font-weight="800" letter-spacing="8" fill="#ffffff">${escapeXml(options.eyebrow)}</text>
    <g filter="url(#shadow)">
      <rect x="72" y="${titleY - 46}" width="936" height="${titleBlockHeight + 92}" rx="18" fill="#111111" opacity="${panelOpacity}"/>
      <rect x="72" y="${titleY - 46}" width="936" height="${Math.max(96, Math.round((titleBlockHeight + 92) * 0.36))}" rx="18" fill="url(#shine)"/>
      <text x="116" y="${titleY}" font-family="${fontStack()}" font-size="${titleSize}" font-weight="900" fill="#ffffff">
${titleLines.map((line, index) => `        <tspan x="116" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`).join("\n")}
      </text>
    </g>
    <rect x="72" y="1510" width="936" height="2" fill="#ffffff" opacity="0.22"/>
    <text x="92" y="1588" font-family="${fontStack()}" font-size="38" font-weight="800" fill="#ffffff" opacity="0.92">REVIEWREEL</text>
    <text x="92" y="1648" font-family="${fontStack()}" font-size="34" font-weight="700" fill="#ffffff" opacity="0.82">${escapeXml(footer)}</text>
    <rect x="750" y="1564" width="238" height="88" rx="44" fill="${dark}" opacity="0.84"/>
    <text x="792" y="1622" font-family="${fontStack()}" font-size="34" font-weight="900" fill="#ffffff">9:16</text>
  </g>
</svg>`;
}

async function buildEmbeddedImage(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
  const bytes = await readFile(filePath);

  return `<image x="0" y="0" width="${posterWidth}" height="${posterHeight}" preserveAspectRatio="xMidYMid slice" href="data:${mimeType};base64,${bytes.toString("base64")}"/>`;
}

function wrapDisplayText(value: string, maxUnits: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const hasCjk = /[\u3400-\u9fff]/.test(normalized);

  if (!hasCjk) {
    return wrapWords(normalized, maxUnits);
  }

  const lines: string[] = [];
  let line = "";
  let units = 0;

  for (const char of [...normalized]) {
    const nextUnits = char.trim() ? units + charUnits(char) : units + 0.5;
    if (nextUnits > maxUnits && line) {
      lines.push(line.trim());
      line = char.trim() ? char : "";
      units = char.trim() ? charUnits(char) : 0;
    } else {
      line += char;
      units = nextUnits;
    }
  }

  if (line.trim()) {
    lines.push(line.trim());
  }

  return lines;
}

function wrapWords(value: string, maxUnits: number) {
  const words = value.split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (estimateUnits(candidate) > maxUnits && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines;
}

function estimateUnits(value: string) {
  return [...value].reduce((sum, char) => sum + charUnits(char), 0);
}

function charUnits(char: string) {
  if (/[\u3400-\u9fff]/.test(char)) {
    return 1;
  }

  if (/[A-Z0-9]/i.test(char)) {
    return 0.62;
  }

  return 0.34;
}

function estimateWidth(value: string, fontSize: number) {
  return estimateUnits(value) * fontSize;
}

function shade(hex: string, amount: number) {
  const clean = hex.replace("#", "");
  const channels = [0, 2, 4].map((start) =>
    Math.max(0, Math.min(255, Number.parseInt(clean.slice(start, start + 2), 16) + amount)),
  );

  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fontStack() {
  return "'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Helvetica Neue',Arial,sans-serif";
}
