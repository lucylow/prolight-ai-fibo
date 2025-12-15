/**
 * ProLight AI - PROFESSIONAL PHOTOGRAPHY INTERACTIVE DEMOS
 * Portrait | Product | Fashion | Commercial - One-click professional setups
 * 3D Previews + FIBO JSON + Real-time lighting adjustments
 */

import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// PROFESSIONAL PHOTOGRAPHY PRESETS (Real Studio Setups)
// ============================================================================

const PRO_PHOTO_PRESETS = {
  portrait: {
    name: "Portrait Studio",
    description: "Rembrandt + Clamshell Lighting",
    lighting: {
      key: { intensity: 1.4, kelvin: 5600, x: 45, y: -15 },      // Rembrandt triangle
      fill: { intensity: 0.7, kelvin: 5600, x: -30, y: 10 },     // Clamshell fill
      rim: { intensity: 1.1, kelvin: 3200, x: 135, y: 20 }       // Hair separation
    },
    camera: { focal: 85, aperture: 2.8, iso: 100 },
    model: "portraitHead",
    background: "#1a1f2e"
  },
  product: {
    name: "Product E-commerce", 
    description: "Flat 3-Point + Seamless White",
    lighting: {
      key: { intensity: 1.2, kelvin: 5600, x: 30, y: -10 },
      fill: { intensity: 0.9, kelvin: 5600, x: -30, y: -10 },
      rim: { intensity: 0.6, kelvin: 5600, x: 0, y: 160 }
    },
    camera: { focal: 50, aperture: 8.0, iso: 100 },
    model: "productLamp",
    background: "#f8f8f8"
  },
  fashion: {
    name: "Fashion Editorial",
    description: "Dramatic Rim + High Contrast",
    lighting: {
      key: { intensity: 0.8, kelvin: 3200, x: -60, y: -30 },     // Side dramatic
      fill: { intensity: 0.3, kelvin: 5600, x: 20, y: 15 },
      rim: { intensity: 1.8, kelvin: 2700, x: 170, y: 45 }        // Strong rim glow
    },
    camera: { focal: 135, aperture: 2.0, iso: 200 },
    model: "fashionModel",
    background: "#1a1f2e"
  },
  commercial: {
    name: "Commercial Clean",
    description: "High-Key Even Lighting",
    lighting: {
      key: { intensity: 1.6, kelvin: 5500, x: 0, y: -20 },
      fill: { intensity: 1.3, kelvin: 5500, x: 0, y: 20 },
      rim: { intensity: 0.4, kelvin: 5500, x: 180, y: 0 }
    },
    camera: { focal: 100, aperture: 5.6, iso: 100 },
    model: "commercialProduct",
    background: "#ffffff"
  }
} as const;

type PresetKey = keyof typeof PRO_PHOTO_PRESETS;
type Preset = typeof PRO_PHOTO_PRESETS[PresetKey];

// ============================================================================
// KELVIN TO RGB CONVERSION
// ============================================================================

const kelvinToRGB = (kelvin: number): THREE.Color => {
  const temp = kelvin / 100;
  let r, g, b;
  
  if (temp < 66) {
    r = 255;
    g = temp;
    g = 99.4708025861 * Math.log(g) - 161.1195681661;
    if (temp <= 19) {
      b = 0;
    } else {
      b = temp - 10;
      b = 138.5177312231 * Math.log(b) - 305.0447927307;
    }
  } else {
    r = temp - 60;
    r = 329.698727446 * Math.pow(r, -0.1332047592);
    g = temp - 60;
    g = 288.1221695283 * Math.pow(g, -0.0755148492);
    b = 255;
  }
  
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  
  return new THREE.Color(r/255, g/255, b/255);
};

// ============================================================================
// 3D MODEL COMPONENTS (Professional Subjects)
// ============================================================================

const PortraitHead = () => (
  <mesh position={[0, 0, 0]} rotation-y={0.1}>
    <sphereGeometry args={[0.9, 32, 32]} />
    <meshStandardMaterial 
      color="#f8d7c8" 
      metalness={0.1} 
      roughness={0.6}
    />
  </mesh>
);

