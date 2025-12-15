import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface LightingCanvasProps {
  keyIntensity?: number;
  fillIntensity?: number;
  colorTemp?: number;
}

const LightingCanvas = ({ keyIntensity = 0.8, fillIntensity = 0.4, colorTemp = 5600 }: LightingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    keyLight: THREE.DirectionalLight;
    fillLight: THREE.DirectionalLight;
    sphere: THREE.Mesh;
    animationId: number;
  } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });

    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor(0x000000, 0);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffecd2, keyIntensity);
    keyLight.position.set(5, 5, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xbde0fe, fillIntensity);
    fillLight.position.set(-3, 2, 3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff9e00, 0.6);
    rimLight.position.set(0, 3, -5);
    scene.add(rimLight);

    // Subject sphere
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.1
    });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // Ground plane
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.8,
      metalness: 0.2
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -1;
    scene.add(plane);

    camera.position.z = 5;

    sceneRef.current = { scene, camera, renderer, keyLight, fillLight, sphere, animationId: 0 };

    const animate = () => {
      sceneRef.current!.animationId = requestAnimationFrame(animate);
      sphere.rotation.y += 0.005;
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!canvasRef.current) return;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.keyLight.intensity = keyIntensity;
      sceneRef.current.fillLight.intensity = fillIntensity;
      
      // Color temperature conversion (simplified)
      const warmColor = colorTemp < 5000 ? 0xffa500 : 0xffecd2;
      sceneRef.current.keyLight.color.setHex(warmColor);
    }
  }, [keyIntensity, fillIntensity, colorTemp]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full rounded-2xl"
      style={{ minHeight: '400px' }}
    />
  );
};

export default LightingCanvas;
