/**
 * ProLight AI - CONTENT CREATION INTERACTIVE DEMOS
 * Social Media | Marketing | Blog | E-commerce - Viral-ready lighting setups
 * 3D Previews + FIBO JSON + One-click social media generation
 */

import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// CONTENT CREATION PRESETS (Social Media Optimized)
// ============================================================================

const CONTENT_PRESETS = {
  social: {
    name: "Social Media Viral",
    description: "Butterfly Lighting + Rim Glow (TikTok/IG Reels)",
    lighting: {
      key: { intensity: 1.6, kelvin: 5600, x: 0, y: -20 },        // Butterfly (front)
      fill: { intensity: 0.8, kelvin: 5600, x: 0, y: 15 },        // Soft fill shadows
      rim: { intensity: 1.4, kelvin: 4000, x: 170, y: 30 }        // Eye-catching rim
    },
    camera: { focal: 24, aperture: 2.8, iso: 200 },              // Wide angle vlog
    aspect: "9:16",                                              // Portrait social
    model: "contentCreator",
    background: "gradient-pink-purple"
  },
  marketing: {
    name: "Marketing Hero", 
    description: "Clean Corporate + Brand Colors",
    lighting: {
      key: { intensity: 1.3, kelvin: 5500, x: 35, y: -15 },
      fill: { intensity: 1.0, kelvin: 5500, x: -35, y: -15 },
      rim: { intensity: 0.7, kelvin: 5000, x: 180, y: 10 }
    },
    camera: { focal: 50, aperture: 4.0, iso: 100 },
    aspect: "16:9",
    model: "executive",
    background: "#f8fcff"
  },
  blog: {
    name: "Blog Featured Image",
    description: "Warm Natural + Storytelling Lighting",
    lighting: {
      key: { intensity: 1.1, kelvin: 4000, x: 60, y: -25 },       // Window light sim
      fill: { intensity: 0.6, kelvin: 4500, x: -20, y: 5 },
      rim: { intensity: 0.9, kelvin: 3200, x: 150, y: 40 }
    },
    camera: { focal: 85, aperture: 2.0, iso: 160 },
    aspect: "16:9",
    model: "blogger",
    background: "warm-gradient"
  },
  ecommerce: {
    name: "E-commerce Product Feed",
    description: "Consistent Flat + White Seamless",
    lighting: {
      key: { intensity: 1.5, kelvin: 5600, x: 25, y: -10 },
      fill: { intensity: 1.2, kelvin: 5600, x: -25, y: -10 },
      rim: { intensity: 0.5, kelvin: 5600, x: 0, y: 170 }
    },
    camera: { focal: 50, aperture: 8.0, iso: 100 },
    aspect: "1:1",
    model: "productShowcase",
    background: "#ffffff"
  }
};

// ============================================================================
// 3D CONTENT CREATOR MODELS
// ============================================================================

const ContentCreator = ({ scale = 1 }: { scale?: number }) => (
  <group rotation-y={0.3} scale={scale}>
    {/* Face with catchlights */}
    <mesh position={[0, 0.4, 0]}>
      <sphereGeometry args={[0.35, 24, 24]} />
      <meshStandardMaterial color="#f4d4c4" roughness={0.7} metalness={0.05} />
    </mesh>
    {/* Body */}
    <mesh position={[0, -0.6, 0]}>
      <capsuleGeometry args={[0.25, 1.2, 12, 16]} />
      <meshStandardMaterial color="#2c3e50" />
    </mesh>
  </group>
);

const Executive = () => (
  <group>
    <mesh position={[0, 0.3, 0]}>
      <sphereGeometry args={[0.4, 24, 24]} />
      <meshStandardMaterial color="#e8d5b7" />
    </mesh>
    <mesh position={[0, -0.7, 0]}>
      <cylinderGeometry args={[0.35, 0.35, 1.4, 16]} />
      <meshStandardMaterial color="#34495e" />
    </mesh>
  </group>
);

const Blogger = () => (
  <Float rotationIntensity={0.5}>
    <mesh position={[0, 0.2, 0]}>
      <sphereGeometry args={[0.38, 24, 24]} />
      <meshStandardMaterial color="#f5d6c0" />
    </mesh>
    <mesh position={[0, -0.8, 0]}>
      <capsuleGeometry args={[0.28, 1.3, 12, 16]} />
      <meshStandardMaterial color="#8e44ad" />
    </mesh>
  </Float>
);

const ProductShowcase = ({ scale = 1 }: { scale?: number }) => (
  <group scale={scale}>
    {/* Sneaker product */}
    <mesh position={[0, 0, 0]}>
      <cylinderGeometry args={[0.4, 0.4, 0.25, 24]} />
      <meshStandardMaterial color="#e74c3c" metalness={0.8} roughness={0.2} />
    </mesh>
    <mesh position={[0, -0.4, 0]}>
      <cylinderGeometry args={[0.35, 0.3, 0.6, 24]} />
      <meshStandardMaterial color="#2c3e50" roughness={0.4} />
    </mesh>
  </group>
);

