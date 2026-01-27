import React, { useRef, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { GalaxyPoint } from '../App';
import { RotateCcw, Eye, EyeOff, Info, BookOpen, Table, Maximize2 } from 'lucide-react';
import BookTable from './BookTable';

interface Props {
  points: GalaxyPoint[];
}

interface BookPointProps {
  point: GalaxyPoint;
  isSelected: boolean;
  onClick: () => void;
  showLabels: boolean;
}

// Color mapping based on rating
const getRatingColor = (rating: number, shelf: string): THREE.Color => {
  if (shelf === 'to-read') return new THREE.Color('#4da6ff'); // Blue for unread
  switch (rating) {
    case 5: return new THREE.Color('#ffd93d'); // Gold supernova
    case 4: return new THREE.Color('#4da6ff'); // Blue giant
    case 3: return new THREE.Color('#a8b4c4'); // White dwarf
    case 2: return new THREE.Color('#ff6b9d'); // Red
    case 1: return new THREE.Color('#ff4444'); // Deep red
    default: return new THREE.Color('#5a6478'); // Dim
  }
};

// Individual book point in 3D space
const BookPoint: React.FC<BookPointProps> = ({ point, isSelected, onClick, showLabels }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  const color = useMemo(() => getRatingColor(point.my_rating, point.shelf), [point.my_rating, point.shelf]);
  const baseSize = point.pages ? Math.min(0.05 + (point.pages / 2000) * 0.05, 0.12) : 0.06;
  
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle pulse animation
      const pulse = Math.sin(state.clock.elapsedTime * 2 + parseFloat(point.id)) * 0.1 + 1;
      meshRef.current.scale.setScalar((hovered || isSelected ? 1.5 : 1) * pulse * baseSize * 10);
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[point.x * 5, point.y * 5, point.z * 5]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={hovered || isSelected ? 2 : 0.8}
        transparent
        opacity={hovered || isSelected ? 1 : 0.85}
      />
      
      {(hovered || (showLabels && point.my_rating === 5)) && (
        <Html distanceFactor={15} style={{ pointerEvents: 'none' }}>
          <div className="book-tooltip">
            <strong>{point.title}</strong>
            <span>{point.author}</span>
            {point.my_rating > 0 && (
              <span className="tooltip-rating">{'★'.repeat(point.my_rating)}</span>
            )}
          </div>
        </Html>
      )}
    </mesh>
  );
};

// Camera animation component
const CameraController: React.FC<{ resetTrigger: number }> = ({ resetTrigger }) => {
  const { camera } = useThree();
  
  React.useEffect(() => {
    camera.position.set(8, 5, 8);
    camera.lookAt(0, 0, 0);
  }, [resetTrigger, camera]);
  
  return null;
};

