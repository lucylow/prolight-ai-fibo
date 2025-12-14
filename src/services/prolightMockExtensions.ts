/**
 * prolight-mock-extensions.ts
 *
 * Additional mock data & helpers to extend the ProLight mock set you already have.
 * Copy-paste into the same module (or import/export) to enrich Ads Generation, Onboarding,
 * Video Editing, Tailored Gen, Product Shot Editing, Status Service, Webhooks, SSE examples,
 * bulk/batch flows, error cases, templates/brands, and sample DB seed arrays.
 *
 * TypeScript, single-file ready. Exports:
 *  - ADDITIONAL_MOCK_DATA (structured object of helpers)
 *  - extendMockProvider(providers) -> returns a merged provider
 *
 * Note: uses the existing ProLightAPIResponse type from your earlier mock file.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ProLightAPIResponse } from './prolightMockData';

/* ---------- Helper utilities ---------- */

function nowId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function randRange(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms = 200) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ---------- Additional Mock Catalog / DB Seeds ---------- */

export const MOCK_USERS = [
  { id: 'user_1', name: 'Ava Photographer', role: 'photographer', email: 'ava@example.com' },
  { id: 'user_2', name: 'Sam Creative', role: 'creative_lead', email: 'sam@example.com' },
  { id: 'user_admin', name: 'Ops Admin', role: 'admin', email: 'ops@example.com' },
  { id: 'user_3', name: 'Jordan Designer', role: 'designer', email: 'jordan@example.com' },
  { id: 'user_4', name: 'Taylor Marketing', role: 'marketing', email: 'taylor@example.com' },
  { id: 'user_5', name: 'Morgan Studio', role: 'photographer', email: 'morgan@example.com' },
  { id: 'user_6', name: 'Casey Art Director', role: 'creative_lead', email: 'casey@example.com' },
  { id: 'user_7', name: 'Riley Producer', role: 'producer', email: 'riley@example.com' },
  { id: 'user_8', name: 'Alex Content Creator', role: 'content_creator', email: 'alex@example.com' },
  { id: 'user_9', name: 'Blake E-commerce Manager', role: 'marketing', email: 'blake@example.com' },
  { id: 'user_10', name: 'Cameron Studio Manager', role: 'producer', email: 'cameron@example.com' },
  { id: 'user_11', name: 'Dakota Fashion Photographer', role: 'photographer', email: 'dakota@example.com' },
  { id: 'user_12', name: 'Emery Brand Strategist', role: 'creative_lead', email: 'emery@example.com' },
  { id: 'user_13', name: 'Finley Product Photographer', role: 'photographer', email: 'finley@example.com' },
  { id: 'user_14', name: 'Harper Social Media Manager', role: 'marketing', email: 'harper@example.com' },
  { id: 'user_15', name: 'Indigo Video Producer', role: 'producer', email: 'indigo@example.com' },
  { id: 'user_16', name: 'Jamie Retoucher', role: 'designer', email: 'jamie@example.com' },
  { id: 'user_17', name: 'Kai Commercial Photographer', role: 'photographer', email: 'kai@example.com' },
  { id: 'user_18', name: 'Logan Creative Director', role: 'creative_lead', email: 'logan@example.com' },
  { id: 'user_19', name: 'Nova Beauty Photographer', role: 'photographer', email: 'nova@example.com' },
  { id: 'user_20', name: 'Parker Agency Owner', role: 'admin', email: 'parker@example.com' }
];

