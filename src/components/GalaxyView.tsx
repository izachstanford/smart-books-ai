import React, { useRef, useState, useMemo, Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { GalaxyPoint } from '../App';
import { RotateCcw, Eye, EyeOff, Info, BookOpen, Table, Maximize2, X, Search, ChevronDown, Check, Pause, Play, Focus, Star, Clock } from 'lucide-react';
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
  books?: any[];  // Optional: for enriching with full book data
}

interface BookPointProps {
  point: GalaxyPoint;
  isSelected: boolean;
  onClick: () => void;
  onHover: (point: GalaxyPoint | null) => void;
  showLabels: boolean;
}

// Color mapping based on read status and rating
// Theme: Discovery through light - rated books glow yellow, unread are gray
const getRatingColor = (rating: number, isRead: boolean): THREE.Color => {
  // Unread books: Dark slate (distant, undiscovered stars)
  if (!isRead) {
    return new THREE.Color('#4A5568'); // Dark slate - clearly distinct
  }
  
  // Read books: Warm spectrum (discovered stars - yellow to pink/purple)
  switch (rating) {
    case 5: return new THREE.Color('#FFD700'); // Bright gold - brilliant star
    case 4: return new THREE.Color('#FFA500'); // Orange - vibrant star
    case 3: return new THREE.Color('#FF8C69'); // Coral/salmon - warm mid-tone
    case 2: return new THREE.Color('#FF69B4'); // Hot pink - distinct warm
    case 1: return new THREE.Color('#DA70D6'); // Orchid/purple - warm but lower energy
    default: return new THREE.Color('#9333ea'); // Purple for unrated read books
  }
};

