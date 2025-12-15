/**
 * ProLight AI - Live Generation Experience
 * Features:
 * - Deterministic FIBO generation with seed control
 * - "Generate" → "Click Again = Identical Output"
 * - Real-time lighting preview
 * - Text-to-Image + Lighting-to-Image workflows
 * - Live demo interactive UI
 * - Professional studio presets
 */

import React, { useState, useCallback } from 'react';
import { create } from 'zustand';

// ============================================================================
// 1. STATE MANAGEMENT - Zustand Store
// ============================================================================

interface LightingState {
  keyLight: { intensity: number; kelvin: number; x: number; y: number; z: number };
  fillLight: { intensity: number; kelvin: number; x: number; y: number; z: number };
  rimLight: { intensity: number; kelvin: number; x: number; y: number; z: number };
  background: string;
  mood: string;
  seed: number | null;
  currentSeed: number; // Locked seed for reproduction
}

interface GenerationSession {
  id: string;
  timestamp: number;
  seed: number;
  lighting: LightingState;
  prompt: string;
  imageUrl: string;
  generationTime: number;
  isReproduction: boolean;
}

interface ProLightStore {
  // Current generation state
  lighting: LightingState;
  isGenerating: boolean;
  currentImageUrl: string | null;
  lastGenerationSeed: number | null;
  lastLightingState: LightingState | null;

  // Session history
  sessions: GenerationSession[];
  currentSessionId: string | null;

  // UI state
  textPrompt: string;
  selectedPreset: string;

  // Actions
  updateLighting: (partial: Partial<LightingState>) => void;
  setTextPrompt: (prompt: string) => void;
  setPreset: (preset: string) => void;
  startGeneration: (isReproduction: boolean) => void;
  completeGeneration: (
    imageUrl: string,
    seed: number,
    generationTime: number,
    isReproduction: boolean
  ) => void;
  lockSeed: (seed: number) => void;
  createSession: () => string;
  getSession: (id: string) => GenerationSession | undefined;
}

const useProlightStore = create<ProLightStore>((set, get) => ({
  lighting: {
    keyLight: { intensity: 1.2, kelvin: 5600, x: 45, y: -20, z: 1.1 },
    fillLight: { intensity: 0.6, kelvin: 5600, x: -30, y: -15, z: 1.0 },
    rimLight: { intensity: 0.8, kelvin: 3200, x: 0, y: 160, z: -0.8 },
    background: 'white',
    mood: 'professional',
    seed: null,
    currentSeed: Math.floor(Math.random() * 1000000),
  },
  isGenerating: false,
  currentImageUrl: null,
  lastGenerationSeed: null,
  lastLightingState: null,
  sessions: [],
  currentSessionId: null,
  textPrompt: 'Modern LED table lamp in professional studio',
  selectedPreset: 'studio_3point',

  updateLighting: (partial) =>
    set((state) => ({
      lighting: { ...state.lighting, ...partial },
    })),

  setTextPrompt: (prompt) => set({ textPrompt: prompt }),

  setPreset: (preset) => {
    const presets = LIGHTING_PRESETS[preset];
    if (presets) {
      set((state) => ({
        lighting: { ...state.lighting, ...presets },
        selectedPreset: preset,
      }));
    }
  },

  startGeneration: (isReproduction) =>
    set({ isGenerating: true }),

  completeGeneration: (imageUrl, seed, generationTime, isReproduction) =>
    set((state) => ({
      isGenerating: false,
      currentImageUrl: imageUrl,
      lastGenerationSeed: seed,
      lastLightingState: state.lighting,
      sessions: [
        ...state.sessions,
        {
          id: state.currentSessionId || `session_${Date.now()}`,
          timestamp: Date.now(),
          seed,
          lighting: state.lighting,
          prompt: state.textPrompt,
          imageUrl,
          generationTime,
          isReproduction,
        },
      ],
    })),

  lockSeed: (seed) =>
    set((state) => ({
      lighting: { ...state.lighting, currentSeed: seed },
      lastGenerationSeed: seed,
    })),

  createSession: () => {
    const sessionId = `session_${Date.now()}`;
    set({ currentSessionId: sessionId });
    return sessionId;
  },

  getSession: (id) => {
    const state = get();
    return state.sessions.find((s) => s.id === id);
  },
}));

// ============================================================================
// 2. PROFESSIONAL LIGHTING PRESETS
// ============================================================================

