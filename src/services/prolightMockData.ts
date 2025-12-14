/**
 * ProLight AI - Complete Mock Data & Agentic Integration
 * All APIs: Ads Generation, Image Onboarding, Video Editing, Tailored Gen, Product Shots
 * Ready for Cursor - Copy entire file
 */

export interface ProLightAPIResponse {
  success: boolean;
  data: any;
  request_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  mock: boolean;
  timing: number;
  error?: any;
}

// ============================================================================
// 1. MOCK FIBO STRUCTURED PROMPTS
// ============================================================================

export const FIBO_MOCK_DATA = {
  productShots: {
    lamp: {
      structured_prompt: {
        short_description: "Modern minimalist table lamp on white studio background",
        objects: [
          {
            description: "Sleek matte black cylindrical table lamp",
            location: "center foreground",
            relationship: "isolated subject on seamless backdrop",
            relative_size: "large dominant object",
            shape_and_color: "cylindrical matte black metal with frosted glass diffuser",
            texture: "smooth matte finish with subtle brushed metal texture",
            appearance_details: "modern industrial design, precise geometric proportions",
            number_of_objects: 1,
            pose: "upright stable position",
            lighting: {
              key_light: { type: "directional", intensity: 1.2, direction: "front-left 45°" },
              fill_light: { type: "softbox", intensity: 0.6, direction: "front-right" },
              rim_light: { type: "hairlight", intensity: 0.8, direction: "rear 30°" }
            }
          }
        ],
        background_setting: "professional photography studio with white seamless paper",
        lighting: {
          conditions: "studio 3-point lighting setup",
          direction: "key light front-left, fill right, rim rear",
          shadows: "soft subtle shadows with clean edges"
        },
        aesthetics: {
          composition: "centered product with negative space",
          color_scheme: "neutral white background with product contrast",
          mood_atmosphere: "professional clean commercial photography"
        },
        photographic_characteristics: {
          lens: "85mm f/2.8 macro",
          aperture: "f/4.0",
          shutter_speed: "1/125s",
          iso: "100",
          white_balance: "5600K daylight"
        },
        style_medium: "professional product photography",
        context: "e-commerce catalog hero shot"
      }
    },
    watch: {
      structured_prompt: {
        short_description: "Luxury wristwatch on marble surface with dramatic studio lighting",
        objects: [
          {
            description: "Premium stainless steel wristwatch with leather strap",
            location: "center foreground on marble pedestal",
            relationship: "isolated luxury product on elegant surface",
            relative_size: "medium-sized object with fine details",
            shape_and_color: "circular watch face with silver case and brown leather band",
            texture: "polished metal with brushed finish, genuine leather texture",
            appearance_details: "luxury timepiece with visible dial details and craftsmanship",
            number_of_objects: 1,
            pose: "laying flat on surface, face visible",
            lighting: {
              key_light: { type: "directional", intensity: 1.4, direction: "top-left 60°" },
              fill_light: { type: "softbox", intensity: 0.5, direction: "front-right" },
              rim_light: { type: "hairlight", intensity: 0.9, direction: "rear-left 45°" }
            }
          }
        ],
        background_setting: "professional product studio with dark gray seamless backdrop",
        lighting: {
          conditions: "dramatic 3-point lighting with emphasis on product highlights",
          direction: "key light top-left, fill right, rim rear-left",
          shadows: "defined shadows with good separation"
        },
        aesthetics: {
          composition: "centered product with elegant negative space",
          color_scheme: "neutral gray background with warm product tones",
          mood_atmosphere: "luxury premium product photography"
        },
        photographic_characteristics: {
          lens: "100mm f/2.8 macro",
          aperture: "f/5.6",
          shutter_speed: "1/160s",
          iso: "100",
          white_balance: "5500K daylight"
        },
        style_medium: "high-end product photography",
        context: "luxury brand catalog and e-commerce"
      }
    },
    jewelry: {
      structured_prompt: {
        short_description: "Elegant diamond ring on velvet surface with soft beauty lighting",
        objects: [
          {
            description: "Platinum diamond engagement ring with center stone",
            location: "center foreground on dark velvet fabric",
            relationship: "isolated jewelry piece on luxurious surface",
            relative_size: "small detailed object requiring macro photography",
            shape_and_color: "circular platinum band with brilliant cut diamond",
            texture: "highly polished metal with faceted gemstone surface",
            appearance_details: "premium jewelry with visible diamond facets and metalwork",
            number_of_objects: 1,
            pose: "laying on side showing ring profile and stone",
            lighting: {
              key_light: { type: "softbox", intensity: 1.0, direction: "front-top 45°" },
              fill_light: { type: "reflector", intensity: 0.4, direction: "front" },
              rim_light: { type: "point", intensity: 0.7, direction: "rear-top" }
            }
          }
        ],
        background_setting: "luxury jewelry photography studio with dark velvet backdrop",
        lighting: {
          conditions: "soft beauty lighting optimized for gemstone sparkle",
          direction: "key light front-top, fill front, rim rear-top",
          shadows: "very soft shadows to maintain elegance"
        },
        aesthetics: {
          composition: "centered ring with dramatic negative space",
          color_scheme: "dark rich background with bright product highlights",
          mood_atmosphere: "luxury jewelry photography with emphasis on sparkle"
        },
        photographic_characteristics: {
          lens: "105mm f/2.8 macro",
          aperture: "f/8.0",
          shutter_speed: "1/200s",
          iso: "50",
          white_balance: "5600K daylight"
        },
        style_medium: "luxury jewelry photography",
        context: "high-end jewelry catalog and marketing"
      }
    },
    cosmetics: {
      structured_prompt: {
        short_description: "Premium cosmetics product on white background with soft lighting",
        objects: [
          {
            description: "Luxury lipstick tube with gold case",
            location: "center foreground on white acrylic surface",
            relationship: "isolated beauty product on clean background",
            relative_size: "small to medium product requiring detail focus",
            shape_and_color: "cylindrical gold case with visible product name",
            texture: "metallic finish with subtle texture, smooth plastic components",
            appearance_details: "premium cosmetics packaging with brand details visible",
            number_of_objects: 1,
            pose: "upright position showing full product",
            lighting: {
              key_light: { type: "softbox", intensity: 1.1, direction: "front-left 30°" },
              fill_light: { type: "softbox", intensity: 0.7, direction: "front-right" },
              rim_light: { type: "hairlight", intensity: 0.5, direction: "rear" }
            }
          }
        ],
        background_setting: "clean beauty photography studio with white seamless backdrop",
        lighting: {
          conditions: "soft even lighting for beauty products",
          direction: "key light front-left, fill right, rim rear",
          shadows: "minimal soft shadows for clean look"
        },
        aesthetics: {
          composition: "centered product with ample white space",
          color_scheme: "bright white background with product as focal point",
          mood_atmosphere: "clean modern beauty product photography"
        },
        photographic_characteristics: {
          lens: "85mm f/2.8",
          aperture: "f/5.6",
          shutter_speed: "1/125s",
          iso: "100",
          white_balance: "5600K daylight"
        },
        style_medium: "beauty product photography",
        context: "cosmetics brand catalog and social media"
      }
    },
    electronics: {
      structured_prompt: {
        short_description: "Modern smartphone on reflective surface with studio lighting",
        objects: [
          {
            description: "Latest generation smartphone with glass back",
            location: "center foreground on reflective acrylic surface",
            relationship: "isolated tech product on modern surface",
            relative_size: "medium-sized rectangular device",
            shape_and_color: "rectangular phone with black glass back and metal frame",
            texture: "smooth glass surface with subtle reflections, polished metal edges",
            appearance_details: "premium smartphone with visible screen and camera array",
            number_of_objects: 1,
            pose: "laying flat showing front screen and back design",
            lighting: {
              key_light: { type: "directional", intensity: 1.3, direction: "top-left 45°" },
              fill_light: { type: "softbox", intensity: 0.6, direction: "front-right" },
              rim_light: { type: "hairlight", intensity: 0.8, direction: "rear-right" }
            }
          }
        ],
        background_setting: "modern tech photography studio with neutral gray backdrop",
        lighting: {
          conditions: "clean studio lighting with controlled reflections",
          direction: "key light top-left, fill right, rim rear-right",
          shadows: "defined but clean shadows"
        },
        aesthetics: {
          composition: "centered device with modern negative space",
          color_scheme: "neutral background with product as focus",
          mood_atmosphere: "sleek modern tech product photography"
        },
        photographic_characteristics: {
          lens: "90mm f/2.8",
          aperture: "f/6.3",
          shutter_speed: "1/160s",
          iso: "100",
          white_balance: "5600K daylight"
        },
        style_medium: "tech product photography",
        context: "electronics e-commerce and marketing"
      }
    },
    fashion: {
      structured_prompt: {
        short_description: "Designer handbag on marble surface with elegant lighting",
        objects: [
          {
            description: "Luxury leather handbag with gold hardware",
            location: "center foreground on white marble surface",
            relationship: "isolated fashion accessory on premium surface",
            relative_size: "large fashion item with visible details",
            shape_and_color: "structured handbag in tan leather with gold accents",
            texture: "premium leather with visible grain, polished metal hardware",
            appearance_details: "designer handbag with visible stitching and brand details",
            number_of_objects: 1,
            pose: "positioned to show front design and handle",
            lighting: {
              key_light: { type: "directional", intensity: 1.2, direction: "front-left 50°" },
              fill_light: { type: "softbox", intensity: 0.6, direction: "front-right" },
              rim_light: { type: "hairlight", intensity: 0.7, direction: "rear-left" }
            }
          }
        ],
        background_setting: "luxury fashion photography studio with white marble backdrop",
        lighting: {
          conditions: "elegant lighting setup for fashion accessories",
          direction: "key light front-left, fill right, rim rear-left",
          shadows: "soft elegant shadows"
        },
        aesthetics: {
          composition: "centered accessory with premium negative space",
          color_scheme: "bright white marble with warm product tones",
          mood_atmosphere: "luxury fashion accessory photography"
        },
        photographic_characteristics: {
          lens: "85mm f/2.8",
          aperture: "f/5.6",
          shutter_speed: "1/125s",
          iso: "100",
          white_balance: "5600K daylight"
        },
        style_medium: "luxury fashion photography",
        context: "high-end fashion brand catalog"
      }
    }
  }
};

