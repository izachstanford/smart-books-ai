import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Search, Star, BookOpen, Clock, X, Loader, Zap, Brain } from 'lucide-react';
import { Book } from '../App';

// @ts-ignore - Transformers.js types
import { pipeline, env } from '@xenova/transformers';

interface Props {
  books: Book[];
}

interface SearchResult extends Book {
  score: number;
  matchReason: string;
}

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

/**
 * SemanticSearch - Real vector similarity search using Transformers.js
 * Embeds the query and finds closest books in 384-dimensional space
 */
const SemanticSearch: React.FC<Props> = ({ books }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [filterShelf, setFilterShelf] = useState<'all' | 'read' | 'unread'>('all');
  const [selectedBook, setSelectedBook] = useState<SearchResult | null>(null);
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadProgress, setLoadProgress] = useState(0);
  
  // Embedding pipeline ref
  const embedderRef = useRef<any>(null);

  // Books with embeddings
  const searchableBooks = useMemo(() => 
    books.filter(b => b.embedding && b.embedding.length > 0),
    [books]
  );

  // Load the embedding model on mount
  useEffect(() => {
    const loadModel = async () => {
      try {
        setModelStatus('loading');
        
        // Load the same model used for book embeddings
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
        console.log('✅ Embedding model loaded!');
      } catch (error) {
        console.error('Failed to load model:', error);
        setModelStatus('error');
      }
    };
    
    loadModel();
  }, []);

  // Real semantic search using embeddings
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    setSearching(true);
    
    try {
      let queryEmbedding: number[] | null = null;
      
      // Generate query embedding if model is ready
      if (embedderRef.current && modelStatus === 'ready') {
        const output = await embedderRef.current(query, {
          pooling: 'mean',
          normalize: true
        });
        queryEmbedding = Array.from(output.data);
      }
      
      // Score all books
      const scored = searchableBooks.map(book => {
        let score = 0;
        const reasons: string[] = [];
        
        // REAL semantic similarity if we have query embedding
        if (queryEmbedding && book.embedding) {
          const similarity = cosineSimilarity(queryEmbedding, book.embedding);
          score = similarity;
          
          if (similarity > 0.6) {
            reasons.push(`Strong semantic match (${(similarity * 100).toFixed(0)}%)`);
          } else if (similarity > 0.45) {
            reasons.push(`Good semantic match (${(similarity * 100).toFixed(0)}%)`);
          } else if (similarity > 0.3) {
            reasons.push(`Related concepts (${(similarity * 100).toFixed(0)}%)`);
          } else {
            reasons.push(`Weak similarity (${(similarity * 100).toFixed(0)}%)`);
          }
        } else {
          // Fallback to keyword matching if model not loaded
          const queryLower = query.toLowerCase();
          const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
          
          if (book.title.toLowerCase().includes(queryLower)) {
            score += 0.5;
            reasons.push('Title match');
          }
          
          if (book.description) {
            const descLower = book.description.toLowerCase();
            const matchingWords = queryWords.filter(w => descLower.includes(w));
            if (matchingWords.length > 0) {
              score += 0.1 * matchingWords.length;
              reasons.push(`Keywords: ${matchingWords.join(', ')}`);
            }
          }
        }
        
        return {
          ...book,
          score,
          matchReason: reasons.join(' • ') || 'No match'
        };
      });
      
      // Filter by shelf
      let filtered = scored.filter(b => b.score > 0.2);
      
      if (filterShelf === 'read') {
        filtered = filtered.filter(b => b.is_read);
      } else if (filterShelf === 'unread') {
        filtered = filtered.filter(b => !b.is_read);
      }
      
      // Sort by score descending
      filtered.sort((a, b) => b.score - a.score);
      
      setResults(filtered.slice(0, 30));
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  }, [query, searchableBooks, filterShelf, modelStatus]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="rating-stars">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            size={14}
            className={`star ${i <= rating ? 'filled' : ''}`}
            fill={i <= rating ? 'currentColor' : 'none'}
          />
        ))}
      </div>
    );
  };

  const parseGenres = (genresStr: string): string[] => {
    try {
      return JSON.parse(genresStr || '[]').slice(0, 3);
    } catch {
      return [];
    }
  };

  return (
    <div className="semantic-search">
      <div className="search-header">
        <h2>Semantic Search</h2>
        <p>Search your library by concept, theme, or feeling — not just keywords</p>
        
        {/* Model Status Indicator */}
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
              <span>AI Model Ready • {searchableBooks.length.toLocaleString()} books indexed</span>
            </>
          )}
          {modelStatus === 'error' && (
            <>
              <X size={14} />
              <span>Model failed to load - using keyword fallback</span>
            </>
          )}
        </div>
      </div>

      <div className="search-controls">
        <div className="search-input-wrapper">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="e.g., 'books about finding inner peace' or 'survival against impossible odds'"
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
        
        <div className="search-filters">
          <select 
            value={filterShelf} 
            onChange={(e) => setFilterShelf(e.target.value as any)}
            className="filter-select"
          >
            <option value="all">All Books</option>
            <option value="read">📖 Read</option>
            <option value="unread">💡 Unread</option>
          </select>
          
          <button 
            className="btn btn-primary" 
            onClick={handleSearch} 
            disabled={searching || modelStatus === 'loading'}
          >
            {searching ? (
              <>
                <Loader size={16} className="spinning" />
                Searching...
              </>
            ) : (
              <>
                <Zap size={16} />
                Search
              </>
            )}
          </button>
        </div>
      </div>

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
            onClick={() => {
              setQuery(suggestion);
            }}
          >
            {suggestion}
          </button>
        ))}
      </div>

      {results.length > 0 && (
        <div className="results-section">
          <div className="results-header">
            <h3>Found {results.length} semantic matches</h3>
            <span className="results-info">
              <Zap size={14} />
              Ranked by cosine similarity in 384-dimensional embedding space
            </span>
          </div>
          
          <div className="results-grid">
            {results.map((book, idx) => (
              <div 
                key={book.id} 
                className="result-card animate-slideUp"
                style={{ animationDelay: `${idx * 50}ms` }}
                onClick={() => setSelectedBook(book)}
              >
                <div className="result-cover">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} />
                  ) : (
                    <div className="cover-placeholder">
                      <BookOpen size={32} />
                    </div>
                  )}
                  <div className={`score-badge ${book.score > 0.5 ? 'high' : book.score > 0.35 ? 'medium' : 'low'}`}>
                    {Math.round(book.score * 100)}%
                  </div>
                </div>
                
                <div className="result-info">
                  <h4 className="result-title">{book.title}</h4>
                  <p className="result-author">{book.author}</p>
                  
                  <div className="result-meta">
                    {book.my_rating > 0 && renderStars(book.my_rating)}
                    <span className={`badge ${book.is_read ? 'read' : 'unread'}`}>
                      {book.is_read ? '📖 Read' : '💡 Unread'}
                    </span>
                  </div>
                  
                  <div className="result-genres">
                    {parseGenres(book.genres).map(genre => (
                      <span key={genre} className="genre-tag">{genre}</span>
                    ))}
                  </div>
                  
                  <p className="result-match">{book.matchReason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Book Detail Modal */}
      {selectedBook && (
        <div className="modal-overlay" onClick={() => setSelectedBook(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedBook(null)}>
              <X size={24} />
            </button>
            
            <div className="modal-body">
              <div className="modal-cover">
                {selectedBook.cover_url ? (
                  <img src={selectedBook.cover_url} alt={selectedBook.title} />
                ) : (
                  <div className="cover-placeholder large">
                    <BookOpen size={64} />
                  </div>
                )}
              </div>
              
              <div className="modal-info">
                <h2>{selectedBook.title}</h2>
                <p className="modal-author">by {selectedBook.author}</p>
                
                <div className="modal-similarity">
                  <span className="similarity-label">Semantic Similarity</span>
                  <div className="similarity-bar-container">
                    <div 
                      className="similarity-bar"
                      style={{ width: `${selectedBook.score * 100}%` }}
                    />
                    <span className="similarity-value">{(selectedBook.score * 100).toFixed(1)}%</span>
                  </div>
                </div>
                
                <div className="modal-meta">
                  {selectedBook.my_rating > 0 && (
                    <div className="meta-item">
                      <span className="meta-label">Your Rating</span>
                      {renderStars(selectedBook.my_rating)}
                    </div>
                  )}
                  
                  {selectedBook.pages && (
                    <div className="meta-item">
                      <span className="meta-label">Pages</span>
                      <span>{selectedBook.pages}</span>
                    </div>
                  )}
                  
                  {selectedBook.date_read && (
                    <div className="meta-item">
                      <span className="meta-label">Date Read</span>
                      <span><Clock size={14} /> {selectedBook.date_read}</span>
                    </div>
                  )}
                </div>
                
                <div className="modal-genres">
                  {parseGenres(selectedBook.genres).map(genre => (
                    <span key={genre} className="genre-tag">{genre}</span>
                  ))}
                </div>
                
                {selectedBook.description && (
                  <div className="modal-description">
                    <h4>Description</h4>
                    <p>{selectedBook.description.slice(0, 600)}...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .semantic-search {
          max-width: 1000px;
          margin: 0 auto;
        }
        
        .search-header {
          text-align: center;
          margin-bottom: var(--space-xl);
        }
        
        .search-header h2 {
          font-size: 2rem;
          margin-bottom: var(--space-sm);
        }
        
        .search-header p {
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
        
        .search-controls {
          display: flex;
          gap: var(--space-md);
          margin-bottom: var(--space-md);
        }
        
        .search-input-wrapper {
          flex: 1;
          position: relative;
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
        
        .search-filters {
          display: flex;
          gap: var(--space-sm);
        }
        
        .filter-select {
          padding: var(--space-sm) var(--space-md);
          background: var(--color-nebula-dark);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-primary);
          font-family: var(--font-main);
        }
        
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: var(--space-xs);
          padding: var(--space-sm) var(--space-lg);
          background: var(--color-cosmic-purple);
          border: none;
          border-radius: var(--radius-md);
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .btn-primary:hover:not(:disabled) {
          background: #b366f0;
          box-shadow: var(--shadow-glow);
        }
        
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .search-suggestions {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-xl);
          color: var(--color-text-muted);
          font-size: 0.875rem;
          flex-wrap: wrap;
        }
        
        .suggestion-chip {
          padding: var(--space-xs) var(--space-sm);
          background: var(--color-nebula);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-full);
          color: var(--color-text-secondary);
          font-size: 0.75rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .suggestion-chip:hover {
          background: var(--color-cosmic-purple);
          color: white;
        }
        
        .results-section {
          animation: fadeIn var(--transition-slow) ease;
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
          color: var(--color-text-secondary);
          font-weight: 500;
        }
        
        .results-info {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          font-size: 0.75rem;
          color: var(--color-aurora);
        }
        
        .results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: var(--space-lg);
        }
        
        .result-card {
          display: flex;
          gap: var(--space-md);
          padding: var(--space-md);
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-base);
        }
        
        .result-card:hover {
          border-color: var(--color-cosmic-purple);
          transform: translateY(-2px);
          box-shadow: var(--shadow-glow);
        }
        
        .result-cover {
          position: relative;
          width: 80px;
          flex-shrink: 0;
        }
        
        .result-cover img {
          width: 100%;
          height: 120px;
          object-fit: cover;
          border-radius: var(--radius-sm);
        }
        
        .cover-placeholder {
          width: 100%;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-nebula);
          border-radius: var(--radius-sm);
          color: var(--color-text-muted);
        }
        
        .score-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          padding: 4px 8px;
          border-radius: var(--radius-full);
          font-size: 0.7rem;
          font-weight: 700;
          color: white;
        }
        
        .score-badge.high {
          background: linear-gradient(135deg, #00f5d4, #00d4aa);
        }
        
        .score-badge.medium {
          background: linear-gradient(135deg, var(--color-cosmic-purple), #9d4edd);
        }
        
        .score-badge.low {
          background: var(--color-nebula-light);
          color: var(--color-text-secondary);
        }
        
        .result-info {
          flex: 1;
          min-width: 0;
        }
        
        .result-title {
          font-size: 0.95rem;
          font-weight: 600;
          margin-bottom: var(--space-xs);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .result-author {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          margin-bottom: var(--space-sm);
        }
        
        .result-meta {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-sm);
          flex-wrap: wrap;
        }
        
        .badge {
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
        }
        
        .badge.read {
          background: rgba(0, 245, 212, 0.15);
          color: var(--color-aurora);
        }
        
        .badge.unread {
          background: rgba(255, 217, 61, 0.15);
          color: var(--color-star-gold);
        }
        
        .result-genres {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-xs);
          margin-bottom: var(--space-sm);
        }
        
        .genre-tag {
          padding: 2px 6px;
          background: var(--color-nebula);
          border-radius: var(--radius-sm);
          font-size: 0.65rem;
          color: var(--color-text-secondary);
        }
        
        .result-match {
          font-size: 0.75rem;
          color: var(--color-aurora);
        }
        
        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
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
        }
        
        .modal-body {
          display: flex;
          gap: var(--space-xl);
          padding: var(--space-xl);
        }
        
        .modal-cover {
          width: 180px;
          flex-shrink: 0;
        }
        
        .modal-cover img {
          width: 100%;
          border-radius: var(--radius-md);
        }
        
        .cover-placeholder.large {
          height: 270px;
        }
        
        .modal-info {
          flex: 1;
        }
        
        .modal-info h2 {
          font-size: 1.5rem;
          margin-bottom: var(--space-xs);
        }
        
        .modal-author {
          color: var(--color-text-secondary);
          margin-bottom: var(--space-md);
        }
        
        .modal-similarity {
          margin-bottom: var(--space-lg);
        }
        
        .similarity-label {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: var(--space-xs);
        }
        
        .similarity-bar-container {
          position: relative;
          height: 28px;
          background: var(--color-nebula);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        
        .similarity-bar {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          background: linear-gradient(90deg, var(--color-cosmic-purple), var(--color-aurora));
          border-radius: var(--radius-full);
          transition: width 0.5s ease;
        }
        
        .similarity-value {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          font-size: 0.8rem;
          font-weight: 700;
          z-index: 1;
        }
        
        .modal-meta {
          display: flex;
          gap: var(--space-lg);
          margin-bottom: var(--space-md);
        }
        
        .meta-item {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }
        
        .meta-label {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
        }
        
        .modal-genres {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-sm);
          margin-bottom: var(--space-lg);
        }
        
        .modal-description {
          margin-bottom: var(--space-md);
        }
        
        .modal-description h4 {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin-bottom: var(--space-sm);
        }
        
        .modal-description p {
          color: var(--color-text-secondary);
          font-size: 0.9rem;
          line-height: 1.6;
        }
        
        @media (max-width: 640px) {
          .search-controls {
            flex-direction: column;
          }
          
          .modal-body {
            flex-direction: column;
          }
          
          .modal-cover {
            width: 120px;
            margin: 0 auto;
          }
          
          .results-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default SemanticSearch;
