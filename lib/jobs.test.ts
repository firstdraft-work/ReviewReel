import { describe, expect, it } from "vitest";
import { createVideoJob, getVideoJob, listVideoJobs, markJobStep, updateVideoJob } from "@/lib/jobs";

describe("createVideoJob", () => {
  it("creates a job with pending status and queued steps", () => {
    const job = createVideoJob({
      businessName: "Test",
      reviews: ["Great!"],
    });

    expect(job.id).toBeTruthy();
    expect(job.status).toBe("pending");
    expect(job.steps.script.status).toBe("queued");
    expect(job.steps.images.status).toBe("queued");
    expect(job.steps.voice.status).toBe("queued");
    expect(job.steps.video.status).toBe("queued");
    expect(job.input.businessName).toBe("Test");
    expect(job.input.reviews).toEqual(["Great!"]);
    expect(job.input.imageUrls).toEqual([]);
  });

  it("uses default template when none provided", () => {
    const job = createVideoJob({
      businessName: "Test",
      reviews: ["Great!"],
    });

    expect(job.input.templateId).toBe("bold-food");
  });

  it("uses provided template and imageUrls", () => {
    const job = createVideoJob({
      businessName: "Test",
      reviews: ["Great!"],
      imageUrls: ["/img1.jpg"],
      templateId: "warm-local",
    });

    expect(job.input.imageUrls).toEqual(["/img1.jpg"]);
    expect(job.input.templateId).toBe("warm-local");
  });
});

describe("getVideoJob", () => {
  it("returns the job by id", () => {
    const job = createVideoJob({ businessName: "Test", reviews: ["Great!"] });
    const found = getVideoJob(job.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(job.id);
  });

  it("returns null for unknown id", () => {
    expect(getVideoJob("nonexistent")).toBeNull();
  });
});

describe("updateVideoJob", () => {
  it("updates top-level fields", () => {
    const job = createVideoJob({ businessName: "Test", reviews: ["Great!"] });
    const updated = updateVideoJob(job.id, { status: "processing" });

    expect(updated.status).toBe("processing");
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(job.createdAt).getTime());
  });

  it("merges output fields", () => {
    const job = createVideoJob({ businessName: "Test", reviews: ["Great!"] });
    updateVideoJob(job.id, { output: { videoUrl: "a.mp4" } });
    const updated = updateVideoJob(job.id, { output: { audioUrl: "b.mp3" } });

    expect(updated.output.videoUrl).toBe("a.mp4");
    expect(updated.output.audioUrl).toBe("b.mp3");
  });

  it("merges metrics fields", () => {
    const job = createVideoJob({ businessName: "Test", reviews: ["Great!"] });
    const updated = updateVideoJob(job.id, { metrics: { totalMs: 1234 } });

    expect(updated.metrics.totalMs).toBe(1234);
  });

  it("merges step fields", () => {
    const job = createVideoJob({ businessName: "Test", reviews: ["Great!"] });
    const updated = updateVideoJob(job.id, {
      steps: { script: { status: "done" } },
    });

    expect(updated.steps.script.status).toBe("done");
    expect(updated.steps.images.status).toBe("queued");
  });
});

describe("markJobStep", () => {
  it("transitions step to processing with startedAt", () => {
    const job = createVideoJob({ businessName: "Test", reviews: ["Great!"] });
    const updated = markJobStep(job.id, "script", "processing");

    expect(updated.steps.script.status).toBe("processing");
    expect(updated.steps.script.startedAt).toBeTruthy();
    expect(updated.steps.script.completedAt).toBeUndefined();
  });

  it("transitions step to done with completedAt and durationMs", () => {
    const job = createVideoJob({ businessName: "Test", reviews: ["Great!"] });
    markJobStep(job.id, "script", "processing");
    const updated = markJobStep(job.id, "script", "done");

    expect(updated.steps.script.status).toBe("done");
    expect(updated.steps.script.completedAt).toBeTruthy();
    expect(updated.steps.script.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("transitions step to failed with error", () => {
    const job = createVideoJob({ businessName: "Test", reviews: ["Great!"] });
    markJobStep(job.id, "script", "processing");
    const updated = markJobStep(job.id, "script", "failed", "Script error");

    expect(updated.steps.script.status).toBe("failed");
    expect(updated.steps.script.error).toBe("Script error");
    expect(updated.steps.script.completedAt).toBeTruthy();
  });

  it("transitions step to skipped", () => {
    const job = createVideoJob({ businessName: "Test", reviews: ["Great!"] });
    const updated = markJobStep(job.id, "voice", "skipped");

    expect(updated.steps.voice.status).toBe("skipped");
    expect(updated.steps.voice.completedAt).toBeTruthy();
  });
});

describe("listVideoJobs", () => {
  it("returns all created jobs", () => {
    const before = listVideoJobs().length;
    createVideoJob({ businessName: "Job A", reviews: ["Great!"] });
    createVideoJob({ businessName: "Job B", reviews: ["Great!"] });
    const list = listVideoJobs();

    expect(list).toHaveLength(before + 2);
    expect(list.map((j) => j.input.businessName)).toContain("Job A");
    expect(list.map((j) => j.input.businessName)).toContain("Job B");
  });
});