export const MOCK_BRANDS = [
  { id: 120, name: 'ProLight Test Brand', colors: { primary: '#0b79d0', accent: '#f59e0b' }, logos: ['https://mock.prolight.ai/logo/pl_120.svg'] },
  { id: 121, name: 'FIBO Studio', colors: { primary: '#0fa3a3', accent: '#ffb86b' }, logos: ['https://mock.prolight.ai/logo/fibo_121.svg'] },
  { id: 122, name: 'Luxury Timepieces', colors: { primary: '#1a1a1a', accent: '#d4af37' }, logos: ['https://mock.prolight.ai/logo/watch_122.svg'] },
  { id: 123, name: 'Beauty Essentials', colors: { primary: '#ff6b9d', accent: '#c44569' }, logos: ['https://mock.prolight.ai/logo/beauty_123.svg'] },
  { id: 124, name: 'Tech Innovations', colors: { primary: '#2c3e50', accent: '#3498db' }, logos: ['https://mock.prolight.ai/logo/tech_124.svg'] },
  { id: 125, name: 'Fashion House', colors: { primary: '#8b4513', accent: '#daa520' }, logos: ['https://mock.prolight.ai/logo/fashion_125.svg'] },
  { id: 126, name: 'Jewelry Collection', colors: { primary: '#2c2c2c', accent: '#ffffff' }, logos: ['https://mock.prolight.ai/logo/jewelry_126.svg'] },
  { id: 127, name: 'Premium Cosmetics', colors: { primary: '#e91e63', accent: '#ff4081' }, logos: ['https://mock.prolight.ai/logo/cosmetics_127.svg'] },
  { id: 128, name: 'Modern Electronics', colors: { primary: '#000000', accent: '#00ff00' }, logos: ['https://mock.prolight.ai/logo/electronics_128.svg'] },
  { id: 129, name: 'Luxury Fragrances', colors: { primary: '#6a1b9a', accent: '#ab47bc' }, logos: ['https://mock.prolight.ai/logo/fragrance_129.svg'] },
  { id: 130, name: 'Artisan Home Decor', colors: { primary: '#5d4037', accent: '#8d6e63' }, logos: ['https://mock.prolight.ai/logo/home_130.svg'] },
  { id: 131, name: 'Sportswear Elite', colors: { primary: '#d32f2f', accent: '#ff5252' }, logos: ['https://mock.prolight.ai/logo/sport_131.svg'] },
  { id: 132, name: 'Gourmet Kitchen', colors: { primary: '#f57c00', accent: '#ff9800' }, logos: ['https://mock.prolight.ai/logo/kitchen_132.svg'] },
  { id: 133, name: 'Wellness Products', colors: { primary: '#388e3c', accent: '#66bb6a' }, logos: ['https://mock.prolight.ai/logo/wellness_133.svg'] },
  { id: 134, name: 'Luxury Automobiles', colors: { primary: '#1976d2', accent: '#42a5f5' }, logos: ['https://mock.prolight.ai/logo/auto_134.svg'] },
  { id: 135, name: 'Fine Art Prints', colors: { primary: '#7b1fa2', accent: '#ba68c8' }, logos: ['https://mock.prolight.ai/logo/art_135.svg'] },
  { id: 136, name: 'Premium Watches', colors: { primary: '#424242', accent: '#757575' }, logos: ['https://mock.prolight.ai/logo/watches_136.svg'] },
  { id: 137, name: 'Designer Accessories', colors: { primary: '#c2185b', accent: '#e91e63' }, logos: ['https://mock.prolight.ai/logo/accessories_137.svg'] },
  { id: 138, name: 'Smart Home Tech', colors: { primary: '#0288d1', accent: '#03a9f4' }, logos: ['https://mock.prolight.ai/logo/smart_138.svg'] },
  { id: 139, name: 'Organic Skincare', colors: { primary: '#689f38', accent: '#8bc34a' }, logos: ['https://mock.prolight.ai/logo/skincare_139.svg'] },
  { id: 140, name: 'Luxury Travel', colors: { primary: '#00796b', accent: '#009688' }, logos: ['https://mock.prolight.ai/logo/travel_140.svg'] }
];

