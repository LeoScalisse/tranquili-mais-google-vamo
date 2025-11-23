import React, { useState, useEffect, useRef } from 'react';
import { HeartIcon, BrainIcon, MoonIcon, ShieldIcon, TargetIcon } from './ui/Icons';
import { playSound } from '../services/soundService';

interface TimelineItem {
  id: number;
  title: string;
  icon: React.ElementType;
  description: React.ReactNode;
}

const timelineData: TimelineItem[] = [
  {
    id: 1,
    title: "Foco & Concentração",
    icon: TargetIcon,
    description: "Aumente sua produtividade e clareza mental com exercícios que aprimoram sua atenção.",
  },
  {
    id: 2,
    title: "Sono Tranquilo",
    icon: MoonIcon,
    description: <>Desenvolva hábitos saudáveis para noites de sono <span className="text-[#ffde59]">+</span> profundas e restauradoras.</>,
  },
  {
    id: 3,
    title: "Rotina de Autocuidado",
    icon: HeartIcon,
    description: "Crie rituais diários de amor-próprio e bem-estar que nutrem seu corpo e mente.",
  },
  {
    id: 4,
    title: "Autoconhecimento",
    icon: BrainIcon,
    description: "Explore seus pensamentos e emoções em uma jornada de descoberta interior.",
  },
  {
    id: 5,
    title: "Ansiedade & Estresse",
    icon: ShieldIcon,
    description: "Aprenda a gerenciar a ansiedade e o estresse com técnicas de respiração e meditação.",
  },
];


interface RadialOrbitalTimelineProps {
  onPathSelect: (path: string) => void;
}

export default function RadialOrbitalTimeline({ onPathSelect }: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const targetAngleRef = useRef<number | null>(null);
  // Fix: The useRef hook was called without an initial value which can cause errors. Initialized it with null.
  const animationFrameRef = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current) {
      playSound('toggle');
      setExpandedItems({});
      setAutoRotate(true);
      targetAngleRef.current = null;
      // Fix: Pass an empty string to onPathSelect as it expects a string argument.
      onPathSelect('');
    }
  };

  const toggleItem = (item: TimelineItem) => {
    playSound('select');
    const id = item.id;
    setExpandedItems((prev) => {
      const isCurrentlyExpanded = !!prev[id];
      const newState: Record<number, boolean> = {};
      
      if (!isCurrentlyExpanded) {
        newState[id] = true;
        setAutoRotate(false);
        
        const nodeIndex = timelineData.findIndex((i) => i.id === id);
        targetAngleRef.current = 270 - (nodeIndex / timelineData.length) * 360;

        onPathSelect(item.title);
      } else {
        setAutoRotate(true);
        targetAngleRef.current = null;
        onPathSelect('');
      }
      return newState;
    });
  };

  useEffect(() => {
    let currentAngle = rotationAngle;

    const animate = () => {
      if (targetAngleRef.current !== null) {
        let diff = targetAngleRef.current - currentAngle;
        // Find the shortest path to the target angle
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        
        // If very close, snap to target
        if (Math.abs(diff) < 0.1) {
          currentAngle = targetAngleRef.current;
          targetAngleRef.current = null;
        } else {
          // Ease towards the target
          currentAngle += diff * 0.1;
        }
      } else if (autoRotate) {
        const rotationSpeed = isHovering ? 0.03 : 0.1;
        currentAngle += rotationSpeed;
      }

      setRotationAngle(currentAngle);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [autoRotate, rotationAngle, isHovering]);
  
  const calculateNodePosition = (index: number, total: number, radius: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radian = (angle * Math.PI) / 180;
    const x = radius * Math.cos(radian);
    const y = radius * Math.sin(radian);
    return { x, y };
  };

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center overflow-hidden"
      ref={containerRef}
      onClick={handleContainerClick}
    >
      <div className="relative w-full h-full flex items-center justify-center" style={{ perspective: "1000px" }}>
        {/* Center Orb */}
        <div className="absolute w-20 h-20 rounded-full bg-[#ffde59] flex items-center justify-center z-10">
          <div className="absolute w-28 h-28 rounded-full border-2 border-white/20"></div>
          <div className="absolute w-36 h-36 rounded-full border border-white/20"></div>
        </div>

        {/* Orbit Path */}
        <div className="absolute w-80 h-80 md:w-96 md:h-96 rounded-full border border-white/20"></div>
        
        {/* Nodes */}
        {timelineData.map((item, index) => {
          const radius = window.innerWidth > 768 ? 192 : 160;
          const position = calculateNodePosition(index, timelineData.length, radius);
          const isExpanded = expandedItems[item.id];
          const Icon = item.icon;

          const nodeStyle = {
            transform: `translate(${position.x}px, ${position.y}px)`,
            zIndex: isExpanded ? 200 : 100,
          };

          return (
            <div
              key={item.id}
              ref={(el) => { nodeRefs.current[item.id] = el; }}
              className="absolute cursor-pointer flex flex-col items-center"
              style={nodeStyle}
              onClick={(e) => { e.stopPropagation(); toggleItem(item); }}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
               <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 ease-in-out transform
                  ${isExpanded ? 'bg-white/20 border-white scale-110' : 'border-white/40'}`}
                >
                  <Icon className={`w-6 h-6 transition-colors duration-300 ease-in-out ${isExpanded ? 'text-white' : 'text-white/70'}`} />
                </div>

              <div className={`absolute top-14 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold tracking-wider transition-all duration-300 ease-in-out ${isExpanded ? "text-white scale-105" : "text-white/70"}`}>
                {item.title}
              </div>
              
              <div className={`absolute top-20 text-center w-48 transition-[opacity,transform] duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] ${isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
                <p className="text-xs text-white/90">{item.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}