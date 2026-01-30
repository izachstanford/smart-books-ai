import React, { useState, useMemo, useCallback, useEffect, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import { 
  Star, BookOpen, Heart, Zap, Target, 
  Search, X, Loader, Brain, BookMarked
} from 'lucide-react';
import { Book } from '../App';

// @ts-ignore - Transformers.js types
import { pipeline, env } from '@xenova/transformers';

interface Props {
  books: Book[];
}

interface RecommendationResult {
  book: Book;
  similarity: number;
  reason?: string;
}

type DiscoverMode = 'search' | 'similar' | 'taste';

// Configure transformers.js to use CDN for models
env.allowLocalModels = false;

// Cosine similarity between two vectors
const cosineSimilarity = (a: number[], b: number[]): number => {
  if (!a || !b || a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  
  return dotProduct / (magnitudeA * magnitudeB);
};

// Average multiple vectors to get centroid
const computeCentroid = (vectors: number[][]): number[] => {
  if (vectors.length === 0) return [];
  
  const dim = vectors[0].length;
  const centroid = new Array(dim).fill(0);
  
  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      centroid[i] += vec[i];
    }
  }
  
  for (let i = 0; i < dim; i++) {
    centroid[i] /= vectors.length;
  }
  
  return centroid;
};

// Project embedding to 3D position
const projectTo3D = (embedding: number[], scale: number = 2): [number, number, number] => {
  return [
    (embedding[0] * 10 + embedding[100] * 5) * scale,
    (embedding[50] * 10 + embedding[150] * 5) * scale,
    (embedding[200] * 10 + embedding[300] * 5) * scale,
  ];
};

// ========== 3D VISUALIZATION COMPONENTS ==========

const SourcePoint: React.FC<{
  position: [number, number, number];
  label: string;
  isMultiple?: boolean;
}> = ({ position, label, isMultiple }) => {
  const [hovered, setHovered] = useState(false);
  
  return (
    <mesh 
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {isMultiple ? (
        <octahedronGeometry args={[0.3, 0]} />
      ) : (
        <dodecahedronGeometry args={[0.25, 0]} />
      )}
      <meshStandardMaterial
        color="#ffd93d"
        emissive="#ffd93d"
        emissiveIntensity={hovered ? 2.5 : 2}
        transparent
        opacity={0.95}
      />
      {hovered && (
        <Html distanceFactor={15} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(13, 13, 35, 0.95)',
            border: '1px solid #ffd93d',
            borderRadius: '4px',
            padding: '3px 8px',
            whiteSpace: 'nowrap',
            fontSize: '9px',
            color: '#ffd93d',
            fontWeight: 600,
          }}>
            ⭐ {label}
          </div>
        </Html>
      )}
    </mesh>
  );
};

interface HoveredMatch {
  title: string;
  fullTitle: string;
  similarity: number;
  isRead: boolean;
  author?: string;
  cover?: string | null;
}