// Individual book point in 3D space
const BookPoint: React.FC<BookPointProps> = ({ point, isSelected, onClick, onHover, showLabels }) => {
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
      onPointerOver={() => {
        setHovered(true);
        onHover(point);
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover(null);
      }}
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
  onHover: (point: GalaxyPoint | null) => void;
  showLabels: boolean;
  resetTrigger: number;
  autoRotate: boolean;
}> = ({ points, selectedPoint, onSelect, onHover, showLabels, resetTrigger, autoRotate }) => {
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
          onHover={onHover}
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
const GalaxyView: React.FC<Props> = ({ points, books }) => {
  const [selectedPoint, setSelectedPoint] = useState<GalaxyPoint | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<GalaxyPoint | null>(null);
  const [showLabels, setShowLabels] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [showTable, setShowTable] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true); // Auto-rotate toggle
  const [isMouseOverViz, setIsMouseOverViz] = useState(false); // Track mouse over visualization
  
  // Create a map of book descriptions by ID for quick lookup
  const bookDescriptions = useMemo(() => {
    const map = new Map<string, string>();
    if (books) {
      books.forEach((book: any) => {
        if (book.description) {
          map.set(book.id, book.description);
        }
      });
    }
    return map;
  }, [books]);
  
  // Enrich points with descriptions from books
  const enrichedPoints = useMemo(() => {
    return points.map(point => ({
      ...point,
      description: bookDescriptions.get(point.id) || point.description || ''
    }));
  }, [points, bookDescriptions]);
  
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
    enrichedPoints.forEach(p => {
      if (p.year_published) {
        years.add(p.year_published.toString());
      }
    });
    return Array.from(years).sort().reverse();
  }, [enrichedPoints]);
  
  // Extract unique years read from date_read
  const availableYearsRead = useMemo(() => {
    const years = new Set<string>();
    enrichedPoints.forEach(p => {
      if (p.date_read) {
        // date_read is in format "YYYY/MM/DD" or similar
        const year = p.date_read.substring(0, 4);
        if (year && !isNaN(Number(year))) {
          years.add(year);
        }
      }
    });
    return Array.from(years).sort().reverse();
  }, [enrichedPoints]);
  
  // Extract unique genres
  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>();
    enrichedPoints.forEach(p => {
      p.genres?.forEach(g => genreSet.add(g));
    });
    return Array.from(genreSet).sort();
  }, [enrichedPoints]);
  
  // Get top unread books by popularity
  const topUnreadByPopularity = useMemo(() => {
    const unread = enrichedPoints.filter(p => !p.is_read && (p.popularity_score || 0) > 0);
    return unread.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
  }, [enrichedPoints]);
  
  const top100Ids = useMemo(() => new Set(topUnreadByPopularity.slice(0, 100).map(p => p.id)), [topUnreadByPopularity]);
  const top1000Ids = useMemo(() => new Set(topUnreadByPopularity.slice(0, 1000).map(p => p.id)), [topUnreadByPopularity]);
  
  // Apply all filters
  const filteredPoints = useMemo(() => {
    let filtered = [...enrichedPoints];
    
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
  }, [enrichedPoints, readStatusFilter, ratingFilter, yearPublishedFilter, yearReadFilter, genreFilter, keywordSearch, popularityFilter, top100Ids, top1000Ids, selectionBounds]);
  
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
    total: enrichedPoints.length,
    read: enrichedPoints.filter(p => p.is_read).length,
    unread: enrichedPoints.filter(p => !p.is_read).length,
    fiveStars: enrichedPoints.filter(p => p.my_rating === 5).length,
    showing: filteredPoints.length,
  }), [enrichedPoints, filteredPoints]);
  
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
        <div 
          className="viz-wrapper-galaxy"
          onMouseEnter={() => setIsMouseOverViz(true)}
          onMouseLeave={() => setIsMouseOverViz(false)}
        >
          <Canvas
            camera={{ position: [8, 5, 8], fov: 60 }}
            style={{ background: 'transparent' }}
            className="galaxy-canvas"
          >
            <Suspense fallback={null}>
              <GalaxyScene
                points={displayPoints}
                selectedPoint={selectedPoint}
                onSelect={setSelectedPoint}
                onHover={setHoveredPoint}
                showLabels={showLabels}
                resetTrigger={resetTrigger}
                autoRotate={autoRotate && !isMouseOverViz}
              />
            </Suspense>
          </Canvas>
          
          {/* Hover panel - outside canvas but inside wrapper */}
          <div className={`viz-hover-panel ${hoveredPoint ? 'visible' : ''}`}>
            {hoveredPoint ? (
              <>
                {hoveredPoint.cover_url && (
                  <div className="hover-cover">
                    <img src={hoveredPoint.cover_url} alt={hoveredPoint.title} />
                  </div>
                )}
                <div className="hover-title">{hoveredPoint.title}</div>
                {hoveredPoint.author && (
                  <div className="hover-author">by {hoveredPoint.author}</div>
                )}
                {hoveredPoint.my_rating > 0 && (
                  <div className="hover-rating">
                    {'★'.repeat(hoveredPoint.my_rating)}
                  </div>
                )}
                <div 
                  className="hover-status"
                  style={{ color: hoveredPoint.is_read ? '#00f5d4' : '#94a3b8' }}
                >
                  {hoveredPoint.is_read ? '✓ Read' : '💡 Unread'}
                </div>
                {hoveredPoint.description && hoveredPoint.description.trim() && (
                  <div className="hover-description">
                    {hoveredPoint.description.length > 250 
                      ? hoveredPoint.description.substring(0, 250).trim() + '...' 
                      : hoveredPoint.description}
                  </div>
                )}
              </>
            ) : (
              <div className="hover-placeholder">
                <span>👆</span>
                <span>Hover over a star</span>
              </div>
            )}
          </div>
        </div>
        
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
            <span className="legend-dot" style={{ background: '#FFD700' }}></span>
            <span>5★ Brilliant</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#FFA500' }}></span>
            <span>4★ Vibrant</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#FF8C69' }}></span>
            <span>3★ Warm</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#FF69B4' }}></span>
            <span>2★ Cool</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#DA70D6' }}></span>
            <span>1★ Dim</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#4A5568' }}></span>
            <span>Unread</span>
          </div>
        </div>
      </div>

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
        />
      )}

      {/* Book Detail Modal */}
      {selectedPoint && (
        <div className="modal-overlay" onClick={() => setSelectedPoint(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedPoint(null)}>
              <X size={24} />
            </button>
            
            <div className="modal-body">
              <div className="modal-cover">
                {selectedPoint.cover_url ? (
                  <img src={selectedPoint.cover_url} alt={selectedPoint.title} />
                ) : (
                  <div className="cover-placeholder large">
                    <BookOpen size={64} />
                  </div>
                )}
              </div>
              
              <div className="modal-info">
                <h2>{selectedPoint.title}</h2>
                <p className="modal-author">by {selectedPoint.author}</p>
                
                <div className="modal-meta">
                  {selectedPoint.my_rating > 0 && (
                    <div className="meta-item">
                      <span className="meta-label">Your Rating</span>
                      <div className="rating-stars">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star
                            key={i}
                            size={16}
                            fill={i <= selectedPoint.my_rating ? '#ffd93d' : 'none'}
                            color={i <= selectedPoint.my_rating ? '#ffd93d' : '#64748b'}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedPoint.avg_rating > 0 && (
                    <div className="meta-item">
                      <span className="meta-label">Avg Rating</span>
                      <span>{selectedPoint.avg_rating.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {selectedPoint.pages && (
                    <div className="meta-item">
                      <span className="meta-label">Pages</span>
                      <span>{selectedPoint.pages}</span>
                    </div>
                  )}
                  
                  {selectedPoint.year_published && (
                    <div className="meta-item">
                      <span className="meta-label">Published</span>
                      <span>{selectedPoint.year_published}</span>
                    </div>
                  )}
                </div>
                
                <div className="modal-status">
                  <span className={`status-badge ${selectedPoint.is_read ? 'read' : 'unread'}`}>
                    {selectedPoint.is_read ? '📖 Read' : '💡 Unread'}
                  </span>
                  {selectedPoint.date_read && (
                    <span className="date-read">
                      <Clock size={14} /> Read on {selectedPoint.date_read}
                    </span>
                  )}
                </div>
                
                {selectedPoint.genres && selectedPoint.genres.length > 0 && (
                  <div className="modal-genres">
                    {selectedPoint.genres.slice(0, 5).map(genre => (
                      <span key={genre} className="genre-tag">{genre}</span>
                    ))}
                  </div>
                )}
                
                {selectedPoint.description && selectedPoint.description.trim() && (
                  <div className="modal-description">
                    <h4>Description</h4>
                    <p>{selectedPoint.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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
        
        .viz-wrapper-galaxy {
          display: flex;
          gap: var(--space-md);
          align-items: stretch;
          height: 100%;
        }
        
        .galaxy-canvas {
          flex: 1;
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
        
        /* Hover Panel */
        .viz-hover-panel {
          width: 200px;
          background: rgba(13, 13, 35, 0.95);
          border-left: 1px solid var(--color-border);
          padding: var(--space-md);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          overflow-y: auto;
        }
        
        .viz-hover-panel.visible {
          border-left-color: var(--color-cosmic-purple);
          box-shadow: -4px 0 20px rgba(157, 78, 221, 0.2);
        }
        
        .hover-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-sm);
          color: var(--color-text-muted);
          font-size: 0.85rem;
          text-align: center;
        }
        
        .hover-placeholder span:first-child {
          font-size: 1.5rem;
          opacity: 0.5;
        }
        
        .hover-cover {
          width: 100%;
          height: 180px;
          margin-bottom: var(--space-md);
          border-radius: var(--radius-md);
          overflow: hidden;
          background: rgba(0, 0, 0, 0.3);
        }
        
        .hover-cover img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .hover-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--color-text-primary);
          text-align: center;
          line-height: 1.3;
          margin-bottom: var(--space-sm);
        }
        
        .hover-author {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          text-align: center;
          margin-bottom: var(--space-sm);
        }
        
        .hover-rating {
          color: var(--color-star-gold);
          font-size: 1.1rem;
          margin-bottom: var(--space-xs);
        }
        
        .hover-status {
          font-size: 0.85rem;
          font-weight: 500;
          margin-bottom: var(--space-sm);
        }
        
        .hover-description {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
          text-align: center;
          margin-top: var(--space-md);
          padding-top: var(--space-md);
          border-top: 1px solid var(--color-border);
        }
        
        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: var(--space-lg);
          animation: fadeIn 0.2s ease;
        }
        
        .modal-content {
          position: relative;
          max-width: 900px;
          max-height: 90vh;
          overflow-y: auto;
          background: var(--color-nebula-dark);
          border: 1px solid var(--color-cosmic-purple);
          border-radius: var(--radius-lg);
          animation: slideUp var(--transition-base) ease;
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .modal-close {
          position: absolute;
          top: var(--space-md);
          right: var(--space-md);
          background: var(--color-nebula);
          border: none;
          border-radius: var(--radius-full);
          padding: var(--space-sm);
          color: var(--color-text-secondary);
          cursor: pointer;
          z-index: 1;
          transition: all var(--transition-fast);
        }
        
        .modal-close:hover {
          background: var(--color-cosmic-purple);
          color: white;
        }
        
        .modal-body {
          display: flex;
          gap: var(--space-xl);
          padding: var(--space-xl);
        }
        
        .modal-cover {
          width: 220px;
          flex-shrink: 0;
        }
        
        .modal-cover img {
          width: 100%;
          border-radius: var(--radius-md);
        }
        
        .cover-placeholder.large {
          height: 330px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-nebula);
          color: var(--color-text-muted);
        }
        
        .modal-info {
          flex: 1;
        }
        
        .modal-info h2 {
          font-size: 1.75rem;
          margin-bottom: var(--space-xs);
        }
        
        .modal-author {
          color: var(--color-text-secondary);
          font-size: 1.1rem;
          margin-bottom: var(--space-lg);
        }
        
        .modal-meta {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-xl);
          margin-bottom: var(--space-lg);
        }
        
        .meta-item {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }
        
        .meta-label {
          font-size: 0.7rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .rating-stars {
          display: flex;
          gap: 2px;
        }
        
        .modal-status {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          margin-bottom: var(--space-lg);
        }
        
        .status-badge {
          padding: var(--space-xs) var(--space-md);
          border-radius: var(--radius-sm);
          font-size: 0.9rem;
          font-weight: 500;
        }
        
        .status-badge.read {
          background: rgba(0, 245, 212, 0.15);
          color: var(--color-aurora);
        }
        
        .status-badge.unread {
          background: rgba(148, 163, 184, 0.15);
          color: #94a3b8;
        }
        
        .date-read {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          font-size: 0.85rem;
          color: var(--color-text-muted);
        }
        
        .modal-genres {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-sm);
          margin-bottom: var(--space-lg);
        }
        
        .genre-tag {
          padding: var(--space-xs) var(--space-sm);
          background: var(--color-nebula);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          color: var(--color-text-secondary);
        }
        
        .modal-description {
          padding-top: var(--space-lg);
          border-top: 1px solid var(--color-border);
        }
        
        .modal-description h4 {
          font-size: 0.9rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: var(--space-md);
        }
        
        .modal-description p {
          color: var(--color-text-secondary);
          font-size: 0.95rem;
          line-height: 1.7;
        }
        
        @media (max-width: 768px) {
          .galaxy-header {
            flex-direction: column;
            gap: var(--space-md);
          }
          
          .galaxy-legend {
            /* Adjust legend position on mobile */
            font-size: 0.7rem;
            padding: var(--space-sm);
          }
          
          .filter-bar {
            flex-wrap: wrap;
            gap: var(--space-sm);
          }
          
          .filter-group {
            min-width: 100%;
          }
          
          .viz-wrapper-galaxy {
            /* Keep flex row on mobile but hide panel */
            flex-direction: row;
          }
          
          .viz-hover-panel {
            /* Hide hover panel on mobile */
            display: none;
          }
          
          .galaxy-canvas {
            /* Full width when panel is hidden */
            width: 100%;
          }
          
          .modal-body {
            flex-direction: column;
          }
          
          .modal-cover {
            width: 150px;
            margin: 0 auto;
          }
        }
      `}</style>
    </div>
  );
};

export default GalaxyView;
