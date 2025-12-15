#!/usr/bin/env node

/**
 * Determinism Test Script
 * 
 * Tests that identical prompts with the same seed produce identical artifacts.
 * 
 * Usage:
 *   node scripts/test_determinism.js --prompt "A beautiful sunset" --seed 12345
 */

import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = process.env.API_URL || 'http://localhost:8000/api';
const TEST_SEED = parseInt(process.env.SEED) || 12345;
const TEST_PROMPT = process.env.PROMPT || 'A beautiful sunset over mountains';

async function downloadImage(url, filepath) {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

function computeFileHash(filepath) {
  const fileBuffer = fs.readFileSync(filepath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

async function generateImage(prompt, seed, runNumber) {
  console.log(`\n[Run ${runNumber}] Generating image with seed ${seed}...`);
  
  try {
    // Create generation job
    const createResponse = await axios.post(`${API_BASE}/generate/text-to-image`, {
      prompt,
      model: 'bria-fibo-v1',
      seed,
      width: 1024,
      height: 1024,
      num_variants: 1,
    });

    const { run_id, sse_token } = createResponse.data;
    console.log(`  Run ID: ${run_id}`);

    // Poll for completion
    let status;
    let attempts = 0;
    const maxAttempts = 120; // 2 minutes max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      status = await axios.get(`${API_BASE}/status/${run_id}`);
      const statusData = status.data;

      console.log(`  Status: ${statusData.status} (${statusData.progress_percent}%)`);

      if (statusData.status === 'completed') {
        if (statusData.artifacts && statusData.artifacts.length > 0) {
          return statusData.artifacts[0].url;
        } else {
          throw new Error('Job completed but no artifacts found');
        }
      }

      if (statusData.status === 'failed') {
        throw new Error('Generation failed');
      }

      attempts++;
    }

    throw new Error('Generation timed out');
  } catch (error) {
    console.error(`  Error: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Determinism Test');
  console.log('='.repeat(60));
  console.log(`Prompt: "${TEST_PROMPT}"`);
  console.log(`Seed: ${TEST_SEED}`);
  console.log(`API: ${API_BASE}`);

  const tempDir = path.join(__dirname, '../.temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    // Generate first image
    const url1 = await generateImage(TEST_PROMPT, TEST_SEED, 1);
    const filepath1 = path.join(tempDir, 'image1.png');
    await downloadImage(url1, filepath1);
    const hash1 = computeFileHash(filepath1);
    console.log(`\n[Run 1] Downloaded: ${filepath1}`);
    console.log(`[Run 1] SHA256: ${hash1}`);

    // Wait a bit
    console.log('\nWaiting 5 seconds before second generation...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Generate second image with same prompt and seed
    const url2 = await generateImage(TEST_PROMPT, TEST_SEED, 2);
    const filepath2 = path.join(tempDir, 'image2.png');
    await downloadImage(url2, filepath2);
    const hash2 = computeFileHash(filepath2);
    console.log(`\n[Run 2] Downloaded: ${filepath2}`);
    console.log(`[Run 2] SHA256: ${hash2}`);

    // Compare hashes
    console.log('\n' + '='.repeat(60));
    if (hash1 === hash2) {
      console.log('✅ SUCCESS: Images are identical (deterministic)');
      console.log(`   Both images have SHA256: ${hash1}`);
      
      // Cleanup
      fs.unlinkSync(filepath1);
      fs.unlinkSync(filepath2);
      
      process.exit(0);
    } else {
      console.log('❌ FAILURE: Images differ (non-deterministic)');
      console.log(`   Run 1 SHA256: ${hash1}`);
      console.log(`   Run 2 SHA256: ${hash2}`);
      console.log(`\n   Files saved for inspection:`);
      console.log(`   - ${filepath1}`);
      console.log(`   - ${filepath2}`);
      
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

main();

