import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Fallback if the robot model isn't downloaded yet or fails
function FallbackMesh({ isPlaying }: { isPlaying: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      if (isPlaying) {
        // Bounce rapidly when playing
        meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 15) * 0.2;
        meshRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 15) * 0.2;
      } else {
        // Idle hover
        meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
        meshRef.current.scale.set(1, 1, 1);
      }
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.2;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#8ba989" />
    </mesh>
  );
}

// Attempts to load the GLTF model
function Model({ isPlaying, modelUrl }: { isPlaying: boolean, modelUrl: string }) {
  const { scene } = useGLTF(modelUrl);
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      if (isPlaying) {
        groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 15) * 0.5 - 1.5;
        const scale = (1 + Math.sin(state.clock.elapsedTime * 15) * 0.1) * 0.92;
        groupRef.current.scale.set(scale, scale, scale);
      } else {
        groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1 - 1.5;
        groupRef.current.scale.set(0.92, 0.92, 0.92);
      }
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.2;
    }
  });

  return <primitive object={scene} ref={groupRef} />;
}

export function R3D({ isPlaying, modelUrl }: { isPlaying: boolean, modelUrl: string }) {
  return (
    <div className="w-full h-full relative cursor-grab active:cursor-grabbing">
      <Canvas camera={{ position: [0, 1, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        
        <React.Suspense fallback={<FallbackMesh isPlaying={isPlaying} />}>
          <Model isPlaying={isPlaying} modelUrl={modelUrl} />
        </React.Suspense>
        
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
}
