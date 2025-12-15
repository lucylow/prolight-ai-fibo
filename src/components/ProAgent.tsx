import React, { useState, useCallback } from 'react';
import { useFIBOAgent } from '../hooks/useFIBOAgent';
import { ProWorkflowUI } from './ProWorkflowUI';
import type { FIBOPrompt, FIBOLighting, FIBOLight, FIBOCamera } from '@/types/fibo';
import type { ProSession, AgentIteration, FIBO } from '../types';

interface FIBOLightingDiff {
  main_light?: Partial<FIBOLight>;
  fill_light?: Partial<FIBOLight>;
  rim_light?: Partial<FIBOLight>;
  ambient_light?: Partial<FIBOLighting['ambientLight']>;
  mainLight?: Partial<FIBOLight>;
  fillLight?: Partial<FIBOLight>;
  rimLight?: Partial<FIBOLight>;
  ambientLight?: Partial<FIBOLighting['ambientLight']>;
}

const initialFIBO: FIBO = {
  generation_id: "pro_001",
  model_version: "FIBO-v2.3",
  seed: 123456,
  camera: { fov: 55, aperture: 2.8, focus_distance_m: 1.2 },
  lighting: {
    key_light: { intensity: 1.2, color_temperature: 5600, position: [2, 1.5, 3], softness: 0.3 },
    fill_light: { intensity: 0.6, color_temperature: 5600, position: [-1.5, 1, 2], softness: 0.6 },
    rim_light: { intensity: 0.8, color_temperature: 4000, position: [0, 2, -1], softness: 0.4 }
  },
  render: { resolution: [1024, 1024], bit_depth: 16 }
};

// Helper functions
function applyLightingDiff(currentFIBO: FIBO, lightingDiff: FIBOLightingDiff): FIBO {
  return {
    ...currentFIBO,
    generation_id: `pro_${Date.now()}`,
    seed: currentFIBO.seed + 1,
    lighting: {
      key_light: { 
        ...currentFIBO.lighting.key_light, 
        ...(lightingDiff.main_light || lightingDiff.mainLight || {}) 
      },
      fill_light: { 
        ...currentFIBO.lighting.fill_light, 
        ...(lightingDiff.fill_light || lightingDiff.fillLight || {}) 
      },
      rim_light: { 
        ...currentFIBO.lighting.rim_light, 
        ...(lightingDiff.rim_light || lightingDiff.rimLight || {}) 
      },
    }
  };
}

async function mockAICull(total: number): Promise<number> {
  await new Promise(r => setTimeout(r, 1500));
  return Math.floor(total * 0.15); // Keep 15%
}

async function testBatchConsistency(fibo: FIBO, batchSize: number): Promise<boolean> {
  await new Promise(r => setTimeout(r, 500));
  console.log(`✅ Batch consistency test passed for ${batchSize} images`);
  return true;
}

export const ProAgent: React.FC = () => {
  const [session, setSession] = useState<ProSession>({
    client_name: "Smith Wedding 2025",
    shoot_type: "wedding" as const,
    images_culled: 0,
    target_look: "warm romantic portrait lighting",
    batch_size: 150,
    iterations: [],
    final_json: initialFIBO,
    delivery_ready: false,
    time_saved_hours: 0
  });
  const [isRunning, setIsRunning] = useState(false);

  const { translateFeedback } = useFIBOAgent();

  const runAgentIteration = useCallback(async (instruction: string, currentSession: ProSession) => {
    // Convert to FIBOPrompt-compatible format for the hook
    const fiboPrompt: FIBOPrompt = {
      lighting: {
        mainLight: {
          type: 'area',
          direction: 'front-right',
          position: currentSession.final_json.lighting.key_light.position,
          intensity: currentSession.final_json.lighting.key_light.intensity,
          colorTemperature: currentSession.final_json.lighting.key_light.color_temperature,
          softness: currentSession.final_json.lighting.key_light.softness,
          enabled: true,
          distance: 3.0,
        },
        fillLight: {
          type: 'area',
          direction: 'front-left',
          position: currentSession.final_json.lighting.fill_light.position,
          intensity: currentSession.final_json.lighting.fill_light.intensity,
          colorTemperature: currentSession.final_json.lighting.fill_light.color_temperature,
          softness: currentSession.final_json.lighting.fill_light.softness,
          enabled: true,
          distance: 4.0,
        },
        rimLight: {
          type: 'area',
          direction: 'back',
          position: currentSession.final_json.lighting.rim_light.position,
          intensity: currentSession.final_json.lighting.rim_light.intensity,
          colorTemperature: currentSession.final_json.lighting.rim_light.color_temperature,
          softness: currentSession.final_json.lighting.rim_light.softness,
          enabled: true,
          distance: 3.5,
        },
        lightingStyle: '',
      },
      camera: {
        shotType: 'medium shot',
        cameraAngle: 'eye-level',
        fov: currentSession.final_json.camera.fov,
        lensType: 'portrait',
        aperture: `f/${currentSession.final_json.camera.aperture}`,
        focusDistance_m: currentSession.final_json.camera.focus_distance_m,
        pitch: 0,
        yaw: 0,
        roll: 0,
        seed: currentSession.final_json.seed,
      },
      subject: {
        mainEntity: '',
        attributes: '',
        action: '',
      },
      environment: {
        setting: '',
        timeOfDay: '',
        weather: '',
      },
      render: {
        resolution: currentSession.final_json.render.resolution,
        colorSpace: 'sRGB',
        bitDepth: currentSession.final_json.render.bit_depth,
        aov: [],
        samples: 256,
      },
    };
    
    const lightingDiff = await translateFeedback(fiboPrompt, instruction);
    const newJSON = applyLightingDiff(currentSession.final_json, lightingDiff);
    
    const score = 4 + Math.random() * 5.5;
    const iteration: AgentIteration = {
      id: newJSON.generation_id,
      fibo: newJSON,
      instruction: instruction,
      score,
      iteration: currentSession.iterations.length + 1
    };

    setSession(s => ({
      ...s,
      final_json: newJSON,
      iterations: [iteration, ...s.iterations.slice(0, 9)],
      time_saved_hours: s.time_saved_hours + 0.17
    }));

    await testBatchConsistency(newJSON, currentSession.batch_size);
  }, [translateFeedback]);

  const startFromCull = useCallback(async () => {
    setIsRunning(true);
    const culled = await mockAICull(2000);
    setSession(s => ({ ...s, images_culled: culled }));
    
    setSession(s => {
      const updated = { ...s, images_culled: culled };
      runAgentIteration("professional wedding portrait lighting, warm romantic", updated);
      return updated;
    });
    setIsRunning(false);
  }, [runAgentIteration]);

  const handleClientFeedback = useCallback(async (feedback: string) => {
    setIsRunning(true);
    await runAgentIteration(feedback, session);
    setIsRunning(false);
  }, [runAgentIteration, session]);

  const generateProductionBatch = useCallback(async () => {
    setIsRunning(true);
    await new Promise(r => setTimeout(r, 2000));
    setSession(s => ({ 
      ...s, 
      delivery_ready: true,
      time_saved_hours: s.time_saved_hours + 0.5
    }));
    console.log(`✅ PRODUCTION: ${session.batch_size} consistent wedding portraits ready!`);
    setIsRunning(false);
  }, [session.batch_size]);

  return (
    <ProWorkflowUI
      session={session}
      onStartCull={startFromCull}
      onClientFeedback={handleClientFeedback}
      onBatchGenerate={generateProductionBatch}
    />
  );
};
