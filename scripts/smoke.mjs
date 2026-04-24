const base = process.env.REVIEWREEL_BASE_URL || "http://127.0.0.1:3000";

async function post(path, body) {
  const response = await fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json();

  if (!response.ok) {
    throw new Error(`${path}: ${JSON.stringify(json)}`);
  }

  return json;
}

async function get(path) {
  const response = await fetch(base + path);
  const json = await response.json();

  if (!response.ok) {
    throw new Error(`${path}: ${JSON.stringify(json)}`);
  }

  return json;
}

const reviews = [
  "Five stars. The staff was incredibly friendly and the service was fast.",
  "Best tacos in the neighborhood. Fresh, flavorful, and always consistent.",
  "I brought my whole family and everyone loved it. We will be back this week.",
];

const result = await post("/api/generate", {
  businessName: "Sunset Tacos",
  reviews,
});
const { job } = result;

console.log("job", {
  id: job.id,
  status: job.status,
  videoUrl: job.output.videoUrl,
  totalMs: job.metrics.totalMs,
});
console.log("script", job.output.script);
console.log("images", job.output.images);
console.log("audio", job.output.audioUrl);
console.log("video", job.output.videoUrl);

const fetched = await get(`/api/jobs/${job.id}`);
console.log("fetched", {
  id: fetched.job.id,
  status: fetched.job.status,
  videoUrl: fetched.job.output.videoUrl,
});