// ============================================================================
// 2. ADS GENERATION API MOCK
// ============================================================================

export interface AdsGenerationRequest {
  product_name: string;
  campaign_type: 'social' | 'display' | 'video';
  formats: string[];
  aspect_ratios: string[];
  copy_variations: number;
}

export const mockAdsGeneration = async (request: AdsGenerationRequest): Promise<ProLightAPIResponse> => {
  const mockResults = {
    social: [
      { url: "https://mock.prolight.ai/ads/facebook-hero.jpg", format: "facebook_1200x628", cta: "Shop Now" },
      { url: "https://mock.prolight.ai/ads/instagram-square.jpg", format: "instagram_1080x1080", cta: "Discover" }
    ],
    display: [
      { url: "https://mock.prolight.ai/ads/banner_728x90.jpg", format: "leaderboard_728x90" },
      { url: "https://mock.prolight.ai/ads/banner_300x250.jpg", format: "medium_rectangle_300x250" }
    ],
    video: [
      { url: "https://mock.prolight.ai/ads/video_15s.mp4", duration: 15, format: "instagram_reels" }
    ]
  };

  return {
    success: true,
    data: mockResults[request.campaign_type],
    request_id: `ads_${Date.now()}`,
    status: 'completed',
    mock: true,
    timing: 2450
  };
};