export const MOCK_AD_TEMPLATES = [
  { id: 1061, name: 'Simple Product Square', scenes: 1, preview: 'https://mock.prolight.ai/templates/1061_preview.png', requires_brand: false },
  { id: 1062, name: 'Hero Multi-Scene', scenes: 3, preview: 'https://mock.prolight.ai/templates/1062_preview.png', requires_brand: true },
  { id: 1063, name: 'Luxury Showcase', scenes: 2, preview: 'https://mock.prolight.ai/templates/1063_preview.png', requires_brand: true },
  { id: 1064, name: 'Minimalist Product', scenes: 1, preview: 'https://mock.prolight.ai/templates/1064_preview.png', requires_brand: false },
  { id: 1065, name: 'Dynamic Lifestyle', scenes: 4, preview: 'https://mock.prolight.ai/templates/1065_preview.png', requires_brand: true },
  { id: 1066, name: 'Clean E-commerce', scenes: 1, preview: 'https://mock.prolight.ai/templates/1066_preview.png', requires_brand: false },
  { id: 1067, name: 'Editorial Style', scenes: 3, preview: 'https://mock.prolight.ai/templates/1067_preview.png', requires_brand: true },
  { id: 1068, name: 'Social Media Grid', scenes: 6, preview: 'https://mock.prolight.ai/templates/1068_preview.png', requires_brand: false },
  { id: 1069, name: 'Product Carousel', scenes: 5, preview: 'https://mock.prolight.ai/templates/1069_preview.png', requires_brand: true },
  { id: 1070, name: 'Before After Comparison', scenes: 2, preview: 'https://mock.prolight.ai/templates/1070_preview.png', requires_brand: false },
  { id: 1071, name: 'Luxury Brand Story', scenes: 4, preview: 'https://mock.prolight.ai/templates/1071_preview.png', requires_brand: true },
  { id: 1072, name: 'Instagram Story Format', scenes: 3, preview: 'https://mock.prolight.ai/templates/1072_preview.png', requires_brand: false },
  { id: 1073, name: 'Facebook Ad Standard', scenes: 1, preview: 'https://mock.prolight.ai/templates/1073_preview.png', requires_brand: false },
  { id: 1074, name: 'TikTok Vertical Video', scenes: 4, preview: 'https://mock.prolight.ai/templates/1074_preview.png', requires_brand: true },
  { id: 1075, name: 'YouTube Thumbnail', scenes: 1, preview: 'https://mock.prolight.ai/templates/1075_preview.png', requires_brand: false },
  { id: 1076, name: 'LinkedIn Professional', scenes: 1, preview: 'https://mock.prolight.ai/templates/1076_preview.png', requires_brand: true },
  { id: 1077, name: 'Pinterest Pin Format', scenes: 2, preview: 'https://mock.prolight.ai/templates/1077_preview.png', requires_brand: false },
  { id: 1078, name: 'Email Header Banner', scenes: 1, preview: 'https://mock.prolight.ai/templates/1078_preview.png', requires_brand: true },
  { id: 1079, name: 'Website Hero Section', scenes: 1, preview: 'https://mock.prolight.ai/templates/1079_preview.png', requires_brand: true },
  { id: 1080, name: 'Product Detail Page', scenes: 6, preview: 'https://mock.prolight.ai/templates/1080_preview.png', requires_brand: false },
  { id: 1081, name: 'Seasonal Campaign', scenes: 4, preview: 'https://mock.prolight.ai/templates/1081_preview.png', requires_brand: true },
  { id: 1082, name: 'Holiday Special', scenes: 3, preview: 'https://mock.prolight.ai/templates/1082_preview.png', requires_brand: true },
  { id: 1083, name: 'New Product Launch', scenes: 5, preview: 'https://mock.prolight.ai/templates/1083_preview.png', requires_brand: true },
  { id: 1084, name: 'Testimonial Showcase', scenes: 2, preview: 'https://mock.prolight.ai/templates/1084_preview.png', requires_brand: false },
  { id: 1085, name: 'Comparison Chart', scenes: 1, preview: 'https://mock.prolight.ai/templates/1085_preview.png', requires_brand: false }
];

