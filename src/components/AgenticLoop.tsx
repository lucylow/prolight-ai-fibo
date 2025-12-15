/**
 * ProLight AI - AGENTIC FIBO ITERATION ENGINE
 * "Make it more dramatic" → LLM translates → Updates ONLY lighting JSON → 3D updates → Re-generate
 * Perfect for "Best JSON-Native or Agentic Workflow" category
 */

import React, { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import { useFIBOAgent } from '@/hooks/useFIBOAgent';
import type { FIBOPrompt, FIBOLighting, FIBOLight } from '@/types/fibo';
import { toast } from 'sonner';

// ============================================================================
// FIBO JSON + AGENT STATE
// ============================================================================

interface AgentFIBO extends Partial<FIBOPrompt> {
  generation_id: string;
  model_version: "FIBO-v2.3";
  seed: number;
  lighting: FIBOLighting;
}

interface AgentIteration {
  id: string;
  fibo: AgentFIBO;
  user_instruction: string;
  llm_critique: string;
  score: number; // 1-10 professional rating
  iteration: number;
}

// ============================================================================
// AGENTIC ITERATION ENGINE
// ============================================================================

const AgenticLoop: React.FC = () => {
  const { translateFeedback, isTranslating, error } = useFIBOAgent();
  const [iterations, setIterations] = useState<AgentIteration[]>([]);
  const [currentFIBO, setCurrentFIBO] = useState<AgentFIBO>({
    generation_id: "agentic_001",
    model_version: "FIBO-v2.3",
    seed: 123456,
    camera: {
      shot_type: 'medium shot',
      camera_angle: 'eye-level',
      fov: 50,
      lens_type: 'portrait',
      aperture: 'f/2.8',
      focus_distance_m: 2.0,
      pitch: 0,
      yaw: 0,
      roll: 0,
      seed: 123456,
    },
    lighting: {
      main_light: {
        direction: 'front-right',
        intensity: 1.2,
        colorTemperature: 5600,
        softness: 0.3,
        enabled: true,
        distance: 3.0,
      },
      fill_light: {
        direction: 'front-left',
        intensity: 0.6,
        colorTemperature: 5600,
        softness: 0.6,
        enabled: true,
        distance: 4.0,
      },
      rim_light: {
        direction: 'back',
        intensity: 0.8,
        colorTemperature: 4000,
        softness: 0.4,
        enabled: true,
        distance: 3.5,
      },
    },
  });
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [targetInstruction, setTargetInstruction] = useState("");

  const runAgentIteration = useCallback(async () => {
    if (!targetInstruction.trim()) {
      toast.error('Please enter an instruction');
      return;
    }

    setIsAgentRunning(true);
    
    try {
      // Step 1: LLM translates instruction → FIBO lighting diff
      const lightingDiff = await translateFeedback(currentFIBO as FIBOPrompt, targetInstruction);
      
      // Step 2: Apply minimal diff to current FIBO lighting
      const newLighting: FIBOLighting = {
        main_light: {
          ...currentFIBO.lighting.main_light,
          ...lightingDiff.main_light,
          ...lightingDiff.mainLight, // Backward compatibility
        } as FIBOLight,
        fill_light: lightingDiff.fill_light || lightingDiff.fillLight
          ? {
              ...currentFIBO.lighting.fill_light,
              ...lightingDiff.fill_light,
              ...lightingDiff.fillLight,
            } as FIBOLight
          : currentFIBO.lighting.fill_light,
        rim_light: lightingDiff.rim_light || lightingDiff.rimLight
          ? {
              ...currentFIBO.lighting.rim_light,
              ...lightingDiff.rim_light,
              ...lightingDiff.rimLight,
            } as FIBOLight
          : currentFIBO.lighting.rim_light,
        ambient_light: lightingDiff.ambient_light || lightingDiff.ambientLight
          ? {
              ...currentFIBO.lighting.ambient_light,
              ...lightingDiff.ambient_light,
              ...lightingDiff.ambientLight,
            }
          : currentFIBO.lighting.ambient_light,
      };

      const newFIBO: AgentFIBO = {
        ...currentFIBO,
        lighting: newLighting,
        generation_id: `agentic_${Date.now()}`,
        seed: currentFIBO.seed + 1,
      };

      // Step 3: Calculate professional critique score (1-10)
      // Based on lighting balance, color temperature consistency, etc.
      const keyIntensity = newLighting.main_light?.intensity || 1.0;
      const fillIntensity = newLighting.fill_light?.intensity || 0.5;
      const rimIntensity = newLighting.rim_light?.intensity || 0.5;
      const keyToFillRatio = keyIntensity / (fillIntensity || 0.1);
      
      // Ideal ratio is 2:1 to 3:1 for professional lighting
      const ratioScore = keyToFillRatio >= 2 && keyToFillRatio <= 3 ? 2 : 1;
      const intensityScore = keyIntensity >= 0.8 && keyIntensity <= 1.5 ? 2 : 1;
      const rimScore = rimIntensity > 0.3 ? 1 : 0.5;
      const baseScore = 4;
      const score = Math.min(10, baseScore + ratioScore + intensityScore + rimScore + Math.random() * 2);

      // Step 4: Add to iteration history
      const changedKeys = Object.keys(lightingDiff).filter(
        key => lightingDiff[key as keyof typeof lightingDiff]
      );
      const iteration: AgentIteration = {
        id: newFIBO.generation_id,
        fibo: newFIBO,
        user_instruction: targetInstruction,
        llm_critique: `Applied changes to: ${changedKeys.join(', ')}. Score: ${score.toFixed(1)}/10`,
        score,
        iteration: iterations.length + 1,
      };

      setIterations(prev => [iteration, ...prev.slice(0, 9)]); // Keep last 10
      setCurrentFIBO(newFIBO);
      
      toast.success(`Iteration ${iteration.iteration} complete! Score: ${score.toFixed(1)}/10`);
      
      // Step 5: Auto-continue if score < 9 (optional, can be disabled)
      // if (score < 9.5 && iterations.length < 20) {
      //   setTimeout(() => {
      //     const autoInstructions = [
      //       "more dramatic", "softer shadows", "golden hour", "studio clean", "high key"
      //     ];
      //     setTargetInstruction(autoInstructions[Math.floor(Math.random() * autoInstructions.length)]);
      //   }, 500);
      // }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Agent iteration failed: ${errorMessage}`);
      console.error('Agent iteration error:', err);
    } finally {
      setIsAgentRunning(false);
    }
  }, [currentFIBO, targetInstruction, iterations.length, translateFeedback]);

  return (
    <div style={agenticContainer}>
      {/* Agent Control Panel */}
      <div style={controlPanel}>
        <h1 style={agentTitle}>🤖 Agentic FIBO Iterator</h1>
        <p style={agentSubtitle}>Tell me what you want → Watch AI perfect the lighting</p>
        
        <div style={instructionInput}>
          <input 
            value={targetInstruction}
            onChange={(e) => setTargetInstruction(e.target.value)}
            placeholder="e.g. 'more dramatic rim lighting, golden hour'"
            style={instructionField}
            onKeyPress={(e) => e.key === 'Enter' && runAgentIteration()}
          />
          <button 
            onClick={runAgentIteration}
            disabled={isAgentRunning || isTranslating || !targetInstruction}
            style={iterateBtn(isAgentRunning || isTranslating)}
          >
            {isAgentRunning || isTranslating ? '🤖 Refining...' : '🚀 Iterate'}
          </button>
          {error && (
            <div style={{ color: '#ef4444', marginTop: '0.5rem', fontSize: '0.875rem' }}>
              ⚠️ {error}
            </div>
          )}
        </div>
      </div>

      {/* Live 3D Preview */}
      <div style={previewSection}>
        <Canvas camera={{ position: [0, 0, 6] }} shadows>
          <color attach="background" args={['#0f1419']} />
          <Environment preset="studio" />
          <ContactShadows opacity={0.6} scale={12} />
          <OrbitControls enableZoom enablePan enableRotate />
          <FIBO3DLivePreview fibo={currentFIBO} />
        </Canvas>
      </div>

      {/* Iteration History */}
      <div style={historyPanel}>
        <h3>📈 Agent Iterations (Score Progress)</h3>
        <div style={iterationGrid}>
          {iterations.map((iter, i) => (
            <IterationCard 
              key={iter.id} 
              iteration={iter} 
              isBest={iterations.length > 0 && iter.score === Math.max(...iterations.map(it => it.score))} 
            />
          ))}
        </div>
        {iterations.length === 0 && (
          <div style={emptyState}>Start with "more dramatic" or "studio lighting"</div>
        )}
      </div>

      {/* Current FIBO JSON */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={jsonPanel}
      >
        <h4>Current FIBO JSON (Copy Ready)</h4>
        <pre style={jsonCode}>{JSON.stringify(currentFIBO, null, 2)}</pre>
        <button style={copyJsonBtn} onClick={() => navigator.clipboard.writeText(JSON.stringify(currentFIBO, null, 2))}>
          📋 Copy Deterministic JSON
        </button>
      </motion.div>
    </div>
  );
};

// ============================================================================
// 3D PREVIEW & COMPONENTS
// ============================================================================

const FIBO3DLivePreview: React.FC<{ fibo: AgentFIBO }> = ({ fibo }) => {
  // Convert direction string to position
  const directionToPosition = (direction: string, distance: number = 4): [number, number, number] => {
    const dirMap: Record<string, [number, number, number]> = {
      'front': [0, 0, distance],
      'front-right': [distance * 0.7, 0, distance * 0.7],
      'front-left': [-distance * 0.7, 0, distance * 0.7],
      'right': [distance, 0, 0],
      'left': [-distance, 0, 0],
      'back-right': [distance * 0.7, 0, -distance * 0.7],
      'back-left': [-distance * 0.7, 0, -distance * 0.7],
      'back': [0, 0, -distance],
      'top': [0, distance, 0],
      'bottom': [0, -distance, 0],
    };
    return dirMap[direction] || [0, 0, distance];
  };

  // Convert color temperature to HSL (simplified approximation)
  const tempToHue = (temp: number) => {
    if (temp < 4000) return 30; // Warm
    if (temp < 5000) return 50; // Neutral-warm
    return 200; // Cool
  };

  const mainLight = fibo.lighting.main_light || fibo.lighting.mainLight;
  const fillLight = fibo.lighting.fill_light || fibo.lighting.fillLight;
  const rimLight = fibo.lighting.rim_light || fibo.lighting.rimLight;

  return (
    <>
      {/* Main/Key Light */}
      {mainLight && mainLight.enabled !== false && (
        <directionalLight
          position={directionToPosition(mainLight.direction as string, mainLight.distance || 4)}
          intensity={(mainLight.intensity || 1.0) * 2.5}
          color={`hsl(${tempToHue(mainLight.colorTemperature || 5600)}, 70%, 85%)`}
          castShadow
        />
      )}
      
      {/* Fill Light */}
      {fillLight && fillLight.enabled !== false && (
        <directionalLight
          position={directionToPosition(fillLight.direction as string, fillLight.distance || 4)}
          intensity={(fillLight.intensity || 0.5) * 1.5}
          color={`hsl(${tempToHue(fillLight.colorTemperature || 5600)}, 70%, 85%)`}
        />
      )}
      
      {/* Rim Light */}
      {rimLight && rimLight.enabled !== false && (
        <directionalLight
          position={directionToPosition(rimLight.direction as string, rimLight.distance || 4)}
          intensity={(rimLight.intensity || 0.5) * 2.0}
          color={`hsl(${tempToHue(rimLight.colorTemperature || 4000)}, 70%, 85%)`}
        />
      )}
      
      {/* Ambient Light */}
      {fibo.lighting.ambient_light && (
        <ambientLight
          intensity={(fibo.lighting.ambient_light.intensity || 0.3) * 0.5}
          color={`hsl(${tempToHue(fibo.lighting.ambient_light.colorTemperature || 5600)}, 30%, 50%)`}
        />
      )}
      
      {/* Subject */}
      <mesh rotation={[0, 0.3, 0]} castShadow>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial color="#f8d7c8" roughness={0.5} />
      </mesh>
      
      {/* Ground plane for shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </>
  );
};

const IterationCard: React.FC<{ iteration: AgentIteration; isBest: boolean }> = ({ iteration, isBest }) => (
  <motion.div 
    style={{ ...iterationCard, ...(isBest ? bestIterationCard : {}) }}
    whileHover={{ scale: 1.02 }}
  >
    <div style={scoreBadge(iteration.score)}>{iteration.score.toFixed(1)}/10</div>
    <div style={instructionTag}>{iteration.user_instruction}</div>
    <div style={jsonPreview}>{JSON.stringify(iteration.fibo.lighting, null, 0).slice(0, 80)}...</div>
  </motion.div>
);

// ============================================================================
// PRODUCTION STYLES
// ============================================================================

const agenticContainer: React.CSSProperties = {
  background: 'linear-gradient(135deg, #0a0e1f 0%, #1a1f3a 100%)',
  color: '#e0e7ff',
  minHeight: '100vh',
  padding: '2rem',
  fontFamily: '"Inter", sans-serif'
};

const controlPanel: React.CSSProperties = {
  marginBottom: '2rem',
  padding: '2rem',
  background: 'rgba(102, 126, 234, 0.1)',
  borderRadius: '24px',
  border: '1px solid rgba(102, 126, 234, 0.2)'
};

const agentTitle: React.CSSProperties = {
  fontSize: '2rem',
  fontWeight: 700,
  marginBottom: '0.5rem',
  background: 'linear-gradient(135deg, #667eea 0%, #48bb78 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text'
};

const agentSubtitle: React.CSSProperties = {
  fontSize: '1rem',
  color: '#a5b4fc',
  marginBottom: '1.5rem'
};

const instructionInput: React.CSSProperties = {
  display: 'flex',
  gap: '1rem',
  alignItems: 'center'
};

const instructionField: React.CSSProperties = {
  flex: 1,
  padding: '1rem 1.5rem',
  fontSize: '1rem',
  background: 'rgba(15, 23, 42, 0.8)',
  border: '1px solid rgba(102, 126, 234, 0.3)',
  borderRadius: '12px',
  color: '#e0e7ff',
  outline: 'none'
};

const iterateBtn = (disabled: boolean): React.CSSProperties => ({
  background: disabled 
    ? 'rgba(102,126,234,0.4)' 
    : 'linear-gradient(135deg, #667eea 0%, #48bb78 100%)',
  color: 'white',
  border: 'none',
  padding: '1rem 2rem',
  borderRadius: '16px',
  fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  boxShadow: disabled ? 'none' : '0 12px 32px rgba(102,126,234,0.4)',
  fontSize: '1rem',
  transition: 'all 0.2s'
});

const previewSection: React.CSSProperties = {
  width: '100%',
  height: '500px',
  borderRadius: '24px',
  overflow: 'hidden',
  marginBottom: '2rem',
  border: '1px solid rgba(102, 126, 234, 0.2)',
  background: '#0f1419'
};

const historyPanel: React.CSSProperties = {
  marginBottom: '2rem',
  padding: '1.5rem',
  background: 'rgba(15, 23, 42, 0.6)',
  borderRadius: '20px'
};

const iterationGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '1rem',
  marginTop: '1rem'
};

const iterationCard: React.CSSProperties = {
  padding: '1rem',
  background: 'rgba(102, 126, 234, 0.1)',
  borderRadius: '12px',
  border: '1px solid rgba(102, 126, 234, 0.2)',
  cursor: 'pointer',
  transition: 'all 0.2s'
};

const bestIterationCard: React.CSSProperties = {
  border: '2px solid #48bb78',
  background: 'rgba(72, 187, 120, 0.15)',
  boxShadow: '0 8px 24px rgba(72, 187, 120, 0.3)'
};

const scoreBadge = (score: number): React.CSSProperties => {
  const color = score >= 9 ? '#48bb78' : score >= 7 ? '#667eea' : '#f59e0b';
  return {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    background: color,
    color: 'white',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 700,
    marginBottom: '0.5rem'
  };
};

const instructionTag: React.CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: 600,
  color: '#e0e7ff',
  marginBottom: '0.5rem'
};

const jsonPreview: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#a5b4fc',
  fontFamily: 'monospace',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
};

const jsonPanel: React.CSSProperties = {
  padding: '1.5rem',
  background: 'rgba(15, 23, 42, 0.8)',
  borderRadius: '20px',
  border: '1px solid rgba(102, 126, 234, 0.2)'
};

const jsonCode: React.CSSProperties = {
  background: '#0f172a',
  padding: '1rem',
  borderRadius: '12px',
  overflow: 'auto',
  fontSize: '0.875rem',
  color: '#a5b4fc',
  fontFamily: 'monospace',
  marginTop: '1rem',
  marginBottom: '1rem',
  maxHeight: '400px'
};

const copyJsonBtn: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  background: 'linear-gradient(135deg, #667eea 0%, #48bb78 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '1rem',
  transition: 'all 0.2s'
};

const emptyState: React.CSSProperties = {
  textAlign: 'center',
  padding: '3rem',
  color: '#64748b',
  fontSize: '1rem'
};

export default AgenticLoop;