// Main Galaxy Scene
const GalaxyScene: React.FC<{
  points: GalaxyPoint[];
  selectedPoint: GalaxyPoint | null;
  onSelect: (point: GalaxyPoint | null) => void;
  showLabels: boolean;
  resetTrigger: number;
}> = ({ points, selectedPoint, onSelect, showLabels, resetTrigger }) => {
  return (
    <>
      <CameraController resetTrigger={resetTrigger} />
      
      {/* Ambient lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#fff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#9d4edd" />
      
      {/* Starfield background */}
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />
      
      {/* Book points */}
      {points.map((point) => (
        <BookPoint
          key={point.id}
          point={point}
          isSelected={selectedPoint?.id === point.id}
          onClick={() => onSelect(selectedPoint?.id === point.id ? null : point)}
          showLabels={showLabels}
        />
      ))}
      
      {/* Axis helpers (subtle) */}
      <axesHelper args={[2]} />
      
      {/* Orbit controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={!selectedPoint}
        autoRotateSpeed={0.5}
        maxDistance={30}
        minDistance={3}
      />
    </>
  );
};

/**
 * GalaxyView - 3D visualization of book embeddings
 * Books positioned in 3D space based on semantic similarity
 */
const GalaxyView: React.FC<Props> = ({ points }) => {
  const [selectedPoint, setSelectedPoint] = useState<GalaxyPoint | null>(null);
  const [showLabels, setShowLabels] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [showTable, setShowTable] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Summary stats
  const stats = useMemo(() => ({
    total: points.length,
    fiveStars: points.filter(p => p.my_rating === 5).length,
    toRead: points.filter(p => p.shelf === 'to-read').length,
  }), [points]);

  const handleReset = () => {
    setSelectedPoint(null);
    setResetTrigger(t => t + 1);
  };

  return (
    <div className="galaxy-view">
      <div className="galaxy-header">
        <div className="galaxy-title">
          <h2>🌌 Galaxy View</h2>
          <p>Your reading universe in 3D vector space — books clustered by semantic similarity</p>
        </div>
        
        <div className="galaxy-controls">
          <button 
            className={`control-btn ${showLabels ? 'active' : ''}`}
            onClick={() => setShowLabels(!showLabels)}
            title="Toggle 5-star labels"
          >
            {showLabels ? <Eye size={18} /> : <EyeOff size={18} />}
            Labels
          </button>
          <button 
            className={`control-btn ${isFullscreen ? 'active' : ''}`}
            onClick={() => setIsFullscreen(!isFullscreen)}
            title="Toggle fullscreen"
          >
            <Maximize2 size={18} />
            {isFullscreen ? 'Exit' : 'Expand'}
          </button>
          <button className="control-btn" onClick={handleReset} title="Reset camera">
            <RotateCcw size={18} />
            Reset
          </button>
          <button 
            className={`control-btn ${showTable ? 'active' : ''}`}
            onClick={() => setShowTable(!showTable)}
            title="Toggle table view"
          >
            <Table size={18} />
            Table
          </button>
        </div>
      </div>

      <div className="galaxy-stats">
        <div className="stat">
          <span className="stat-num">{stats.total}</span>
          <span className="stat-label">Books</span>
        </div>
        <div className="stat">
          <span className="stat-num" style={{ color: 'var(--color-star-gold)' }}>{stats.fiveStars}</span>
          <span className="stat-label">5-Star</span>
        </div>
        <div className="stat">
          <span className="stat-num" style={{ color: 'var(--color-blue-giant)' }}>{stats.toRead}</span>
          <span className="stat-label">To-Read</span>
        </div>
      </div>

      <div className={`galaxy-canvas-wrapper ${isFullscreen ? 'fullscreen' : ''}`}>
        <Canvas
          camera={{ position: [8, 5, 8], fov: 60 }}
          style={{ background: 'transparent' }}
        >
          <Suspense fallback={null}>
            <GalaxyScene
              points={points}
              selectedPoint={selectedPoint}
              onSelect={setSelectedPoint}
              showLabels={showLabels}
              resetTrigger={resetTrigger}
            />
          </Suspense>
        </Canvas>
        
        <div className="galaxy-legend">
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#ffd93d' }}></span>
            <span>5★ Books</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#4da6ff' }}></span>
            <span>4★ / To-Read</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#a8b4c4' }}></span>
            <span>3★ Books</span>
          </div>
        </div>
      </div>

      {/* Selected Book Panel */}
      {selectedPoint && (
        <div className="selected-book-panel animate-slideUp">
          <button className="panel-close" onClick={() => setSelectedPoint(null)}>×</button>
          
          <div className="panel-content">
            {selectedPoint.cover_url ? (
              <img src={selectedPoint.cover_url} alt={selectedPoint.title} className="panel-cover" />
            ) : (
              <div className="panel-cover-placeholder">
                <BookOpen size={32} />
              </div>
            )}
            
            <div className="panel-info">
              <h3>{selectedPoint.title}</h3>
              <p className="panel-author">{selectedPoint.author}</p>
              
              <div className="panel-meta">
                {selectedPoint.my_rating > 0 && (
                  <span className="panel-rating">
                    {'★'.repeat(selectedPoint.my_rating)}
                  </span>
                )}
                <span className={`badge ${selectedPoint.shelf}`}>
                  {selectedPoint.shelf === 'read' ? '✅ Read' : '📚 To-Read'}
                </span>
              </div>
              
              {selectedPoint.genres.length > 0 && (
                <div className="panel-genres">
                  {selectedPoint.genres.map(g => (
                    <span key={g} className="genre-tag">{g}</span>
                  ))}
                </div>
              )}
              
              <p className="panel-coords">
                <Info size={14} />
                Position: ({selectedPoint.x.toFixed(2)}, {selectedPoint.y.toFixed(2)}, {selectedPoint.z.toFixed(2)})
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="galaxy-tip">
        <Info size={14} />
        <span>Click and drag to rotate • Scroll to zoom • Click a star to see details</span>
      </div>

      {/* Data Table */}
      {showTable && (
        <BookTable 
          books={points} 
          onSelectBook={(book) => setSelectedPoint(book)}
        />
      )}

      <style>{`
        .galaxy-view {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }
        
        .galaxy-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-md);
        }
        
        .galaxy-title h2 {
          font-size: 1.75rem;
          margin-bottom: var(--space-xs);
        }
        
        .galaxy-title p {
          color: var(--color-text-secondary);
          font-size: 0.9rem;
        }
        
        .galaxy-controls {
          display: flex;
          gap: var(--space-sm);
        }
        
        .control-btn {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          padding: var(--space-sm) var(--space-md);
          background: var(--color-nebula);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          font-family: var(--font-main);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .control-btn:hover,
        .control-btn.active {
          background: var(--color-cosmic-purple);
          color: white;
          border-color: var(--color-cosmic-purple);
        }
        
        .galaxy-stats {
          display: flex;
          gap: var(--space-lg);
          margin-bottom: var(--space-md);
        }
        
        .stat {
          display: flex;
          align-items: baseline;
          gap: var(--space-xs);
        }
        
        .stat-num {
          font-size: 1.5rem;
          font-weight: 700;
        }
        
        .stat-label {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
        }
        
        .galaxy-canvas-wrapper {
          height: 600px;
          position: relative;
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: radial-gradient(ellipse at center, #1a1a3a 0%, #050510 100%);
          border: 1px solid var(--color-border);
          transition: all var(--transition-base);
        }
        
        .galaxy-canvas-wrapper.fullscreen {
          position: fixed;
          inset: 0;
          z-index: 1000;
          border-radius: 0;
          height: 100vh;
        }
        
        .galaxy-legend {
          position: absolute;
          top: var(--space-md);
          left: var(--space-md);
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          padding: var(--space-md);
          background: rgba(10, 10, 26, 0.8);
          backdrop-filter: blur(10px);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }
        
        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        
        .selected-book-panel {
          position: absolute;
          bottom: var(--space-lg);
          right: var(--space-lg);
          width: 320px;
          background: rgba(10, 10, 26, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
        }
        
        .panel-close {
          position: absolute;
          top: var(--space-sm);
          right: var(--space-sm);
          background: none;
          border: none;
          color: var(--color-text-muted);
          font-size: 1.5rem;
          cursor: pointer;
          padding: var(--space-xs);
        }
        
        .panel-content {
          display: flex;
          gap: var(--space-md);
        }
        
        .panel-cover {
          width: 80px;
          height: 120px;
          object-fit: cover;
          border-radius: var(--radius-sm);
        }
        
        .panel-cover-placeholder {
          width: 80px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-nebula);
          border-radius: var(--radius-sm);
          color: var(--color-text-muted);
        }
        
        .panel-info {
          flex: 1;
          min-width: 0;
        }
        
        .panel-info h3 {
          font-size: 0.95rem;
          margin-bottom: var(--space-xs);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .panel-author {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          margin-bottom: var(--space-sm);
        }
        
        .panel-meta {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-sm);
        }
        
        .panel-rating {
          color: var(--color-star-gold);
          font-size: 0.9rem;
        }
        
        .panel-genres {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-xs);
          margin-bottom: var(--space-sm);
        }
        
        .panel-coords {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          font-size: 0.7rem;
          color: var(--color-text-muted);
          font-family: var(--font-mono);
        }
        
        .galaxy-tip {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-sm);
          margin-top: var(--space-md);
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
        
        /* Tooltip styles (rendered in Three.js Html) */
        .book-tooltip {
          background: rgba(10, 10, 26, 0.95);
          border: 1px solid var(--color-cosmic-purple);
          border-radius: var(--radius-sm);
          padding: var(--space-sm);
          white-space: nowrap;
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 0.75rem;
        }
        
        .book-tooltip strong {
          color: var(--color-text-primary);
        }
        
        .book-tooltip span {
          color: var(--color-text-secondary);
        }
        
        .tooltip-rating {
          color: var(--color-star-gold) !important;
        }
        
        @media (max-width: 768px) {
          .galaxy-header {
            flex-direction: column;
            gap: var(--space-md);
          }
          
          .selected-book-panel {
            width: calc(100% - 2 * var(--space-md));
            right: var(--space-md);
            left: var(--space-md);
          }
        }
      `}</style>
    </div>
  );
};

export default GalaxyView;