const ProductLamp = () => (
  <group position={[0, -0.2, 0]}>
    <mesh>
      <cylinderGeometry args={[0.15, 0.15, 1.8, 24]} />
      <meshStandardMaterial color="#e8e8e8" metalness={0.3} roughness={0.4} />
    </mesh>
    <mesh position-y={1.0}>
      <cylinderGeometry args={[0.25, 0.2, 0.4, 24]} />
      <meshStandardMaterial color="#ffcc88" emissive="#ffaa00" emissiveIntensity={0.2} />
    </mesh>
  </group>
);

const FashionModel = () => (
  <group scale={1.1}>
    <mesh position={[0, 0.8, 0]}>
      <capsuleGeometry args={[0.3, 1.4, 16, 16]} />
      <meshStandardMaterial color="#2a1a0f" />
    </mesh>
    <mesh position={[0, -0.8, 0]}>
      <cylinderGeometry args={[0.4, 0.4, 1.2, 16]} />
      <meshStandardMaterial color="#1a0f0f" />
    </mesh>
  </group>
);

const CommercialProduct = () => (
  <group>
    <mesh>
      <boxGeometry args={[1.2, 1.2, 1.2]} />
      <meshStandardMaterial 
        color="#ffffff" 
        metalness={0.2} 
        roughness={0.1}
        envMapIntensity={1.5}
      />
    </mesh>
    <mesh position-y={-0.8}>
      <cylinderGeometry args={[0.6, 0.6, 0.3, 32]} />
      <meshStandardMaterial color="#f0f0f0" metalness={0.5} roughness={0.2} />
    </mesh>
  </group>
);

// ============================================================================
// DYNAMIC 3D LIGHTING SYSTEM
// ============================================================================

const StudioLighting = ({ preset }: { preset: Preset }) => {
  const keyColor = kelvinToRGB(preset.lighting.key.kelvin);
  const fillColor = kelvinToRGB(preset.lighting.fill.kelvin);
  const rimColor = kelvinToRGB(preset.lighting.rim.kelvin);

  return (
    <>
      {/* Key Light */}
      <directionalLight
        position={[
          Math.cos(preset.lighting.key.x * Math.PI/180) * 4,
          -Math.sin(preset.lighting.key.y * Math.PI/180) * 3,
          2
        ]}
        intensity={preset.lighting.key.intensity * 2.5}
        color={keyColor}
        castShadow
      />
      
      {/* Fill Light */}
      <directionalLight
        position={[
          Math.cos(preset.lighting.fill.x * Math.PI/180) * 3,
          -Math.sin(preset.lighting.fill.y * Math.PI/180) * 2,
          1.5
        ]}
        intensity={preset.lighting.fill.intensity * 1.5}
        color={fillColor}
      />
      
      {/* Rim Light */}
      <directionalLight
        position={[
          Math.cos(preset.lighting.rim.x * Math.PI/180) * 3,
          -Math.sin(preset.lighting.rim.y * Math.PI/180) * 2,
          -1.5
        ]}
        intensity={preset.lighting.rim.intensity * 2.0}
        color={rimColor}
      />
    </>
  );
};

// ============================================================================
// PRESET CARD COMPONENT
// ============================================================================

const PresetCard = ({ 
  preset, 
  isActive, 
  onClick 
}: { 
  preset: Preset; 
  isActive: boolean; 
  onClick: () => void; 
}) => {
  const presetIconMap: Record<string, string> = {
    "Portrait Studio": "👤",
    "Product E-commerce": "💡",
    "Fashion Editorial": "👗",
    "Commercial Clean": "🏪"
  };

  return (
    <div 
      style={{ 
        ...presetCard, 
        ...(isActive ? activePresetCard : {}) 
      }} 
      onClick={onClick}
    >
      <div style={presetIcon}>{presetIconMap[preset.name] || "📸"}</div>
      <h3 style={presetTitle}>{preset.name}</h3>
      <p style={presetDescCard}>{preset.description}</p>
      {isActive && <div style={activeIndicator}>✅ ACTIVE</div>}
    </div>
  );
};

// ============================================================================
// MAIN INTERACTIVE DEMO GALLERY
// ============================================================================

