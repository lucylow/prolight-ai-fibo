import React, { useState, useCallback } from 'react';
import { ProSession, FIBO, AgentIteration } from '../types';
import { useFIBOAgent } from '../hooks/useFIBOAgent';
import { ProWorkflowUI } from './ProWorkflowUI';

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

export const ProAgent: React.FC = () => {
  const [session, setSession] = useState<ProSession>({
    client_name: "Smith Wedding 2025",
    shoot_type: "wedding",
    images_culled: 0,
    target_look: "warm romantic portrait lighting",
    batch_size: 150,
    iterations: [],
    final_json: initialFIBO,
    delivery_ready: false,
    time_saved_hours: 0
  });

  const { translateFeedback, applyLightingDiff, mockAICull, testBatchConsistency, isRunning, setIsRunning } = useFIBOAgent();

  const runAgentIteration = useCallback(async (instruction: string, currentSession: ProSession) => {
    const lightingDiff = await translateFeedback(currentSession.final_json, instruction);
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
      time_saved_hours: s.time_saved_hours + 0.17 // 10min saved per feedback
    }));

    await testBatchConsistency(newJSON, currentSession.batch_size);
  }, [translateFeedback, applyLightingDiff, testBatchConsistency]);

  const startFromCull = useCallback(async () => {
    setIsRunning(true);
    const culled = await mockAICull(2000);
    setSession(s => ({ ...s, images_culled: culled }));
    
    // Get updated session state for agent iteration
    setSession(s => {
      const updated = { ...s, images_culled: culled };
      // Auto-start agent previz
      runAgentIteration("professional wedding portrait lighting, warm romantic", updated);
      return updated;
    });
    setIsRunning(false);
  }, [mockAICull, runAgentIteration]);

  const handleClientFeedback = useCallback(async (feedback: string) => {
    setIsRunning(true);
    // Use current session state
    await runAgentIteration(feedback, session);
    setIsRunning(false);
  }, [runAgentIteration, session]);

  const generateProductionBatch = useCallback(async () => {
    setIsRunning(true);
    // Simulate batch (FIBO deterministic = 100% identical)
    await new Promise(r => setTimeout(r, 2000));
    setSession(s => ({ 
      ...s, 
      delivery_ready: true,
      time_saved_hours: s.time_saved_hours + 0.5 // 30min saved on batch
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

