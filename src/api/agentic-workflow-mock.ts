/**
 * Mock API service for agentic workflow demo.
 * Returns mock plan data and sample outputs for demonstration purposes.
 */

export type PlanStep = {
  id: string;
  name: string;
  tool: string;
  params: Record<string, unknown>;
};

export type MockPlan = {
  request_id: string;
  goal: string;
  planner: {
    agent_version: string;
    plan: PlanStep[];
  };
  tools: Record<string, { description: string }>;
  sample_outputs: Array<{
    id: string;
    url: string;
    seed: number;
    model: string;
    score: number;
  }>;
};

/**
 * Get mock agentic workflow plan data
 */
export async function getMockAgenticWorkflowPlan(): Promise<MockPlan> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  const mockPlan: MockPlan = {
    request_id: 'mock_run_001',
    goal: 'Create 6 catalog hero shots with 4 lighting setups and 3 backgrounds',
    planner: {
      agent_version: 'planner-v0.1',
      plan: [
        {
          id: 'p1',
          name: 'Design prompts',
          tool: 'prompt_designer',
          params: { variations: 6 },
        },
        {
          id: 'p2',
          name: 'Generate base images',
          tool: 'fibo_generate',
          params: { model: 'prolight-product-v1', count: 6 },
        },
        {
          id: 'p3',
          name: 'Rate results',
          tool: 'quality_evaluator',
          params: { metric: 'clip_similarity' },
        },
        {
          id: 'p4',
          name: 'Pick best',
          tool: 'selector',
          params: { top_k: 5 },
        },
        {
          id: 'p5',
          name: 'Edit (relight / crop)',
          tool: 'product_shot_edit',
          params: { operations: ['relight', 'crop'] },
        },
        {
          id: 'p6',
          name: 'Generate ad variants',
          tool: 'ads_generate',
          params: { variants: 12 },
        },
        {
          id: 'p7',
          name: 'Publish assets',
          tool: 'asset_store',
          params: { pub: true },
        },
      ],
    },
    tools: {
      prompt_designer: {
        description: 'Generates structured FIBO JSON prompts from high-level goals',
      },
      fibo_generate: {
        description: 'FIBO model text-to-image (mocked)',
      },
      quality_evaluator: {
        description: 'CLIP/LPIPS style evaluator (mocked)',
      },
      selector: {
        description: 'Simple sorter by score',
      },
      product_shot_edit: {
        description: 'Relight / BG replace / crop',
      },
      ads_generate: {
        description: 'Create ad variants',
      },
      asset_store: {
        description: 'Save to asset library',
      },
    },
    sample_outputs: [
      {
        id: 'img_001',
        url: 'https://placehold.co/512x512?text=hero-1',
        seed: 12345,
        model: 'prolight-product-v1',
        score: 0.88,
      },
      {
        id: 'img_002',
        url: 'https://placehold.co/512x512?text=hero-2',
        seed: 22345,
        model: 'prolight-product-v1',
        score: 0.81,
      },
      {
        id: 'img_003',
        url: 'https://placehold.co/512x512?text=hero-3',
        seed: 32345,
        model: 'prolight-product-v1',
        score: 0.85,
      },
    ],
  };

  return mockPlan;
}

