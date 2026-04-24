import { randomUUID } from "node:crypto";
import { saveGeneratedAsset } from "@/lib/storage";

const maxUploadBytes = 8 * 1024 * 1024;
const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function saveUploadedImage(file: File) {
  const extension = allowedTypes.get(file.type);

  if (!extension) {
    throw new Error("Only JPG, PNG, and WEBP images are supported.");
  }

  if (file.size > maxUploadBytes) {
    throw new Error("Each image must be 8MB or smaller.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const fileName = `${Date.now()}-${randomUUID()}.${extension}`;

  return saveGeneratedAsset({
    bytes,
    fileName,
    directory: "uploads",
    contentType: file.type,
  });
}