export const ProfessionalPhotographyDemos = () => {
  const [activePreset, setActivePreset] = useState<PresetKey>('portrait');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const currentPreset = PRO_PHOTO_PRESETS[activePreset];

  const generateFIBO = () => {
    setIsGenerating(true);
    // Generate with locked seed + current lighting
    setTimeout(() => setIsGenerating(false), 2000);
  };

  return (
    <div style={demoContainer}>
      {/* Header */}
      <header style={demoHeader}>
        <h1 style={demoTitle}>📸 Professional Photography Demos</h1>
        <p style={demoSubtitle}>One-click studio lighting setups</p>
      </header>

      {/* Preset Selector */}
      <div style={presetSelector}>
        {(Object.keys(PRO_PHOTO_PRESETS) as PresetKey[]).map((key) => (
          <PresetCard
            key={key}
            preset={PRO_PHOTO_PRESETS[key]}
            isActive={activePreset === key}
            onClick={() => setActivePreset(key)}
          />
        ))}
      </div>

      {/* Live 3D Studio Preview */}
      <div style={isMobile ? studioPreviewContainerMobile : studioPreviewContainer}>
        <div style={studioInfo}>
          <h2 style={presetName}>{currentPreset.name}</h2>
          <p style={presetDesc}>{currentPreset.description}</p>
          <div style={cameraInfo}>
            {currentPreset.camera.focal}mm f/{currentPreset.camera.aperture} ISO{currentPreset.camera.iso}
          </div>
        </div>
        
        <div style={threeCanvasContainer}>
          <Canvas 
            camera={{ position: [0, 0, 5], fov: 50 }}
            shadows
            style={canvasStyle}
          >
            <color attach="background" args={[currentPreset.background]} />
            <Environment preset="studio" />
            <ContactShadows position={[-1, -1.5, 0]} opacity={0.4} scale={10} blur={2.5} />
            
            <StudioLighting preset={currentPreset} />
            
            {activePreset === 'portrait' && <PortraitHead />}
            {activePreset === 'product' && <ProductLamp />}
            {activePreset === 'fashion' && <FashionModel />}
            {activePreset === 'commercial' && <CommercialProduct />}
            
            <OrbitControls enableZoom={false} enablePan={false} />
          </Canvas>
        </div>
      </div>

      {/* FIBO JSON Preview */}
      <div style={fiboSection}>
        <h3 style={fiboSectionTitle}>FIBO JSON (Copy Ready)</h3>
        <pre style={fiboJson}>{JSON.stringify({
          camera: currentPreset.camera,
          lighting: currentPreset.lighting,
          style: activePreset,
          professional_setup: true
        }, null, 2)}</pre>
      </div>

      {/* Action Buttons */}
      <div style={actionButtons}>
        <button 
          onClick={generateFIBO} 
          disabled={isGenerating}
          style={generateBtn(isGenerating)}
        >
          {isGenerating ? '🎬 Generating...' : `🎬 Generate ${activePreset} Shot`}
        </button>
        <button style={repeatBtn} onClick={() => {}}>
          🔁 Identical Output
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// STYLES (Professional Dark Theme)
// ============================================================================

const demoContainer: React.CSSProperties = {
  background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3e 100%)',
  color: '#e0e7ff',
  minHeight: '100vh',
  fontFamily: '"Inter", -apple-system, sans-serif',
  padding: '2rem'
};

const demoHeader: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '3rem'
};

const demoTitle: React.CSSProperties = {
  fontSize: 'clamp(2.5rem, 5vw, 4rem)',
  fontWeight: 800,
  background: 'linear-gradient(135deg, #667eea 0%, #48bb78 50%, #f6ad55 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  margin: 0,
  lineHeight: 1.1
};

const demoSubtitle: React.CSSProperties = {
  fontSize: '1.25rem',
  color: '#a0aec0',
  marginTop: '0.5rem'
};

const presetSelector: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '1.5rem',
  marginBottom: '3rem',
  maxWidth: '1200px',
  margin: '0 auto 3rem'
};

const presetCard: React.CSSProperties = {
  background: 'rgba(26, 31, 58, 0.6)',
  border: '1px solid rgba(102, 126, 234, 0.3)',
  borderRadius: '20px',
  padding: '2rem',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  backdropFilter: 'blur(20px)'
};

