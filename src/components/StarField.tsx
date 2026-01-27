import React, { useMemo } from 'react';

/**
 * StarField - Animated background with twinkling stars
 * Creates an immersive galactic atmosphere
 */
const StarField: React.FC = () => {
  const stars = useMemo(() => {
    return Array.from({ length: 200 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.3,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 5,
    }));
  }, []);

  return (
    <div className="star-field" aria-hidden="true">
      {stars.map((star) => (
        <div
          key={star.id}
          className="star"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
      
      {/* Nebula gradient overlays */}
      <div className="nebula nebula-1" />
      <div className="nebula nebula-2" />
      
      <style>{`
        .star-field {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }
        
        .star {
          position: absolute;
          background: white;
          border-radius: 50%;
          animation: twinkle var(--transition-slow) ease-in-out infinite;
        }
        
        .nebula {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.15;
        }
        
        .nebula-1 {
          top: 10%;
          right: -10%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, var(--color-cosmic-purple) 0%, transparent 70%);
        }
        
        .nebula-2 {
          bottom: 20%;
          left: -10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, var(--color-blue-giant) 0%, transparent 70%);
        }
      `}</style>
    </div>
  );
};

export default StarField;
