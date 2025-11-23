import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { playSound } from '../services/soundService';

// Icons recreated as SVGs since lucide-react is not available
const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
    </svg>
);

const LoaderIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);


interface SlideButtonProps {
  onComplete: () => void;
  disabled?: boolean;
  text: string;
}

const SlideButton: React.FC<SlideButtonProps> = ({ onComplete, disabled, text }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [isCompleted, setIsCompleted] = useState(false);
  const [dragX, setDragX] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const DRAG_THRESHOLD = 0.9;
  const HANDLE_SIZE = 40; 
  const CONTAINER_WIDTH = 192; // 12rem

  const getDragConstraints = () => {
      const right = CONTAINER_WIDTH - HANDLE_SIZE;
      return { right };
  };

  const handleInteractionStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled || isCompleted) return;
    isDraggingRef.current = true;
    e.preventDefault();
  };

  const handleInteractionMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const containerRect = containerRef.current.getBoundingClientRect();
    const constraints = getDragConstraints();

    let newX = clientX - containerRect.left - HANDLE_SIZE / 2;
    newX = Math.max(0, Math.min(newX, constraints.right));
    setDragX(newX);
  }, []);

  const handleInteractionEnd = useCallback(() => {
    if (!isDraggingRef.current || !containerRef.current) return;
    isDraggingRef.current = false;

    const constraints = getDragConstraints();
    const progress = dragX / constraints.right;

    if (progress >= DRAG_THRESHOLD) {
      setDragX(constraints.right);
      setIsCompleted(true);
      setStatus('loading');
      playSound('confirm');
      setTimeout(() => {
        setStatus('success');
        // A slight delay before calling onComplete to let the checkmark appear
        setTimeout(onComplete, 400); 
      }, 1000); 
    } else {
      setDragX(0); // spring back
    }
  }, [dragX, onComplete]);
  
  useEffect(() => {
    window.addEventListener('mousemove', handleInteractionMove);
    window.addEventListener('touchmove', handleInteractionMove);
    window.addEventListener('mouseup', handleInteractionEnd);
    window.addEventListener('touchend', handleInteractionEnd);

    return () => {
      window.removeEventListener('mousemove', handleInteractionMove);
      window.removeEventListener('touchmove', handleInteractionMove);
      window.removeEventListener('mouseup', handleInteractionEnd);
      window.removeEventListener('touchend', handleInteractionEnd);
    };
  }, [handleInteractionMove, handleInteractionEnd]);
  
  const StatusContent = useMemo(() => {
    switch (status) {
      case 'loading': return <LoaderIcon />;
      case 'success': return <CheckIcon />;
      default: return null;
    }
  }, [status]);


  return (
    <div className="flex justify-center items-center h-16">
      <div 
        ref={containerRef}
        className={`relative flex items-center justify-center rounded-full bg-gray-100 shadow-inner transition-all duration-500 ease-in-out ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${isCompleted ? 'w-32 bg-[#38b6ff]' : 'w-48'}`}
        style={{ height: `${HANDLE_SIZE}px` }}
      >
        {!isCompleted && (
          <>
            {/* Track fill */}
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-[#38b6ff] bg-opacity-30"
              style={{ width: `${dragX + HANDLE_SIZE}px`, transition: isDraggingRef.current ? 'none' : 'width 0.2s ease-out' }}
            />
            
            {/* Handle */}
            <div
              onMouseDown={handleInteractionStart}
              onTouchStart={handleInteractionStart}
              className="absolute top-0 left-0 z-10 flex items-center justify-center bg-[#38b6ff] rounded-full shadow-lg cursor-grab active:cursor-grabbing"
              style={{ 
                  width: `${HANDLE_SIZE}px`, 
                  height: `${HANDLE_SIZE}px`,
                  transform: `translateX(${dragX}px)`,
                  transition: isDraggingRef.current ? 'none' : 'transform 0.2s ease-out',
              }}
            >
               <div className="text-white">
                   <SendIcon />
               </div>
            </div>
          
            {/* Text */}
            <span className="text-gray-500 font-semibold z-0 select-none">{text}</span>
          </>
        )}
        
        {/* Completed State */}
        {isCompleted && (
            <div className="flex items-center justify-center text-white">
              {StatusContent}
            </div>
        )}
      </div>
    </div>
  );
};

export default SlideButton;
