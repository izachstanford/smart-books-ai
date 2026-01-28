import React, { useState, useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { RefreshCw, Star, BookOpen, Shuffle, Heart, Zap, Calculator, Target } from 'lucide-react';
import { Book } from '../App';

interface Props {
  books: Book[];
}

interface ScoredBook {
  book: Book;
  similarity: number;
  reason: string;
}

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

// Compute vector magnitude
const magnitude = (v: number[]): number => {
  return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
};

// 3D Point component for visualization
const TastePoint: React.FC<{
  position: [number, number, number];
  color: string;
  size: number;
  label?: string;
  isCenter?: boolean;
}> = ({ position, color, size, label, isCenter }) => {
  const [hovered, setHovered] = useState(false);
  
  return (
    <mesh
      position={position}
      scale={hovered ? 1.3 : 1}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {isCenter ? (
        <octahedronGeometry args={[size, 0]} />
      ) : (
        <sphereGeometry args={[size, 12, 12]} />
      )}
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={hovered ? 2 : 1}
        transparent
        opacity={0.9}
      />
      {(hovered || isCenter) && label && (
        <Html distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(13, 13, 35, 0.95)',
            border: '1px solid rgba(157, 78, 221, 0.5)',
            borderRadius: '8px',
            padding: '8px 12px',
            whiteSpace: 'nowrap',
            fontSize: '12px',
            color: 'white',
            maxWidth: '200px',
          }}>
            {label}
          </div>
        </Html>
      )}
    </mesh>
  );
};