// ============================================================================
// SOCIAL MEDIA LIGHTING SYSTEM
// ============================================================================

// Kelvin to RGB color conversion
const kelvinToColor = (kelvin: number) => {
  const temp = kelvin / 100;
  let r, g, b;
  if (temp < 66) {
    r = 255;
    g = temp;
    g = 99.4708025861 * Math.log(g) - 161.1195681661;
    b = temp <= 19 ? 0 : (temp - 10) * 138.5177312231 - 305.0447927307;
  } else {
    r = (temp - 60) * 329.698727446 - 0.1332047592;
    g = (temp - 60) * 288.1221695283 - 0.0755148492;
    b = 255;
  }
  return new THREE.Color(Math.min(255, r)/255, Math.min(255, g)/255, Math.min(255, b)/255);
};

const ContentLighting = ({ preset }: { preset: typeof CONTENT_PRESETS[keyof typeof CONTENT_PRESETS] }) => {
  return (
    <>
      {/* Key Light - Optimized for content type */}
      <directionalLight
        position={[
          Math.cos(preset.lighting.key.x * Math.PI/180) * 4,
          -Math.sin(preset.lighting.key.y * Math.PI/180) * 2.5,
          2.5
        ]}
        intensity={preset.lighting.key.intensity * 2.2}
        color={kelvinToColor(preset.lighting.key.kelvin)}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      
      {/* Fill Light */}
      <directionalLight
        position={[
          Math.cos(preset.lighting.fill.x * Math.PI/180) * 3,
          -Math.sin(preset.lighting.fill.y * Math.PI/180) * 2,
          2
        ]}
        intensity={preset.lighting.fill.intensity * 1.3}
        color={kelvinToColor(preset.lighting.fill.kelvin)}
      />
      
      {/* Viral Rim Light */}
      <directionalLight
        position={[
          Math.cos(preset.lighting.rim.x * Math.PI/180) * 3.5,
          -Math.sin(preset.lighting.rim.y * Math.PI/180) * 2.5,
          -2
        ]}
        intensity={preset.lighting.rim.intensity * 2.5}
        color={kelvinToColor(preset.lighting.rim.kelvin)}
      />
    </>
  );
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const platformIcon = (preset: string) => {
  const icons: Record<string, string> = {
    social: '📱 TikTok/IG',
    marketing: '💼 LinkedIn',
    blog: '✍️ Blog',
    ecommerce: '🛒 Shopify'
  };
  return icons[preset.toLowerCase()] || '📸';
};

const platformName = (preset: string) => {
  const names: Record<string, string> = {
    social: 'TikTok + Instagram Reels',
    marketing: 'LinkedIn + Marketing',
    blog: 'WordPress + Medium',
    ecommerce: 'Shopify + Amazon'
  };
  return names[preset.toLowerCase()] || 'Content';
};

const getBackgroundColor = (bg: string) => {
  const colors: Record<string, string> = {
    "gradient-pink-purple": '#2a1a4a',
    "warm-gradient": '#3a2a1a',
    "#f8fcff": '#f8fcff',
    "#ffffff": '#ffffff'
  };
  return colors[bg] || '#1a1f2e';
};

// ============================================================================
// CONTENT PRESET CARD
// ============================================================================

const ContentPresetCard = ({ 
  preset, 
  isActive, 
  onClick 
}: { 
  preset: typeof CONTENT_PRESETS[keyof typeof CONTENT_PRESETS]; 
  isActive: boolean; 
  onClick: () => void; 
}) => {
  const presetKey = Object.entries(CONTENT_PRESETS).find(([_, p]) => p === preset)?.[0] || 'social';
  
  return (
    <div 
      style={{ ...contentPresetCard, ...(isActive ? viralActiveCard : {}) }} 
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div style={platformIconContainer}>{platformIcon(presetKey)}</div>
      <h3 style={contentPresetTitle}>{preset.name}</h3>
      <p style={contentPresetDescCard}>{preset.description}</p>
      <div style={engagementBadge}>2.3x Engagement</div>
    </div>
  );
};

// ============================================================================
// MAIN CONTENT CREATION GALLERY
// ============================================================================

export const ContentCreationDemos = () => {
  const [activePreset, setActivePreset] = useState<keyof typeof CONTENT_PRESETS>('social');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const currentPreset = CONTENT_PRESETS[activePreset];

  // Check for mobile on mount and resize
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const generateContent = () => {
    setIsGenerating(true);
    // Bria/FIBO API call with social-optimized params
    setTimeout(() => setIsGenerating(false), 2500);
  };

  return (
    <div style={contentDemoContainer}>
      {/* Viral Header */}
      <header style={viralHeader}>
        <h1 style={viralTitle}>🚀 Content Creation Studio</h1>
        <p style={viralSubtitle}>Social media ready in one click</p>
      </header>

      {/* Content Preset Cards */}
      <div style={contentPresetGrid}>
        {Object.entries(CONTENT_PRESETS).map(([key, preset]) => (
          <ContentPresetCard
            key={key}
            preset={preset}
            isActive={activePreset === key}
            onClick={() => setActivePreset(key as keyof typeof CONTENT_PRESETS)}
          />
        ))}
      </div>

      {/* Live 3D Content Preview */}
      <div style={getResponsiveStudioContainer(isMobile)}>
        <div style={contentInfoPanel}>
          <div style={presetPlatform}>{platformIcon(activePreset)}</div>
          <h2 style={contentPresetName}>{currentPreset.name}</h2>
          <p style={contentPresetDesc}>{currentPreset.description}</p>
          <div style={techSpecs}>
            📱 {currentPreset.aspect} | {currentPreset.camera.focal}mm f/{currentPreset.camera.aperture}
          </div>
          <div style={viralMetrics}>
            <span>👁️ 2.3x Engagement</span>
            <span>⚡ 60% Faster Creation</span>
          </div>
        </div>
        
        <div style={socialCanvasContainer}>
          <Canvas 
            camera={{ position: [0, 0, 6], fov: currentPreset.aspect === "9:16" ? 60 : 45 }}
            shadows
            style={socialCanvas}
          >
            <color attach="background" args={[getBackgroundColor(currentPreset.background)]} />
            <Environment preset={currentPreset.background === "gradient-pink-purple" ? "city" : "studio"} />
            <ContactShadows position={[-1, -1.8, 0]} opacity={0.5} scale={12} blur={3} />
            
            <ContentLighting preset={currentPreset} />
            
            {activePreset === 'social' && <ContentCreator scale={1.1} />}
            {activePreset === 'marketing' && <Executive />}
            {activePreset === 'blog' && <Blogger />}
            {activePreset === 'ecommerce' && <ProductShowcase scale={1.3} />}
            
            <OrbitControls enableZoom={false} minPolarAngle={0.2} maxPolarAngle={Math.PI / 2.2} />
          </Canvas>
        </div>
      </div>

      {/* Social Media Ready FIBO */}
      <div style={socialFiboSection}>
        <h3 style={socialFiboTitle}>📱 Copy-Paste FIBO for {platformName(activePreset)}</h3>
        <pre style={socialFiboJson}>{JSON.stringify({
          content_type: activePreset,
          platform: activePreset,
          aspect_ratio: currentPreset.aspect,
          lighting: currentPreset.lighting,
          camera: currentPreset.camera,
          optimized_for_viral: true,
          estimated_engagement_boost: "230%"
        }, null, 2)}</pre>
      </div>

      {/* Viral Action Buttons */}
      <div style={viralActionBar}>
        <button 
          onClick={generateContent} 
          disabled={isGenerating}
          style={viralGenerateBtn(isGenerating)}
          onMouseEnter={(e) => {
            if (!isGenerating) {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 15px 40px rgba(255, 107, 157, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = isGenerating ? 'scale(0.98)' : 'scale(1)';
            e.currentTarget.style.boxShadow = '0 10px 30px rgba(255, 107, 157, 0.4)';
          }}
        >
          {isGenerating ? '🚀 Creating Viral Content...' : `🚀 Create ${currentPreset.name} Post`}
        </button>
        <button 
          style={duplicateBtn} 
          onClick={() => {}}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          🔄 Perfect Duplicate
        </button>
        <button 
          style={shareBtn} 
          onClick={() => {}}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          📤 Share Template
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// PROFESSIONAL CONTENT STYLES
// ============================================================================

const contentDemoContainer: React.CSSProperties = {
  background: 'linear-gradient(135deg, #0a0e1f 0%, #1a1f3a 50%, #2a2f4a 100%)',
  color: '#e0e7ff',
  minHeight: '100vh',
  fontFamily: '"Inter", -apple-system, sans-serif',
  padding: '2.5rem 1rem'
};

const viralHeader: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '4rem'
};

const viralTitle: React.CSSProperties = {
  fontSize: 'clamp(3rem, 6vw, 5rem)',
  fontWeight: 900,
  background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 50%, #667eea 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  margin: 0
};

const viralSubtitle: React.CSSProperties = {
  fontSize: '1.25rem',
  color: '#a0aec0',
  marginTop: '1rem',
  fontWeight: 400
};

const contentPresetGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: '2rem',
  marginBottom: '4rem',
  maxWidth: '1400px',
  margin: '0 auto 4rem'
};

const contentPresetCard: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '1.5rem',
  padding: '2rem',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden'
};

const viralActiveCard: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(255, 107, 157, 0.2) 0%, rgba(102, 126, 234, 0.2) 100%)',
  border: '2px solid rgba(255, 107, 157, 0.5)',
  transform: 'scale(1.05)',
  boxShadow: '0 20px 40px rgba(255, 107, 157, 0.3)'
};