const LIGHTING_PRESETS: Record<string, Partial<LightingState>> = {
  studio_3point: {
    keyLight: { intensity: 1.2, kelvin: 5600, x: 45, y: -20, z: 1.1 },
    fillLight: { intensity: 0.6, kelvin: 5600, x: -30, y: -15, z: 1.0 },
    rimLight: { intensity: 0.8, kelvin: 3200, x: 0, y: 160, z: -0.8 },
    mood: 'professional',
  },
  soft_window: {
    keyLight: { intensity: 0.9, kelvin: 6500, x: -45, y: -10, z: 0.8 },
    fillLight: { intensity: 0.4, kelvin: 6000, x: 20, y: 0, z: 1.2 },
    rimLight: { intensity: 0.3, kelvin: 4000, x: 90, y: 5, z: -0.5 },
    mood: 'soft',
  },
  dramatic_rim: {
    keyLight: { intensity: 0.7, kelvin: 3200, x: 60, y: -30, z: 0.9 },
    fillLight: { intensity: 0.2, kelvin: 5600, x: -20, y: 0, z: 1.5 },
    rimLight: { intensity: 1.4, kelvin: 2700, x: -90, y: 45, z: -1.0 },
    mood: 'dramatic',
  },
  product_flat: {
    keyLight: { intensity: 1.0, kelvin: 5600, x: 0, y: -30, z: 1.5 },
    fillLight: { intensity: 0.8, kelvin: 5600, x: 0, y: 30, z: 1.5 },
    rimLight: { intensity: 0.4, kelvin: 6500, x: 0, y: 180, z: -0.5 },
    mood: 'neutral',
  },
  warm_cozy: {
    keyLight: { intensity: 1.0, kelvin: 3200, x: 30, y: -25, z: 1.0 },
    fillLight: { intensity: 0.5, kelvin: 2700, x: -40, y: -10, z: 1.2 },
    rimLight: { intensity: 0.6, kelvin: 2000, x: 0, y: 150, z: -0.7 },
    mood: 'warm',
  },
};

// ============================================================================
// 3. FIBO STRUCTURED PROMPT BUILDER
// ============================================================================

interface FIBOStructuredPrompt {
  short_description: string;
  objects: Array<{
    description: string;
    location: string;
    texture: string;
    color: string;
  }>;
  lighting: {
    key_light: { intensity: number; color_temperature: number; direction: string };
    fill_light: { intensity: number; color_temperature: number; direction: string };
    rim_light: { intensity: number; color_temperature: number; direction: string };
    overall_brightness: number;
    shadow_softness: string;
  };
  environment: {
    background_type: string;
    background_color: string;
    atmosphere: string;
  };
  camera: {
    lens_mm: number;
    aperture: number;
    iso: number;
    white_balance_k: number;
  };
  composition: {
    framing: string;
    depth_of_field: string;
    focus_point: string;
  };
  photographic_style: string;
  quality: string;
}

function buildFIBOPrompt(
  textPrompt: string,
  lighting: LightingState
): FIBOStructuredPrompt {
  const kelvinToDirection = (x: number, y: number, z: number): string => {
    if (x > 30) return 'front-left 45°';
    if (x < -30) return 'front-right 45°';
    if (y > 100) return 'back-overhead';
    if (y < -100) return 'front-overhead';
    return 'center';
  };

  return {
    short_description: textPrompt,
    objects: [
      {
        description: 'Main product subject',
        location: 'center-foreground',
        texture: 'product material with professional finish',
        color: 'product-dependent',
      },
    ],
    lighting: {
      key_light: {
        intensity: lighting.keyLight.intensity,
        color_temperature: lighting.keyLight.kelvin,
        direction: kelvinToDirection(
          lighting.keyLight.x,
          lighting.keyLight.y,
          lighting.keyLight.z
        ),
      },
      fill_light: {
        intensity: lighting.fillLight.intensity,
        color_temperature: lighting.fillLight.kelvin,
        direction: kelvinToDirection(
          lighting.fillLight.x,
          lighting.fillLight.y,
          lighting.fillLight.z
        ),
      },
      rim_light: {
        intensity: lighting.rimLight.intensity,
        color_temperature: lighting.rimLight.kelvin,
        direction: kelvinToDirection(
          lighting.rimLight.x,
          lighting.rimLight.y,
          lighting.rimLight.z
        ),
      },
      overall_brightness: (lighting.keyLight.intensity + lighting.fillLight.intensity) / 2,
      shadow_softness: 'soft smooth shadows with clean edges',
    },
    environment: {
      background_type: 'seamless backdrop',
      background_color: lighting.background === 'white' ? 'pure white' : lighting.background,
      atmosphere: 'professional studio clean',
    },
    camera: {
      lens_mm: 85,
      aperture: 2.8,
      iso: 100,
      white_balance_k: 5600,
    },
    composition: {
      framing: 'centered product shot',
      depth_of_field: 'shallow depth of field product focus',
      focus_point: 'product center sharp',
    },
    photographic_style: 'professional commercial product photography',
    quality: 'premium high-resolution',
  };
}

