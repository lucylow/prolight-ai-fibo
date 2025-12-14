import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Environment } from '@react-three/drei';
import { useLighting } from '@/hooks/useLighting';
import * as THREE from 'three';

const SubjectModel = () => {
  return (
    <group>
      <Sphere args={[0.5, 32, 32]} position={[0, 1.7, 0]}>
        <meshStandardMaterial color="#f0d9b5" roughness={0.3} />
      </Sphere>
      <Sphere args={[0.3, 32, 32]} position={[0, 0.5, 0]}>
        <meshStandardMaterial color="#4a5568" roughness={0.4} />
      </Sphere>
    </group>
  );
};

interface LightSourceProps {
  config: { intensity: number; colorTemperature: number; enabled: boolean };
  position: [number, number, number];
}

const LightSource = ({ config, position }: LightSourceProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { getColorTemperatureColor } = useLighting();

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(config.intensity * 0.5 + 0.3);
    }
  });

  const color = getColorTemperatureColor(config.colorTemperature);
  const intensity = config.enabled ? config.intensity * 2 : 0;

  return (
    <group position={position}>
      <Sphere ref={meshRef} args={[0.1]}>
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </Sphere>
      <pointLight color={color} intensity={intensity} distance={5} decay={2} />
    </group>
  );
};

const Scene = () => {
  const { lightingSetup, getColorTemperatureColor } = useLighting();

  const lightPositions: Record<string, [number, number, number]> = {
    key: [2, 2, 2],
    fill: [-1.5, 1, 1.5],
    rim: [0, 2, -2],
  };

  return (
    <>
      <ambientLight
        intensity={lightingSetup.ambient.enabled ? lightingSetup.ambient.intensity * 0.5 : 0}
        color={getColorTemperatureColor(lightingSetup.ambient.colorTemperature)}
      />
      <SubjectModel />
      {Object.entries(lightingSetup).map(([type, config]) => {
        if (type === 'ambient' || !lightPositions[type]) return null;
        if (type === 'key' || type === 'fill' || type === 'rim') {
          return <LightSource key={type} config={config} position={lightPositions[type]} />;
        }
        return null;
      })}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      <Environment preset="studio" />
      <OrbitControls enableZoom enablePan />
    </>
  );
};

const LightVisualizer = () => {
  return (
    <div className="w-full h-96 rounded-2xl overflow-hidden shadow-2xl bg-card">
      <Canvas camera={{ position: [5, 2, 5], fov: 50 }}>
        <Scene />
      </Canvas>
    </div>
  );
};

export default LightVisualizer;
