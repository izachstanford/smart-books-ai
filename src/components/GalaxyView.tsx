import React, { useRef, useState, useMemo, Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { GalaxyPoint } from '../App';
import { RotateCcw, Eye, EyeOff, Info, BookOpen, Table, Maximize2, X, Search, ChevronDown, Check, Pause, Play, Focus } from 'lucide-react';
import BookTable from './BookTable';

// Searchable dropdown component
interface SearchableSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ label, value, options, onChange, placeholder = "Search..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(opt => opt.label.toLowerCase().includes(term));
  }, [options, searchTerm]);
  
  const selectedLabel = options.find(o => o.value === value)?.label || placeholder;
  
  return (
    <div className="filter-group" ref={dropdownRef}>
      <label>{label}</label>
      <div className="searchable-select">
        <button 
          className={`select-trigger ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="select-value">{selectedLabel}</span>
          <ChevronDown size={14} className={`select-chevron ${isOpen ? 'rotated' : ''}`} />
        </button>
        
        {isOpen && (
          <div className="select-dropdown">
            {options.length > 6 && (
              <div className="select-search">
                <Search size={12} />
                <input
                  type="text"
                  placeholder={placeholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            )}
            <div className="select-options">
              {filteredOptions.map(opt => (
                <button
                  key={opt.value}
                  className={`select-option ${opt.value === value ? 'selected' : ''}`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <span>{opt.label}</span>
                  {opt.value === value && <Check size={14} />}
                </button>
              ))}
              {filteredOptions.length === 0 && (
                <div className="select-no-results">No matches found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface Props {
  points: GalaxyPoint[];
}

interface BookPointProps {
  point: GalaxyPoint;
  isSelected: boolean;
  onClick: () => void;
  showLabels: boolean;
}

// Color mapping based on read status and rating
// Theme: Discovery through light - rated books glow yellow, unread are gray
const getRatingColor = (rating: number, isRead: boolean): THREE.Color => {
  // Unread books: Slate gray (undiscovered but visible)
  if (!isRead) {
    return new THREE.Color('#94a3b8'); // Lighter slate gray - visible against dark background
  }
  
  // Read books: Yellow spectrum for high ratings, light blue for low
  switch (rating) {
    case 5: return new THREE.Color('#fbbf24'); // Bright yellow/gold - stellar
    case 4: return new THREE.Color('#d4a017'); // Amber - warm glow
    case 3: return new THREE.Color('#a89132'); // Muted gold/olive
    case 2: return new THREE.Color('#7dd3fc'); // Light blue - cool
    case 1: return new THREE.Color('#93c5fd'); // Softer light blue
    default: return new THREE.Color('#9ca3af'); // Unrated read: medium gray
  }
};

// Individual book point in 3D space
const BookPoint: React.FC<BookPointProps> = ({ point, isSelected, onClick, showLabels }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  const color = useMemo(() => getRatingColor(point.my_rating, point.is_read), [point.my_rating, point.is_read]);
  
  // Uniform size for all books - let color convey the story
  const size = 0.08;

  return (
    <mesh
      ref={meshRef}
      position={[point.x * 8, point.y * 8, point.z * 8]}
      scale={hovered || isSelected ? 1.8 : 1}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[size, 12, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={
          hovered || isSelected 
            ? 3 
            : point.is_read 
              ? (point.my_rating >= 4 ? 2.5 : 1.5)  // High-rated read books glow brighter
              : 1.0  // Unread books - visible but not glowing
        }
        transparent
        opacity={point.is_read ? 0.95 : 0.85}  // Unread slightly more transparent
      />
      
      {/* Simple label for 5-star books when labels enabled */}
      {!hovered && showLabels && point.my_rating === 5 && (
        <Html 
          center
          style={{ pointerEvents: 'none', transform: 'translate3d(0, -30px, 0)' }}
          zIndexRange={[100, 0]}
        >
          <div className="book-label-simple">
            {point.title.length > 25 ? point.title.substring(0, 25) + '...' : point.title}
          </div>
        </Html>
      )}
      
      {/* Rich tooltip on hover - appears in 3D space */}
      {hovered && (
        <Html 
          center
          style={{ pointerEvents: 'none', transform: 'translate3d(120px, 0, 0)' }}
          zIndexRange={[100, 0]}
        >
          <div className="book-tooltip-rich">
            {point.cover_url ? (
              <img src={point.cover_url} alt="" className="tooltip-cover" />
            ) : (
              <div className="tooltip-cover-placeholder">📚</div>
            )}
            <div className="tooltip-content">
              <strong className="tooltip-title">{point.title}</strong>
              <span className="tooltip-author">{point.author}</span>
              <div className="tooltip-meta">
                {point.my_rating > 0 && (
                  <span className="tooltip-rating">{'★'.repeat(point.my_rating)}</span>
                )}
                <span className={`tooltip-badge ${point.is_read ? 'read' : 'unread'}`}>
                  {point.is_read ? '✅ Read' : '📖 Unread'}
                </span>
              </div>
              {point.genres && point.genres.length > 0 && (
                <div className="tooltip-genres">
                  {point.genres.slice(0, 2).map((g, i) => (
                    <span key={i} className="tooltip-genre">{g}</span>
                  ))}
                </div>
              )}
            </div>
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
  autoRotate: boolean;
}> = ({ points, selectedPoint, onSelect, showLabels, resetTrigger, autoRotate }) => {
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
        autoRotate={autoRotate && !selectedPoint}
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
  const [autoRotate, setAutoRotate] = useState(true); // Auto-rotate toggle
  
  // Selection/zoom states
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectionBounds, setSelectionBounds] = useState<{
    minX: number; maxX: number;
    minY: number; maxY: number;
    minZ: number; maxZ: number;
  } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  
  // Filter states
  const [readStatusFilter, setReadStatusFilter] = useState<'all' | 'read' | 'unread'>('all'); // Default to all for top1k
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [yearPublishedFilter, setYearPublishedFilter] = useState<string>('all');
  const [yearReadFilter, setYearReadFilter] = useState<string>('all');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [keywordSearch, setKeywordSearch] = useState<string>('');
  const [popularityFilter, setPopularityFilter] = useState<'all' | 'top100' | 'top1000'>('top1000'); // Default to top 1k
  
  // Extract unique years published
  const availableYearsPublished = useMemo(() => {
    const years = new Set<string>();
    points.forEach(p => {
      if (p.year_published) {
        years.add(p.year_published.toString());
      }
    });
    return Array.from(years).sort().reverse();
  }, [points]);
  
  // Extract unique years read from date_read
  const availableYearsRead = useMemo(() => {
    const years = new Set<string>();
    points.forEach(p => {
      if (p.date_read) {
        // date_read is in format "YYYY/MM/DD" or similar
        const year = p.date_read.substring(0, 4);
        if (year && !isNaN(Number(year))) {
          years.add(year);
        }
      }
    });
    return Array.from(years).sort().reverse();
  }, [points]);
  
  // Extract unique genres
  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>();
    points.forEach(p => {
      p.genres?.forEach(g => genreSet.add(g));
    });
    return Array.from(genreSet).sort();
  }, [points]);
  
  // Get top unread books by popularity
  const topUnreadByPopularity = useMemo(() => {
    const unread = points.filter(p => !p.is_read && (p.popularity_score || 0) > 0);
    return unread.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
  }, [points]);
  
  const top100Ids = useMemo(() => new Set(topUnreadByPopularity.slice(0, 100).map(p => p.id)), [topUnreadByPopularity]);
  const top1000Ids = useMemo(() => new Set(topUnreadByPopularity.slice(0, 1000).map(p => p.id)), [topUnreadByPopularity]);
  
  // Apply all filters
  const filteredPoints = useMemo(() => {
    let filtered = [...points];
    
    // Read status filter
    if (readStatusFilter === 'read') {
      filtered = filtered.filter(p => p.is_read);
    } else if (readStatusFilter === 'unread') {
      filtered = filtered.filter(p => !p.is_read);
    }
    
    // Popularity filter (only applies to unread books)
    if (popularityFilter === 'top100') {
      filtered = filtered.filter(p => p.is_read || top100Ids.has(p.id));
    } else if (popularityFilter === 'top1000') {
      filtered = filtered.filter(p => p.is_read || top1000Ids.has(p.id));
    }
    
    // Rating filter
    if (ratingFilter !== 'all') {
      filtered = filtered.filter(p => p.my_rating === ratingFilter);
    }
    
    // Year published filter
    if (yearPublishedFilter !== 'all') {
      filtered = filtered.filter(p => p.year_published?.toString() === yearPublishedFilter);
    }
    
    // Year read filter
    if (yearReadFilter !== 'all') {
      filtered = filtered.filter(p => p.date_read?.substring(0, 4) === yearReadFilter);
    }
    
    // Genre filter
    if (genreFilter !== 'all') {
      filtered = filtered.filter(p => p.genres?.includes(genreFilter));
    }
    
    // Keyword search (title/author)
    if (keywordSearch.trim()) {
      const keyword = keywordSearch.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(keyword) || 
        p.author.toLowerCase().includes(keyword)
      );
    }
    
    // Selection bounds filter (hyper zoom)
    if (selectionBounds) {
      filtered = filtered.filter(p => {
        const px = p.x * 8;
        const py = p.y * 8;
        const pz = p.z * 8;
        return px >= selectionBounds.minX && px <= selectionBounds.maxX &&
               py >= selectionBounds.minY && py <= selectionBounds.maxY &&
               pz >= selectionBounds.minZ && pz <= selectionBounds.maxZ;
      });
    }
    
    return filtered;
  }, [points, readStatusFilter, ratingFilter, yearPublishedFilter, yearReadFilter, genreFilter, keywordSearch, popularityFilter, top100Ids, top1000Ids, selectionBounds]);
  
  // Rescale points when selection is active (spread them out to fill the space)
  const displayPoints = useMemo(() => {
    if (!selectionBounds || filteredPoints.length === 0) {
      return filteredPoints;
    }
    
    // Calculate the actual bounds of filtered points
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    filteredPoints.forEach(p => {
      const px = p.x * 8;
      const py = p.y * 8;
      const pz = p.z * 8;
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
      minZ = Math.min(minZ, pz);
      maxZ = Math.max(maxZ, pz);
    });
    
    // Rescale to fill the full -8 to 8 range (spreading points apart)
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const rangeZ = maxZ - minZ || 1;
    
    return filteredPoints.map(p => ({
      ...p,
      // Rescale coordinates to spread out the cluster
      x: ((p.x * 8 - minX) / rangeX - 0.5) * 2, // Maps to -1 to 1, then BookPoint multiplies by 8
      y: ((p.y * 8 - minY) / rangeY - 0.5) * 2,
      z: ((p.z * 8 - minZ) / rangeZ - 0.5) * 2,
    }));
  }, [filteredPoints, selectionBounds]);
  
  // Summary stats
  const stats = useMemo(() => ({
    total: points.length,
    read: points.filter(p => p.is_read).length,
    unread: points.filter(p => !p.is_read).length,
    fiveStars: points.filter(p => p.my_rating === 5).length,
    showing: filteredPoints.length,
  }), [points, filteredPoints]);
  
  // Check if any filters are active (beyond defaults)
  const hasActiveFilters = readStatusFilter !== 'all' || ratingFilter !== 'all' || 
    yearPublishedFilter !== 'all' || yearReadFilter !== 'all' || genreFilter !== 'all' || 
    keywordSearch.trim() !== '' || popularityFilter !== 'top1000' || selectionBounds !== null;
  
  const clearFilters = () => {
    setReadStatusFilter('all');
    setRatingFilter('all');
    setYearPublishedFilter('all');
    setYearReadFilter('all');
    setGenreFilter('all');
    setKeywordSearch('');
    setPopularityFilter('top1000');
    setSelectionBounds(null);
    setSelectionMode(false);
  };

  const handleReset = () => {
    setSelectedPoint(null);
    setResetTrigger(t => t + 1);
  };

  return (
    <div className="galaxy-view">
      <div className="galaxy-header">
        <div className="galaxy-title">
          <h2>Galaxy View</h2>
          <p>Your reading universe in 3D vector space — books clustered by semantic similarity</p>
        </div>
        
        <div className="galaxy-controls">
          <div className="view-toggle">
            <button 
              className={`toggle-btn ${readStatusFilter === 'read' && popularityFilter === 'all' ? 'active' : ''}`}
              onClick={() => { setReadStatusFilter('read'); setPopularityFilter('all'); }}
              title="Show only your read books"
            >
              Read Only
            </button>
            <button 
              className={`toggle-btn ${popularityFilter === 'top100' ? 'active' : ''}`}
              onClick={() => { setReadStatusFilter('all'); setPopularityFilter('top100'); }}
              title="Your reads + Top 100 most popular unread"
            >
              Top 100
            </button>
            <button 
              className={`toggle-btn ${popularityFilter === 'top1000' ? 'active' : ''}`}
              onClick={() => { setReadStatusFilter('all'); setPopularityFilter('top1000'); }}
              title="Your reads + Top 1000 most popular unread"
            >
              Top 1K
            </button>
            <button 
              className={`toggle-btn ${readStatusFilter === 'all' && popularityFilter === 'all' ? 'active' : ''}`}
              onClick={() => { setReadStatusFilter('all'); setPopularityFilter('all'); }}
              title="Show all books"
            >
              All
            </button>
          </div>
          <button 
            className={`control-btn ${!autoRotate ? 'active' : ''}`}
            onClick={() => setAutoRotate(!autoRotate)}
            title={autoRotate ? "Pause rotation" : "Resume rotation"}
          >
            {autoRotate ? <Pause size={18} /> : <Play size={18} />}
            {autoRotate ? 'Pause' : 'Rotate'}
          </button>
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
          <button 
            className={`control-btn ${selectionMode ? 'active selection-active' : ''}`}
            onClick={() => {
              if (selectionMode) {
                setSelectionMode(false);
              } else {
                setSelectionMode(true);
                setAutoRotate(false); // Disable rotation during selection
              }
            }}
            title="Select region to zoom"
          >
            <Focus size={18} />
            {selectionMode ? 'Selecting...' : 'Select'}
          </button>
          {selectionBounds && (
            <button 
              className="control-btn clear-selection"
              onClick={() => {
                setSelectionBounds(null);
                setSelectionMode(false);
              }}
              title="Clear selection"
            >
              <X size={18} />
              Clear Zoom
            </button>
          )}
        </div>
      </div>

      <div className="galaxy-stats">
        <div className="stat">
          <span className="stat-num">{stats.showing}</span>
          <span className="stat-label">{selectionBounds ? '🔍 Zoomed' : 'Showing'}</span>
        </div>
        <div className="stat">
          <span className="stat-num" style={{ color: '#fbbf24' }}>{stats.read}</span>
          <span className="stat-label">Read</span>
        </div>
        <div className="stat">
          <span className="stat-num" style={{ color: '#94a3b8' }}>{stats.unread}</span>
          <span className="stat-label">Unread</span>
        </div>
        <div className="stat">
          <span className="stat-num" style={{ color: 'var(--color-star-gold)' }}>{stats.fiveStars}</span>
          <span className="stat-label">5-Star</span>
        </div>
      </div>

      <div className={`galaxy-canvas-wrapper ${isFullscreen ? 'fullscreen' : ''}`}>
        <Canvas
          camera={{ position: [8, 5, 8], fov: 60 }}
          style={{ background: 'transparent' }}
        >
          <Suspense fallback={null}>
            <GalaxyScene
              points={displayPoints}
              selectedPoint={selectedPoint}
              onSelect={setSelectedPoint}
              showLabels={showLabels}
              resetTrigger={resetTrigger}
              autoRotate={autoRotate}
            />
          </Suspense>
        </Canvas>
        
        {/* Selection overlay for drawing selection box */}
        {selectionMode && (
          <div 
            className="selection-overlay"
            onMouseDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setIsSelecting(true);
              setSelectionStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              setSelectionEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            }}
            onMouseMove={(e) => {
              if (isSelecting && selectionStart) {
                const rect = e.currentTarget.getBoundingClientRect();
                setSelectionEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              }
            }}
            onMouseUp={(e) => {
              if (isSelecting && selectionStart && selectionEnd) {
                // Convert 2D selection to approximate 3D bounds
                // Use the center of visible points to estimate depth
                const rect = e.currentTarget.getBoundingClientRect();
                const width = rect.width;
                const height = rect.height;
                
                // Normalize selection coordinates to -1 to 1 range
                const minScreenX = Math.min(selectionStart.x, selectionEnd.x);
                const maxScreenX = Math.max(selectionStart.x, selectionEnd.x);
                const minScreenY = Math.min(selectionStart.y, selectionEnd.y);
                const maxScreenY = Math.max(selectionStart.y, selectionEnd.y);
                
                // Convert to normalized coordinates (-8 to 8 range to match 3D space)
                const normalizedMinX = ((minScreenX / width) * 2 - 1) * 12;
                const normalizedMaxX = ((maxScreenX / width) * 2 - 1) * 12;
                const normalizedMinY = ((1 - maxScreenY / height) * 2 - 1) * 12; // Y inverted
                const normalizedMaxY = ((1 - minScreenY / height) * 2 - 1) * 12;
                
                // Set generous Z bounds since we're selecting from a 2D projection
                setSelectionBounds({
                  minX: normalizedMinX,
                  maxX: normalizedMaxX,
                  minY: normalizedMinY,
                  maxY: normalizedMaxY,
                  minZ: -15,
                  maxZ: 15
                });
                
                setSelectionMode(false);
              }
              setIsSelecting(false);
              setSelectionStart(null);
              setSelectionEnd(null);
            }}
            onMouseLeave={() => {
              setIsSelecting(false);
              setSelectionStart(null);
              setSelectionEnd(null);
            }}
          >
            <div className="selection-instructions">
              🎯 Click and drag to select a region
            </div>
            {isSelecting && selectionStart && selectionEnd && (
              <div 
                className="selection-box"
                style={{
                  left: Math.min(selectionStart.x, selectionEnd.x),
                  top: Math.min(selectionStart.y, selectionEnd.y),
                  width: Math.abs(selectionEnd.x - selectionStart.x),
                  height: Math.abs(selectionEnd.y - selectionStart.y),
                }}
              />
            )}
          </div>
        )}
        
        <div className="galaxy-legend">
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#fbbf24' }}></span>
            <span>5★ Favorites</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#d4a017' }}></span>
            <span>4★ Great</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#a89132' }}></span>
            <span>3★ Good</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#7dd3fc' }}></span>
            <span>2★ / 1★</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#94a3b8' }}></span>
            <span>Unread</span>
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

      {/* Filter Bar - Below visual, above table */}
      <div className="galaxy-filters-bar">
        <div className="filters-header">
          <h3>🔍 Filter Books</h3>
          {hasActiveFilters && (
            <button className="clear-filters-btn" onClick={clearFilters} title="Clear all filters">
              <X size={14} />
              Clear All
            </button>
          )}
        </div>
        <div className="filters-row">
          <SearchableSelect
            label="My Rating"
            value={ratingFilter === 'all' ? 'all' : String(ratingFilter)}
            options={[
              { value: 'all', label: 'All Ratings' },
              { value: '5', label: '⭐⭐⭐⭐⭐ 5 Stars' },
              { value: '4', label: '⭐⭐⭐⭐ 4 Stars' },
              { value: '3', label: '⭐⭐⭐ 3 Stars' },
              { value: '2', label: '⭐⭐ 2 Stars' },
              { value: '1', label: '⭐ 1 Star' },
              { value: '0', label: 'Unrated' },
            ]}
            onChange={(v) => setRatingFilter(v === 'all' ? 'all' : Number(v))}
          />
          
          <SearchableSelect
            label="Year Read"
            value={yearReadFilter}
            options={[
              { value: 'all', label: 'All Years' },
              ...availableYearsRead.map(y => ({ value: y, label: y }))
            ]}
            onChange={setYearReadFilter}
            placeholder="Search year..."
          />
          
          <SearchableSelect
            label="Year Published"
            value={yearPublishedFilter}
            options={[
              { value: 'all', label: 'All Years' },
              ...availableYearsPublished.map(y => ({ value: y, label: y }))
            ]}
            onChange={setYearPublishedFilter}
            placeholder="Search year..."
          />
          
          <SearchableSelect
            label="Genre"
            value={genreFilter}
            options={[
              { value: 'all', label: 'All Genres' },
              ...availableGenres.map(g => ({ value: g, label: g }))
            ]}
            onChange={setGenreFilter}
            placeholder="Search genre..."
          />
          
          <div className="filter-group keyword-search">
            <label>Keyword</label>
            <div className="search-wrapper">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Title or author..."
                value={keywordSearch}
                onChange={(e) => setKeywordSearch(e.target.value)}
                className="filter-search"
              />
              {keywordSearch && (
                <button className="clear-search" onClick={() => setKeywordSearch('')}>
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      {showTable && (
        <BookTable 
          books={filteredPoints} 
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
        
        .view-toggle {
          display: flex;
          background: var(--color-nebula-dark);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          overflow: hidden;
          margin-right: var(--space-sm);
        }
        
        .toggle-btn {
          padding: var(--space-sm) var(--space-md);
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          font-family: var(--font-main);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all var(--transition-fast);
          white-space: nowrap;
        }
        
        .toggle-btn:hover {
          color: var(--color-text-primary);
          background: rgba(138, 93, 255, 0.1);
        }
        
        .toggle-btn.active {
          background: var(--color-cosmic-purple);
          color: white;
        }
        
        .filter-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          background: white;
          border-radius: var(--radius-full);
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--color-cosmic-purple);
          margin-left: 4px;
        }
        
        /* Filter Bar */
        .galaxy-filters-bar {
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-lg);
        }
        
        .filters-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-md);
        }
        
        .filters-header h3 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
        }
        
        .filters-row {
          display: flex;
          gap: var(--space-md);
          align-items: flex-end;
          flex-wrap: wrap;
        }
        
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
          position: relative;
        }
        
        .filter-group label {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        /* Searchable Select Styles */
        .searchable-select {
          position: relative;
          min-width: 160px;
        }
        
        .select-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-sm);
          width: 100%;
          padding: var(--space-sm) var(--space-md);
          background: var(--color-nebula-dark);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text-primary);
          font-family: var(--font-main);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .select-trigger:hover {
          border-color: var(--color-cosmic-purple);
        }
        
        .select-trigger.open {
          border-color: var(--color-cosmic-purple);
          background: rgba(138, 93, 255, 0.1);
        }
        
        .select-value {
          flex: 1;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .select-chevron {
          transition: transform var(--transition-fast);
          flex-shrink: 0;
        }
        
        .select-chevron.rotated {
          transform: rotate(180deg);
        }
        
        .select-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          min-width: 200px;
          background: rgba(10, 10, 26, 0.98);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          z-index: 100;
          animation: dropdownFadeIn 0.15s ease;
        }
        
        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .select-search {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-sm) var(--space-md);
          border-bottom: 1px solid var(--color-border);
        }
        
        .select-search input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--color-text-primary);
          font-family: var(--font-main);
          font-size: 0.875rem;
          outline: none;
        }
        
        .select-search input::placeholder {
          color: var(--color-text-muted);
        }
        
        .select-options {
          max-height: 240px;
          overflow-y: auto;
          padding: var(--space-xs) 0;
        }
        
        .select-options::-webkit-scrollbar {
          width: 6px;
        }
        
        .select-options::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .select-options::-webkit-scrollbar-thumb {
          background: var(--color-border);
          border-radius: 3px;
        }
        
        .select-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: var(--space-sm) var(--space-md);
          background: transparent;
          border: none;
          color: var(--color-text-secondary);
          font-family: var(--font-main);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: left;
        }
        
        .select-option:hover {
          background: rgba(138, 93, 255, 0.15);
          color: var(--color-text-primary);
        }
        
        .select-option.selected {
          background: rgba(0, 245, 212, 0.1);
          color: #00f5d4;
        }
        
        .select-no-results {
          padding: var(--space-md);
          text-align: center;
          color: var(--color-text-muted);
          font-size: 0.875rem;
        }
        
        .filter-select {
          padding: var(--space-sm) var(--space-md);
          background: var(--color-nebula-dark);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text-primary);
          font-family: var(--font-main);
          font-size: 0.875rem;
          min-width: 140px;
        }
        
        .filter-select:focus {
          outline: none;
          border-color: var(--color-cosmic-purple);
        }
        
        .keyword-search {
          flex: 1;
          min-width: 200px;
        }
        
        .search-wrapper {
          position: relative;
        }
        
        .search-icon {
          position: absolute;
          left: var(--space-sm);
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-muted);
        }
        
        .filter-search {
          width: 100%;
          padding: var(--space-sm) var(--space-md) var(--space-sm) 32px;
          background: var(--color-nebula-dark);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text-primary);
          font-family: var(--font-main);
          font-size: 0.875rem;
        }
        
        .filter-search:focus {
          outline: none;
          border-color: var(--color-cosmic-purple);
        }
        
        .clear-search {
          position: absolute;
          right: var(--space-sm);
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
        }
        
        .clear-filters-btn {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          padding: var(--space-sm) var(--space-md);
          background: rgba(255, 107, 157, 0.15);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: #ff6b9d;
          font-family: var(--font-main);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all var(--transition-fast);
          align-self: flex-end;
        }
        
        .clear-filters-btn:hover {
          background: rgba(255, 107, 157, 0.25);
          border-color: #ff6b9d;
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease;
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
        
        .selection-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          cursor: crosshair;
          background: rgba(139, 92, 246, 0.1);
          z-index: 10;
        }
        
        .selection-instructions {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(10, 10, 26, 0.9);
          padding: var(--space-md) var(--space-lg);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-accent);
          color: var(--color-text);
          font-size: 1rem;
          pointer-events: none;
        }
        
        .selection-box {
          position: absolute;
          border: 2px dashed var(--color-accent);
          background: rgba(139, 92, 246, 0.2);
          pointer-events: none;
        }
        
        .control-btn.selection-active {
          background: var(--color-accent);
          color: white;
        }
        
        .control-btn.clear-selection {
          background: rgba(239, 68, 68, 0.2);
          border-color: #ef4444;
          color: #ef4444;
        }
        
        .control-btn.clear-selection:hover {
          background: rgba(239, 68, 68, 0.3);
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
          top: 80px;
          right: var(--space-lg);
          width: 320px;
          max-height: calc(100% - 100px);
          overflow-y: auto;
          background: rgba(10, 10, 26, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
          z-index: 20;
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
        /* Simple label for 5-star books */
        .book-label-simple {
          background: rgba(10, 10, 26, 0.9);
          border: 1px solid var(--color-cosmic-purple);
          border-radius: var(--radius-sm);
          padding: 4px 8px;
          font-size: 0.7rem;
          color: var(--color-text-primary);
          white-space: nowrap;
        }
        
        /* Rich tooltip with cover image */
        .book-tooltip-rich {
          background: rgba(10, 10, 26, 0.98);
          border: 1px solid var(--color-cosmic-purple);
          border-radius: var(--radius-md);
          padding: 12px;
          display: flex;
          gap: 12px;
          min-width: 280px;
          max-width: 350px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }
        
        .tooltip-cover {
          width: 60px;
          height: 90px;
          object-fit: cover;
          border-radius: var(--radius-sm);
          flex-shrink: 0;
        }
        
        .tooltip-cover-placeholder {
          width: 60px;
          height: 90px;
          background: rgba(139, 92, 246, 0.2);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        
        .tooltip-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        
        .tooltip-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--color-text-primary);
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        
        .tooltip-author {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
        }
        
        .tooltip-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }
        
        .tooltip-rating {
          color: var(--color-star-gold);
          font-size: 0.85rem;
        }
        
        .tooltip-badge {
          font-size: 0.7rem;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 500;
        }
        
        .tooltip-badge.read {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }
        
        .tooltip-badge.unread {
          background: rgba(148, 163, 184, 0.2);
          color: #94a3b8;
        }
        
        .tooltip-genres {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
        
        .tooltip-genre {
          font-size: 0.65rem;
          padding: 2px 6px;
          background: rgba(139, 92, 246, 0.2);
          border-radius: var(--radius-sm);
          color: var(--color-text-muted);
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
