// worker/worker.js
const { Worker, QueueScheduler } = require("bullmq");
const axios = require("axios");
const Redis = require("ioredis");

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const BRIA_API_TOKEN = process.env.BRIA_API_TOKEN || "YOUR_BRIA_TOKEN";
const QUEUE_NAME = "prolight-batch-render";

const connection = new Redis(REDIS_URL);
new QueueScheduler(QUEUE_NAME, { connection });

async function callBriaGenerate(cameraJson) {
  // Example: call a wrapper endpoint on your backend that posts to BRIA
  // or call Bria directly. We'll call backend to avoid exposing tokens.
  const resp = await axios.post(`${BACKEND_URL}/api/render/from-camera`, { camera: cameraJson });
  return resp.data; // expects { request_id, status_url }
}

async function pollStatus(statusUrl, timeoutMs = 5 * 60 * 1000, interval = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await axios.get(statusUrl);
    if (r.data.status === "COMPLETED") return r.data.result;
    if (r.data.status === "ERROR") throw new Error("render error: " + JSON.stringify(r.data.error));
    await new Promise((res) => setTimeout(res, interval));
  }
  throw new Error("timeout waiting for status");
}

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    console.log("processing", job.id, job.name);
    const { poseId, camera } = job.data;
    // 1) start generation
    const startResp = await callBriaGenerate(camera);
    const requestId = startResp.request_id;
    const statusUrl = startResp.status_url;

    // 2) poll
    const result = await pollStatus(statusUrl);

    // 3) notify backend with results (store image URLs, seeds, etc.)
    await axios.post(`${BACKEND_URL}/api/render/callback`, { poseId, requestId, result });

    return { ok: true, requestId };
  },
  { connection: { host: connection.options.host } }
);

worker.on("completed", (job) => console.log("completed", job.id));
worker.on("failed", (job, err) => console.error("job failed", job.id, err));