const MatchPoint: React.FC<{
  position: [number, number, number];
  matchData: HoveredMatch;
  onHover: (data: HoveredMatch | null) => void;
  onClick?: () => void;
}> = ({ position, matchData, onHover, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const color = matchData.isRead ? '#00f5d4' : '#ff6b9d';
  
  return (
    <mesh
      position={position}
      scale={hovered ? 1.4 : 1}
      onPointerOver={() => {
        setHovered(true);
        onHover(matchData);
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover(null);
      }}
      onClick={onClick}
    >
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={hovered ? 2.5 : 1.5}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
};

const ConnectionLine: React.FC<{
  start: [number, number, number];
  end: [number, number, number];
}> = ({ start, end }) => {
  return (
    <Line
      points={[start, end]}
      color="#ff6b9d"
      lineWidth={1.5}
      opacity={0.3}
      transparent
    />
  );
};

const ResultsVisualization: React.FC<{
  sourceLabel: string;
  sourceEmbedding: number[] | null;
  sourceBooks?: Book[]; // For "Find Similar" mode
  results: RecommendationResult[];
  onSelectBook: (book: Book) => void;
}> = ({ sourceLabel, sourceEmbedding, sourceBooks, results, onSelectBook }) => {
  const [autoRotate, setAutoRotate] = useState(true);
  const [hoveredMatch, setHoveredMatch] = useState<HoveredMatch | null>(null);
  
  const positions = useMemo(() => {
    if (!sourceEmbedding) return { source: [0, 0, 0] as [number, number, number], matches: [] };
    
    const sourcePos = projectTo3D(sourceEmbedding);
    
    // If we have source books (Find Similar mode), show them clustered around centroid
    const sourceBookPositions = sourceBooks?.map(b => 
      b.embedding ? projectTo3D(b.embedding) : sourcePos
    ) || [];
    
    const matchPositions = results.slice(0, 5).map(r => ({
      pos: r.book.embedding ? projectTo3D(r.book.embedding) : [0, 0, 0] as [number, number, number],
      matchData: {
        title: r.book.title.length > 25 ? r.book.title.substring(0, 25) + '...' : r.book.title,
        fullTitle: r.book.title,
        similarity: r.similarity,
        isRead: r.book.is_read,
        author: r.book.author,
        cover: r.book.cover_url,
      },
      book: r.book,
    }));
    
    return { source: sourcePos, sourceBooks: sourceBookPositions, matches: matchPositions };
  }, [sourceEmbedding, sourceBooks, results]);

  if (!sourceEmbedding || results.length === 0) return null;

  return (
    <div className="results-visualization">
      <div className="viz-header-row">
        <span className="viz-info">Hover over points for details • Drag to rotate</span>
        <button 
          className={`rotate-toggle ${autoRotate ? 'active' : ''}`}
          onClick={() => setAutoRotate(!autoRotate)}
        >
          {autoRotate ? '⏸ Pause' : '▶ Rotate'}
        </button>
      </div>
      
      <div className="viz-wrapper">
        <div className="viz-container">
          <Canvas camera={{ position: [5, 4, 5], fov: 50 }}>
            <Suspense fallback={null}>
              <ambientLight intensity={0.4} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              
              {/* Source point(s) */}
              <SourcePoint 
                position={positions.source} 
                label={sourceLabel}
                isMultiple={sourceBooks && sourceBooks.length > 1}
              />
              
              {/* Source books (for Find Similar mode) */}
              {positions.sourceBooks?.map((pos, i) => (
                <mesh key={`source-${i}`} position={pos as [number, number, number]}>
                  <sphereGeometry args={[0.1, 12, 12]} />
                  <meshStandardMaterial
                    color="#00f5d4"
                    emissive="#00f5d4"
                    emissiveIntensity={1.5}
                    transparent
                    opacity={0.8}
                  />
                </mesh>
              ))}
              
              {/* Connection lines */}
              {positions.matches.map((match, i) => (
                <ConnectionLine
                  key={`line-${i}`}
                  start={positions.source}
                  end={match.pos}
                />
              ))}
              
              {/* Match points */}
              {positions.matches.map((match, i) => (
                <MatchPoint
                  key={`match-${i}`}
                  position={match.pos}
                  matchData={match.matchData}
                  onHover={setHoveredMatch}
                  onClick={() => onSelectBook(match.book)}
                />
              ))}
              
              <OrbitControls
                enablePan={false}
                enableZoom={true}
                autoRotate={autoRotate}
                autoRotateSpeed={0.5}
              />
            </Suspense>
          </Canvas>
        </div>
        
        {/* Hover panel - outside canvas but inside wrapper */}
        <div className={`viz-hover-panel ${hoveredMatch ? 'visible' : ''}`}>
          {hoveredMatch ? (
            <>
              {hoveredMatch.cover && (
                <div className="hover-cover">
                  <img src={hoveredMatch.cover} alt={hoveredMatch.fullTitle} />
                </div>
              )}
              <div className="hover-title">{hoveredMatch.fullTitle}</div>
              {hoveredMatch.author && (
                <div className="hover-author">by {hoveredMatch.author}</div>
              )}
              <div className="hover-match" style={{ color: '#ff6b9d' }}>
                {(hoveredMatch.similarity * 100).toFixed(0)}% match
              </div>
              <div 
                className="hover-status"
                style={{ color: hoveredMatch.isRead ? '#00f5d4' : '#ff6b9d' }}
              >
                {hoveredMatch.isRead ? '✓ Read' : '💡 Unread'}
              </div>
            </>
          ) : (
            <div className="hover-placeholder">
              <span>👆</span>
              <span>Hover over a point</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="viz-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#ffd93d' }}></span>
          <span>Source</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#00f5d4' }}></span>
          <span>Read</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#ff6b9d' }}></span>
          <span>Unread</span>
        </div>
      </div>
    </div>
  );
};

// ========== RESULTS CARDS COMPONENT ==========

const ResultCard: React.FC<{
  result: RecommendationResult;
  rank: number;
  onClick: () => void;
}> = ({ result, rank, onClick }) => {
  const { book, similarity } = result;
  
  const truncateDescription = (desc: string | null, maxLength: number = 120) => {
    if (!desc) return null;
    if (desc.length <= maxLength) return desc;
    return desc.substring(0, maxLength).trim() + '...';
  };

  return (
    <div className="result-card" onClick={onClick}>
      <div className="card-rank">#{rank}</div>
      <div className="card-match-badge">
        {(similarity * 100).toFixed(0)}%
      </div>
      
      <div className="card-cover">
        {book.cover_url ? (
          <img src={book.cover_url} alt={book.title} />
        ) : (
          <div className="cover-placeholder">
            <BookOpen size={32} />
          </div>
        )}
      </div>
      
      <div className="card-content">
        <h4 className="card-title">{book.title}</h4>
        <p className="card-author">{book.author}</p>
        
        <div className="card-meta">
          {book.my_rating > 0 && (
            <div className="card-rating">
              {[1, 2, 3, 4, 5].map(i => (
                <Star
                  key={i}
                  size={12}
                  fill={i <= book.my_rating ? '#ffd93d' : 'none'}
                  color={i <= book.my_rating ? '#ffd93d' : '#64748b'}
                />
              ))}
            </div>
          )}
          <span className={`card-status ${book.is_read ? 'read' : 'unread'}`}>
            {book.is_read ? '📖 Read' : '💡 Unread'}
          </span>
        </div>
        
        {book.description && (
          <p className="card-description">
            {truncateDescription(book.description)}
          </p>
        )}
      </div>
    </div>
  );
};

// ========== BOOK DETAIL MODAL ==========

const BookDetailModal: React.FC<{
  book: Book;
  similarity: number;
  onClose: () => void;
}> = ({ book, similarity, onClose }) => {
  const parseGenres = (genresStr: string): string[] => {
    try {
      return JSON.parse(genresStr || '[]').slice(0, 5);
    } catch {
      return [];
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>
        
        <div className="modal-body">
          <div className="modal-cover">
            {book.cover_url ? (
              <img src={book.cover_url} alt={book.title} />
            ) : (
              <div className="cover-placeholder large">
                <BookOpen size={64} />
              </div>
            )}
          </div>
          
          <div className="modal-info">
            <div className="modal-match-score">
              <span className="match-label">Match Score</span>
              <span className="match-value">{(similarity * 100).toFixed(1)}%</span>
            </div>
            
            <h2>{book.title}</h2>
            <p className="modal-author">by {book.author}</p>
            
            <div className="modal-meta">
              {book.my_rating > 0 && (
                <div className="meta-item">
                  <span className="meta-label">Your Rating</span>
                  <div className="rating-stars">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star
                        key={i}
                        size={16}
                        fill={i <= book.my_rating ? '#ffd93d' : 'none'}
                        color={i <= book.my_rating ? '#ffd93d' : '#64748b'}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {book.avg_rating > 0 && (
                <div className="meta-item">
                  <span className="meta-label">Avg Rating</span>
                  <span>{book.avg_rating.toFixed(2)}</span>
                </div>
              )}
              
              {book.pages && (
                <div className="meta-item">
                  <span className="meta-label">Pages</span>
                  <span>{book.pages}</span>
                </div>
              )}
              
              {book.year_published && (
                <div className="meta-item">
                  <span className="meta-label">Published</span>
                  <span>{book.year_published}</span>
                </div>
              )}
            </div>
            
            <div className="modal-status">
              <span className={`status-badge ${book.is_read ? 'read' : 'unread'}`}>
                {book.is_read ? '📖 Read' : '💡 Unread'}
              </span>
              {book.date_read && (
                <span className="date-read">Read on {book.date_read}</span>
              )}
            </div>
            
            {parseGenres(book.genres).length > 0 && (
              <div className="modal-genres">
                {parseGenres(book.genres).map(genre => (
                  <span key={genre} className="genre-tag">{genre}</span>
                ))}
              </div>
            )}
            
            {book.description && (
              <div className="modal-description">
                <h4>Description</h4>
                <p>{book.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== MAIN COMPONENT ==========

const TasteFinder: React.FC<Props> = ({ books }) => {
  // Mode state
  const [mode, setMode] = useState<DiscoverMode>('search');
  
  // Search state
  const [query, setQuery] = useState('');
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadProgress, setLoadProgress] = useState(0);
  
  // Find Similar state
  const [selectedBooks, setSelectedBooks] = useState<Book[]>([]);
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [showBookDropdown, setShowBookDropdown] = useState(false);
  
  // Taste Profile state
  const [selectedRatings, setSelectedRatings] = useState<number[]>([5]);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  
  // Results state
  const [results, setResults] = useState<RecommendationResult[]>([]);
  const [sourceEmbedding, setSourceEmbedding] = useState<number[] | null>(null);
  const [sourceLabel, setSourceLabel] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBookDetail, setSelectedBookDetail] = useState<RecommendationResult | null>(null);
  
  // Embedding pipeline ref
  const embedderRef = useRef<any>(null);

  // Books with embeddings
  const booksWithEmbeddings = useMemo(() => 
    books.filter(b => b.embedding && b.embedding.length > 0),
    [books]
  );
  
  // Read books for selection
  const readBooks = useMemo(() => 
    booksWithEmbeddings.filter(b => b.is_read),
    [booksWithEmbeddings]
  );
  
  // Unread books pool
  const unreadBooks = useMemo(() => {
    let pool = booksWithEmbeddings.filter(b => !b.is_read);
    if (selectedGenre !== 'all') {
      pool = pool.filter(b => b.genre_primary === selectedGenre);
    }
    return pool;
  }, [booksWithEmbeddings, selectedGenre]);
  
  // Available genres
  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>();
    booksWithEmbeddings.forEach(b => {
      if (b.genre_primary && b.genre_primary !== 'Unknown') {
        genreSet.add(b.genre_primary);
      }
    });
    return Array.from(genreSet).sort();
  }, [booksWithEmbeddings]);
  
  // Filtered books for dropdown search
  const filteredBooksForDropdown = useMemo(() => {
    if (!bookSearchQuery.trim()) return readBooks.slice(0, 20);
    const query = bookSearchQuery.toLowerCase();
    return readBooks
      .filter(b => 
        b.title.toLowerCase().includes(query) || 
        b.author.toLowerCase().includes(query)
      )
      .slice(0, 20);
  }, [readBooks, bookSearchQuery]);
  
  // Taste profile books
  const tasteProfileBooks = useMemo(() => 
    booksWithEmbeddings.filter(b => 
      selectedRatings.includes(b.my_rating) && b.is_read
    ),
    [booksWithEmbeddings, selectedRatings]
  );

  // Load the embedding model on mount
  useEffect(() => {
    const loadModel = async () => {
      try {
        setModelStatus('loading');
        
        embedderRef.current = await pipeline(
          'feature-extraction',
          'Xenova/all-MiniLM-L6-v2',
          {
            progress_callback: (progress: any) => {
              if (progress.status === 'progress') {
                setLoadProgress(Math.round(progress.progress));
              }
            }
          }
        );
        
        setModelStatus('ready');
      } catch (error) {
        console.error('Failed to load model:', error);
        setModelStatus('error');
      }
    };
    
    loadModel();
  }, []);

  // Clear results when mode changes
  useEffect(() => {
    setResults([]);
    setSourceEmbedding(null);
    setSourceLabel('');
  }, [mode]);

  // Search by Concept
  const handleSearchByConcept = useCallback(async () => {
    if (!query.trim() || modelStatus !== 'ready') return;
    
    setIsSearching(true);
    
    try {
      const output = await embedderRef.current(query, {
        pooling: 'mean',
        normalize: true
      });
      const queryEmbedding = Array.from(output.data) as number[];
      
      const scored = booksWithEmbeddings
        .map(book => ({
          book,
          similarity: cosineSimilarity(queryEmbedding, book.embedding!),
        }))
        .filter(r => r.similarity > 0.2)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 20);
      
      setSourceEmbedding(queryEmbedding);
      setSourceLabel(`"${query}"`);
      setResults(scored);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [query, booksWithEmbeddings, modelStatus]);

  // Find Similar Books
  const handleFindSimilar = useCallback(async () => {
    if (selectedBooks.length === 0) return;
    
    setIsSearching(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const embeddings = selectedBooks
      .map(b => b.embedding)
      .filter((e): e is number[] => e !== null && e !== undefined);
    
    if (embeddings.length === 0) {
      setIsSearching(false);
      return;
    }
    
    const centroid = computeCentroid(embeddings);
    
    // Search in ALL books (both read and unread), excluding selected books
    const selectedIds = new Set(selectedBooks.map(b => b.id));
    const scored = booksWithEmbeddings
      .filter(b => !selectedIds.has(b.id))
      .map(book => ({
        book,
        similarity: cosineSimilarity(centroid, book.embedding!),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 20);
    
    const label = selectedBooks.length === 1 
      ? selectedBooks[0].title.substring(0, 30) + (selectedBooks[0].title.length > 30 ? '...' : '')
      : `${selectedBooks.length} Selected Books`;
    
    setSourceEmbedding(centroid);
    setSourceLabel(label);
    setResults(scored);
    setIsSearching(false);
  }, [selectedBooks, booksWithEmbeddings]);

  // My Taste Profile
  const handleTasteProfile = useCallback(async () => {
    if (tasteProfileBooks.length === 0) return;
    
    setIsSearching(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const embeddings = tasteProfileBooks
      .map(b => b.embedding)
      .filter((e): e is number[] => e !== null && e !== undefined);
    
    if (embeddings.length === 0) {
      setIsSearching(false);
      return;
    }
    
    const centroid = computeCentroid(embeddings);
    
    const scored = unreadBooks
      .map(book => ({
        book,
        similarity: cosineSimilarity(centroid, book.embedding!),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 20);
    
    const ratingLabel = selectedRatings.length === 1 
      ? `${selectedRatings[0]}★ Books` 
      : `${selectedRatings.join('/')}★ Books`;
    
    setSourceEmbedding(centroid);
    setSourceLabel(`Your Taste (${tasteProfileBooks.length} ${ratingLabel})`);
    setResults(scored);
    setIsSearching(false);
  }, [tasteProfileBooks, unreadBooks, selectedRatings]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchByConcept();
    }
  };

  const addSelectedBook = (book: Book) => {
    if (selectedBooks.length < 3 && !selectedBooks.find(b => b.id === book.id)) {
      setSelectedBooks([...selectedBooks, book]);
    }
    setBookSearchQuery('');
    setShowBookDropdown(false);
  };

  const removeSelectedBook = (bookId: string) => {
    setSelectedBooks(selectedBooks.filter(b => b.id !== bookId));
  };

  const toggleRating = (rating: number) => {
    setSelectedRatings(prev => {
      if (prev.includes(rating)) {
        if (prev.length === 1) return prev;
        return prev.filter(r => r !== rating);
      }
      return [...prev, rating].sort((a, b) => b - a);
    });
  };

  return (
    <div className="discover-page">
      {/* Header */}
      <div className="discover-header">
        <h2>Discover</h2>
        <p>Find your next great read with AI-powered semantic search</p>
        
        <div className={`model-status ${modelStatus}`}>
          {modelStatus === 'loading' && (
            <>
              <Loader size={14} className="spinning" />
              <span>Loading AI model... {loadProgress}%</span>
            </>
          )}
          {modelStatus === 'ready' && (
            <>
              <Brain size={14} />
              <span>AI Ready • {booksWithEmbeddings.length.toLocaleString()} books indexed</span>
            </>
          )}
          {modelStatus === 'error' && (
            <>
              <X size={14} />
              <span>Model failed to load</span>
            </>
          )}
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="mode-tabs">
        <button 
          className={`mode-tab ${mode === 'search' ? 'active' : ''}`}
          onClick={() => setMode('search')}
        >
          <Search size={18} />
          <span>Search by Concept</span>
        </button>
        <button 
          className={`mode-tab ${mode === 'similar' ? 'active' : ''}`}
          onClick={() => setMode('similar')}
        >
          <BookMarked size={18} />
          <span>Find Similar</span>
        </button>
        <button 
          className={`mode-tab ${mode === 'taste' ? 'active' : ''}`}
          onClick={() => setMode('taste')}
        >
          <Heart size={18} />
          <span>My Taste Profile</span>
        </button>
      </div>

      {/* Input Section */}
      <div className="input-section">
        {/* Search by Concept */}
        {mode === 'search' && (
          <div className="search-input-section">
            <div className="search-input-wrapper">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Describe what you're looking for..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              {query && (
                <button className="clear-btn" onClick={() => setQuery('')}>
                  <X size={16} />
                </button>
              )}
            </div>
            
            <button 
              className="action-btn primary"
              onClick={handleSearchByConcept}
              disabled={isSearching || modelStatus !== 'ready' || !query.trim()}
            >
              {isSearching ? <Loader size={18} className="spinning" /> : <Zap size={18} />}
              Search
            </button>
            
            <div className="search-suggestions">
              <span>Try:</span>
              {[
                'meditation and mindfulness',
                'epic space adventures', 
                'overcoming personal challenges',
                'building successful habits'
              ].map(suggestion => (
                <button 
                  key={suggestion}
                  className="suggestion-chip"
                  onClick={() => setQuery(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Find Similar */}
        {mode === 'similar' && (
          <div className="similar-input-section">
            <div className="section-description">
              <p>Select 1-3 books from your library to find similar recommendations</p>
            </div>
            
            <div className="book-selector">
              <div className="selected-books">
                {selectedBooks.map(book => (
                  <div key={book.id} className="selected-book-chip">
                    {book.cover_url && <img src={book.cover_url} alt="" />}
                    <span>{book.title.substring(0, 25)}{book.title.length > 25 ? '...' : ''}</span>
                    <button onClick={() => removeSelectedBook(book.id)}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
                
                {selectedBooks.length < 3 && (
                  <div className="book-search-dropdown">
                    <input
                      type="text"
                      placeholder={selectedBooks.length === 0 ? "Search your books..." : "Add another book..."}
                      value={bookSearchQuery}
                      onChange={(e) => setBookSearchQuery(e.target.value)}
                      onFocus={() => setShowBookDropdown(true)}
                    />
                    
                    {showBookDropdown && (
                      <div className="dropdown-list">
                        {filteredBooksForDropdown.map(book => (
                          <button 
                            key={book.id} 
                            className="dropdown-item"
                            onClick={() => addSelectedBook(book)}
                          >
                            {book.cover_url && <img src={book.cover_url} alt="" />}
                            <div className="dropdown-item-info">
                              <span className="dropdown-title">{book.title}</span>
                              <span className="dropdown-author">{book.author}</span>
                            </div>
                            {book.my_rating > 0 && (
                              <span className="dropdown-rating">{book.my_rating}★</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button 
                className="action-btn primary"
                onClick={handleFindSimilar}
                disabled={isSearching || selectedBooks.length === 0}
              >
                {isSearching ? <Loader size={18} className="spinning" /> : <Target size={18} />}
                Find Similar
              </button>
            </div>
          </div>
        )}

        {/* My Taste Profile */}
        {mode === 'taste' && (
          <div className="taste-input-section">
            <div className="section-description">
              <p>Get recommendations based on books you've loved</p>
            </div>
            
            <div className="taste-filters-grid">
              <div className="filter-group">
                <label>Include books rated:</label>
                <div className="rating-toggles">
                  {[5, 4, 3].map(rating => (
                    <button
                      key={rating}
                      className={`rating-toggle ${selectedRatings.includes(rating) ? 'active' : ''}`}
                      onClick={() => toggleRating(rating)}
                    >
                      {rating}★
                    </button>
                  ))}
                </div>
                <span className="filter-hint">{tasteProfileBooks.length} books selected</span>
              </div>
              
              <div className="filter-group">
                <label>Recommend from:</label>
                <select 
                  value={selectedGenre} 
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="genre-select"
                >
                  <option value="all">All Genres ({unreadBooks.length.toLocaleString()} unread)</option>
                  {availableGenres.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="taste-action-row">
              <button 
                className="action-btn primary"
                onClick={handleTasteProfile}
                disabled={isSearching || tasteProfileBooks.length === 0}
              >
                {isSearching ? <Loader size={18} className="spinning" /> : <Heart size={18} />}
                Get Recommendations
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      {results.length > 0 && (
        <div className="results-section">
          <div className="results-header">
            <h3>
              <Zap size={18} />
              Top Matches
            </h3>
            <span className="results-source">Based on: {sourceLabel}</span>
          </div>
          
          {/* 3D Visualization */}
          <ResultsVisualization
            sourceLabel={sourceLabel}
            sourceEmbedding={sourceEmbedding}
            sourceBooks={mode === 'similar' ? selectedBooks : undefined}
            results={results}
            onSelectBook={(book) => {
              const result = results.find(r => r.book.id === book.id);
              if (result) setSelectedBookDetail(result);
            }}
          />
          
          {/* Results Cards */}
          <div className="results-cards">
            {results.map((result, idx) => (
              <ResultCard
                key={result.book.id}
                result={result}
                rank={idx + 1}
                onClick={() => setSelectedBookDetail(result)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Book Detail Modal */}
      {selectedBookDetail && (
        <BookDetailModal
          book={selectedBookDetail.book}
          similarity={selectedBookDetail.similarity}
          onClose={() => setSelectedBookDetail(null)}
        />
      )}

      {/* Click outside to close dropdown */}
      {showBookDropdown && (
        <div 
          className="dropdown-backdrop" 
          onClick={() => setShowBookDropdown(false)}
        />
      )}

      <style>{`
        .discover-page {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        /* Header */
        .discover-header {
          text-align: center;
          margin-bottom: var(--space-xl);
        }
        
        .discover-header h2 {
          font-size: 2rem;
          margin-bottom: var(--space-sm);
        }
        
        .discover-header p {
          color: var(--color-text-secondary);
          margin-bottom: var(--space-md);
        }
        
        .model-status {
          display: inline-flex;
          align-items: center;
          gap: var(--space-xs);
          padding: var(--space-xs) var(--space-md);
          border-radius: var(--radius-full);
          font-size: 0.75rem;
        }
        
        .model-status.loading {
          background: rgba(255, 217, 61, 0.15);
          color: var(--color-star-gold);
          border: 1px solid rgba(255, 217, 61, 0.3);
        }
        
        .model-status.ready {
          background: rgba(0, 245, 212, 0.15);
          color: var(--color-aurora);
          border: 1px solid rgba(0, 245, 212, 0.3);
        }
        
        .model-status.error {
          background: rgba(255, 107, 157, 0.15);
          color: var(--color-red-dwarf);
          border: 1px solid rgba(255, 107, 157, 0.3);
        }
        
        .spinning {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        /* Mode Tabs */
        .mode-tabs {
          display: flex;
          justify-content: center;
          gap: var(--space-md);
          margin-bottom: var(--space-xl);
        }
        
        .mode-tab {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-md) var(--space-xl);
          background: var(--color-nebula-dark);
          border: 2px solid var(--color-border);
          border-radius: var(--radius-lg);
          color: var(--color-text-secondary);
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .mode-tab:hover {
          border-color: var(--color-cosmic-purple);
          color: var(--color-text-primary);
        }
        
        .mode-tab.active {
          background: linear-gradient(135deg, rgba(157, 78, 221, 0.2), rgba(255, 107, 157, 0.1));
          border-color: var(--color-cosmic-purple);
          color: var(--color-text-primary);
        }
        
        /* Input Section */
        .input-section {
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-xl);
          margin-bottom: var(--space-xl);
        }
        
        .section-description {
          text-align: center;
          margin-bottom: var(--space-lg);
        }
        
        .section-description p {
          color: var(--color-text-secondary);
        }
        
        /* Search Input */
        .search-input-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        
        .search-input-wrapper {
          position: relative;
          flex: 1;
        }
        
        .search-icon {
          position: absolute;
          left: var(--space-md);
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-muted);
        }
        
        .search-input {
          width: 100%;
          padding: var(--space-md) var(--space-md) var(--space-md) 48px;
          font-size: 1rem;
          background: var(--color-nebula-dark);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-primary);
        }
        
        .search-input:focus {
          outline: none;
          border-color: var(--color-cosmic-purple);
          box-shadow: 0 0 0 3px rgba(157, 78, 221, 0.2);
        }
        
        .clear-btn {
          position: absolute;
          right: var(--space-md);
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: var(--space-xs);
        }
        
        .action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-sm);
          padding: var(--space-md) var(--space-xl);
          border: none;
          border-radius: var(--radius-md);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .action-btn.primary {
          background: linear-gradient(135deg, var(--color-cosmic-purple), var(--color-supernova));
          color: white;
        }
        
        .action-btn.primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(157, 78, 221, 0.4);
        }
        
        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .search-suggestions {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          flex-wrap: wrap;
          color: var(--color-text-muted);
          font-size: 0.85rem;
        }
        
        .suggestion-chip {
          padding: var(--space-xs) var(--space-sm);
          background: var(--color-nebula);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-full);
          color: var(--color-text-secondary);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .suggestion-chip:hover {
          background: var(--color-cosmic-purple);
          border-color: var(--color-cosmic-purple);
          color: white;
        }
        
        /* Book Selector */
        .book-selector {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
          align-items: center;
        }
        
        .selected-books {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-md);
          justify-content: center;
          align-items: center;
          width: 100%;
        }
        
        .selected-book-chip {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-sm) var(--space-md);
          background: rgba(0, 245, 212, 0.15);
          border: 1px solid rgba(0, 245, 212, 0.3);
          border-radius: var(--radius-md);
          color: var(--color-aurora);
        }
        
        .selected-book-chip img {
          width: 24px;
          height: 36px;
          object-fit: cover;
          border-radius: 2px;
        }
        
        .selected-book-chip button {
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: 2px;
          display: flex;
        }
        
        .selected-book-chip button:hover {
          color: var(--color-red-dwarf);
        }
        
        .book-search-dropdown {
          position: relative;
          width: 300px;
        }
        
        .book-search-dropdown input {
          width: 100%;
          padding: var(--space-sm) var(--space-md);
          background: var(--color-nebula-dark);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-primary);
          font-size: 0.9rem;
        }
        
        .book-search-dropdown input:focus {
          outline: none;
          border-color: var(--color-cosmic-purple);
        }
        
        .dropdown-list {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          max-height: 300px;
          overflow-y: auto;
          background: var(--color-nebula-dark);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          margin-top: var(--space-xs);
          z-index: 100;
        }
        
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          width: 100%;
          padding: var(--space-sm) var(--space-md);
          background: none;
          border: none;
          border-bottom: 1px solid var(--color-border);
          color: var(--color-text-primary);
          text-align: left;
          cursor: pointer;
          transition: background var(--transition-fast);
        }
        
        .dropdown-item:hover {
          background: rgba(157, 78, 221, 0.1);
        }
        
        .dropdown-item:last-child {
          border-bottom: none;
        }
        
        .dropdown-item img {
          width: 30px;
          height: 45px;
          object-fit: cover;
          border-radius: 2px;
          flex-shrink: 0;
        }
        
        .dropdown-item-info {
          flex: 1;
          min-width: 0;
        }
        
        .dropdown-title {
          display: block;
          font-size: 0.85rem;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .dropdown-author {
          display: block;
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }
        
        .dropdown-rating {
          color: var(--color-star-gold);
          font-size: 0.8rem;
          font-weight: 600;
        }
        
        .dropdown-backdrop {
          position: fixed;
          inset: 0;
          z-index: 99;
        }
        
        /* Taste Filters */
        .taste-filters-grid {
          display: flex;
          justify-content: center;
          gap: var(--space-2xl);
          align-items: flex-start;
          margin-bottom: var(--space-lg);
        }
        
        .taste-action-row {
          display: flex;
          justify-content: center;
        }
        
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        
        .filter-group label {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .rating-toggles {
          display: flex;
          gap: var(--space-sm);
        }
        
        .rating-toggle {
          padding: var(--space-sm) var(--space-md);
          background: var(--color-nebula-dark);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .rating-toggle:hover {
          border-color: var(--color-star-gold);
        }
        
        .rating-toggle.active {
          background: rgba(255, 217, 61, 0.2);
          border-color: var(--color-star-gold);
          color: var(--color-star-gold);
        }
        
        .filter-hint {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
        
        .genre-select {
          padding: var(--space-sm) var(--space-md);
          background: var(--color-nebula-dark);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-primary);
          font-family: var(--font-main);
          min-width: 200px;
        }
        
        /* Results Section */
        .results-section {
          animation: fadeIn var(--transition-slow) ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-lg);
          flex-wrap: wrap;
          gap: var(--space-sm);
        }
        
        .results-header h3 {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: 1.25rem;
        }
        
        .results-source {
          font-size: 0.85rem;
          color: var(--color-text-secondary);
        }
        
        /* Visualization */
        .results-visualization {
          margin-bottom: var(--space-xl);
        }
        
        .viz-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-sm);
          padding: 0 var(--space-sm);
        }
        
        .viz-info {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
        
        .rotate-toggle {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background: rgba(100, 100, 130, 0.3);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          font-size: 0.75rem;
          cursor: pointer;
          transition: all var(--transition-base);
        }
        
        .rotate-toggle:hover {
          background: rgba(157, 78, 221, 0.2);
          border-color: var(--color-cosmic-purple);
        }
        
        .rotate-toggle.active {
          background: rgba(157, 78, 221, 0.3);
          border-color: var(--color-cosmic-purple);
          color: var(--color-text-primary);
        }
        
        .viz-wrapper {
          display: flex;
          gap: var(--space-md);
          align-items: stretch;
        }
        
        .viz-container {
          flex: 1;
          height: 350px;
          background: radial-gradient(ellipse at center, #1a1a3e 0%, #0d0d23 100%);
          border-radius: var(--radius-lg);
          overflow: hidden;
          border: 1px solid var(--color-border);
        }
        
        .viz-hover-panel {
          width: 180px;
          min-height: 350px;
          background: rgba(13, 13, 35, 0.9);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-md);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        
        .viz-hover-panel.visible {
          border-color: var(--color-cosmic-purple);
          box-shadow: 0 0 20px rgba(157, 78, 221, 0.2);
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
          height: 140px;
          margin-bottom: var(--space-sm);
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
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--color-text-primary);
          text-align: center;
          line-height: 1.3;
          margin-bottom: var(--space-xs);
        }
        
        .hover-author {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          text-align: center;
          margin-bottom: var(--space-sm);
        }
        
        .hover-match {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: var(--space-xs);
        }
        
        .hover-status {
          font-size: 0.8rem;
          font-weight: 500;
        }
        
        .viz-legend {
          display: flex;
          justify-content: center;
          gap: var(--space-lg);
          margin-top: var(--space-md);
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          font-size: 0.8rem;
          color: var(--color-text-secondary);
        }
        
        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        
        /* Results Cards */
        .results-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--space-lg);
        }
        
        .result-card {
          position: relative;
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
          cursor: pointer;
          transition: all var(--transition-base);
        }
        
        .result-card:hover {
          border-color: var(--color-cosmic-purple);
          transform: translateY(-4px);
          box-shadow: var(--shadow-glow);
        }
        
        .card-rank {
          position: absolute;
          top: var(--space-sm);
          left: var(--space-sm);
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-cosmic-purple);
          border-radius: 50%;
          font-size: 0.75rem;
          font-weight: 700;
        }
        
        .card-match-badge {
          position: absolute;
          top: var(--space-sm);
          right: var(--space-sm);
          padding: 4px 10px;
          background: linear-gradient(135deg, var(--color-cosmic-purple), var(--color-supernova));
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 700;
        }
        
        .card-cover {
          width: 100%;
          height: 180px;
          margin-bottom: var(--space-md);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        
        .card-cover img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: var(--color-nebula);
        }
        
        .cover-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-nebula);
          color: var(--color-text-muted);
        }
        
        .card-content {
          min-height: 140px;
        }
        
        .card-title {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: var(--space-xs);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .card-author {
          font-size: 0.85rem;
          color: var(--color-text-secondary);
          margin-bottom: var(--space-sm);
        }
        
        .card-meta {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-sm);
          flex-wrap: wrap;
        }
        
        .card-rating {
          display: flex;
          gap: 1px;
        }
        
        .card-status {
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
        }
        
        .card-status.read {
          background: rgba(0, 245, 212, 0.15);
          color: var(--color-aurora);
        }
        
        .card-status.unread {
          background: rgba(255, 217, 61, 0.15);
          color: var(--color-star-gold);
        }
        
        .card-description {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
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
        }
        
        .modal-content {
          position: relative;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          background: var(--color-nebula-dark);
          border: 1px solid var(--color-border);
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
          width: 200px;
          flex-shrink: 0;
        }
        
        .modal-cover img {
          width: 100%;
          border-radius: var(--radius-md);
        }
        
        .cover-placeholder.large {
          height: 300px;
          border-radius: var(--radius-md);
        }
        
        .modal-info {
          flex: 1;
        }
        
        .modal-match-score {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          padding: var(--space-sm) var(--space-lg);
          background: linear-gradient(135deg, rgba(157, 78, 221, 0.2), rgba(255, 107, 157, 0.1));
          border: 1px solid var(--color-cosmic-purple);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-md);
        }
        
        .match-label {
          font-size: 0.65rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .match-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-cosmic-purple);
        }
        
        .modal-info h2 {
          font-size: 1.5rem;
          margin-bottom: var(--space-xs);
        }
        
        .modal-author {
          color: var(--color-text-secondary);
          margin-bottom: var(--space-md);
        }
        
        .modal-meta {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-lg);
          margin-bottom: var(--space-md);
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
        }
        
        .rating-stars {
          display: flex;
          gap: 2px;
        }
        
        .modal-status {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          margin-bottom: var(--space-md);
        }
        
        .status-badge {
          padding: var(--space-xs) var(--space-md);
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
        }
        
        .status-badge.read {
          background: rgba(0, 245, 212, 0.15);
          color: var(--color-aurora);
        }
        
        .status-badge.unread {
          background: rgba(255, 217, 61, 0.15);
          color: var(--color-star-gold);
        }
        
        .date-read {
          font-size: 0.8rem;
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
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }
        
        .modal-description {
          padding-top: var(--space-md);
          border-top: 1px solid var(--color-border);
        }
        
        .modal-description h4 {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          margin-bottom: var(--space-sm);
        }
        
        .modal-description p {
          color: var(--color-text-secondary);
          font-size: 0.9rem;
          line-height: 1.7;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
          .mode-tabs {
            flex-direction: column;
          }
          
          .mode-tab {
            width: 100%;
            justify-content: center;
          }
          
          .taste-filters-grid {
            flex-direction: column;
            align-items: center;
          }
          
          .book-selector {
            width: 100%;
          }
          
          .selected-books {
            flex-direction: column;
          }
          
          .book-search-dropdown {
            width: 100%;
          }
          
          .results-cards {
            grid-template-columns: 1fr;
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

export default TasteFinder;