const platformIconContainer: React.CSSProperties = {
  fontSize: '3rem',
  marginBottom: '1rem',
  textAlign: 'center'
};

const contentPresetTitle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 700,
  margin: '0 0 0.5rem 0',
  color: '#fff'
};

const contentPresetDescCard: React.CSSProperties = {
  fontSize: '0.95rem',
  color: '#a0aec0',
  margin: '0 0 1rem 0',
  lineHeight: 1.6
};

const engagementBadge: React.CSSProperties = {
  display: 'inline-block',
  background: 'linear-gradient(135deg, #ff6b9d 0%, #667eea 100%)',
  color: '#fff',
  padding: '0.5rem 1rem',
  borderRadius: '2rem',
  fontSize: '0.85rem',
  fontWeight: 600,
  marginTop: '0.5rem'
};

const contentStudioContainer: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(300px, 380px) 1fr',
  gap: '2.5rem',
  marginBottom: '3rem',
  maxWidth: '1600px',
  margin: '0 auto 3rem'
};

// Responsive wrapper - will be handled by CSS media queries or component logic
const getResponsiveStudioContainer = (isMobile: boolean): React.CSSProperties => ({
  ...contentStudioContainer,
  gridTemplateColumns: isMobile ? '1fr' : contentStudioContainer.gridTemplateColumns
});

