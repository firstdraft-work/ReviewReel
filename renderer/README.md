# ReviewReel Renderer

Independent FFmpeg renderer for production deployments where the Next.js app runs on Vercel.

## Local Run

```bash
cd renderer
RENDERER_TOKEN=dev-renderer-token node server.mjs
```

Then smoke test:

```bash
cd renderer
RENDERER_TOKEN=dev-renderer-token node smoke.mjs
```

## Docker

```bash
docker build -t reviewreel-renderer ./renderer
docker run --rm -p 8080:8080 -e RENDERER_TOKEN=dev-renderer-token reviewreel-renderer
```

## API

`POST /render`

Headers:

```text
Authorization: Bearer <RENDERER_TOKEN>
Content-Type: application/json
```

Body:

```json
{
  "businessName": "拉州拉面馆",
  "reviews": ["牛肉面汤头很香，分量特别足"],
  "script": {
    "hook": "拉州拉面馆，汤头香别错过",
    "socialProof": ["食客都夸：牛肉面汤头很香，分量特别足"],
    "cta": "今天就去拉州拉面馆吃一碗。"
  },
  "imageUrls": ["https://..."],
  "audioUrl": "https://...",
  "subtitles": ["...", "...", "..."],
  "templateId": "bold-food",
  "output": {
    "width": 1080,
    "height": 1920,
    "durationSeconds": 15,
    "format": "mp4"
  }
}
```

Response:

```json
{
  "videoUrl": "https://renderer.example.com/media/reviewreel-....mp4",
  "images": [],
  "provider": "reviewreel-renderer:ffmpeg"
}
```

## Notes

- The Docker image installs FFmpeg and Noto CJK fonts for Chinese subtitles.
- By default, MP4 files are served from the renderer's local `media/` directory.
- For durable production storage, mount a persistent volume or extend this service to upload the final MP4 to Vercel Blob/S3/R2.
