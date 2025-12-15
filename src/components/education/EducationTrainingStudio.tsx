/**
 * ProLight AI - EDUCATION & TRAINING INTERACTIVE DEMOS
 * Photography Education | Workshops | Portfolio - Learn by doing
 * Real-time lighting experiments + Progress tracking + Certificates
 */

import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Text } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// EDUCATION MODULES (Progressive Learning Path)
// ============================================================================

const EDUCATION_MODULES = {
  beginner: {
    name: "Beginner: 3-Point Basics",
    description: "Learn Key, Fill, Rim lighting fundamentals",
    lighting: {
      key: { intensity: 1.2, kelvin: 5600, x: 45, y: -20, locked: false },
      fill: { intensity: 0.6, kelvin: 5600, x: -45, y: -15, locked: false },
      rim: { intensity: 0.8, kelvin: 5600, x: 180, y: 30, locked: true }
    },
    learningObjective: "Understand 3:1 lighting ratio",
    quiz: ["What is the purpose of fill light?", "Key:fill ratio?"],
    difficulty: "Beginner"
  },
  rembrandt: {
    name: "Intermediate: Rembrandt Lighting",
    description: "Create the classic triangle shadow pattern",
    lighting: {
      key: { intensity: 1.4, kelvin: 5600, x: 35, y: -25, locked: false },
      fill: { intensity: 0.5, kelvin: 5600, x: -20, y: 10, locked: false },
      rim: { intensity: 1.0, kelvin: 3200, x: 140, y: 25, locked: true }
    },
    learningObjective: "Master Rembrandt triangle",
    quiz: ["Angle for Rembrandt?", "Fill light position?"],
    difficulty: "Intermediate"
  },
  butterfly: {
    name: "Advanced: Butterfly Lighting",
    description: "Hollywood glamour lighting pattern",
    lighting: {
      key: { intensity: 1.6, kelvin: 5600, x: 0, y: -30, locked: false },
      fill: { intensity: 0.8, kelvin: 5600, x: 0, y: 20, locked: false },
      rim: { intensity: 1.2, kelvin: 4000, x: 170, y: 35, locked: true }
    },
    learningObjective: "Perfect butterfly shadow under nose",
    quiz: ["Key light position?", "Why butterfly for portraits?"],
    difficulty: "Advanced"
  },
  portfolio: {
    name: "Portfolio: Mixed Styles",
    description: "Create 3 portfolio-ready shots",
    lighting: {
      key: { intensity: 1.3, kelvin: 5000, x: 30, y: -15, locked: false },
      fill: { intensity: 0.7, kelvin: 5000, x: -30, y: -10, locked: false },
      rim: { intensity: 1.1, kelvin: 3800, x: 160, y: 20, locked: false }
    },
    learningObjective: "Build consistent portfolio lighting",
    quiz: ["Consistency across shots?", "Brand lighting ratios?"],
    difficulty: "Portfolio"
  }
};

type ModuleKey = keyof typeof EDUCATION_MODULES;

interface LightingConfig {
  intensity: number;
  kelvin: number;
  x: number;
  y: number;
  locked: boolean;
}

interface Module {
  name: string;
  description: string;
  lighting: {
    key: LightingConfig;
    fill: LightingConfig;
    rim: LightingConfig;
  };
  learningObjective: string;
  quiz: string[];
  difficulty: string;
}

// ============================================================================
// INTERACTIVE LEARNING MODEL
// ============================================================================

const LearningSubject = ({ module }: { module: ModuleKey }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial 
          color="#f8d7c8" 
          metalness={0.1} 
          roughness={0.6}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Learning annotations */}
      <Text position={[1.5, 0, 0]} fontSize={0.2} color="#667eea">
        Key Light
      </Text>
      <Text position={[-1.5, 0, 0]} fontSize={0.2} color="#48bb78">
        Fill Light
      </Text>
    </group>
  );
};

// ============================================================================
// EDUCATION LIGHTING SYSTEM (Experiment Friendly)
// ============================================================================

const EducationalLighting = ({ 
  lighting, 
  onLightChange 
}: {
  lighting: Module['lighting'];
  onLightChange: (light: string, property: string, value: number) => void;
}) => {
  return (
    <>
      {/* Interactive Key Light */}
      <directionalLight
        position={[
          Math.cos(lighting.key.x * Math.PI/180) * 4,
          -Math.sin(lighting.key.y * Math.PI/180) * 3,
          2
        ]}
        intensity={lighting.key.intensity * 2.5}
        color="#ffeb99"
        castShadow
      />
      
      {/* Interactive Fill Light */}
      <directionalLight
        position={[
          Math.cos(lighting.fill.x * Math.PI/180) * 3.5,
          -Math.sin(lighting.fill.y * Math.PI/180) * 2.5,
          1.5
        ]}
        intensity={lighting.fill.intensity * 1.5}
        color="#a8e6cf"
      />
      
      {/* Fixed Rim Light (locked for learning) */}
      <directionalLight
        position={[0, 1, -2.5]}
        intensity={lighting.rim.intensity * 2}
        color="#ff9999"
      />
    </>
  );
};

