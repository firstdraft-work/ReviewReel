import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

export type SaveGeneratedAssetInput = {
  bytes: Buffer;
  fileName: string;
  directory?: string;
  contentType?: string;
};

export const generatedDir = path.join(process.cwd(), "public", "generated");

export async function ensureGeneratedDir(directory = "") {
  await mkdir(generatedPath(directory), { recursive: true });
}

export function generatedPath(...segments: string[]) {
  return path.join(generatedDir, ...segments.filter(Boolean));
}

export function publicGeneratedUrl(fileName: string, directory = "") {
  const prefix = directory ? `${directory.replace(/^\/+|\/+$/g, "")}/` : "";

  return `/generated/${prefix}${fileName}`;
}

export async function saveGeneratedAsset(input: SaveGeneratedAssetInput) {
  if (isBlobStorageEnabled()) {
    const pathname = generatedBlobPath(input.fileName, input.directory);
    const blob = await put(pathname, input.bytes, {
      access: "public",
      contentType: input.contentType,
    });

    return blob.url;
  }

  await ensureGeneratedDir(input.directory);

  const filePath = generatedPath(input.directory ?? "", input.fileName);
  await writeFile(filePath, input.bytes);

  return publicGeneratedUrl(input.fileName, input.directory);
}

export function publicUrlToFilePath(url: string) {
  if (!url.startsWith("/generated/")) {
    throw new Error(`Only generated local assets are supported: ${url}`);
  }

  const relativePath = url.replace(/^\/generated\//, "");

  if (relativePath.includes("..")) {
    throw new Error(`Invalid generated asset path: ${url}`);
  }

  return path.join(generatedDir, relativePath);
}

export function isBlobStorageEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN) && (process.env.STORAGE_PROVIDER === "blob" || process.env.VERCEL === "1");
}

function generatedBlobPath(fileName: string, directory = "") {
  const prefix = directory ? `${directory.replace(/^\/+|\/+$/g, "")}/` : "";

  return `generated/${prefix}${fileName}`;
}
