import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface CardProps {
  step: string;
  title: string;
  description: string;
  detail: string;
  onHoverState?: (isHovered: boolean) => void;
}

interface MeshProps extends Omit<CardProps, 'onHoverState'> {
  rotationTarget: React.MutableRefObject<{ x: number; y: number }>;
  isHovered: boolean;
}

const Card3DVolume: React.FC<MeshProps> = ({ step, title, description, detail, rotationTarget, isHovered }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (!groupRef.current) return;
    
    // Lerp towards the mouse-driven rotation targets
    groupRef.current.rotation.x += (rotationTarget.current.x - groupRef.current.rotation.x) * 0.12;
    groupRef.current.rotation.y += (rotationTarget.current.y - groupRef.current.rotation.y) * 0.12;

    // Apply a slight forward pop on hover
    const targetZ = isHovered ? 0.15 : 0;
    groupRef.current.position.z += (targetZ - groupRef.current.position.z) * 0.15;
  });

  return (
    <group ref={groupRef}>
      {/* Front Face Panel representing physical thickness */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3.2, 3.4, 0.12]} />
        <meshStandardMaterial 
          color="#FFFFFF" 
          roughness={0.3} 
          metalness={0.05} 
        />
      </mesh>

      {/* Red rear boundary frame (the colored 3D edge detail) */}
      <mesh position={[0, 0, -0.07]}>
        <boxGeometry args={[3.24, 3.44, 0.06]} />
        <meshBasicMaterial color="#E0362F" />
      </mesh>

      {/* HTML overlay injected onto the front face of the 3D card */}
      <Html
        transform
        distanceFactor={3.6}
        position={[0, 0, 0.065]}
        className="w-[280px] h-[300px] pointer-events-none select-none"
      >
        <div className="w-full h-full bg-white border border-[#D8D5CC] rounded-2xl p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#E0362F]" />
          
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] text-[#E0362F] font-bold tracking-widest uppercase">{detail}</span>
              <span className="font-mono text-3xl font-extrabold text-[#D8D5CC]/80">{step}</span>
            </div>
            <h4 className="font-sans font-extrabold text-sm text-[#0E0E0E] mt-4 tracking-wider uppercase">
              {title}
            </h4>
            <p className="text-xs text-[#6B6960] mt-3 leading-relaxed">
              {description}
            </p>
          </div>

          <div className="pt-4 border-t border-[#D8D5CC]/50 flex items-center justify-between mt-auto">
            <span className="text-[9px] font-bold font-mono text-[#6B6960]/80">MEDLENS SYSTEM LOG</span>
            <span className="w-2 h-2 rounded-full bg-[#E0362F] animate-pulse" />
          </div>
        </div>
      </Html>
    </group>
  );
};

export const PipelineCard3D: React.FC<CardProps> = ({ step, title, description, detail, onHoverState }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const rotationTarget = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setShouldReduceMotion(motionQuery.matches);
    const handleMotionChange = (e: MediaQueryListEvent) => setShouldReduceMotion(e.matches);
    motionQuery.addEventListener('change', handleMotionChange);

    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Normalize coordinates relative to card center (ranging from -1 to 1)
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    
    // Scale rotation to max ~15 degrees (0.26 radians)
    rotationTarget.current.y = ((x - xc) / xc) * 0.26;
    rotationTarget.current.x = -((y - yc) / yc) * 0.26;
  };

  const handleMouseLeave = () => {
    rotationTarget.current.x = 0;
    rotationTarget.current.y = 0;
    setIsHovered(false);
  };

  // Perform fully responsive CSS 3D transform card tilt if reduced-motion or mobile viewport is detected
  if (shouldReduceMotion || isMobile) {
    const cssTransform = isHovered 
      ? `perspective(800px) rotateX(${rotationTarget.current.x * 57.3}deg) rotateY(${rotationTarget.current.y * 57.3}deg) translateY(-4px)`
      : `perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px)`;

    return (
      <div
        ref={containerRef}
        onMouseMove={(e) => {
          handleMouseMove(e);
          setIsHovered(true);
          if (onHoverState) onHoverState(true);
        }}
        onMouseLeave={() => {
          handleMouseLeave();
          if (onHoverState) onHoverState(false);
        }}
        style={{
          transform: cssTransform,
          transition: 'transform 0.15s ease-out, shadow 0.15s ease-out'
        }}
        className="w-full min-h-[300px] bg-white border border-[#D8D5CC] rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:shadow-lg transition-all relative overflow-hidden group select-none cursor-pointer"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#E0362F] scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
        
        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-[#E0362F] font-bold tracking-widest uppercase">{detail}</span>
            <span className="font-mono text-3xl font-extrabold text-[#D8D5CC] group-hover:text-[#E0362F]/20 transition-colors">{step}</span>
          </div>
          <h4 className="font-sans font-extrabold text-sm text-[#0E0E0E] mt-4 tracking-wider uppercase">
            {title}
          </h4>
          <p className="text-xs text-[#6B6960] mt-3 leading-relaxed">
            {description}
          </p>
        </div>

        <div className="pt-4 border-t border-[#D8D5CC]/50 flex items-center justify-between mt-auto">
          <span className="text-[9px] font-bold font-mono text-[#6B6960]/80 font-semibold">MEDLENS SYSTEM LOG</span>
          <span className="w-2 h-2 rounded-full bg-[#E0362F] opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={(e) => {
        handleMouseMove(e);
        setIsHovered(true);
        if (onHoverState) onHoverState(true);
      }}
      onMouseLeave={() => {
        handleMouseLeave();
        if (onHoverState) onHoverState(false);
      }}
      className="w-full h-[300px] relative cursor-pointer"
    >
      <Canvas
        camera={{ position: [0, 0, 3.8], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.2} />
        <pointLight position={[5, 5, 5]} intensity={1.5} />
        <Card3DVolume
          step={step}
          title={title}
          description={description}
          detail={detail}
          rotationTarget={rotationTarget}
          isHovered={isHovered}
        />
      </Canvas>
    </div>
  );
};
