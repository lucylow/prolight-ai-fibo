// worker/producer.js
const { Queue } = require("bullmq");
const axios = require("axios");

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const QUEUE_NAME = "prolight-batch-render";

const queue = new Queue(QUEUE_NAME, { connection: { url: REDIS_URL } });

async function enqueueAllPoses() {
  // fetch poses from backend
  const backend = process.env.BACKEND_URL || "http://localhost:8000";
  const res = await axios.get(`${backend}/api/poses/`);
  const poses = res.data;

  for (const pose of poses) {
    const jobData = {
      poseId: pose.id,
      camera: pose.camera,
      meta: { jobOrigin: "batch_from_poselist" },
    };
    await queue.add("render-pose", jobData, { attempts: 3, backoff: { type: "exponential", delay: 2000 } });
    console.log("enqueued pose", pose.id);
  }
  console.log("enqueued", poses.length, "jobs");
}

enqueueAllPoses().catch((err) => {
  console.error(err);
  process.exit(1);
});
