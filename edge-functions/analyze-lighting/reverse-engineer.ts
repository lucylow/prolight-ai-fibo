import type { FIBOLighting } from "../natural-language-lighting/schema";

// This module is intended for internal reuse if you want to run reverse
// engineering logic separately from the HTTP handler. Right now it wraps the
// same mocks/logic as the main handler but can be extended with a dedicated
// CLIP / ViT pipeline later.

export interface ReverseEngineerResult {
  lighting: FIBOLighting;
  confidence: Record<string, number>;
  estimated_params: {
    fov: number;
    aperture: string;
  };
}

export async function reverseEngineerFromImage(
  image: { image_b64?: string; image_url?: string },
): Promise<ReverseEngineerResult> {
  // For now, just delegate to the HTTP handler's mock assumptions by importing
  // via dynamic require if you later split environments. This keeps the API
  // surface ready for upgrade.
  const { default: mock } = await import("./index");
  // This is a small hack: call the handler with a fake Request in DEV
  // if you want to use it programmatically.
  if (typeof Request !== "undefined") {
    const res = await mock(
      new Request("http://localhost/analyze-lighting", {
        method: "POST",
        body: JSON.stringify(image),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const json = await res.json();
    return json as ReverseEngineerResult;
  }

  throw new Error("reverseEngineerFromImage is only supported in edge runtime");
}