export const MOCK_ASSETS = [
  { asset_id: 'asset_1001', url: 'https://mock.prolight.ai/assets/lamp_hero_01.png', width: 4000, height: 3000, tags: ['lamp','hero','studio'], visual_id: 'v_1001' },
  { asset_id: 'asset_1002', url: 'https://mock.prolight.ai/assets/lamp_side_02.png', width: 3000, height: 3000, tags: ['lamp','side','studio'], visual_id: 'v_1002' },
  { asset_id: 'asset_1003', url: 'https://mock.prolight.ai/assets/watch_luxury_01.png', width: 4000, height: 3000, tags: ['watch','luxury','product'], visual_id: 'v_1003' },
  { asset_id: 'asset_1004', url: 'https://mock.prolight.ai/assets/jewelry_ring_01.png', width: 3000, height: 3000, tags: ['jewelry','ring','luxury'], visual_id: 'v_1004' },
  { asset_id: 'asset_1005', url: 'https://mock.prolight.ai/assets/cosmetics_lipstick_01.png', width: 3000, height: 3000, tags: ['cosmetics','beauty','product'], visual_id: 'v_1005' },
  { asset_id: 'asset_1006', url: 'https://mock.prolight.ai/assets/phone_hero_01.png', width: 4000, height: 3000, tags: ['electronics','phone','tech'], visual_id: 'v_1006' },
  { asset_id: 'asset_1007', url: 'https://mock.prolight.ai/assets/handbag_luxury_01.png', width: 4000, height: 3000, tags: ['fashion','handbag','luxury'], visual_id: 'v_1007' },
  { asset_id: 'asset_1008', url: 'https://mock.prolight.ai/assets/watch_detail_02.png', width: 3000, height: 3000, tags: ['watch','detail','macro'], visual_id: 'v_1008' },
  { asset_id: 'asset_1009', url: 'https://mock.prolight.ai/assets/jewelry_necklace_01.png', width: 3000, height: 4000, tags: ['jewelry','necklace','portrait'], visual_id: 'v_1009' },
  { asset_id: 'asset_1010', url: 'https://mock.prolight.ai/assets/cosmetics_palette_01.png', width: 3000, height: 3000, tags: ['cosmetics','makeup','beauty'], visual_id: 'v_1010' },
  { asset_id: 'asset_1011', url: 'https://mock.prolight.ai/assets/perfume_bottle_01.png', width: 3000, height: 4000, tags: ['fragrance','luxury','beauty'], visual_id: 'v_1011' },
  { asset_id: 'asset_1012', url: 'https://mock.prolight.ai/assets/sunglasses_01.png', width: 4000, height: 3000, tags: ['fashion','accessories','lifestyle'], visual_id: 'v_1012' },
  { asset_id: 'asset_1013', url: 'https://mock.prolight.ai/assets/shoes_luxury_01.png', width: 4000, height: 3000, tags: ['fashion','footwear','luxury'], visual_id: 'v_1013' },
  { asset_id: 'asset_1014', url: 'https://mock.prolight.ai/assets/laptop_premium_01.png', width: 4000, height: 3000, tags: ['electronics','tech','product'], visual_id: 'v_1014' },
  { asset_id: 'asset_1015', url: 'https://mock.prolight.ai/assets/camera_professional_01.png', width: 4000, height: 3000, tags: ['electronics','camera','tech'], visual_id: 'v_1015' },
  { asset_id: 'asset_1016', url: 'https://mock.prolight.ai/assets/skincare_set_01.png', width: 3000, height: 3000, tags: ['beauty','skincare','wellness'], visual_id: 'v_1016' },
  { asset_id: 'asset_1017', url: 'https://mock.prolight.ai/assets/wine_bottle_01.png', width: 3000, height: 4000, tags: ['beverage','luxury','lifestyle'], visual_id: 'v_1017' },
  { asset_id: 'asset_1018', url: 'https://mock.prolight.ai/assets/headphones_premium_01.png', width: 4000, height: 3000, tags: ['electronics','audio','tech'], visual_id: 'v_1018' },
  { asset_id: 'asset_1019', url: 'https://mock.prolight.ai/assets/watch_sport_01.png', width: 3000, height: 3000, tags: ['watch','sport','tech'], visual_id: 'v_1019' },
  { asset_id: 'asset_1020', url: 'https://mock.prolight.ai/assets/jewelry_earrings_01.png', width: 3000, height: 3000, tags: ['jewelry','earrings','luxury'], visual_id: 'v_1020' },
  { asset_id: 'asset_1021', url: 'https://mock.prolight.ai/assets/tablet_modern_01.png', width: 4000, height: 3000, tags: ['electronics','tablet','tech'], visual_id: 'v_1021' },
  { asset_id: 'asset_1022', url: 'https://mock.prolight.ai/assets/sneakers_lifestyle_01.png', width: 4000, height: 3000, tags: ['fashion','footwear','lifestyle'], visual_id: 'v_1022' },
  { asset_id: 'asset_1023', url: 'https://mock.prolight.ai/assets/backpack_premium_01.png', width: 4000, height: 3000, tags: ['fashion','accessories','lifestyle'], visual_id: 'v_1023' },
  { asset_id: 'asset_1024', url: 'https://mock.prolight.ai/assets/smartwatch_01.png', width: 3000, height: 3000, tags: ['electronics','watch','tech'], visual_id: 'v_1024' },
  { asset_id: 'asset_1025', url: 'https://mock.prolight.ai/assets/bracelet_luxury_01.png', width: 3000, height: 3000, tags: ['jewelry','bracelet','luxury'], visual_id: 'v_1025' },
  { asset_id: 'asset_1026', url: 'https://mock.prolight.ai/assets/speaker_wireless_01.png', width: 4000, height: 3000, tags: ['electronics','audio','tech'], visual_id: 'v_1026' },
  { asset_id: 'asset_1027', url: 'https://mock.prolight.ai/assets/makeup_brush_set_01.png', width: 3000, height: 3000, tags: ['beauty','makeup','tools'], visual_id: 'v_1027' },
  { asset_id: 'asset_1028', url: 'https://mock.prolight.ai/assets/coffee_maker_premium_01.png', width: 4000, height: 3000, tags: ['home','appliances','lifestyle'], visual_id: 'v_1028' },
  { asset_id: 'asset_1029', url: 'https://mock.prolight.ai/assets/wallet_luxury_01.png', width: 3000, height: 3000, tags: ['fashion','accessories','luxury'], visual_id: 'v_1029' },
  { asset_id: 'asset_1030', url: 'https://mock.prolight.ai/assets/earbuds_premium_01.png', width: 3000, height: 3000, tags: ['electronics','audio','tech'], visual_id: 'v_1030' }
];

