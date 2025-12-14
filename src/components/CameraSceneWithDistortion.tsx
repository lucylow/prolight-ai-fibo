// frontend/src/components/CameraSceneWithDistortion.tsx
import React, { useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import useCameraStore from "@/stores/useCameraStore"; // your zustand store
import { mapLensProfileToSim } from "@/utils/lensProfile"; // mapping util (see below)

/**
 * Distortion shader (radial model)
 * - k1: radial coefficient 1
 * - k2: radial coefficient 2
 * - aspect: aspect ratio correction (width/height)
 */

const DistortionShader = {
  uniforms: {
    tDiffuse: { value: null },
    k1: { value: 0.0 },
    k2: { value: 0.0 },
    aspect: { value: 16 / 9 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float k1;
    uniform float k2;
    uniform float aspect;
    varying vec2 vUv;

    vec2 radialDistort(vec2 uv, float k1, float k2, float aspect){
      vec2 xy = uv - 0.5;
      xy.x *= aspect;
      float r2 = dot(xy, xy);
      float factor = 1.0 + k1 * r2 + k2 * r2 * r2;
      vec2 distorted = xy * factor;
      distorted.x /= aspect;
      return distorted + 0.5;
    }

    void main(){
      vec2 dUV = radialDistort(vUv, k1, k2, aspect);
      if (dUV.x < 0.0 || dUV.x > 1.0 || dUV.y < 0.0 || dUV.y > 1.0) {
        gl_FragColor = vec4(0.0,0.0,0.0,1.0);
      } else {
        gl_FragColor = texture2D(tDiffuse, dUV);
      }
    }
  `,
};

function PostprocessingComposer() {
  const composerRef = useRef<any>(null);
  const k1 = useCameraStore((s) => s.lensSim.distortionK1);
  const k2 = useCameraStore((s) => s.lensSim.distortionK2);
  const aspect = useCameraStore((s) => s.camera.aspectRatio);

  // create shader pass once
  const passRef = useRef<any>(null);
  useEffect(() => {
    // create ShaderPass using the shader object
    try {
      passRef.current = new ShaderPass(DistortionShader as any);
      // material created inside pass; set initial uniforms
      passRef.current.material.uniforms.k1.value = k1;
      passRef.current.material.uniforms.k2.value = k2;
      passRef.current.material.uniforms.aspect.value = aspect;
    } catch (err) {
      // If import fails, we still gracefully degrade
      console.warn("ShaderPass create failed:", err);
      passRef.current = null;
    }
    return () => {
      if (passRef.current && composerRef.current) {
        try {
          composerRef.current.removePass(passRef.current);
        } catch (e) {}
      }
    };
  }, []); // run once

  // attach pass to composer after mount
  useEffect(() => {
    if (!composerRef.current || !passRef.current) return;
    const composer = composerRef.current;
    try {
      composer.addPass(passRef.current);
    } catch (err) {
      // some composer implementations require different hooks; ignore if unsupported
    }
    return () => {
      try {
        composer.removePass(passRef.current);
      } catch (e) {}
    };
  }, [composerRef.current, passRef.current]);

  // update uniforms when params change
  useEffect(() => {
    if (passRef.current && passRef.current.material && passRef.current.material.uniforms) {
      passRef.current.material.uniforms.k1.value = k1;
      passRef.current.material.uniforms.k2.value = k2;
      passRef.current.material.uniforms.aspect.value = aspect;
    }
  }, [k1, k2, aspect]);

  // render composer (we still return <EffectComposer> to keep react-three-postprocessing happy)
  return <EffectComposer ref={composerRef as any} disableGamma={false} />;
}

/** small demo scene (replace with your product scene) */
function DemoScene() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 10, 6]} intensity={0.8} />
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.35, 0.25, 0.25]} />
        <meshStandardMaterial color={"#c0c0c0"} metalness={0.6} roughness={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color={"#0f1720"} />
      </mesh>
    </>
  );
}

/** Main export: scene + composer + Orbit controls + UI hooks for shader */
export default function CameraSceneWithDistortion() {
  const camera = useCameraStore((s) => s.camera);
  const setCamera = useCameraStore((s) => s.setCamera);
  const lensSim = useCameraStore((s) => s.lensSim);
  const setLensSim = useCameraStore((s) => s.setLensSim);

  // simple UI bound to store; you can replace this with your existing controls
  return (
    <div className="flex">
      <div className="flex-1 h-screen bg-black">
        <Canvas dpr={[1, 2]}>
          <PerspectiveCamera makeDefault fov={camera.fov} position={camera.position} />
          <OrbitControls target={new THREE.Vector3(...camera.lookAt)} />
          <DemoScene />
          <PostprocessingComposer />
        </Canvas>
      </div>

      <aside className="w-96 p-4 bg-white dark:bg-[#071019]">
        <h3 className="text-lg font-semibold mb-2">Lens Simulation</h3>
        <label>k1 (barrel/pincushion)</label>
        <input type="range" min={-0.6} max={0.6} step={0.001} value={lensSim.distortionK1} onChange={(e) => setLensSim({ distortionK1: Number(e.target.value) })} />
        <label>k2</label>
        <input type="range" min={-0.6} max={0.6} step={0.001} value={lensSim.distortionK2} onChange={(e) => setLensSim({ distortionK2: Number(e.target.value) })} />
        <label>Chromatic Aberration</label>
        <input type="range" min={0} max={1} step={0.01} value={lensSim.chromaticAberration} onChange={(e) => setLensSim({ chromaticAberration: Number(e.target.value) })} />
        <label>Vignette</label>
        <input type="range" min={0} max={1} step={0.01} value={lensSim.vignetteAmount} onChange={(e) => setLensSim({ vignetteAmount: Number(e.target.value) })} />
      </aside>
    </div>
  );
}