// ============================================================================
// 3. IMAGE ONBOARDING API MOCK
// ============================================================================

export interface ImageOnboardingRequest {
  images: string[]; // URLs or base64
  metadata?: {
    product_id: string;
    category: string;
    tags: string[];
  };
}

export const mockImageOnboarding = async (request: ImageOnboardingRequest): Promise<ProLightAPIResponse> => {
  return {
    success: true,
    data: {
      processed: request.images.length,
      asset_library_ids: request.images.map((_, i) => `asset_${Date.now()}_${i}`),
      quality_scores: request.images.map(() => Math.random() * 0.3 + 0.7), // 0.7-1.0
      enhancements_applied: ['auto_enhance', 'background_clean', 'crop_optimize']
    },
    request_id: `onboard_${Date.now()}`,
    status: 'completed',
    mock: true,
    timing: 1800
  };
};

// ============================================================================
// 4. VIDEO EDITING API MOCK
// ============================================================================

export interface VideoEditingRequest {
  video_url: string;
  edits: Array<{
    type: 'trim' | 'enhance' | 'add_logo' | 'speed_change' | 'crop';
    params: Record<string, unknown>;
  }>;
  output_format: 'mp4' | 'mov' | 'webm';
}

export const mockVideoEditing = async (request: VideoEditingRequest): Promise<ProLightAPIResponse> => {
  return {
    success: true,
    data: {
      output_url: `https://mock.prolight.ai/video/edited_${Date.now()}.mp4`,
      duration: 15,
      resolution: "1080x1920",
      edits_applied: request.edits.map(edit => edit.type),
      file_size: "12.4MB"
    },
    request_id: `video_${Date.now()}`,
    status: 'completed',
    mock: true,
    timing: 8920
  };
};