export const MOCK_TAILORED_MODELS = [
  { model_id: 'prolight-product-v1', created_at: new Date().toISOString(), status: 'ready', training_info: { type: 'fully_automated', examples: 120 } },
  { model_id: 'studio-lighting-v2', created_at: new Date().toISOString(), status: 'training', training_info: { type: 'expert', checkpoint: 1200, progress: 0.42 } },
  { model_id: 'luxury-watch-v1', created_at: new Date(Date.now() - 5 * 24 * 3600000).toISOString(), status: 'ready', training_info: { type: 'fully_automated', examples: 200 } },
  { model_id: 'jewelry-premium-v1', created_at: new Date(Date.now() - 10 * 24 * 3600000).toISOString(), status: 'ready', training_info: { type: 'expert', examples: 150 } },
  { model_id: 'beauty-cosmetics-v1', created_at: new Date(Date.now() - 7 * 24 * 3600000).toISOString(), status: 'ready', training_info: { type: 'fully_automated', examples: 180 } },
  { model_id: 'tech-products-v1', created_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), status: 'ready', training_info: { type: 'fully_automated', examples: 140 } },
  { model_id: 'fashion-accessories-v1', created_at: new Date(Date.now() - 14 * 24 * 3600000).toISOString(), status: 'ready', training_info: { type: 'expert', examples: 220 } },
  { model_id: 'portrait-studio-v2', created_at: new Date(Date.now() - 1 * 24 * 3600000).toISOString(), status: 'training', training_info: { type: 'expert', checkpoint: 800, progress: 0.35 } },
  { model_id: 'electronics-premium-v1', created_at: new Date(Date.now() - 8 * 24 * 3600000).toISOString(), status: 'ready', training_info: { type: 'fully_automated', examples: 160 } },
  { model_id: 'fragrance-luxury-v1', created_at: new Date(Date.now() - 12 * 24 * 3600000).toISOString(), status: 'ready', training_info: { type: 'expert', examples: 190 } },
  { model_id: 'home-decor-v1', created_at: new Date(Date.now() - 6 * 24 * 3600000).toISOString(), status: 'ready', training_info: { type: 'fully_automated', examples: 130 } },
  { model_id: 'sportswear-v1', created_at: new Date(Date.now() - 4 * 24 * 3600000).toISOString(), status: 'ready', training_info: { type: 'fully_automated', examples: 170 } },
  { model_id: 'food-photography-v1', created_at: new Date(Date.now() - 9 * 24 * 3600000).toISOString(), status: 'ready', training_info: { type: 'expert', examples: 210 } },
  { model_id: 'automotive-v1', created_at: new Date(Date.now() - 11 * 24 * 3600000).toISOString(), status: 'ready', training_info: { type: 'expert', examples: 250 } },
  { model_id: 'fashion-apparel-v2', created_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString(), status: 'training', training_info: { type: 'expert', checkpoint: 1500, progress: 0.68 } },
  { model_id: 'lifestyle-v1', created_at: new Date(Date.now() - 15 * 24 * 3600000).toISOString(), status: 'ready', training_info: { type: 'fully_automated', examples: 145 } },
  { model_id: 'macro-photography-v1', created_at: new Date(Date.now() - 13 * 24 * 3600000).toISOString(), status: 'ready', training_info: { type: 'expert', examples: 175 } },
  { model_id: 'editorial-v1', created_at: new Date(Date.now() - 16 * 24 * 3600000).toISOString(), status: 'ready', training_info: { type: 'expert', examples: 195 } },
  { model_id: 'commercial-catalog-v1', created_at: new Date(Date.now() - 18 * 24 * 3600000).toISOString(), status: 'ready', training_info: { type: 'fully_automated', examples: 165 } },
  { model_id: 'artistic-creative-v1', created_at: new Date(Date.now() - 20 * 24 * 3600000).toISOString(), status: 'ready', training_info: { type: 'expert', examples: 205 } }
];

/* ---------- Additional Ads Generation mocks ---------- */

export async function mockGetAdsTemplates(): Promise<ProLightAPIResponse> {
  await sleep(80);
  return {
    success: true,
    data: MOCK_AD_TEMPLATES,
    request_id: nowId('templates'),
    status: 'completed',
    mock: true,
    timing: 80
  };
}

export async function mockGetBrands(): Promise<ProLightAPIResponse> {
  await sleep(60);
  return {
    success: true,
    data: MOCK_BRANDS,
    request_id: nowId('brands'),
    status: 'completed',
    mock: true,
    timing: 60
  };
}

/* ---------- Image Onboarding extended mocks (edge cases) ---------- */

export async function mockImageOnboardingWithFailures(request: { images: string[]; metadata?: any; require_auth?: boolean; }): Promise<ProLightAPIResponse> {
  await sleep(300);
  // simulate some images failing validation (size/type)
  const results = request.images.map((img, i) => {
    if (i % 5 === 0) {
      return { input: img, success: false, reason: 'unsupported_format', code: 415 };
    }
    return { input: img, success: true, visual_id: `vis_${Date.now()}_${i}`, quality_score: +(0.75 + Math.random() * 0.25).toFixed(3) };
  });
  return {
    success: true,
    data: { processed: request.images.length, items: results },
    request_id: nowId('onboard_batch'),
    status: 'completed',
    mock: true,
    timing: 420
  };
}

