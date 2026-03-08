'use client';

import { useEffect, useState } from 'react';

export const HeroBackground = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-dot-pattern" />
      <div 
        className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background opacity-50" 
      />
      <div 
        className="absolute inset-0 mix-blend-multiply"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, hsl(var(--primary) / 0.2), transparent 40%)`,
        }}
      />
    </div>
  );
};