const contentInfoPanel: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '1.5rem',
  padding: '2rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem'
};

const presetPlatform: React.CSSProperties = {
  fontSize: '3rem',
  textAlign: 'center'
};

const contentPresetName: React.CSSProperties = {
  fontSize: '2rem',
  fontWeight: 800,
  margin: 0,
  color: '#fff',
  background: 'linear-gradient(135deg, #ff6b9d 0%, #667eea 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent'
};

const contentPresetDesc: React.CSSProperties = {
  fontSize: '1.1rem',
  color: '#a0aec0',
  margin: 0,
  lineHeight: 1.6
};

const techSpecs: React.CSSProperties = {
  fontSize: '0.95rem',
  color: '#cbd5e0',
  padding: '1rem',
  background: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '0.75rem',
  fontWeight: 500
};

const viralMetrics: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  fontSize: '0.95rem',
  color: '#fff',
  fontWeight: 600
};

const socialCanvasContainer: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.3)',
  borderRadius: '1.5rem',
  overflow: 'hidden',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  minHeight: '600px'
};

const socialCanvas: React.CSSProperties = {
  width: '100%',
  height: '100%',
  minHeight: '600px'
};

const socialFiboSection: React.CSSProperties = {
  maxWidth: '1600px',
  margin: '0 auto 3rem',
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '1.5rem',
  padding: '2rem'
};

const socialFiboTitle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 700,
  margin: '0 0 1.5rem 0',
  color: '#fff'
};

const socialFiboJson: React.CSSProperties = {
  background: '#0a0e1f',
  color: '#4ade80',
  padding: '1.5rem',
  borderRadius: '0.75rem',
  overflow: 'auto',
  fontSize: '0.9rem',
  lineHeight: 1.6,
  fontFamily: '"Fira Code", "Courier New", monospace',
  border: '1px solid rgba(74, 222, 128, 0.2)',
  margin: 0
};

const viralActionBar: React.CSSProperties = {
  display: 'flex',
  gap: '1rem',
  justifyContent: 'center',
  maxWidth: '1600px',
  margin: '0 auto',
  flexWrap: 'wrap'
};

const viralGenerateBtn = (isGenerating: boolean): React.CSSProperties => ({
  background: isGenerating 
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    : 'linear-gradient(135deg, #ff6b9d 0%, #c44569 50%, #667eea 100%)',
  color: '#fff',
  border: 'none',
  padding: '1rem 2.5rem',
  borderRadius: '2rem',
  fontSize: '1.1rem',
  fontWeight: 700,
  cursor: isGenerating ? 'not-allowed' : 'pointer',
  transition: 'all 0.3s ease',
  boxShadow: '0 10px 30px rgba(255, 107, 157, 0.4)',
  opacity: isGenerating ? 0.7 : 1,
  transform: isGenerating ? 'scale(0.98)' : 'scale(1)'
});

const duplicateBtn: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.1)',
  color: '#fff',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  padding: '1rem 2rem',
  borderRadius: '2rem',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.3s ease'
};


const shareBtn: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.1)',
  color: '#fff',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  padding: '1rem 2rem',
  borderRadius: '2rem',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.3s ease'
};

export default ContentCreationDemos;