export async function mockRegisterImageFromS3(org_image_key: string): Promise<ProLightAPIResponse> {
  await sleep(120);
  return {
    success: true,
    data: { visual_id: `v_${Math.abs(org_image_key.length * 1000 + randRange(1000, 9999))}_${Date.now()}`, registered_as: org_image_key },
    request_id: nowId('register'),
    status: 'completed',
    mock: true,
    timing: 120
  };
}

/* ---------- Video Editing extended mocks & progress timeline ---------- */

export async function mockVideoEditingLongTask(request: { video_url: string; edits: any[]; output_format: string; }): Promise<ProLightAPIResponse> {
  // returns async job id (simulate v2 behavior)
  await sleep(70);
  const request_id = nowId('video_job');
  return {
    success: true,
    data: { request_id, status_url: `https://mock.prolight.ai/status/${request_id}` },
    request_id,
    status: 'pending',
    mock: true,
    timing: 70
  };
}

export function mockVideoStatusTimeline(request_id: string) {
  // returns a deterministic timeline array for testing UI (client can poll)
  const base = Date.now();
  return [
    { ts: new Date(base - 60000).toISOString(), state: 'IN_PROGRESS', message: 'queued' },
    { ts: new Date(base - 30000).toISOString(), state: 'IN_PROGRESS', message: 'encoding' },
    { ts: new Date(base - 10000).toISOString(), state: 'IN_PROGRESS', message: 'packaging' },
    { ts: new Date(base - 2000).toISOString(), state: 'COMPLETED', message: 'ready', output_url: `https://mock.prolight.ai/video/finished_${request_id}.mp4` }
  ];
}

/* ---------- Tailored Generation: training lifecycle & usage ---------- */

export async function mockTailoredTrainingStart(payload: { project_id: string; dataset_id: string; mode: 'auto' | 'expert'; }) {
  await sleep(120);
  const modelId = `tailored_${Date.now()}`;
  // create mock training job id
  return {
    success: true,
    data: { model_id: modelId, training_job_id: nowId('train'), status: 'started', mode: payload.mode, eta_minutes: payload.mode === 'auto' ? 40 : 180 },
    request_id: nowId('train_start'),
    status: 'processing',
    mock: true,
    timing: 120
  } as ProLightAPIResponse;
}

export function mockTailoredTrainingStatus(training_job_id: string) {
  // simulated status object
  const progress = +(Math.random() * 0.98).toFixed(3);
  const statuses = ['queued', 'running', 'optimizing', 'finalizing', 'completed'];
  const i = Math.min(Math.floor(progress * statuses.length), statuses.length - 1);
  return {
    success: true,
    data: {
      training_job_id,
      status: statuses[i],
      progress,
      checkpoint_step: Math.floor(progress * 2000),
      logs_preview: [`step ${i}: simulated log line`]
    },
    request_id: nowId('train_status'),
    status: i === statuses.length - 1 ? 'completed' : 'processing',
    mock: true,
    timing: 200
  } as ProLightAPIResponse;
}

/* ---------- Product Shot Editing: batch operations & diffs ---------- */

export async function mockProductShotBatchEdit(request: {
  image_urls: string[];
  ops: Array<{ op: string; params?: any }>;
  priority?: 'low' | 'normal' | 'high';
}) {
  await sleep(300);
  const results = request.image_urls.map((u, i) => ({
    input: u,
    output: `https://mock.prolight.ai/product-shot/edited_batch_${Date.now()}_${i}.png`,
    applied: request.ops.map((o) => o.op),
    diff_map: `https://mock.prolight.ai/diff_maps/${nowId('diff')}_${i}.png`,
    quality_delta: `${randRange(5, 35)}%`
  }));
  return {
    success: true,
    data: { items: results, total: results.length, priority: request.priority || 'normal' },
    request_id: nowId('product_batch'),
    status: 'completed',
    mock: true,
    timing: 1200
  };
}

/* ---------- Image Generation: bulk + deterministic seeds ---------- */

export async function mockBulkImageGeneration(request: {
  prompt: string;
  structured_prompt?: any;
  count: number;
  start_seed?: number;
  model?: string;
}) {
  await sleep(250);
  const startSeed = request.start_seed || randRange(10000, 20000);
  const items = Array.from({ length: request.count }, (_, i) => {
    const seed = startSeed + i;
    return {
      url: `https://mock.prolight.ai/gen/bulk/${nowId('img')}_${i}.png`,
      seed,
      width: 1024,
      height: 1024,
      model: request.model || 'bria-3.2'
    };
  });
  return {
    success: true,
    data: { images: items, prompt: request.prompt, structured_prompt: request.structured_prompt || null },
    request_id: nowId('bulk_gen'),
    status: 'completed',
    mock: true,
    timing: 660
  };
}