// ============================================================================
// EDUCATION COMPONENTS
// ============================================================================

const SliderControl = ({ 
  label, 
  value, 
  min, 
  max, 
  onChange 
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) => (
  <div style={sliderContainer}>
    <label style={sliderLabel}>{label}: {value.toFixed(1)}</label>
    <input
      type="range"
      min={min} 
      max={max} 
      step={0.1}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={educationalSlider}
    />
  </div>
);

const ModuleCard = ({ 
  module, 
  isActive, 
  progress, 
  onClick 
}: {
  module: Module;
  isActive: boolean;
  progress: number;
  onClick: () => void;
}) => (
  <div 
    style={{ ...moduleCard, ...(isActive ? activeModuleCard : {}) }} 
    onClick={onClick}
  >
    <div style={difficultyBadge(module.difficulty)}>{module.difficulty}</div>
    <h3 style={moduleCardTitle}>{module.name}</h3>
    <p style={moduleCardDescription}>{module.description}</p>
    <div style={progressRing(progress)}>
      <div style={progressRingInner}>{progress}%</div>
    </div>
  </div>
);

const QuizQuestion = ({
  question,
  index,
  onAnswer
}: {
  question: string;
  index: number;
  onAnswer: (answer: string) => void;
}) => {
  const [answer, setAnswer] = useState('');

  const handleAnswer = (value: string) => {
    setAnswer(value);
    if (value.trim()) {
      onAnswer(value);
    }
  };

  return (
    <div style={quizQuestionContainer}>
      <p style={quizQuestionText}>{question}</p>
      <input
        type="text"
        value={answer}
        onChange={(e) => handleAnswer(e.target.value)}
        onBlur={() => answer.trim() && onAnswer(answer)}
        placeholder="Your answer..."
        style={quizInput}
      />
    </div>
  );
};

const CertificateBadge = ({ onClick }: { onClick: () => void }) => (
  <div style={certificateBadge} onClick={onClick}>
    🎉 Certificate Unlocked! Download Portfolio
  </div>
);

const PortfolioShot = ({
  module,
  lighting
}: {
  module: ModuleKey;
  lighting: Module['lighting'];
}) => {
  return (
    <div style={portfolioShotCard}>
      <div style={portfolioShotPreview}>
        <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
          <color attach="background" args={['#1a1a1a']} />
          <EducationalLighting lighting={lighting} onLightChange={() => {}} />
          <mesh>
            <sphereGeometry args={[0.8, 32, 32]} />
            <meshStandardMaterial color="#f8d7c8" />
          </mesh>
        </Canvas>
      </div>
      <p style={portfolioShotLabel}>{EDUCATION_MODULES[module].name}</p>
    </div>
  );
};

// ============================================================================
// MAIN EDUCATION PLATFORM
// ============================================================================

export const EducationTrainingStudio = () => {
  const [activeModule, setActiveModule] = useState<ModuleKey>('beginner');
  const [lighting, setLighting] = useState(EDUCATION_MODULES[activeModule].lighting);
  const [progress, setProgress] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [certificateUnlocked, setCertificateUnlocked] = useState(false);

  const currentModule = EDUCATION_MODULES[activeModule];

  // Reset lighting when module changes
  useEffect(() => {
    setLighting(currentModule.lighting);
    setProgress(0);
  }, [activeModule]);

  const updateLight = (light: string, property: string, value: number) => {
    const lightConfig = currentModule.lighting[light as keyof typeof currentModule.lighting];
    if (lightConfig && !lightConfig.locked) {
      setLighting(prev => ({
        ...prev,
        [light]: { ...prev[light as keyof typeof prev], [property]: value }
      }));
      
      // Learning progress
      setProgress(prev => Math.min(100, prev + 2));
    }
  };

  const completeQuiz = (answer: string, questionIndex: number) => {
    setQuizAnswers(prev => {
      const updated = {
        ...prev,
        [`${activeModule}_q${questionIndex}`]: answer
      };
      
      // Check if we have enough answers to unlock certificate
      const currentModuleAnswers = Object.keys(updated).filter(key => 
        key.startsWith(`${activeModule}_`)
      );
      
      if (currentModuleAnswers.length >= 2) {
        setCertificateUnlocked(true);
      }
      
      return updated;
    });
  };

  return (
    <div style={educationContainer}>
      {/* Education Header */}
      <header style={educationHeader}>
        <h1 style={educationTitle}>🎓 Photography Lighting Academy</h1>
        <p style={educationSubtitle}>Learn by doing - Real-time experiments</p>
        <div style={progressBarContainer}>
          <div style={{ ...progressBar, width: `${progress}%` }} />
          <span style={progressText}>{progress}% Module Complete</span>
        </div>
      </header>

      {/* Module Selector */}
      <div style={moduleSelector}>
        {Object.entries(EDUCATION_MODULES).map(([key, module]) => (
          <ModuleCard
            key={key}
            module={module}
            isActive={activeModule === key}
            progress={progress}
            onClick={() => setActiveModule(key as ModuleKey)}
          />
        ))}
      </div>

      {/* Interactive Learning Studio */}
      <div style={learningStudioContainer}>
        <div style={learningControls}>
          <h2 style={moduleTitle}>{currentModule.name}</h2>
          <p style={learningObjective}>{currentModule.learningObjective}</p>
          
          {/* Interactive Sliders */}
          <div style={controlPanel}>
            <h4 style={controlPanelTitle}>Key Light (Yellow)</h4>
            <SliderControl 
              label="Intensity" 
              value={lighting.key.intensity} 
              min={0.5} 
              max={2.5} 
              onChange={(v) => updateLight('key', 'intensity', v)}
            />
            <SliderControl 
              label="Angle" 
              value={lighting.key.x} 
              min={-90} 
              max={90} 
              onChange={(v) => updateLight('key', 'x', v)}
            />
            
            <h4 style={{ ...controlPanelTitle, marginTop: '1.5rem' }}>Fill Light (Green)</h4>
            <SliderControl 
              label="Intensity" 
              value={lighting.fill.intensity} 
              min={0.2} 
              max={1.5} 
              onChange={(v) => updateLight('fill', 'intensity', v)}
            />
          </div>
        </div>
        
        <div style={threeStudioContainer}>
          <Canvas camera={{ position: [0, 0, 5], fov: 50 }} shadows>
            <color attach="background" args={['#0f1419']} />
            <Environment preset="studio" />
            <ContactShadows opacity={0.6} scale={12} blur={2.5} />
            
            <EducationalLighting lighting={lighting} onLightChange={updateLight} />
            <LearningSubject module={activeModule} />
            
            <OrbitControls enableZoom={false} />
          </Canvas>
        </div>
      </div>

      {/* Interactive Quiz */}
      <div style={quizSection}>
        <h3 style={quizSectionTitle}>✅ Verify Learning</h3>
        <div style={quizContainer}>
          {currentModule.quiz.slice(0, 2).map((question, i) => (
            <QuizQuestion
              key={i}
              question={question}
              index={i}
              onAnswer={(answer) => completeQuiz(answer, i)}
            />
          ))}
        </div>
        {certificateUnlocked && (
          <CertificateBadge onClick={() => {}} />
        )}
      </div>

      {/* Portfolio Builder */}
      <div style={portfolioSection}>
        <h3 style={portfolioSectionTitle}>📁 Portfolio Generator</h3>
        <div style={portfolioGrid}>
          {(['beginner', 'rembrandt', 'butterfly'] as ModuleKey[]).map((mod) => (
            <PortfolioShot 
              key={mod} 
              module={mod}
              lighting={EDUCATION_MODULES[mod].lighting}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STYLES (Educational Design)
// ============================================================================

const educationContainer: React.CSSProperties = {
  background: 'linear-gradient(135deg, #0a1428 0%, #1a2a4a 100%)',
  color: '#e0e7ff',
  minHeight: '100vh',
  fontFamily: '"Inter", -apple-system, sans-serif',
  padding: '2rem'
};

const educationHeader: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '3rem'
};

const educationTitle: React.CSSProperties = {
  fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
  fontWeight: 900,
  background: 'linear-gradient(135deg, #667eea 0%, #48bb78 50%, #f6ad55 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  margin: 0
};

const educationSubtitle: React.CSSProperties = {
  fontSize: '1.25rem',
  color: '#94a3b8',
  marginTop: '0.5rem'
};

const progressBarContainer: React.CSSProperties = {
  marginTop: '1.5rem',
  background: 'rgba(42, 47, 74, 0.6)',
  borderRadius: '12px',
  padding: '4px',
  maxWidth: '400px',
  margin: '1.5rem auto 0',
  position: 'relative'
};

const progressBar: React.CSSProperties = {
  height: '8px',
  background: 'linear-gradient(90deg, #667eea, #48bb78)',
  borderRadius: '8px',
  transition: 'width 0.3s ease'
};

const progressText: React.CSSProperties = {
  display: 'block',
  marginTop: '0.5rem',
  fontSize: '0.875rem',
  color: '#cbd5e1'
};

const moduleSelector: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '1.5rem',
  marginBottom: '3rem',
  maxWidth: '1400px',
  margin: '0 auto 3rem'
};

const moduleCard: React.CSSProperties = {
  background: 'rgba(30, 41, 59, 0.6)',
  borderRadius: '16px',
  padding: '1.5rem',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  border: '2px solid transparent',
  position: 'relative',
  overflow: 'hidden'
};

const activeModuleCard: React.CSSProperties = {
  borderColor: '#667eea',
  background: 'rgba(102, 126, 234, 0.15)',
  transform: 'scale(1.02)'
};

const moduleCardTitle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 700,
  margin: '0.5rem 0',
  color: '#e0e7ff'
};

const moduleCardDescription: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#94a3b8',
  margin: '0.5rem 0'
};

const difficultyBadge = (difficulty: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '0.25rem 0.75rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: 600,
  background: difficulty === 'Beginner' ? '#48bb78' : 
              difficulty === 'Intermediate' ? '#f6ad55' : 
              difficulty === 'Advanced' ? '#fc8181' : '#667eea',
  color: '#fff',
  marginBottom: '0.5rem'
});

const progressRing = (progress: number): React.CSSProperties => ({
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  border: '4px solid rgba(102, 126, 234, 0.3)',
  borderTopColor: '#667eea',
  position: 'relative',
  marginTop: '1rem'
});

const progressRingInner: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#667eea'
};