// ============================================================================
// 4. MOCK GENERATION WITH DETERMINISTIC SEEDING
// ============================================================================

interface GenerationResult {
  imageUrl: string;
  seed: number;
  generationTime: number;
  structuredPrompt: FIBOStructuredPrompt;
}

async function generateImage(
  textPrompt: string,
  lighting: LightingState,
  seed?: number
): Promise<GenerationResult> {
  const startTime = performance.now();

  // Use provided seed or generate new one
  const generationSeed = seed ?? Math.floor(Math.random() * 1000000);

  // Build FIBO structured prompt
  const structuredPrompt = buildFIBOPrompt(textPrompt, lighting);

  // Simulate generation delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Generate mock image URL with seed for reproducibility
  const mockImageUrl = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='512' height='512'%3E%3Crect fill='%23${Math.floor(
    (generationSeed * 0.618) % 16777215
  )
    .toString(16)
    .padStart(6, '0')}' width='512' height='512'/%3E%3Ctext x='50%' y='50%' text-anchor='middle' dy='.3em' fill='white' font-size='24'%3ESeed: ${generationSeed}%3C/text%3E%3C/svg%3E`;

  const generationTime = performance.now() - startTime;

  return {
    imageUrl: mockImageUrl,
    seed: generationSeed,
    generationTime,
    structuredPrompt,
  };
}

// ============================================================================
// 5. LIVE GENERATION PANEL COMPONENT
// ============================================================================