/* ---------- Image Editing: staged operations + failure injection ---------- */

export async function mockImageEditingWithStages(request: {
  image_url: string;
  pipeline: Array<{ op: string; params?: any }>;
}) {
  // Simulate each op as a stage with occasional intentional "blocked" output to demonstrate moderation handling
  const stages: any[] = [];
  for (let i = 0; i < request.pipeline.length; i++) {
    const op = request.pipeline[i];
    // random fail for op name 'dangerous_replace' to emulate moderation blocking
    if (op.op === 'dangerous_replace' && Math.random() < 0.5) {
      stages.push({ step: i, op: op.op, status: 'blocked', reason: 'policy' });
      return {
        success: false,
        data: { stages },
        request_id: nowId('edit_blocked'),
        status: 'failed',
        mock: true,
        timing: 300,
        error: { code: 422, message: 'input blocked by content moderation' }
      } as ProLightAPIResponse;
    }
    stages.push({ step: i, op: op.op, status: 'applied', output_url: `https://mock.prolight.ai/edit/stage_${i}_${nowId('o')}.png` });
    await sleep(60);
  }

  return {
    success: true,
    data: { stages, final_url: stages[stages.length - 1]?.output_url || null },
    request_id: nowId('edit_pipeline'),
    status: 'completed',
    mock: true,
    timing: stages.length * 120
  } as ProLightAPIResponse;
}

/* ---------- Status Service: richer timeline & SSE event generator ---------- */

export function mockStatusTimeline(request_id: string, steps = 5) {
  const base = Date.now();
  const timeline = [];
  const labels = ['QUEUED', 'IN_PROGRESS', 'EXECUTING', 'FINALIZING', 'COMPLETED'];
  for (let i = 0; i < steps; i++) {
    timeline.push({
      ts: new Date(base - (steps - i) * 1000 * 8).toISOString(),
      status: labels[Math.min(i, labels.length - 1)],
      progress: Math.min(100, Math.round(((i + 1) / steps) * 100)),
      message: `${labels[Math.min(i, labels.length - 1)]} step ${i}`
    });
  }
  // ensure final has output url
  timeline[timeline.length - 1].output_url = `https://mock.prolight.ai/result/${request_id}.png`;
  return timeline;
}

/** SSE event samples to help client UI tests */
export function mockSseEventsForRun(runId: string) {
  const events: any[] = [];
  const timeline = mockStatusTimeline(runId, 6);
  for (const t of timeline) {
    events.push({
      event: 'status.update',
      runId,
      payload: t
    });
  }
  // add artifact-ready event
  events.push({
    event: 'artifact.ready',
    runId,
    payload: { artifact_url: `https://mock.prolight.ai/artifacts/${runId}.zip` }
  });
  return events;
}

/* ---------- Webhook & Delivery mock helpers ---------- */

export async function mockWebhookDelivery(url: string, payload: any) {
  await sleep(120);
  // Simulate 90% success, 10% temporary failure
  if (Math.random() < 0.1) {
    return {
      success: false,
      data: null,
      request_id: nowId('webhook'),
      status: 'failed',
      mock: true,
      timing: 120,
      error: { code: 502, message: 'remote endpoint returned 502' }
    } as ProLightAPIResponse;
  }
  return {
    success: true,
    data: { delivered_to: url, payload_preview: payload, delivered_at: new Date().toISOString() },
    request_id: nowId('webhook_ok'),
    status: 'completed',
    mock: true,
    timing: 140
  } as ProLightAPIResponse;
}

/* ---------- Billing / Cost Estimate helpers ---------- */

export async function mockCostEstimateForRun(ops: Array<{ tool: string; seconds?: number }>) {
  await sleep(40);
  const unitCosts: Record<string, number> = {
    'bria.text_to_image': 0.035, // per image
    'bria.edit': 0.01,
    'evaluator.perceptual': 0.005,
    'storage.save': 0.002
  };
  let total = 0;
  ops.forEach((o) => {
    const c = unitCosts[o.tool] || 0.01;
    total += c * (o.seconds ? (o.seconds / 10) : 1);
  });
  total = Math.max(0.01, +(total.toFixed(4)));
  return {
    success: true,
    data: { estimate_usd: total, breakdown: ops.map((o) => ({ tool: o.tool, cost: +( (unitCosts[o.tool] || 0.01) .toFixed(4)) })) },
    request_id: nowId('cost_est'),
    status: 'completed',
    mock: true,
    timing: 60
  } as ProLightAPIResponse;
}

