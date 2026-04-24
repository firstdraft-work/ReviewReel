import { randomUUID } from "node:crypto";
import { defaultTemplateId } from "@/lib/templates";
import type { GeneratePipelineInput, VideoJob, VideoJobStepKey, VideoJobStepStatus } from "@/types/video";

const jobs = new Map<string, VideoJob>();

type VideoJobPatch = Omit<Partial<VideoJob>, "output" | "metrics" | "steps"> & {
  output?: Partial<VideoJob["output"]>;
  metrics?: Partial<VideoJob["metrics"]>;
  steps?: Partial<VideoJob["steps"]>;
};

export function createVideoJob(input: GeneratePipelineInput) {
  const now = new Date().toISOString();
  const job: VideoJob = {
    id: randomUUID(),
    status: "pending",
    steps: {
      script: { status: "queued" },
      images: { status: "queued" },
      voice: { status: "queued" },
      video: { status: "queued" },
    },
    input: {
      businessName: input.businessName,
      reviews: input.reviews,
      imageUrls: input.imageUrls ?? [],
      templateId: input.templateId ?? defaultTemplateId,
    },
    output: {
      images: [],
      audioUrl: "",
      voiceProvider: "",
      videoUrl: "",
    },
    metrics: {},
    createdAt: now,
    updatedAt: now,
  };

  jobs.set(job.id, job);
  return job;
}

export function getVideoJob(id: string) {
  return jobs.get(id) ?? null;
}

export function listVideoJobs() {
  return [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function updateVideoJob(id: string, patch: VideoJobPatch) {
  const job = getRequiredJob(id);
  const next: VideoJob = {
    ...job,
    ...patch,
    input: patch.input ?? job.input,
    output: patch.output ? { ...job.output, ...patch.output } : job.output,
    metrics: patch.metrics ? { ...job.metrics, ...patch.metrics } : job.metrics,
    steps: patch.steps ? { ...job.steps, ...patch.steps } : job.steps,
    updatedAt: new Date().toISOString(),
  };

  jobs.set(id, next);
  return next;
}

export function markJobStep(id: string, key: VideoJobStepKey, status: VideoJobStepStatus, error?: string) {
  const job = getRequiredJob(id);
  const now = new Date();
  const previous = job.steps[key];
  const startedAt = previous.startedAt ?? (status === "processing" ? now.toISOString() : undefined);
  const completedAt = status === "done" || status === "failed" || status === "skipped" ? now.toISOString() : undefined;
  const durationMs = startedAt && completedAt ? now.getTime() - new Date(startedAt).getTime() : previous.durationMs;

  return updateVideoJob(id, {
    steps: {
      [key]: {
        ...previous,
        status,
        startedAt,
        completedAt,
        durationMs,
        error,
      },
    },
  });
}

function getRequiredJob(id: string) {
  const job = getVideoJob(id);

  if (!job) {
    throw new Error(`Video job not found: ${id}`);
  }

  return job;
}