const ProLightLiveGenerationPanel: React.FC = () => {
  const store = useProlightStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastUsedSeed, setLastUsedSeed] = useState<number | null>(null);
  const [reproductionMode, setReproductionMode] = useState(false);

  const handleGenerate = useCallback(async (useLastSeed: boolean = false) => {
    setIsGenerating(true);
    store.startGeneration(useLastSeed);

    try {
      const seedToUse = useLastSeed ? lastUsedSeed : undefined;

      const result = await generateImage(
        store.textPrompt,
        store.lighting,
        seedToUse
      );

      store.completeGeneration(
        result.imageUrl,
        result.seed,
        result.generationTime,
        useLastSeed
      );

      setLastUsedSeed(result.seed);
      setReproductionMode(false);
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [store, lastUsedSeed]);

  const handleReproducibleClick = () => {
    if (lastUsedSeed === null) {
      // First generation
      handleGenerate(false);
      setReproductionMode(true);
    } else {
      // Reproduction with same seed
      setReproductionMode(true);
      handleGenerate(true);
    }
  };

  return (
    <div style={styles.panelContainer}>
      <div style={styles.header}>
        <h1>🎬 ProLight AI - Live Generation</h1>
        <p>Deterministic Professional Lighting Simulation</p>
      </div>

      <div style={styles.mainGrid}>
        {/* Left: Controls */}
        <div style={styles.controlsPanel}>
          <section style={styles.section}>
            <h2>Text Prompt</h2>
            <textarea
              value={store.textPrompt}
              onChange={(e) => store.setTextPrompt(e.target.value)}
              style={styles.textarea}
              placeholder="Describe your product or scene..."
            />
          </section>

          <section style={styles.section}>
            <h2>Studio Preset</h2>
            <div style={styles.presetGrid}>
              {Object.keys(LIGHTING_PRESETS).map((key) => (
                <button
                  key={key}
                  onClick={() => store.setPreset(key)}
                  style={{
                    ...styles.presetButton,
                    ...(store.selectedPreset === key ? styles.presetButtonActive : {}),
                  }}
                >
                  {key.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </section>

          <section style={styles.section}>
            <h2>Key Light</h2>
            <ControlSlider
              label="Intensity"
              value={store.lighting.keyLight.intensity}
              min={0}
              max={2}
              step={0.1}
              onChange={(val) =>
                store.updateLighting({ keyLight: { ...store.lighting.keyLight, intensity: val } })
              }
            />
            <ControlSlider
              label="Kelvin (Color Temp)"
              value={store.lighting.keyLight.kelvin}
              min={2000}
              max={10000}
              step={100}
              onChange={(val) =>
                store.updateLighting({ keyLight: { ...store.lighting.keyLight, kelvin: val } })
              }
            />
            <ControlSlider
              label="X Angle"
              value={store.lighting.keyLight.x}
              min={-180}
              max={180}
              step={5}
              onChange={(val) =>
                store.updateLighting({ keyLight: { ...store.lighting.keyLight, x: val } })
              }
            />
          </section>

          <section style={styles.section}>
            <h2>Fill Light</h2>
            <ControlSlider
              label="Intensity"
              value={store.lighting.fillLight.intensity}
              min={0}
              max={2}
              step={0.1}
              onChange={(val) =>
                store.updateLighting({ fillLight: { ...store.lighting.fillLight, intensity: val } })
              }
            />
            <ControlSlider
              label="Kelvin"
              value={store.lighting.fillLight.kelvin}
              min={2000}
              max={10000}
              step={100}
              onChange={(val) =>
                store.updateLighting({ fillLight: { ...store.lighting.fillLight, kelvin: val } })
              }
            />
          </section>

          <section style={styles.section}>
            <h2>Rim Light</h2>
            <ControlSlider
              label="Intensity"
              value={store.lighting.rimLight.intensity}
              min={0}
              max={2}
              step={0.1}
              onChange={(val) =>
                store.updateLighting({ rimLight: { ...store.lighting.rimLight, intensity: val } })
              }
            />
            <ControlSlider
              label="Kelvin"
              value={store.lighting.rimLight.kelvin}
              min={2000}
              max={10000}
              step={100}
              onChange={(val) =>
                store.updateLighting({ rimLight: { ...store.lighting.rimLight, kelvin: val } })
              }
            />
          </section>

          <section style={styles.section}>
            <h2>Background</h2>
            <select
              value={store.lighting.background}
              onChange={(e) => store.updateLighting({ background: e.target.value })}
              style={styles.select}
            >
              <option value="white">White Seamless</option>
              <option value="gray">Gray Studio</option>
              <option value="black">Black</option>
              <option value="gradient">Gradient</option>
            </select>
          </section>
        </div>

        {/* Middle: Generation & Display */}
        <div style={styles.generationPanel}>
          <section style={styles.imageDisplaySection}>
            <h2>Generated Image</h2>
            <div style={styles.imageContainer}>
              {store.currentImageUrl ? (
                <img src={store.currentImageUrl} alt="Generated" style={styles.generatedImage} />
              ) : (
                <div style={styles.imagePlaceholder}>
                  Generate an image to see results
                </div>
              )}
            </div>
          </section>

          <section style={styles.buttonSection}>
            <button
              onClick={() => handleGenerate(false)}
              disabled={isGenerating}
              style={{
                ...styles.generateButton,
                ...(isGenerating ? styles.buttonDisabled : {}),
              }}
            >
              {isGenerating ? 'Generating...' : '🎬 Generate New'}
            </button>

            {lastUsedSeed !== null && (
              <button
                onClick={handleReproducibleClick}
                disabled={isGenerating}
                style={{
                  ...styles.reproduceButton,
                  ...(isGenerating ? styles.buttonDisabled : {}),
                }}
              >
                {reproductionMode ? '✓ Identical Output' : '🔁 Click Again = Identical'}
              </button>
            )}

            {lastUsedSeed !== null && (
              <div style={styles.seedInfo}>
                <strong>Locked Seed:</strong> {lastUsedSeed}
                <br />
                <em>Click "Identical Output" to regenerate exact same image</em>
              </div>
            )}
          </section>

          <section style={styles.metricsSection}>
            {store.currentImageUrl && (
              <>
                <h3>Generation Metrics</h3>
                <div style={styles.metricsGrid}>
                  <div>
                    <strong>Seed:</strong> {store.lastGenerationSeed}
                  </div>
                  <div>
                    <strong>Generation Time:</strong>{' '}
                    {store.sessions[store.sessions.length - 1]?.generationTime.toFixed(2) || '—'} ms
                  </div>
                  <div>
                    <strong>Prompt:</strong> {store.textPrompt.substring(0, 50)}...
                  </div>
                </div>
              </>
            )}
          </section>
        </div>

        {/* Right: Session History & JSON Preview */}
        <div style={styles.rightPanel}>
          <section style={styles.section}>
            <h2>Generation History</h2>
            <div style={styles.historyList}>
              {store.sessions.slice(-5).reverse().map((session) => (
                <div
                  key={session.id}
                  style={{
                    ...styles.historyItem,
                    ...(session.isReproduction ? styles.reproductionHighlight : {}),
                  }}
                >
                  <div style={styles.historyTime}>
                    {new Date(session.timestamp).toLocaleTimeString()}
                  </div>
                  <div style={styles.historySeed}>Seed: {session.seed}</div>
                  {session.isReproduction && <div style={styles.reproductionBadge}>↺ Reproduction</div>}
                </div>
              ))}
            </div>
          </section>

          <section style={styles.section}>
            <h2>FIBO JSON Preview</h2>
            <details style={styles.details}>
              <summary style={styles.summary}>View Structured Prompt</summary>
              <pre style={styles.jsonPreview}>
                {JSON.stringify(
                  buildFIBOPrompt(store.textPrompt, store.lighting),
                  null,
                  2
                )}
              </pre>
            </details>
          </section>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 6. CONTROL SLIDER COMPONENT
// ============================================================================

const ControlSlider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}> = ({ label, value, min, max, step, onChange }) => (
  <div style={styles.controlRow}>
    <label style={styles.label}>
      {label}: <strong>{value.toFixed(1)}</strong>
    </label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={styles.slider}
    />
  </div>
);

// ============================================================================
// 7. STYLES
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  panelContainer: {
    backgroundColor: '#0a0e27',
    color: '#ffffff',
    minHeight: '100vh',
    padding: '20px',
    fontFamily: 'Inter, Helvetica, Arial, sans-serif',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
    borderBottom: '2px solid #667eea',
    paddingBottom: '20px',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '350px 1fr 320px',
    gap: '30px',
    maxWidth: '1600px',
    margin: '0 auto',
  },
  controlsPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  generationPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  section: {
    backgroundColor: '#1a1f3a',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #667eea',
  },
  imageDisplaySection: {
    backgroundColor: '#1a1f3a',
    borderRadius: '12px',
    padding: '20px',
    border: '2px solid #667eea',
    flex: 1,
  },
  imageContainer: {
    aspectRatio: '1',
    backgroundColor: '#0a0e27',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  generatedImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  imagePlaceholder: {
    color: '#667eea',
    fontSize: '14px',
    textAlign: 'center',
  },
  buttonSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  generateButton: {
    backgroundColor: '#667eea',
    color: 'white',
    padding: '16px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  reproduceButton: {
    backgroundColor: '#48bb78',
    color: 'white',
    padding: '16px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  seedInfo: {
    backgroundColor: '#2a2f4a',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '13px',
    border: '1px solid #48bb78',
  },
  metricsSection: {
    backgroundColor: '#1a1f3a',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #667eea',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '8px',
    fontSize: '12px',
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  presetButton: {
    backgroundColor: '#2a2f4a',
    color: '#999',
    border: '1px solid #667eea',
    borderRadius: '6px',
    padding: '8px',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  presetButtonActive: {
    backgroundColor: '#667eea',
    color: 'white',
    fontWeight: 'bold',
  },
  controlRow: {
    marginBottom: '12px',
  },
  label: {
    display: 'block',
    marginBottom: '4px',
    fontSize: '12px',
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    backgroundColor: '#2a2f4a',
    outline: 'none',
    cursor: 'pointer',
  },
  select: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#2a2f4a',
    color: 'white',
    border: '1px solid #667eea',
    borderRadius: '6px',
    fontSize: '13px',
  },
  textarea: {
    width: '100%',
    height: '80px',
    padding: '8px',
    backgroundColor: '#2a2f4a',
    color: 'white',
    border: '1px solid #667eea',
    borderRadius: '6px',
    fontSize: '12px',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '200px',
    overflowY: 'auto',
  },
  historyItem: {
    backgroundColor: '#2a2f4a',
    padding: '8px',
    borderRadius: '6px',
    fontSize: '11px',
    border: '1px solid #667eea',
  },
  reproductionHighlight: {
    backgroundColor: '#1a4d2e',
    borderColor: '#48bb78',
  },
  reproductionBadge: {
    display: 'inline-block',
    backgroundColor: '#48bb78',
    color: '#000',
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '10px',
    marginTop: '4px',
    fontWeight: 'bold',
  },
  historyTime: {
    color: '#999',
    fontSize: '10px',
  },
  historySeed: {
    color: '#667eea',
    fontWeight: 'bold',
  },
  details: {
    marginTop: '12px',
  },
  summary: {
    cursor: 'pointer',
    color: '#667eea',
    fontWeight: 'bold',
    fontSize: '12px',
    padding: '8px',
    backgroundColor: '#2a2f4a',
    borderRadius: '6px',
  },
  jsonPreview: {
    backgroundColor: '#0a0e27',
    color: '#48bb78',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '9px',
    maxHeight: '300px',
    overflowY: 'auto',
    marginTop: '8px',
    fontFamily: 'monospace',
  },
};

// ============================================================================
// 8. EXPORT
// ============================================================================

export default ProLightLiveGenerationPanel;
export { useProlightStore, LIGHTING_PRESETS, buildFIBOPrompt };

