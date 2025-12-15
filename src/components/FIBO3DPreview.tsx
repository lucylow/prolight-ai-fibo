import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import { FIBO } from '../types';

export const FIBO3DPreview: React.FC<{ fibo: FIBO }> = ({ fibo }) => (
  <div style={{ height: '400px', borderRadius: '16px', overflow: 'hidden', background: '#0f1419' }}>
    <Canvas camera={{ position: [0, 0, 6], fov: fibo.camera.fov }}>
      <color attach="background" args={['#0f1419']} />
      <Environment preset="studio" />
      <ContactShadows opacity={0.6} scale={12} />
      
      {/* Key Light */}
      <directionalLight
        position={fibo.lighting.key_light.position.map((p: number) => p * 3) as [number, number, number]}
        intensity={fibo.lighting.key_light.intensity * 2}
        color={`hsl(${fibo.lighting.key_light.color_temperature / 100}, 70%, 85%)`}
      />
      
      {/* Fill + Rim */}
      <directionalLight 
        position={fibo.lighting.fill_light.position.map((p: number) => p * 3) as [number, number, number]} 
        intensity={fibo.lighting.fill_light.intensity * 1.2}
        color={`hsl(${fibo.lighting.fill_light.color_temperature / 100}, 70%, 85%)`}
      />
      <directionalLight 
        position={fibo.lighting.rim_light.position.map((p: number) => p * 3) as [number, number, number]} 
        intensity={fibo.lighting.rim_light.intensity}
        color={`hsl(${fibo.lighting.rim_light.color_temperature / 100}, 70%, 85%)`}
      />

      {/* Product/Wedding Subject */}
      <mesh rotation={[0, 0.3, 0]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial 
          color="#f8d7c8" 
          roughness={0.3 + fibo.lighting.key_light.softness * 0.4} 
        />
      </mesh>
    </Canvas>
  </div>
);

