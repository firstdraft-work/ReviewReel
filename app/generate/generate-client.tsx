"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReviewScript, VideoJob, VideoJobStepStatus, VideoTemplateId } from "@/types/video";

type StepKey = "script" | "images" | "voice" | "video";

const stepKeys: StepKey[] = ["script", "images", "voice", "video"];

const templateIds: VideoTemplateId[] = [
  "bold-food",
  "clean-service",
  "warm-local",
  "neon-night",
  "minimal-pro",
  "retro-diner",
];

export function GenerateClient() {
  const t = useTranslations("generate");

  const sampleReviews = [t("sampleReview1"), t("sampleReview2"), t("sampleReview3")].join("\n");

  const [businessName, setBusinessName] = useState("Sunset Tacos");
  const [reviewsText, setReviewsText] = useState(sampleReviews);
  const [script, setScript] = useState<ReviewScript | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [audioUrl, setAudioUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [job, setJob] = useState<VideoJob | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState<VideoTemplateId>("bold-food");
  const [activeStep, setActiveStep] = useState<StepKey | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [completed, setCompleted] = useState<StepKey[]>([]);
  const [error, setError] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reviews = useMemo(
    () =>
      reviewsText
        .split("\n")
        .map((review) => review.trim())
        .filter(Boolean),
    [reviewsText],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedBusinessName = window.localStorage.getItem("reviewreel.businessName");
      const savedReviews = window.localStorage.getItem("reviewreel.reviews");
      const savedTemplate = window.localStorage.getItem("reviewreel.templateId") as VideoTemplateId | null;

      if (savedBusinessName) {
        setBusinessName(savedBusinessName);
      }

      if (savedReviews) {
        setReviewsText(savedReviews);
      }

      if (savedTemplate && templateIds.includes(savedTemplate)) {
        setTemplateId(savedTemplate);
      }

      setStorageReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem("reviewreel.businessName", businessName);
  }, [businessName, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem("reviewreel.reviews", reviewsText);
  }, [reviewsText, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem("reviewreel.templateId", templateId);
  }, [storageReady, templateId]);

  useEffect(() => {
    if (videoUrl) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [videoUrl]);

  useEffect(() => {
    if (!isGenerating) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  });

  async function generate() {
    setError("");
    setScript(null);
    setImages([]);
    setAudioUrl("");
    setVideoUrl("");
    setJob(null);
    setCompleted([]);
    setActiveStep("script");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await postJson<{ job: VideoJob }>("/api/generate", {
        businessName,
        reviews,
        imageUrls: uploadedImages,
        templateId,
      }, controller.signal);
      applyJob(result.job);
      setActiveStep(null);
    } catch (caught) {
      setActiveStep(null);
      if (caught instanceof DOMException && caught.name === "AbortError") {
        setError(t("cancelled"));
      } else {
        if (caught instanceof ApiError && caught.job) {
          applyJob(caught.job);
        }
        setError(caught instanceof Error ? caught.message : t("generationFailed"));
      }
    } finally {
      abortRef.current = null;
    }
  }

  function cancelGeneration() {
    abortRef.current?.abort();
  }

  const isGenerating = activeStep !== null;
  const canGenerate = !isGenerating && !isUploading && businessName.trim().length > 0 && reviews.length > 0;

  function applyJob(nextJob: VideoJob) {
    setJob(nextJob);
    setScript(nextJob.output.script ?? null);
    setImages(nextJob.output.images);
    setAudioUrl(nextJob.output.audioUrl);
    setVideoUrl(nextJob.output.videoUrl);
    setCompleted(
      stepKeys
        .filter((key) => nextJob.steps[key].status === "done" || nextJob.steps[key].status === "skipped")
        .map((key) => key),
    );
  }

  function getStepStatus(step: StepKey) {
    return job?.steps[step].status ?? (completed.includes(step) ? "done" : activeStep === step ? "processing" : "queued");
  }

  function formatStepStatus(status: VideoJobStepStatus) {
    const map: Record<VideoJobStepStatus, string> = {
      queued: t("statusQueued"),
      processing: t("statusRunning"),
      done: t("statusDone"),
      failed: t("statusFailed"),
      skipped: t("statusSkipped"),
    };
    return map[status];
  }

  function getStepLabel(key: StepKey) {
    const map: Record<StepKey, string> = {
      script: t("stepScript"),
      images: t("stepImages"),
      voice: t("stepVoiceover"),
      video: t("stepVideo"),
    };
    return map[key];
  }

  function getTemplateName(id: VideoTemplateId) {
    const map: Record<VideoTemplateId, { name: string; desc: string }> = {
      "bold-food": { name: t("templateBoldFood"), desc: t("templateBoldFoodDesc") },
      "clean-service": { name: t("templateCleanService"), desc: t("templateCleanServiceDesc") },
      "warm-local": { name: t("templateWarmLocal"), desc: t("templateWarmLocalDesc") },
      "neon-night": { name: t("templateNeonNight"), desc: t("templateNeonNightDesc") },
      "minimal-pro": { name: t("templateMinimalPro"), desc: t("templateMinimalProDesc") },
      "retro-diner": { name: t("templateRetroDiner"), desc: t("templateRetroDinerDesc") },
    };
    return map[id];
  }

  async function uploadImages(files: FileList | null) {
    const selected = [...(files ?? [])].slice(0, Math.max(0, 5 - uploadedImages.length));

    if (selected.length === 0) {
      return;
    }

    setError("");
    setIsUploading(true);

    try {
      const formData = new FormData();
      selected.forEach((file) => formData.append("images", file));

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      let json: { images?: string[]; error?: string };
      try {
        json = (await response.json()) as { images?: string[]; error?: string };
      } catch {
        throw new Error(t("uploadFailed", { status: response.status }));
      }

      if (!response.ok) {
        throw new Error(json.error ?? t("imageUploadFailed"));
      }

      setUploadedImages((current) => [...current, ...(json.images ?? [])].slice(0, 5));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("imageUploadFailed"));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <nav className="mb-4 flex items-center justify-between">
        <Link className="text-muted text-sm font-semibold hover:text-black" href="/">{t("backLink")}</Link>
      </nav>
      <section className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(360px,480px)_1fr]">
        <section
          className="border-line bg-panel flex min-h-[calc(100vh-48px)] flex-col gap-5 border p-5 shadow-sm"
        >
          <div>
            <p className="text-muted text-sm font-semibold uppercase tracking-[0.18em]">{t("brand")}</p>
            <h1 className="mt-2 text-4xl font-black leading-none text-balance sm:text-5xl">
              {t("headline")}
            </h1>
            <p className="text-muted mt-3 text-sm font-semibold">{t("autosave")}</p>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-bold">{t("businessNameLabel")}</span>
            <input
              className="border-line bg-background h-12 border px-3 outline-none focus:border-black"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder={t("businessNamePlaceholder")}
            />
          </label>

          <label className="grid flex-1 gap-2">
            <span className="text-sm font-bold">{t("reviewsLabel")}</span>
            <textarea
              className="border-line bg-background min-h-72 flex-1 resize-none border p-3 leading-6 outline-none focus:border-black"
              value={reviewsText}
              onChange={(event) => setReviewsText(event.target.value)}
              placeholder={t("reviewsPlaceholder")}
            />
          </label>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <span className="text-sm font-bold">{t("templateLabel")}</span>
              <div className="grid gap-2" role="radiogroup" aria-label={t("templateAriaLabel")}>
                {templateIds.map((id) => {
                  const selected = id === templateId;
                  const tpl = getTemplateName(id);

                  return (
                    <button
                      aria-checked={selected}
                      className={`border px-3 py-2 text-left transition ${
                        selected ? "border-black bg-black text-white" : "border-line bg-background text-foreground hover:border-black"
                      }`}
                      key={id}
                      onClick={() => setTemplateId(id)}
                      role="radio"
                      type="button"
                    >
                      <span className="block text-sm font-black">{tpl.name}</span>
                      <span className={`block text-xs font-semibold ${selected ? "text-white/75" : "text-muted"}`}>
                        {tpl.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-bold">{t("storeImagesLabel")}</span>
              <input
                accept="image/jpeg,image/png,image/webp"
                aria-describedby="image-help"
                className="border-line bg-background border p-3 text-sm"
                disabled={isUploading || uploadedImages.length >= 5}
                multiple
                onChange={(event) => {
                  void uploadImages(event.target.files);
                  event.target.value = "";
                }}
                type="file"
              />
            </label>
            <p className="text-muted text-xs font-semibold" id="image-help">
              {t("imageHelp")}
            </p>
            {uploadedImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {uploadedImages.map((image) => (
                  <div className="border-line bg-background relative aspect-[9/16] overflow-hidden border" key={image}>
                    <Image alt={t("uploadedImageAlt")} className="h-full w-full object-cover" height={1920} src={image} width={1080} />
                    <button
                      className="absolute right-1 top-1 bg-black/75 px-2 py-1 text-xs font-black text-white"
                      onClick={() => setUploadedImages((current) => current.filter((item) => item !== image))}
                      type="button"
                    >
                      {t("remove")}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="border border-red-700 bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">{error}</div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              className="bg-ink h-13 text-base font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-55"
              disabled={!canGenerate}
              onClick={() => {
                void generate();
              }}
              type="button"
            >
              {isUploading ? t("uploading") : isGenerating ? <span className="animate-pulse">{t("generating")}</span> : t("generate")}
            </button>
            {isGenerating ? (
              <button
                className="border-line h-13 border text-base font-black transition hover:bg-red-50 hover:text-red-800"
                onClick={cancelGeneration}
                type="button"
              >
                {t("cancel")}
              </button>
            ) : null}
          </div>
        </section>

        <section className="grid gap-6">
          <div className="border-line bg-panel border p-5">
            <div className="grid gap-3 sm:grid-cols-4">
              {stepKeys.map((key) => {
                const state = getStepStatus(key);

                return (
                  <div className="border-line bg-background min-h-24 border p-3" key={key}>
                    <p className="text-muted text-xs font-bold uppercase tracking-[0.14em]">{formatStepStatus(state)}</p>
                    <p className="mt-4 text-lg font-black">{getStepLabel(key)}</p>
                    {job?.steps[key].durationMs ? (
                      <p className="text-muted mt-2 text-xs font-bold">{job.steps[key].durationMs}ms</p>
                    ) : null}
                    {job?.steps[key].status === "failed" && job.steps[key].error ? (
                      <p className="mt-1 text-xs font-semibold text-red-700">{job.steps[key].error}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {job ? (
              <div className="border-line bg-background mt-4 border p-3 text-sm">
                <p className="font-black">{t("jobLabel", { id: job.id })}</p>
                <p className="text-muted mt-1 font-semibold">
                  {t("statusLabel")} {job.status}
                  {job.metrics.totalMs ? t("totalLabel", { ms: job.metrics.totalMs }) : ""}
                </p>
              </div>
            ) : null}
          </div>

          <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
            <div className="border-line bg-panel border p-5">
              <h2 className="text-2xl font-black">{t("scriptHeading")}</h2>
              {script ? (
                <div className="mt-4 grid gap-4">
                  <ScriptBlock label={t("scriptHook")} value={script.hook} />
                  <ScriptBlock label={t("scriptSocialProof")} value={script.socialProof.join("\n")} />
                  <ScriptBlock label={t("scriptCta")} value={script.cta} />
                </div>
              ) : (
                <p className="text-muted mt-4 leading-6">{t("scriptPlaceholder")}</p>
              )}
            </div>

            <div className="border-line bg-panel border p-5" ref={resultRef}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">{t("previewHeading")}</h2>
                  {videoUrl ? (
                    <p className="text-accent-2 mt-1 text-sm font-black">{t("videoReady")}</p>
                  ) : null}
                </div>
                {videoUrl ? (
                  <a
                    className="border-ink bg-accent-3 border px-4 py-2 text-sm font-black text-black"
                    download
                    href={videoUrl}
                  >
                    {t("downloadMp4")}
                  </a>
                ) : null}
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(220px,320px)_1fr]">
                <div className="bg-ink aspect-[9/16] overflow-hidden">
                  {videoUrl ? (
                    <video
                      aria-label={t("videoAriaLabel", { name: businessName })}
                      className="h-full w-full object-cover"
                      controls
                      playsInline
                      src={videoUrl}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-6 text-center text-sm font-bold text-white/70">
                      {t("videoPlaceholder")}
                    </div>
                  )}
                </div>

                <div className="grid content-start gap-3">
                  {images.length > 0 ? (
                    images.map((image, index) => (
                      <Image
                        alt={t("sceneAlt", { number: index + 1 })}
                        className="border-line aspect-[9/16] max-h-52 w-full border object-cover"
                        height={1920}
                        key={image}
                        src={image}
                        width={1080}
                      />
                    ))
                  ) : (
                    <p className="text-muted leading-6">{t("scenesPlaceholder")}</p>
                  )}
                  {audioUrl ? (
                    <div className="text-muted grid gap-1 text-sm">
                      <p>{t("voiceoverLabel")} {job?.output.voiceProvider || t("voiceoverFallback")}</p>
                      <a className="underline" href={audioUrl} rel="noreferrer" target="_blank">{t("downloadVoiceover")}</a>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function ScriptBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted text-xs font-bold uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-1 whitespace-pre-line text-lg font-bold leading-7">{value}</p>
    </div>
  );
}

class ApiError extends Error {
  job?: VideoJob;

  constructor(message: string, job?: VideoJob) {
    super(message);
    this.name = "ApiError";
    this.job = job;
  }
}

async function postJson<T>(url: string, payload: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  let json: T & { error?: string; job?: VideoJob };
  try {
    json = (await response.json()) as T & { error?: string; job?: VideoJob };
  } catch {
    throw new ApiError(`Request failed with status ${response.status}.`);
  }

  if (!response.ok) {
    throw new ApiError(json.error ?? `Request failed: ${url}`, json.job);
  }

  return json;
}
