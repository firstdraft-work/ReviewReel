const endpoint = process.env.RENDERER_URL || "http://localhost:8080/render";
const token = process.env.RENDERER_TOKEN || process.env.VIDEO_RENDERER_TOKEN || "dev-renderer-token";

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    businessName: "拉州拉面馆",
    reviews: ["牛肉面汤头很香，分量特别足", "老板服务热情，上菜也快"],
    script: {
      hook: "拉州拉面馆，汤头香别错过",
      socialProof: ["食客都夸：牛肉面汤头很香，分量特别足", "食客都夸：老板服务热情，上菜也快"],
      cta: "今天就去拉州拉面馆吃一碗。",
    },
    imageUrls: [],
    audioUrl: "",
    subtitles: ["拉州拉面馆，汤头香别错过", "牛肉面汤头很香，分量特别足", "今天就去吃一碗。"],
    templateId: "bold-food",
    output: {
      width: 1080,
      height: 1920,
      durationSeconds: 15,
      format: "mp4",
    },
  }),
});

const json = await response.json();
console.log(response.status, json);

if (!response.ok || !json.videoUrl) {
  process.exit(1);
}