const learningStudioContainer: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '450px 1fr',
  gap: '2.5rem',
  marginBottom: '3rem',
  maxWidth: '1600px',
  margin: '0 auto 3rem'
};

const learningControls: React.CSSProperties = {
  background: 'rgba(30, 41, 59, 0.6)',
  borderRadius: '16px',
  padding: '2rem'
};

const moduleTitle: React.CSSProperties = {
  fontSize: '2rem',
  fontWeight: 700,
  marginBottom: '0.5rem',
  color: '#e0e7ff'
};

const learningObjective: React.CSSProperties = {
  fontSize: '1rem',
  color: '#94a3b8',
  marginBottom: '2rem'
};

const controlPanel: React.CSSProperties = {
  marginTop: '2rem'
};

const controlPanelTitle: React.CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: 600,
  color: '#e0e7ff',
  marginBottom: '1rem'
};

const sliderContainer: React.CSSProperties = {
  marginBottom: '1.5rem'
};

const sliderLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '0.875rem',
  color: '#cbd5e1',
  marginBottom: '0.5rem'
};

const educationalSlider: React.CSSProperties = {
  width: '100%',
  height: '6px',
  background: 'rgba(102, 126, 234, 0.3)',
  borderRadius: '3px',
  outline: 'none',
  accentColor: '#667eea'
};