// Mini 3D visualization of taste space
const TasteVisualization: React.FC<{
  centerPosition: [number, number, number];
  favoritePositions: Array<{ pos: [number, number, number]; title: string }>;
  recommendedPositions: Array<{ pos: [number, number, number]; title: string; similarity: number }>;
}> = ({ centerPosition, favoritePositions, recommendedPositions }) => {
  return (
    <Canvas
      camera={{ position: [4, 3, 4], fov: 50 }}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        {/* Taste Centroid - the center of your reading preferences */}
        <TastePoint
          position={centerPosition}
          color="#ffd93d"
          size={0.25}
          label="⭐ Your Taste Centroid"
          isCenter={true}
        />
        
        {/* 5-star favorites */}
        {favoritePositions.slice(0, 8).map((fav, i) => (
          <TastePoint
            key={`fav-${i}`}
            position={fav.pos}
            color="#00f5d4"
            size={0.12}
            label={`📖 ${fav.title}`}
          />
        ))}
        
        {/* Recommended books */}
        {recommendedPositions.slice(0, 5).map((rec, i) => (
          <TastePoint
            key={`rec-${i}`}
            position={rec.pos}
            color="#ff6b9d"
            size={0.1 + rec.similarity * 0.08}
            label={`💡 ${rec.title} (${(rec.similarity * 100).toFixed(0)}%)`}
          />
        ))}
        
        {/* Lines from centroid to recommendations */}
        {recommendedPositions.slice(0, 5).map((rec, i) => (
          <line key={`line-${i}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([
                  ...centerPosition,
                  ...rec.pos
                ])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#ff6b9d" opacity={0.3} transparent />
          </line>
        ))}
        
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          autoRotate={true}
          autoRotateSpeed={1}
        />
      </Suspense>
    </Canvas>
  );
};

/**
 * TasteFinder - Semantic similarity-based book recommendations
 * Uses actual embedding vectors for real vector math!
 */
const TasteFinder: React.FC<Props> = ({ books }) => {
  const [recommendations, setRecommendations] = useState<ScoredBook[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [vectorMath, setVectorMath] = useState<{
    centroidMagnitude: number;
    dimensionality: number;
    topSimilarities: number[];
    sampleDotProduct: number;
  } | null>(null);
  
  // Books with embeddings
  const booksWithEmbeddings = useMemo(() => 
    books.filter(b => b.embedding && b.embedding.length > 0),
    [books]
  );
  
  // 5-star books with embeddings
  const fiveStarBooks = useMemo(() => 
    booksWithEmbeddings.filter(b => b.my_rating === 5 && b.is_read),
    [booksWithEmbeddings]
  );
  
  // Unread books with embeddings (recommendations pool)
  const unreadBooks = useMemo(() => 
    booksWithEmbeddings.filter(b => !b.is_read),
    [booksWithEmbeddings]
  );
  
  // Compute taste centroid from 5-star embeddings
  const tasteCentroid = useMemo(() => {
    const embeddings = fiveStarBooks
      .map(b => b.embedding)
      .filter((e): e is number[] => e !== null && e !== undefined);
    
    if (embeddings.length === 0) return null;
    return computeCentroid(embeddings);
  }, [fiveStarBooks]);
  
  // Extract genre info for display
  const tasteProfile = useMemo(() => {
    const genreCounts: Record<string, number> = {};
    fiveStarBooks.forEach(book => {
      try {
        const genres = JSON.parse(book.genres || '[]');
        genres.forEach((g: string) => {
          genreCounts[g] = (genreCounts[g] || 0) + 1;
        });
      } catch {}
    });
    
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);
    
    return { topGenres };
  }, [fiveStarBooks]);
  
  // Generate visualization positions using PCA-like projection
  const visualizationData = useMemo(() => {
    if (!tasteCentroid || recommendations.length === 0) {
      return { centerPos: [0, 0, 0] as [number, number, number], favorites: [], recommended: [] };
    }
    
    // Simple projection: use first 3 dimensions scaled
    const project = (embedding: number[]): [number, number, number] => {
      // Use a simple random projection for visualization
      const scale = 2;
      return [
        (embedding[0] * 10 + embedding[100] * 5) * scale,
        (embedding[50] * 10 + embedding[150] * 5) * scale,
        (embedding[200] * 10 + embedding[300] * 5) * scale,
      ];
    };
    
    const centerPos = project(tasteCentroid);
    
    const favorites = fiveStarBooks.slice(0, 8).map(b => ({
      pos: b.embedding ? project(b.embedding) : [0, 0, 0] as [number, number, number],
      title: b.title.substring(0, 30) + (b.title.length > 30 ? '...' : ''),
    }));
    
    const recommended = recommendations.slice(0, 5).map(rec => ({
      pos: rec.book.embedding ? project(rec.book.embedding) : [0, 0, 0] as [number, number, number],
      title: rec.book.title.substring(0, 30) + (rec.book.title.length > 30 ? '...' : ''),
      similarity: rec.similarity,
    }));
    
    return { centerPos, favorites, recommended };
  }, [tasteCentroid, fiveStarBooks, recommendations]);

  const generateRecommendations = async () => {
    if (!tasteCentroid) return;
    
    setIsGenerating(true);
    
    // Simulate processing time for effect
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Score ALL unread books by cosine similarity to taste centroid
    const scored: ScoredBook[] = unreadBooks
      .filter(book => book.embedding)
      .map(book => {
        const similarity = cosineSimilarity(tasteCentroid, book.embedding!);
        
        // Generate reason based on similarity
        let reason = '';
        if (similarity > 0.85) {
          reason = '🔥 Extremely close to your taste profile!';
        } else if (similarity > 0.75) {
          reason = '✨ Very strong semantic match';
        } else if (similarity > 0.65) {
          reason = '📚 Good alignment with your preferences';
        } else {
          reason = '🌟 Interesting semantic connection';
        }
        
        return { book, similarity, reason };
      })
      .sort((a, b) => b.similarity - a.similarity);
    
    // Take top 10 recommendations
    const topRecs = scored.slice(0, 10);
    
    // Compute vector math stats for display
    const centroidMag = magnitude(tasteCentroid);
    const topSims = topRecs.slice(0, 5).map(r => r.similarity);
    
    // Sample dot product calculation
    const sampleBook = topRecs[0]?.book;
    let sampleDot = 0;
    if (sampleBook?.embedding) {
      for (let i = 0; i < Math.min(10, tasteCentroid.length); i++) {
        sampleDot += tasteCentroid[i] * sampleBook.embedding[i];
      }
    }
    
    setVectorMath({
      centroidMagnitude: centroidMag,
      dimensionality: tasteCentroid.length,
      topSimilarities: topSims,
      sampleDotProduct: sampleDot,
    });
    
    setRecommendations(topRecs);
    setHasGenerated(true);
    setIsGenerating(false);
  };

  return (
    <div className="taste-finder">
      <div className="finder-header">
        <h2>Discover</h2>
        <p>Semantic similarity search using your 384-dimensional taste vector</p>
      </div>

      {/* Taste Profile Summary */}
      <div className="taste-profile">
        <div className="profile-header">
          <Heart size={20} />
          <h3>Your Taste Profile</h3>
        </div>
        
        <div className="profile-stats">
          <div className="profile-stat">
            <span className="stat-number">{fiveStarBooks.length}</span>
            <span className="stat-desc">5-Star Books</span>
          </div>
          <div className="profile-stat">
            <span className="stat-number">{unreadBooks.length.toLocaleString()}</span>
            <span className="stat-desc">Unread Pool</span>
          </div>
          <div className="profile-stat">
            <span className="stat-number">384</span>
            <span className="stat-desc">Dimensions</span>
          </div>
        </div>
        
        {tasteProfile.topGenres.length > 0 && (
          <div className="profile-section">
            <span className="section-label">Favorite Genres (from 5★ books)</span>
            <div className="genre-tags">
              {tasteProfile.topGenres.map(genre => (
                <span key={genre} className="genre-tag">{genre}</span>
              ))}
            </div>
          </div>
        )}
        
        {tasteCentroid && (
          <div className="centroid-preview">
            <span className="section-label">Taste Centroid Vector (first 20 dims)</span>
            <div className="vector-preview">
              [{tasteCentroid.slice(0, 20).map(v => v.toFixed(3)).join(', ')}...]
            </div>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <div className="generate-section">
        <button 
          className="generate-btn"
          onClick={generateRecommendations}
          disabled={isGenerating || !tasteCentroid}
        >
          {isGenerating ? (
            <>
              <RefreshCw size={20} className="spinning" />
              Computing cosine similarities...
            </>
          ) : hasGenerated ? (
            <>
              <Shuffle size={20} />
              Recalculate Recommendations
            </>
          ) : (
            <>
              <Target size={20} />
              Find Semantically Similar Books
            </>
          )}
        </button>
        
        {!tasteCentroid && (
          <p className="no-books-msg">Rate more books 5 stars to build your taste profile!</p>
        )}
      </div>

      {/* Vector Math Display */}
      {vectorMath && (
        <div className="vector-math-section">
          <div className="math-header">
            <Calculator size={20} />
            <h3>Vector Mathematics</h3>
          </div>
          
          <div className="math-grid">
            <div className="math-card">
              <div className="math-title">Cosine Similarity Formula</div>
              <div className="math-formula">
                cos(θ) = (A · B) / (||A|| × ||B||)
              </div>
              <div className="math-explanation">
                Measures angle between taste centroid and book embedding
              </div>
            </div>
            
            <div className="math-card">
              <div className="math-title">Taste Centroid Magnitude</div>
              <div className="math-value">||C|| = {vectorMath.centroidMagnitude.toFixed(4)}</div>
              <div className="math-explanation">
                Length of your averaged preference vector
              </div>
            </div>
            
            <div className="math-card">
              <div className="math-title">Top Match Similarities</div>
              <div className="similarity-bars">
                {vectorMath.topSimilarities.map((sim, i) => (
                  <div key={i} className="sim-bar-row">
                    <span className="sim-rank">#{i + 1}</span>
                    <div className="sim-bar-container">
                      <div 
                        className="sim-bar-fill" 
                        style={{ width: `${sim * 100}%` }}
                      />
                    </div>
                    <span className="sim-value">{(sim * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="math-card">
              <div className="math-title">Sample Dot Product (first 10 dims)</div>
              <div className="math-value">
                Σ(cᵢ × bᵢ) = {vectorMath.sampleDotProduct.toFixed(6)}
              </div>
              <div className="math-explanation">
                Partial dot product calculation for top match
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3D Visualization */}
      {hasGenerated && recommendations.length > 0 && (
        <div className="visualization-section">
          <div className="viz-header">
            <Zap size={20} />
            <h3>Taste Space Visualization</h3>
            <span className="viz-subtitle">3D projection of embedding vectors</span>
          </div>
          
          <div className="viz-container">
            <TasteVisualization
              centerPosition={visualizationData.centerPos}
              favoritePositions={visualizationData.favorites}
              recommendedPositions={visualizationData.recommended}
            />
          </div>
          
          <div className="viz-legend">
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#ffd93d' }}></span>
              <span>Taste Centroid</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#00f5d4' }}></span>
              <span>Your 5★ Books</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#ff6b9d' }}></span>
              <span>Recommendations</span>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="recommendations-section">
          <h3>📚 Top Semantic Matches ({recommendations.length} found)</h3>
          
          <div className="recommendations-grid">
            {recommendations.map((rec, idx) => (
              <div 
                key={rec.book.id}
                className="recommendation-card animate-slideUp"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="rec-rank">#{idx + 1}</div>
                
                <div className="rec-content">
                  {rec.book.cover_url ? (
                    <img src={rec.book.cover_url} alt={rec.book.title} className="rec-cover" />
                  ) : (
                    <div className="rec-cover-placeholder">
                      <BookOpen size={32} />
                    </div>
                  )}
                  
                  <div className="rec-info">
                    <h4>{rec.book.title}</h4>
                    <p className="rec-author">{rec.book.author}</p>
                    
                    <div className="rec-reason">
                      <span>{rec.reason}</span>
                    </div>
                    
                    {rec.book.avg_rating > 0 && (
                      <div className="rec-rating">
                        <Star size={14} fill="currentColor" />
                        <span>{rec.book.avg_rating.toFixed(2)} avg rating</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="rec-similarity">
                  <div className="similarity-label">Cosine Similarity</div>
                  <div className="similarity-score">
                    <div 
                      className="score-bar"
                      style={{ width: `${rec.similarity * 100}%` }}
                    />
                    <span className="score-text">{(rec.similarity * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="how-it-works">
        <h4>How Semantic Search Works</h4>
        <div className="steps">
          <div className="step">
            <span className="step-num">1</span>
            <div className="step-content">
              <span className="step-title">Compute Centroid</span>
              <span className="step-text">Average all 5★ book embeddings</span>
            </div>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <span className="step-num">2</span>
            <div className="step-content">
              <span className="step-title">Calculate Similarity</span>
              <span className="step-text">Cosine distance to all unread</span>
            </div>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <span className="step-num">3</span>
            <div className="step-content">
              <span className="step-title">Rank & Recommend</span>
              <span className="step-text">Return highest similarity books</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .taste-finder {
          max-width: 1000px;
          margin: 0 auto;
        }
        
        .finder-header {
          text-align: center;
          margin-bottom: var(--space-xl);
        }
        
        .finder-header h2 {
          font-size: 1.75rem;
          margin-bottom: var(--space-xs);
        }
        
        .finder-header p {
          color: var(--color-text-secondary);
        }
        
        .taste-profile {
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-xl);
          margin-bottom: var(--space-xl);
        }
        
        .profile-header {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-lg);
          color: var(--color-supernova);
        }
        
        .profile-header h3 {
          font-size: 1.1rem;
        }
        
        .profile-stats {
          display: flex;
          gap: var(--space-xl);
          margin-bottom: var(--space-lg);
          flex-wrap: wrap;
        }
        
        .profile-stat {
          display: flex;
          flex-direction: column;
        }
        
        .stat-number {
          font-size: 2rem;
          font-weight: 700;
          color: var(--color-star-gold);
        }
        
        .stat-desc {
          font-size: 0.8rem;
          color: var(--color-text-muted);
        }
        
        .profile-section, .centroid-preview {
          margin-bottom: var(--space-md);
        }
        
        .section-label {
          display: block;
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: var(--space-sm);
        }
        
        .genre-tags {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-sm);
        }
        
        .genre-tag {
          padding: var(--space-xs) var(--space-sm);
          background: var(--color-nebula);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }
        
        .vector-preview {
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 0.7rem;
          color: var(--color-aurora);
          background: rgba(0, 245, 212, 0.1);
          padding: var(--space-sm);
          border-radius: var(--radius-sm);
          overflow-x: auto;
          white-space: nowrap;
        }
        
        .generate-section {
          text-align: center;
          margin-bottom: var(--space-xl);
        }
        
        .generate-btn {
          display: inline-flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-md) var(--space-xl);
          background: linear-gradient(135deg, var(--color-cosmic-purple), var(--color-supernova));
          border: none;
          border-radius: var(--radius-full);
          color: white;
          font-family: var(--font-main);
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-base);
        }
        
        .generate-btn:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 0 30px rgba(157, 78, 221, 0.5);
        }
        
        .generate-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .spinning {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .no-books-msg {
          margin-top: var(--space-md);
          color: var(--color-text-muted);
          font-size: 0.9rem;
        }
        
        /* Vector Math Section */
        .vector-math-section {
          background: rgba(21, 21, 53, 0.5);
          border: 1px solid var(--color-cosmic-purple);
          border-radius: var(--radius-lg);
          padding: var(--space-xl);
          margin-bottom: var(--space-xl);
        }
        
        .math-header {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-lg);
          color: var(--color-cosmic-purple);
        }
        
        .math-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: var(--space-md);
        }
        
        .math-card {
          background: var(--color-nebula-dark);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-md);
        }
        
        .math-title {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: var(--space-sm);
        }
        
        .math-formula {
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 1rem;
          color: var(--color-aurora);
          margin-bottom: var(--space-sm);
        }
        
        .math-value {
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 1.1rem;
          color: var(--color-star-gold);
          margin-bottom: var(--space-sm);
        }
        
        .math-explanation {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }
        
        .similarity-bars {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }
        
        .sim-bar-row {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }
        
        .sim-rank {
          font-size: 0.7rem;
          color: var(--color-text-muted);
          width: 24px;
        }
        
        .sim-bar-container {
          flex: 1;
          height: 8px;
          background: var(--color-nebula);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        
        .sim-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-cosmic-purple), var(--color-supernova));
          border-radius: var(--radius-full);
          transition: width 0.5s ease;
        }
        
        .sim-value {
          font-size: 0.7rem;
          font-family: monospace;
          color: var(--color-aurora);
          width: 40px;
          text-align: right;
        }
        
        /* Visualization Section */
        .visualization-section {
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
          margin-bottom: var(--space-xl);
        }
        
        .viz-header {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-md);
          color: var(--color-supernova);
        }
        
        .viz-subtitle {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          margin-left: auto;
        }
        
        .viz-container {
          height: 350px;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: radial-gradient(ellipse at center, #1a1a3e 0%, #0d0d23 100%);
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
        
        /* Recommendations */
        .recommendations-section {
          margin-bottom: var(--space-xl);
        }
        
        .recommendations-section h3 {
          margin-bottom: var(--space-lg);
        }
        
        .recommendations-grid {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        
        .recommendation-card {
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
          position: relative;
          transition: all var(--transition-base);
        }
        
        .recommendation-card:hover {
          border-color: var(--color-cosmic-purple);
          box-shadow: var(--shadow-glow);
        }
        
        .rec-rank {
          position: absolute;
          top: var(--space-md);
          right: var(--space-md);
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-cosmic-purple);
          border-radius: 50%;
          font-weight: 700;
          font-size: 0.9rem;
        }
        
        .rec-content {
          display: flex;
          gap: var(--space-lg);
        }
        
        .rec-cover {
          width: 80px;
          height: 120px;
          object-fit: cover;
          border-radius: var(--radius-md);
          flex-shrink: 0;
        }
        
        .rec-cover-placeholder {
          width: 80px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-nebula);
          border-radius: var(--radius-md);
          color: var(--color-text-muted);
        }
        
        .rec-info {
          flex: 1;
          min-width: 0;
        }
        
        .rec-info h4 {
          font-size: 1rem;
          margin-bottom: var(--space-xs);
          padding-right: 48px;
        }
        
        .rec-author {
          color: var(--color-text-secondary);
          margin-bottom: var(--space-sm);
          font-size: 0.9rem;
        }
        
        .rec-reason {
          font-size: 0.85rem;
          color: var(--color-aurora);
          margin-bottom: var(--space-sm);
        }
        
        .rec-rating {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          font-size: 0.8rem;
          color: var(--color-star-gold);
        }
        
        .rec-similarity {
          margin-top: var(--space-md);
          padding-top: var(--space-md);
          border-top: 1px solid var(--color-border);
        }
        
        .similarity-label {
          font-size: 0.7rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: var(--space-xs);
        }
        
        .similarity-score {
          position: relative;
          height: 24px;
          background: var(--color-nebula-dark);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        
        .score-bar {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          background: linear-gradient(90deg, var(--color-cosmic-purple), var(--color-aurora));
          border-radius: var(--radius-full);
          transition: width var(--transition-slow) ease;
        }
        
        .score-text {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          font-size: 0.75rem;
          font-weight: 600;
          font-family: monospace;
          z-index: 1;
        }
        
        /* How It Works */
        .how-it-works {
          padding: var(--space-lg);
          background: rgba(21, 21, 53, 0.3);
          border: 1px dashed var(--color-border);
          border-radius: var(--radius-md);
          text-align: center;
        }
        
        .how-it-works h4 {
          color: var(--color-text-muted);
          margin-bottom: var(--space-lg);
        }
        
        .steps {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: var(--space-md);
          flex-wrap: wrap;
        }
        
        .step {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          background: var(--color-nebula);
          padding: var(--space-sm) var(--space-md);
          border-radius: var(--radius-md);
        }
        
        .step-num {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-cosmic-purple);
          border-radius: 50%;
          font-size: 0.8rem;
          font-weight: 600;
        }
        
        .step-content {
          display: flex;
          flex-direction: column;
          text-align: left;
        }
        
        .step-title {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        
        .step-text {
          font-size: 0.7rem;
          color: var(--color-text-secondary);
        }
        
        .step-arrow {
          color: var(--color-cosmic-purple);
          font-size: 1.5rem;
        }
        
        @media (max-width: 640px) {
          .rec-content {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          
          .rec-info h4 {
            padding-right: 0;
          }
          
          .steps {
            flex-direction: column;
          }
          
          .step-arrow {
            transform: rotate(90deg);
          }
          
          .math-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default TasteFinder;