const activePresetCard: React.CSSProperties = {
  background: 'rgba(102, 126, 234, 0.15)',
  borderColor: '#667eea',
  boxShadow: '0 20px 40px rgba(102, 126, 234, 0.3)',
  transform: 'translateY(-8px)'
};

const presetIcon: React.CSSProperties = {
  fontSize: '3rem',
  textAlign: 'center',
  marginBottom: '1rem'
};

const presetTitle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 700,
  margin: '0 0 0.5rem 0',
  color: '#e0e7ff'
};

const presetDescCard: React.CSSProperties = {
  fontSize: '0.9rem',
  color: '#a0aec0',
  margin: 0
};

const activeIndicator: React.CSSProperties = {
  marginTop: '1rem',
  padding: '0.5rem',
  background: 'rgba(72, 187, 120, 0.2)',
  borderRadius: '8px',
  textAlign: 'center',
  fontWeight: 700,
  color: '#48bb78'
};

const studioPreviewContainer: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(280px, 300px) 1fr',
  gap: '2rem',
  marginBottom: '2rem',
  maxWidth: '1400px',
  margin: '0 auto 2rem'
};

// For mobile, we'll handle this with a media query wrapper or inline style
const studioPreviewContainerMobile: React.CSSProperties = {
  ...studioPreviewContainer,
  gridTemplateColumns: '1fr'
};

const studioInfo: React.CSSProperties = {
  background: 'rgba(26, 31, 58, 0.6)',
  padding: '2rem',
  borderRadius: '20px',
  border: '1px solid rgba(102, 126, 234, 0.3)'
};

const presetName: React.CSSProperties = {
  fontSize: '2rem',
  fontWeight: 700,
  margin: '0 0 0.5rem 0',
  color: '#e0e7ff'
};

const presetDesc: React.CSSProperties = {
  fontSize: '1rem',
  color: '#a0aec0',
  margin: '0 0 1.5rem 0'
};

const cameraInfo: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 600,
  color: '#48bb78',
  padding: '0.75rem',
  background: 'rgba(72, 187, 120, 0.1)',
  borderRadius: '8px',
  textAlign: 'center'
};

const threeCanvasContainer: React.CSSProperties = {
  height: '500px',
  borderRadius: '24px',
  overflow: 'hidden',
  border: '2px solid rgba(102, 126, 234, 0.4)',
  background: 'rgba(10, 14, 39, 0.8)'
};

const canvasStyle: React.CSSProperties = {
  width: '100%',
  height: '100%'
};

const fiboSection: React.CSSProperties = {
  maxWidth: '800px',
  margin: '0 auto 2rem'
};

const fiboSectionTitle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 700,
  margin: '0 0 1rem 0',
  color: '#e0e7ff'
};

const fiboJson: React.CSSProperties = {
  background: 'rgba(15, 20, 41, 0.9)',
  padding: '1.5rem',
  borderRadius: '16px',
  fontSize: '13px',
  fontFamily: 'Monaco, Consolas, monospace',
  border: '1px solid rgba(102, 126, 234, 0.3)',
  maxHeight: '300px',
  overflow: 'auto',
  color: '#48bb78',
  margin: 0
};

const actionButtons: React.CSSProperties = {
  display: 'flex',
  gap: '1rem',
  justifyContent: 'center',
  maxWidth: '600px',
  margin: '0 auto'
};

const generateBtn = (disabled: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '1.25rem 2rem',
  background: disabled 
    ? 'rgba(102, 126, 234, 0.4)' 
    : 'linear-gradient(135deg, #667eea 0%, #48bb78 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '16px',
  fontSize: '1.25rem',
  fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  boxShadow: disabled ? 'none' : '0 12px 32px rgba(102, 126, 234, 0.4)',
  transition: 'all 0.3s ease'
});

const repeatBtn: React.CSSProperties = {
  padding: '1.25rem 2rem',
  background: 'rgba(72, 187, 120, 0.2)',
  color: '#48bb78',
  border: '2px solid #48bb78',
  borderRadius: '16px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  fontSize: '1.25rem'
};