const threeStudioContainer: React.CSSProperties = {
  width: '100%',
  height: '600px',
  background: '#0f1419',
  borderRadius: '16px',
  overflow: 'hidden'
};

const quizSection: React.CSSProperties = {
  background: 'rgba(30, 41, 59, 0.6)',
  borderRadius: '16px',
  padding: '2rem',
  marginBottom: '3rem',
  maxWidth: '1200px',
  margin: '0 auto 3rem'
};

const quizSectionTitle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 700,
  marginBottom: '1.5rem',
  color: '#e0e7ff'
};

const quizContainer: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem'
};

const quizQuestionContainer: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.6)',
  borderRadius: '12px',
  padding: '1.5rem'
};

const quizQuestionText: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 600,
  color: '#e0e7ff',
  marginBottom: '0.75rem'
};

const quizInput: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  background: 'rgba(30, 41, 59, 0.8)',
  border: '1px solid rgba(102, 126, 234, 0.3)',
  borderRadius: '8px',
  color: '#e0e7ff',
  fontSize: '0.875rem',
  outline: 'none'
};

const certificateBadge: React.CSSProperties = {
  marginTop: '2rem',
  padding: '1.5rem',
  background: 'linear-gradient(135deg, #667eea, #48bb78)',
  borderRadius: '12px',
  textAlign: 'center',
  fontSize: '1.125rem',
  fontWeight: 600,
  color: '#fff',
  cursor: 'pointer',
  transition: 'transform 0.2s ease'
};

const portfolioSection: React.CSSProperties = {
  background: 'rgba(30, 41, 59, 0.6)',
  borderRadius: '16px',
  padding: '2rem',
  maxWidth: '1200px',
  margin: '0 auto'
};

const portfolioSectionTitle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 700,
  marginBottom: '1.5rem',
  color: '#e0e7ff'
};

const portfolioGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '1.5rem'
};

const portfolioShotCard: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.6)',
  borderRadius: '12px',
  overflow: 'hidden'
};

const portfolioShotPreview: React.CSSProperties = {
  width: '100%',
  height: '250px'
};

const portfolioShotLabel: React.CSSProperties = {
  padding: '1rem',
  textAlign: 'center',
  fontSize: '0.875rem',
  color: '#cbd5e1'
};

export default EducationTrainingStudio;

