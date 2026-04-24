import { NextResponse } from "next/server";
import { generateScript } from "@/lib/ai";
import type { GenerateScriptInput } from "@/types/video";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateScriptInput;
    const script = generateScript(body);

    return NextResponse.json(script);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate script." },
      { status: 400 },
    );
  }
}
