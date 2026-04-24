import { NextResponse } from "next/server";
import { mediaRuntimeUnsupportedResponse } from "@/lib/deployment";
import { saveUploadedImage } from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("images").filter((value): value is File => value instanceof File).slice(0, 5);

    if (files.length === 0) {
      return NextResponse.json({ error: "Upload at least one image." }, { status: 400 });
    }

    const unsupportedResponse = mediaRuntimeUnsupportedResponse({ allowBlobOnly: true });
    if (unsupportedResponse) {
      return unsupportedResponse;
    }

    const images = await Promise.all(files.map(saveUploadedImage));

    return NextResponse.json({ images });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image upload failed." },
      { status: 400 },
    );
  }
}