// ============================================================================
// 5. TAILORED GENERATION API MOCK (FIBO Fine-tuned)
// ============================================================================

export interface TailoredGenerationRequest {
  model_id: string; // "prolight-product-v1", "studio-lighting-v2"
  structured_prompt: Record<string, unknown>;
  num_variations?: number;
}

export const mockTailoredGeneration = async (request: TailoredGenerationRequest): Promise<ProLightAPIResponse> => {
  return {
    success: true,
    data: {
      images: Array.from({ length: request.num_variations || 4 }, (_, i) => ({
        url: `https://mock.prolight.ai/tailored/${request.model_id}_${Date.now()}_${i}.png`,
        seed: Math.floor(Math.random() * 1000000),
        model_used: request.model_id,
        confidence: 0.92 + Math.random() * 0.08
      })),
      structured_prompt_used: request.structured_prompt
    },
    request_id: `tailored_${Date.now()}`,
    status: 'completed',
    mock: true,
    timing: 5670
  };
};

// ============================================================================
// 6. PRODUCT SHOT EDITING API MOCK
// ============================================================================

export interface ProductShotEditingRequest {
  image_url: string;
  lighting_setup?: string;
  background?: string;
  crop?: { x: number; y: number; width: number; height: number };
}

export const mockProductShotEditing = async (request: ProductShotEditingRequest): Promise<ProLightAPIResponse> => {
  return {
    success: true,
    data: {
      before: request.image_url,
      after: `https://mock.prolight.ai/product-shot/edited_${Date.now()}.png`,
      edits_applied: [
        ...(request.lighting_setup ? ['relight'] : []),
        ...(request.background ? ['background_replace'] : []),
        ...(request.crop ? ['smart_crop'] : [])
      ],
      quality_improvement: "+24%",
      file_optimized: true
    },
    request_id: `product_edit_${Date.now()}`,
    status: 'completed',
    mock: true,
    timing: 2340
  };
};

// ============================================================================
// 7. IMAGE GENERATION (FIBO) MOCK
// ============================================================================

export interface ImageGenerationRequest {
  prompt: string;
  structured_prompt?: Record<string, unknown>;
  aspect_ratio?: string;
  seed?: number;
}

export const mockImageGeneration = async (request: ImageGenerationRequest): Promise<ProLightAPIResponse> => {
  return {
    success: true,
    data: {
      images: [{
        url: `https://mock.prolight.ai/fibo/gen_${Date.now()}.png`,
        width: 1024,
        height: 1024,
        seed: request.seed || Math.floor(Math.random() * 1000000)
      }],
      structured_prompt: request.structured_prompt || {
        short_description: request.prompt,
        lighting: { conditions: "professional studio lighting" }
      }
    },
    request_id: `gen_${Date.now()}`,
    status: 'completed',
    mock: true,
    timing: 3890
  };
};

// ============================================================================
// 8. IMAGE EDITING (Bria Edit APIs) MOCK
// ============================================================================

export interface ImageEditingRequest {
  image_url: string;
  operation: 'remove_bg' | 'gen_fill' | 'expand' | 'enhance';
  params?: Record<string, unknown>;
}

