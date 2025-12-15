import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Environment, Text } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import type { LightingSetup } from '@/utils/fiboLightingUtils';

interface PresetDemoProps {
  preset: {
    id: string;
    name: string;
    lightingSetup: LightingSetup;
    cameraSettings: {
      shotType: string;
      cameraAngle: string;
      fov: number;
      lensType: string;
      aperture: string;
    };
  };
}

const SubjectModel = () => {
  return (
    <group>
      {/* Head */}
      <Sphere args={[0.5, 32, 32]} position={[0, 1.7, 0]}>
        <meshStandardMaterial color="#f0d9b5" roughness={0.3} />
      </Sphere>
      {/* Torso */}
      <Sphere args={[0.3, 32, 32]} position={[0, 0.5, 0]}>
        <meshStandardMaterial color="#4a5568" roughness={0.4} />
      </Sphere>
      {/* Base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 1, 32]} />
        <meshStandardMaterial color="#2d3748" roughness={0.8} />
      </mesh>
    </group>
  );
};

interface LightSourceProps {
  config: {
    direction: string;
    intensity: number;
    colorTemperature: number;
    softness: number;
    distance: number;
    enabled: boolean;
  };
  position: [number, number, number];
  label: string;
}

const LightSource = ({ config, position, label }: LightSourceProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (meshRef.current && config.enabled) {
      const pulse = Math.sin(Date.now() * 0.002) * 0.1 + 1;
      meshRef.current.scale.setScalar(config.intensity * 0.5 * pulse + 0.3);
    }
  });

  const getColorTemperatureColor = (temp: number): string => {
    if (temp <= 3200) return '#FF8C00';
    if (temp <= 4500) return '#FFA500';
    if (temp <= 5600) return '#FFD700';
    if (temp <= 6500) return '#FFFFE0';
    return '#87CEFA';
  };

  const color = getColorTemperatureColor(config.colorTemperature);
  const intensity = config.enabled ? config.intensity * 2 : 0;

  return (
    <group position={position}>
      <Sphere
        ref={meshRef}
        args={[0.15]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshBasicMaterial color={color} transparent opacity={config.enabled ? 0.9 : 0.3} />
      </Sphere>
      <pointLight color={color} intensity={intensity} distance={5} decay={2} />
      {hovered && (
        <Text
          position={[0, 0.4, 0]}
          fontSize={0.15}
          color={color}
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      )}
    </group>
  );
};

const Scene = ({ lightingSetup }: { lightingSetup: LightingSetup }) => {
  const getColorTemperatureColor = (temp: number): string => {
    if (temp <= 3200) return '#FF8C00';
    if (temp <= 4500) return '#FFA500';
    if (temp <= 5600) return '#FFD700';
    if (temp <= 6500) return '#FFFFE0';
    return '#87CEFA';
  };

  // Convert direction strings to 3D positions
  const getLightPosition = (direction: string, distance: number): [number, number, number] => {
    const normalizedDistance = distance * 1.5;
    
    if (direction.includes('camera-right')) {
      return [normalizedDistance, 2, normalizedDistance * 0.7];
    } else if (direction.includes('camera-left')) {
      return [-normalizedDistance, 2, normalizedDistance * 0.7];
    } else if (direction.includes('above camera') || direction.includes('above')) {
      return [0, normalizedDistance * 1.2, normalizedDistance * 0.5];
    } else if (direction.includes('frontal') || direction.includes('front')) {
      return [0, 1.5, normalizedDistance];
    } else if (direction.includes('behind subject') || direction.includes('behind')) {
      return [0, 2, -normalizedDistance];
    } else if (direction.includes('behind subject left')) {
      return [-normalizedDistance * 0.7, 2, -normalizedDistance];
    } else {
      return [normalizedDistance, 2, normalizedDistance];
    }
  };

  const lightPositions: Record<string, [number, number, number]> = {};
  
  if (lightingSetup.key?.enabled) {
    lightPositions.key = getLightPosition(lightingSetup.key.direction, lightingSetup.key.distance || 1.5);
  }
  if (lightingSetup.fill?.enabled) {
    lightPositions.fill = getLightPosition(lightingSetup.fill.direction, lightingSetup.fill.distance || 2.0);
  }
  if (lightingSetup.rim?.enabled) {
    lightPositions.rim = getLightPosition(lightingSetup.rim.direction, lightingSetup.rim.distance || 1.0);
  }

  return (
    <>
      <ambientLight
        intensity={lightingSetup.ambient?.enabled ? (lightingSetup.ambient.intensity || 0.1) * 0.5 : 0}
        color={getColorTemperatureColor(lightingSetup.ambient?.colorTemperature || 5000)}
      />
      <SubjectModel />
      {lightingSetup.key?.enabled && lightingSetup.key && (
        <LightSource
          config={{
            direction: lightingSetup.key.direction,
            intensity: lightingSetup.key.intensity,
            colorTemperature: lightingSetup.key.colorTemperature,
            softness: lightingSetup.key.softness,
            distance: lightingSetup.key.distance || 1.5,
            enabled: lightingSetup.key.enabled,
          }}
          position={lightPositions.key}
          label="Key Light"
        />
      )}
      {lightingSetup.fill?.enabled && lightingSetup.fill && (
        <LightSource
          config={{
            direction: lightingSetup.fill.direction,
            intensity: lightingSetup.fill.intensity,
            colorTemperature: lightingSetup.fill.colorTemperature,
            softness: lightingSetup.fill.softness,
            distance: lightingSetup.fill.distance || 2.0,
            enabled: lightingSetup.fill.enabled,
          }}
          position={lightPositions.fill}
          label="Fill Light"
        />
      )}
      {lightingSetup.rim?.enabled && lightingSetup.rim && (
        <LightSource
          config={{
            direction: lightingSetup.rim.direction,
            intensity: lightingSetup.rim.intensity,
            colorTemperature: lightingSetup.rim.colorTemperature,
            softness: lightingSetup.rim.softness,
            distance: lightingSetup.rim.distance || 1.0,
            enabled: lightingSetup.rim.enabled,
          }}
          position={lightPositions.rim}
          label="Rim Light"
        />
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      <Environment preset="studio" />
      <OrbitControls enableZoom enablePan enableRotate />
    </>
  );
};

const PresetDemo: React.FC<PresetDemoProps> = ({ preset }) => {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-muted-foreground">Interactive 3D Preview</h4>
        <div className="text-xs text-muted-foreground">
          Drag to rotate • Scroll to zoom
        </div>
      </div>
      
      <motion.div
        className="w-full h-80 rounded-xl overflow-hidden shadow-2xl bg-card border border-border/50"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Canvas camera={{ position: [5, 2, 5], fov: 50 }}>
          <Scene lightingSetup={preset.lightingSetup} />
        </Canvas>
      </motion.div>
      
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Drag to rotate • Scroll to zoom • Click lights to see details</p>
        <p>• Real-time visualization of FIBO lighting parameters</p>
      </div>
    </div>
  );
};

export default PresetDemo;

