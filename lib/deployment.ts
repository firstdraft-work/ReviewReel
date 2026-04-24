export const mediaRuntimeUnsupportedCode = "MEDIA_RUNTIME_NOT_CONFIGURED";

export function getMediaRuntimeUnsupportedMessage(
  options: {
    allowBlobOnly?: boolean;
    allowCloudTtsOnly?: boolean;
    allowRemotePipeline?: boolean;
    allowRemoteRendererOnly?: boolean;
  } = {},
) {
  if (process.env.VERCEL !== "1" || process.env.ALLOW_LOCAL_MEDIA_ON_VERCEL === "1") {
    return "";
  }

  if (options.allowBlobOnly && process.env.BLOB_READ_WRITE_TOKEN) {
    return "";
  }

  if (options.allowCloudTtsOnly && process.env.TTS_ENDPOINT_URL && process.env.TTS_API_KEY) {
    return "";
  }

  if (options.allowRemoteRendererOnly && process.env.VIDEO_RENDERER_URL && process.env.VIDEO_RENDERER_TOKEN) {
    return "";
  }

  if (
    options.allowRemotePipeline &&
    process.env.BLOB_READ_WRITE_TOKEN &&
    process.env.TTS_ENDPOINT_URL &&
    process.env.TTS_API_KEY &&
    process.env.VIDEO_RENDERER_URL &&
    process.env.VIDEO_RENDERER_TOKEN
  ) {
    return "";
  }

  return [
    "ReviewReel media generation is still configured for local-only tools.",
    "Vercel production needs Blob storage, cloud TTS, and a remote video renderer before this endpoint can generate media.",
  ].join(" ");
}

export function mediaRuntimeUnsupportedResponse(
  options: {
    allowBlobOnly?: boolean;
    allowCloudTtsOnly?: boolean;
    allowRemotePipeline?: boolean;
    allowRemoteRendererOnly?: boolean;
  } = {},
) {
  const message = getMediaRuntimeUnsupportedMessage(options);

  if (!message) {
    return null;
  }

  return Response.json(
    {
      code: mediaRuntimeUnsupportedCode,
      error: message,
    },
    { status: 501 },
  );
}
