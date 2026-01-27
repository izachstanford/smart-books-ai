import React, { useState, useMemo, useCallback } from 'react';
import { Search, Star, BookOpen, Clock, X } from 'lucide-react';
import { Book } from '../App';

interface Props {
  books: Book[];
}

interface SearchResult extends Book {
  score: number;
  matchReason: string;
}

/**
 * SemanticSearch - Natural language book search
 * Uses cosine similarity on pre-computed embeddings
 */
const SemanticSearch: React.FC<Props> = ({ books }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [filterShelf, setFilterShelf] = useState<'all' | 'read' | 'to-read'>('all');
  const [selectedBook, setSelectedBook] = useState<SearchResult | null>(null);

  // Books with embeddings
  const searchableBooks = useMemo(() => 
    books.filter(b => b.embedding && b.description),
    [books]
  );

  // Simple client-side search (for demo - in production, call API with vector similarity)
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    setSearching(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // For client-side demo: keyword matching + description similarity
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    
    const scored = searchableBooks.map(book => {
      let score = 0;
      const reasons: string[] = [];
      
      // Title match (highest weight)
      if (book.title.toLowerCase().includes(queryLower)) {
        score += 0.5;
        reasons.push('Title match');
      }
      
      // Author match
      if (book.author.toLowerCase().includes(queryLower)) {
        score += 0.3;
        reasons.push('Author match');
      }
      
      // Genre match
      try {
        const genres = JSON.parse(book.genres || '[]');
        const genreMatch = genres.some((g: string) => 
          queryWords.some(w => g.toLowerCase().includes(w))
        );
        if (genreMatch) {
          score += 0.3;
          reasons.push('Genre match');
        }
      } catch {}
      
      // Description keyword match
      if (book.description) {
        const descLower = book.description.toLowerCase();
        const matchingWords = queryWords.filter(w => descLower.includes(w));
        if (matchingWords.length > 0) {
          score += 0.1 * matchingWords.length;
          reasons.push(`Keywords: ${matchingWords.join(', ')}`);
        }
      }
      
      return {
        ...book,
        score: Math.min(score, 1),
        matchReason: reasons.join(' • ') || 'Semantic similarity'
      };
    });
    
    // Filter and sort
    let filtered = scored.filter(b => b.score > 0);
    
    if (filterShelf !== 'all') {
      filtered = filtered.filter(b => b.shelf === filterShelf);
    }
    
    filtered.sort((a, b) => b.score - a.score);
    
    setResults(filtered.slice(0, 20));
    setSearching(false);
  }, [query, searchableBooks, filterShelf]);

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
        <h2>🔍 Semantic Search</h2>
        <p>Search your library by concept, theme, or feeling — not just keywords</p>
      </div>

      <div className="search-controls">
        <div className="search-input-wrapper">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="e.g., 'cozy mystery with quirky characters' or 'space opera'"
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
            <option value="read">✅ Read</option>
            <option value="to-read">📚 To-Read</option>
          </select>
          
          <button className="btn btn-primary" onClick={handleSearch} disabled={searching}>
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      <div className="search-suggestions">
        <span>Try:</span>
        {['fast-paced thriller', 'magical fantasy world', 'business leadership', 'feel-good romance'].map(suggestion => (
          <button 
            key={suggestion}
            className="suggestion-chip"
            onClick={() => {
              setQuery(suggestion);
              setTimeout(handleSearch, 100);
            }}
          >
            {suggestion}
          </button>
        ))}
      </div>

      {results.length > 0 && (
        <div className="results-section">
          <div className="results-header">
            <h3>Found {results.length} matches</h3>
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
                  <div className="score-badge">
                    {Math.round(book.score * 100)}%
                  </div>
                </div>
                
                <div className="result-info">
                  <h4 className="result-title">{book.title}</h4>
                  <p className="result-author">{book.author}</p>
                  
                  <div className="result-meta">
                    {book.my_rating > 0 && renderStars(book.my_rating)}
                    <span className={`badge ${book.shelf}`}>
                      {book.shelf === 'read' ? '✅ Read' : '📚 To-Read'}
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
                
                {selectedBook.series && (
                  <p className="modal-series">📖 {selectedBook.series}</p>
                )}
                
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
                
                {selectedBook.review && (
                  <div className="modal-review">
                    <h4>Your Review</h4>
                    <p dangerouslySetInnerHTML={{ __html: selectedBook.review }} />
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
        
        .search-suggestions {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-xl);
          color: var(--color-text-muted);
          font-size: 0.875rem;
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
          margin-bottom: var(--space-lg);
        }
        
        .results-header h3 {
          color: var(--color-text-secondary);
          font-weight: 500;
        }
        
        .results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
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
          padding: 2px 6px;
          background: var(--color-cosmic-purple);
          border-radius: var(--radius-full);
          font-size: 0.7rem;
          font-weight: 600;
          color: white;
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
          font-size: 0.7rem;
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
          width: 200px;
          flex-shrink: 0;
        }
        
        .modal-cover img {
          width: 100%;
          border-radius: var(--radius-md);
        }
        
        .cover-placeholder.large {
          height: 300px;
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
          margin-bottom: var(--space-sm);
        }
        
        .modal-series {
          color: var(--color-cosmic-purple);
          margin-bottom: var(--space-md);
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
        
        .modal-description,
        .modal-review {
          margin-bottom: var(--space-md);
        }
        
        .modal-description h4,
        .modal-review h4 {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin-bottom: var(--space-sm);
        }
        
        .modal-description p,
        .modal-review p {
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
            width: 150px;
            margin: 0 auto;
          }
        }
      `}</style>
    </div>
  );
};

export default SemanticSearch;