/* ---------- Advanced Evaluator plugin mock wrapper (CLIP-like) ---------- */

export async function mockPerceptualEvaluator(referenceUrl: string, candidateUrls: string[]) {
  // call the evaluator microservice in the real stack. Here we simulate scores and flags.
  await sleep(240);
  const scores = candidateUrls.map((u) => ({
    url: u,
    score: +(0.6 + Math.random() * 0.4).toFixed(3),
    pass: Math.random() > 0.25
  }));
  // compute top pick
  const top = scores.reduce((a, b) => (b.score > a.score ? b : a), scores[0]);
  return {
    success: true,
    data: { reference: referenceUrl, scores, top_pick: top },
    request_id: nowId('eval'),
    status: 'completed',
    mock: true,
    timing: 240
  } as ProLightAPIResponse;
}

/* ---------- Utilities to extend the original provider ---------- */

export const ADDITIONAL_MOCK_DATA = {
  users: MOCK_USERS,
  brands: MOCK_BRANDS,
  templates: MOCK_AD_TEMPLATES,
  assets: MOCK_ASSETS,
  tailored_models: MOCK_TAILORED_MODELS,

  // Ads
  getAdsTemplates: mockGetAdsTemplates,
  getBrands: mockGetBrands,

  // Onboarding
  imageOnboardingWithFailures: mockImageOnboardingWithFailures,
  registerImageFromS3: mockRegisterImageFromS3,

  // Video
  startVideoEditJob: mockVideoEditingLongTask,
  videoStatusTimeline: mockVideoStatusTimeline,

  // Tailored training
  startTailoredTraining: mockTailoredTrainingStart,
  tailoredTrainingStatus: mockTailoredTrainingStatus,

  // Product shot batch
  productShotBatchEdit: mockProductShotBatchEdit,

  // Generation
  bulkImageGeneration: mockBulkImageGeneration,

  // Editing
  stagedImageEditing: mockImageEditingWithStages,

  // Status & SSE
  statusTimeline: mockStatusTimeline,
  sseEventsForRun: mockSseEventsForRun,

  // Webhooks
  webhookDelivery: mockWebhookDelivery,

  // Cost
  costEstimate: mockCostEstimateForRun,

  // Evaluator
  perceptualEval: mockPerceptualEvaluator
};

/* Merge helper for existing provider */
export function extendMockProvider(baseProvider: any) {
  const merged = { ...(baseProvider || {}) };
  // shallow copy additional functions into provider
  Object.keys(ADDITIONAL_MOCK_DATA).forEach((k) => {
    // skip seed arrays grouping (users, assets...) and only attach functions as needed
    (merged as any)[k] = (ADDITIONAL_MOCK_DATA as any)[k];
  });
  return merged;
}

/* ---------- Small demo: produce richer mock campaign object ---------- */

export async function mockFullCampaignReport(productName = 'Mock Lamp X') {
  // produce a consolidated campaign response by calling several mocks sequentially
  const tailored = await ADDITIONAL_MOCK_DATA.bulkImageGeneration({ prompt: `${productName} hero`, count: 6, start_seed: 3000 });
  const onboard = await ADDITIONAL_MOCK_DATA.imageOnboardingWithFailures({ images: tailored.data.images.map((i: any) => i.url), metadata: { product: productName } });
  const ads = await ADDITIONAL_MOCK_DATA.getAdsTemplates();
  const productEdits = await ADDITIONAL_MOCK_DATA.productShotBatchEdit({ image_urls: tailored.data.images.map((i: any) => i.url), ops: [{ op: 'relight' }, { op: 'smart_crop' }] });
  const evals = await ADDITIONAL_MOCK_DATA.perceptualEval(tailored.data.images[0].url, tailored.data.images.map((i: any) => i.url));

  return {
    success: true,
    request_id: nowId('campaign_report'),
    data: {
      product: productName,
      generated_images: tailored.data.images,
      onboarding: onboard.data,
      ads_templates_preview: ads.data,
      edits: productEdits.data,
      perceptual_eval_top: evals.data.top_pick,
      summary: {
        images_generated: tailored.data.images.length,
        onboarded: onboard.data.processed,
        edits_applied: productEdits.data.items.length
      }
    },
    status: 'completed',
    mock: true,
    timing: 4200
  } as ProLightAPIResponse;
}

/* ---------- Export default convenience object ---------- */

const AdditionalMocks = {
  ADDITIONAL_MOCK_DATA,
  extendMockProvider,
  mockFullCampaignReport
};

export default AdditionalMocks;
