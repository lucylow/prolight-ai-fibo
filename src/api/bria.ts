// src/api/bria.ts
import axios from "axios";

export const bria = axios.create({
  baseURL: "/edge/bria",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

/* ---------- TEXT → IMAGE ---------- */
export async function textToImage(payload: {
  prompt?: string;
  structured_prompt?: object;
  model_version?: "v1" | "v2";
  seed?: number;
  num_results?: number;
  sync?: boolean;
}) {
  const { data } = await bria.post("/image-generate", payload);
  return data;
}

/* ---------- TAILORED MODEL ---------- */
export async function tailoredTextToImage(payload: {
  model_id: string;
  prompt?: string;
  structured_prompt?: object;
}) {
  const { data } = await bria.post("/tailored-gen", payload);
  return data;
}

/* ---------- ADS ---------- */
export async function generateAds(payload: {
  brand_id?: string;
  template_id?: string;
  formats?: string[];
  prompt?: string;
  structured_prompt?: object;
  branding_blocks?: unknown[];
}) {
  const { data } = await bria.post("/ads-generate", payload);
  return data;
}

/* ---------- IMAGE EDIT ---------- */
export async function editImage(route: string, payload: {
  asset_id: string;
  operation?: string;
  params?: Record<string, unknown>;
  [key: string]: unknown;
}) {
  const { data } = await bria.post("/image-edit", {
    asset_id: payload.asset_id,
    operation: route,
    params: payload,
  });
  return data;
}

/* ---------- PRODUCT SHOT ---------- */
export async function editProductShot(payload: {
  asset_id: string;
  operation: string;
  params?: Record<string, unknown>;
}) {
  const { data } = await bria.post("/product-shot", payload);
  return data;
}

/* ---------- VIDEO ---------- */
export async function editVideo(route: string, payload: {
  asset_id: string;
  operation?: string;
  params?: Record<string, unknown>;
  [key: string]: unknown;
}) {
  const { data } = await bria.post("/video-edit", {
    asset_id: payload.asset_id,
    operation: route,
    params: payload,
  });
  return data;
}

/* ---------- IMAGE ONBOARD ---------- */
export async function onboardImage(payload: {
  image_url: string;
}) {
  const { data } = await bria.post("/image-onboard", payload);
  return data;
}

/* ---------- STATUS ---------- */
export async function getStatus(requestId: string) {
  const { data } = await bria.get(`/status?request_id=${requestId}`);
  return data;
}

/* ---------- ADS GENERATION v1 ---------- */
export interface AdsGenerateV1Request {
  template_id: string;
  brand_id?: string;
  smart_image?: {
    input_image_url: string;
    scene: {
      operation: 'expand_image' | 'lifestyle_shot_by_text';
      input: string;
    };
  };
  elements?: Array<{
    layer_type: 'text' | 'image';
    content_type?: string;
    content: string;
    id?: string;
  }>;
  content_moderation?: boolean;
}

export interface AdsSceneResult {
  id: string;
  name: string;
  url: string;
  resolution?: {
    width: number;
    height: number;
  };
}

export interface AdsGenerateV1Response {
  result: AdsSceneResult[];
}

export async function generateAdsV1(payload: AdsGenerateV1Request): Promise<AdsGenerateV1Response> {
  const { data } = await bria.post("/ads-generate-v1", payload);
  return data;
}

export interface AdsStatusResponse {
  status: 'pending' | 'ready' | 'failed';
  contentLength: number | null;
  statusCode: number | null;
}

export async function checkAdsStatus(sceneUrl: string): Promise<AdsStatusResponse> {
  const { data } = await bria.get(`/ads-status?url=${encodeURIComponent(sceneUrl)}`);
  return data;
}

export async function downloadAdsImage(sceneUrl: string): Promise<Blob> {
  const { data } = await bria.get(`/ads-download?url=${encodeURIComponent(sceneUrl)}`, {
    responseType: 'blob',
  });
  return data;
}

/* ---------- IMAGE GENERATION v2 ---------- */
export interface TextToImageV2Request {
  prompt?: string;
  images?: string[];
  structured_prompt?: string | object;
  negative_prompt?: string;
  aspect_ratio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9';
  guidance_scale?: number;
  steps_num?: number;
  seed?: number;
  sync?: boolean;
  model_version?: string;
  ip_signal?: boolean;
  prompt_content_moderation?: boolean;
  visual_input_content_moderation?: boolean;
  visual_output_content_moderation?: boolean;
}

export interface ImageToImageV2Request {
  images: string[];
  prompt?: string;
  structured_prompt?: string | object;
  negative_prompt?: string;
  strength?: number;
  guidance_scale?: number;
  steps_num?: number;
  seed?: number;
  aspect_ratio?: string;
  sync?: boolean;
}

export interface BriaV2Response {
  result?: {
    image_url?: string;
    images?: Array<{ url: string; seed: number }>;
    seed?: number;
    structured_prompt?: string | object;
  };
  request_id: string;
  status_url?: string;
  warning?: string;
  status?: string;
}

export async function textToImageV2(payload: TextToImageV2Request): Promise<BriaV2Response> {
  const { data } = await bria.post("/image-generate-v2", payload);
  return data;
}

export async function imageToImageV2(payload: ImageToImageV2Request): Promise<BriaV2Response> {
  const { data } = await bria.post("/image-to-image-v2", payload);
  return data;
}