import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, AccumulativeShadows, ContactShadows, PresentationControls, Float } from '@react-three/drei'
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useLightingStore } from '@/stores/lightingStore'

// ============================================================================
// 3D PRODUCT MODEL (Professional PBR Materials)
// ============================================================================
const ProductModel = ({ rotationSpeed = 0.01 }: { rotationSpeed?: number }) => {
  const meshRef = useRef<THREE.Group>(null)
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed
    }
  })

  return (
    <Float rotationIntensity={0.3} floatIntensity={0.5}>
      <group ref={meshRef} castShadow receiveShadow>
        {/* Modern LED Lamp - PBR Realistic */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.8, 0.8, 2.5, 32]} />
          <meshStandardMaterial 
            metalness={0.1} 
            roughness={0.3}
            color="#f0f0f0"
            envMapIntensity={1.5}
          />
        </mesh>
        
        {/* Lamp Base */}
        <mesh position-y={-1.6} rotation-x={-Math.PI * 0.5} castShadow receiveShadow>
          <cylinderGeometry args={[0.9, 1.1, 0.3, 32]} />
          <meshStandardMaterial metalness={0.8} roughness={0.2} color="#333" />
        </mesh>
        
        {/* Lamp Shade */}
        <mesh position-y={1.3} castShadow receiveShadow>
          <cylinderGeometry args={[0.7, 0.6, 0.8, 32]} />
          <meshStandardMaterial 
            metalness={0.05} 
            roughness={0.4}
            color="#ffedcc"
            emissive="#ffaa00"
            emissiveIntensity={0.1}
            transmission={0.9}
          />
        </mesh>
      </group>
    </Float>
  )
}

// ============================================================================
// KELVIN TO RGB CONVERSION
// ============================================================================
const kelvinToRGB = (kelvin: number): THREE.Color => {
  const temp = kelvin / 100
  let r, g, b
  
  if (temp < 66) {
    r = 255
    g = temp
    g = 99.4708025861 * Math.log(g) - 161.1195681661
    if (temp <= 19) {
      b = 0
    } else {
      b = temp - 10
      b = 138.5177312231 * Math.log(b) - 305.0447927307
    }
  } else {
    r = temp - 60
    r = 329.698727446 * Math.pow(r, -0.1332047592)
    g = temp - 60
    g = 288.1221695283 * Math.pow(g, -0.0755148492)
    b = 255
  }
  
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  
  return new THREE.Color(r/255, g/255, b/255)
}

// ============================================================================
// PARSE DIRECTION STRING TO POSITION
// ============================================================================
const parseDirection = (direction: string, lightType: 'key' | 'fill' | 'rim'): [number, number, number] => {
  const dirLower = direction.toLowerCase()
  
  // Specific direction mappings
  if (dirLower.includes('camera-right') || dirLower.includes('right')) {
    if (dirLower.includes('45')) return [2, 2, 2]
    if (dirLower.includes('30')) return [1.5, 1.5, 1.5]
    return [2, 2, 2]
  }
  
  if (dirLower.includes('camera-left') || dirLower.includes('left')) {
    if (dirLower.includes('30')) return [-1.5, 1, 1.5]
    return [-1.5, 1, 1.5]
  }
  
  if (dirLower.includes('behind') || dirLower.includes('back')) {
    return [0, 2, -2]
  }
  
  // Parse numeric angles if present
  const angleMatch = direction.match(/(\d+)\s*degrees?/)
  if (angleMatch) {
    const angle = parseInt(angleMatch[1])
    const rad = (angle * Math.PI) / 180
    const isLeft = dirLower.includes('left')
    const x = (isLeft ? -1 : 1) * Math.cos(rad) * 3
    return [x, -Math.sin(rad) * 2, 2]
  }
  
  // Default positions based on light type
  const defaults: Record<string, [number, number, number]> = {
    key: [2, 2, 2],
    fill: [-1.5, 1, 1.5],
    rim: [0, 2, -2],
  }
  
  return defaults[lightType] || [2, 2, 2]
}

