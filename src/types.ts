export interface FIBO {
  generation_id: string;
  model_version: "FIBO-v2.3";
  seed: number;
  camera: { fov: number; aperture: number; focus_distance_m: number };
  lighting: {
    key_light: { intensity: number; color_temperature: number; position: [number, number, number]; softness: number };
    fill_light: { intensity: number; color_temperature: number; position: [number, number, number]; softness: number };
    rim_light: { intensity: number; color_temperature: number; position: [number, number, number]; softness: number };
  };
  render: { resolution: [number, number]; bit_depth: 8 | 16 };
}

export interface AgentIteration {
  id: string; 
  fibo: FIBO; 
  instruction: string; 
  score: number; 
  iteration: number;
}

export interface ProSession {
  client_name: string;
  shoot_type: "wedding" | "product" | "portrait" | "ecommerce";
  images_culled: number;
  target_look: string;
  batch_size: number;
  iterations: AgentIteration[];
  final_json: FIBO;
  delivery_ready: boolean;
  time_saved_hours: number;
}