export const mockImageEditing = async (request: ImageEditingRequest): Promise<ProLightAPIResponse> => {
  return {
    success: true,
    data: {
      input: request.image_url,
      output: `https://mock.prolight.ai/edit/${request.operation}_${Date.now()}.png`,
      operation_details: request.operation,
      params_used: request.params
    },
    request_id: `edit_${Date.now()}`,
    status: 'completed',
    mock: true,
    timing: 2100
  };
};

// ============================================================================
// 9. STATUS SERVICE MOCK
// ============================================================================

export const mockStatusService = async (request_id: string): Promise<ProLightAPIResponse> => {
  const statuses = ['pending', 'processing', 'completed'] as const;
  const status = statuses[Math.floor(Math.random() * statuses.length)] as any;
  
  return {
    success: true,
    data: { status, progress: Math.random() * 100 },
    request_id,
    status,
    mock: true,
    timing: 120
  };
};

// ============================================================================
// 10. AGENTIC WORKFLOW ORCHESTRATOR
// ============================================================================

export class ProLightAgenticWorkflow {
  private mockDelay(min: number, max: number) {
    return new Promise(resolve => 
      setTimeout(resolve, Math.random() * (max - min) + min)
    );
  }

  async completeProductCampaign(productDescription: string) {
    console.log(`🎬 Starting agentic workflow for: ${productDescription}`);
    
    const workflowSteps = [
      // 1. Generate hero shots
      () => mockTailoredGeneration({
        model_id: "prolight-product-v1",
        structured_prompt: FIBO_MOCK_DATA.productShots.lamp.structured_prompt,
        num_variations: 6
      }),
      
      // 2. Onboard to asset library
      (heroResults: ProLightAPIResponse) => mockImageOnboarding({
        images: (heroResults.data as { images: Array<{ url: string }> }).images.map((i) => i.url),
        metadata: { product_id: `prod_${Date.now()}`, category: "lighting", tags: ["hero", "studio"] }
      }),
      
      // 3. Generate ad variants
      () => mockAdsGeneration({
        product_name: productDescription,
        campaign_type: 'social',
        formats: ['facebook', 'instagram'],
        aspect_ratios: ['1:1', '4:5'],
        copy_variations: 4
      }),
      
      // 4. Edit product shots
      (heroResults: ProLightAPIResponse) => mockProductShotEditing({
        image_url: (heroResults.data as { images: Array<{ url: string }> }).images[0].url,
        lighting_setup: "3-point studio",
        background: "white seamless"
      })
    ];

    const results: ProLightAPIResponse[] = [];
    
    for (const step of workflowSteps) {
      const result = await step(results[results.length - 1]);
      results.push(result);
      await this.mockDelay(500, 1500);
    }

    return {
      success: true,
      workflow: 'complete_product_campaign',
      steps_completed: results.length,
      final_assets: results.flatMap(r => r.data),
      total_time: 12500
    };
  }
}

// ============================================================================
// 11. USAGE EXAMPLES
// ============================================================================

/*
const prolight = new ProLightAgenticWorkflow();

// Single API calls
mockImageGeneration({ prompt: "studio lamp" });
mockAdsGeneration({ product_name: "LED Lamp", campaign_type: 'social' });

// Complete workflow
const campaign = await prolight.completeProductCampaign("Modern LED Table Lamp");
console.log("Campaign ready:", campaign);

// Status polling
setInterval(async () => {
  const status = await mockStatusService("req_123");
  console.log("Status:", status);
}, 2000);
*/

// ============================================================================
// 12. REACT INTEGRATION READY
// ============================================================================

export const ProLightMockProvider = {
  adsGeneration: mockAdsGeneration,
  imageOnboarding: mockImageOnboarding,
  videoEditing: mockVideoEditing,
  tailoredGeneration: mockTailoredGeneration,
  productShotEditing: mockProductShotEditing,
  imageGeneration: mockImageGeneration,
  imageEditing: mockImageEditing,
  statusService: mockStatusService,
  agenticWorkflow: new ProLightAgenticWorkflow()
};

export default ProLightMockProvider;