// ============================================================================
// DYNAMIC LIGHTING SYSTEM (Connected to Store)
// ============================================================================
const DynamicLighting = () => {
  const lightingSetup = useLightingStore((state) => state.lightingSetup)
  const keyLightRef = useRef<THREE.DirectionalLight>(null)
  const fillLightRef = useRef<THREE.DirectionalLight>(null)
  const rimLightRef = useRef<THREE.DirectionalLight>(null)

  const keyPos = useMemo(() => parseDirection(lightingSetup.key.direction, 'key'), [lightingSetup.key.direction])
  const fillPos = useMemo(() => parseDirection(lightingSetup.fill.direction, 'fill'), [lightingSetup.fill.direction])
  const rimPos = useMemo(() => parseDirection(lightingSetup.rim.direction, 'rim'), [lightingSetup.rim.direction])

  return (
    <>
      {/* Ambient Light */}
      {lightingSetup.ambient.enabled && (
        <ambientLight
          intensity={lightingSetup.ambient.intensity * 0.5}
          color={kelvinToRGB(lightingSetup.ambient.colorTemperature)}
        />
      )}

      {/* Key Light */}
      {lightingSetup.key.enabled && (
        <directionalLight
          ref={keyLightRef}
          position={keyPos}
          intensity={lightingSetup.key.intensity * 2}
          color={kelvinToRGB(lightingSetup.key.colorTemperature)}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={10}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
        />
      )}

      {/* Fill Light */}
      {lightingSetup.fill.enabled && (
        <directionalLight
          ref={fillLightRef}
          position={fillPos}
          intensity={lightingSetup.fill.intensity * 1.2}
          color={kelvinToRGB(lightingSetup.fill.colorTemperature)}
        />
      )}

      {/* Rim Light */}
      {lightingSetup.rim.enabled && (
        <directionalLight
          ref={rimLightRef}
          position={rimPos}
          intensity={lightingSetup.rim.intensity * 1.5}
          color={kelvinToRGB(lightingSetup.rim.colorTemperature)}
        />
      )}
    </>
  )
}

// ============================================================================
// MAIN 3D STUDIO CANVAS
// ============================================================================
export const ThreeLightStudio = () => {
  return (
    <div style={{ width: '100%', height: '100%', borderRadius: '24px', overflow: 'hidden' }}>
      <Canvas
        camera={{ position: [0, 1, 5], fov: 45 }}
        shadows
        gl={{ 
          antialias: true, 
          toneMapping: THREE.ACESFilmicToneMapping,
          outputEncoding: THREE.sRGBEncoding 
        }}
      >
        <color attach="background" args={['#1a1f2e']} />
        
        {/* Professional Studio Environment */}
        <Environment preset="studio" />
        
        {/* Shadows */}
        <AccumulativeShadows
          position={[0, -0.5, 0]}
          scale={8}
          frames={100}
          threshold={0.1}
          opacity={0.7}
        />
        <ContactShadows 
          position={[0, -1.5, 0]} 
          scale={15} 
          blur={1} 
          far={1.5} 
          opacity={0.6}
        />
        
        {/* Dynamic Lighting */}
        <DynamicLighting />
        
        {/* Product */}
        <PresentationControls
          global
          rotation={[-0.13, -0.1, 0]}
          polar={[-0.1, 0.2]}
          azimuth={[-1, 0.75]}
          config={{ mass: 2, tension: 100 }}
          snap={{ mass: 4, tension: 400 }}
        >
          <ProductModel />
        </PresentationControls>
        
        {/* Post Processing */}
        <EffectComposer>
          <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} />
          <DepthOfField 
            target={[0, 0, 0]}
            focalLength={0.5} 
            bokehScale={5} 
            height={300} 
          />
        </EffectComposer>
        
        <OrbitControls 
          enablePan={false} 
          enableZoom={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2.5}
        />
      </Canvas>
    </div>
  )
}

