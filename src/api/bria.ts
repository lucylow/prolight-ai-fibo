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