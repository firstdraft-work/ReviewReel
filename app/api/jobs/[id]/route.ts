import { NextResponse } from "next/server";
import { getVideoJob } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const job = getVideoJob(id);

  if (!job) {
    return NextResponse.json({ error: "Video job not found." }, { status: 404 });
  }

  return NextResponse.json({ job });
}
