// scripts/write_build_meta.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commit = process.env.GITHUB_SHA || process.env.SOURCE_COMMIT || "dev-local";
const time = new Date().toISOString();

// Write to .env.local.build for Vite to pick up
const envFile = `VITE_CLIENT_COMMIT=${commit}\nVITE_CLIENT_BUILD_TIME=${time}\n`;
const envPath = path.join(__dirname, "..", ".env.local.build");
fs.writeFileSync(envPath, envFile);
console.log("Wrote frontend build meta:", envFile.trim());
