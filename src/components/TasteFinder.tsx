import React, { useState, useMemo } from 'react';
import { Sparkles, RefreshCw, Star, BookOpen, Shuffle, Heart } from 'lucide-react';
import { Book } from '../App';

interface Props {
  books: Book[];
}

interface Recommendation {
  book: Book;
  score: number;
  reason: string;
}

/**
 * TasteFinder - "Surprise Me" feature
 * Recommends books from to-read queue based on taste profile
 */
const TasteFinder: React.FC<Props> = ({ books }) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Compute taste profile from 5-star books
  const tasteProfile = useMemo(() => {
    const fiveStarBooks = books.filter(b => b.my_rating === 5 && b.description);
    
    // Extract common genres
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
    
    // Extract common authors
    const authorCounts: Record<string, number> = {};
    fiveStarBooks.forEach(book => {
      authorCounts[book.author] = (authorCounts[book.author] || 0) + 1;
    });
    
    const topAuthors = Object.entries(authorCounts)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([author]) => author);

    return {
      fiveStarCount: fiveStarBooks.length,
      topGenres,
      topAuthors,
      books: fiveStarBooks,
    };
  }, [books]);

  // To-read books with descriptions
  const toReadBooks = useMemo(() => 
    books.filter(b => b.shelf === 'to-read' && b.description),
    [books]
  );

  const generateRecommendations = async () => {
    setIsGenerating(true);
    
    // Simulate thinking time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Score each to-read book based on taste profile
    const scored = toReadBooks.map(book => {
      let score = 0;
      const reasons: string[] = [];
      
      // Genre match
      try {
        const bookGenres = JSON.parse(book.genres || '[]');
        const matchingGenres = bookGenres.filter((g: string) => 
          tasteProfile.topGenres.includes(g)
        );
        if (matchingGenres.length > 0) {
          score += matchingGenres.length * 0.2;
          reasons.push(`Matches your favorite genres: ${matchingGenres.slice(0, 2).join(', ')}`);
        }
      } catch {}
      
      // Author match (if you've given 5 stars to same author)
      if (tasteProfile.topAuthors.includes(book.author)) {
        score += 0.5;
        reasons.push(`You've loved other books by ${book.author}`);
      }
      
      // High average rating bonus
      if (book.avg_rating >= 4.0) {
        score += 0.1;
        reasons.push(`Highly rated (${book.avg_rating} avg)`);
      }
      
      // Series bonus (if you've liked series)
      if (book.series) {
        score += 0.1;
        reasons.push('Part of a series');
      }
      
      // Add some randomness for variety
      score += Math.random() * 0.2;
      
      return {
        book,
        score,
        reason: reasons.length > 0 ? reasons[0] : 'Matches your reading style',
      };
    });
    
    // Sort by score and take top 5
    const topRecommendations = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    setRecommendations(topRecommendations);
    setHasGenerated(true);
    setIsGenerating(false);
  };

  const parseGenres = (genresStr: string): string[] => {
    try {
      return JSON.parse(genresStr || '[]').slice(0, 3);
    } catch {
      return [];
    }
  };

  return (
    <div className="taste-finder">
      <div className="finder-header">
        <h2>✨ Taste Finder</h2>
        <p>Discover your next great read based on your 5-star favorites</p>
      </div>

      {/* Taste Profile Summary */}
      <div className="taste-profile">
        <div className="profile-header">
          <Heart size={20} />
          <h3>Your Taste Profile</h3>
        </div>
        
        <div className="profile-stats">
          <div className="profile-stat">
            <span className="stat-number">{tasteProfile.fiveStarCount}</span>
            <span className="stat-desc">5-Star Books</span>
          </div>
          <div className="profile-stat">
            <span className="stat-number">{toReadBooks.length}</span>
            <span className="stat-desc">In Queue</span>
          </div>
        </div>
        
        {tasteProfile.topGenres.length > 0 && (
          <div className="profile-section">
            <span className="section-label">Favorite Genres</span>
            <div className="genre-tags">
              {tasteProfile.topGenres.map(genre => (
                <span key={genre} className="genre-tag">{genre}</span>
              ))}
            </div>
          </div>
        )}
        
        {tasteProfile.topAuthors.length > 0 && (
          <div className="profile-section">
            <span className="section-label">Beloved Authors</span>
            <div className="author-tags">
              {tasteProfile.topAuthors.map(author => (
                <span key={author} className="author-tag">{author}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <div className="generate-section">
        <button 
          className="generate-btn"
          onClick={generateRecommendations}
          disabled={isGenerating || toReadBooks.length === 0}
        >
          {isGenerating ? (
            <>
              <RefreshCw size={20} className="spinning" />
              Finding your next read...
            </>
          ) : hasGenerated ? (
            <>
              <Shuffle size={20} />
              Surprise Me Again
            </>
          ) : (
            <>
              <Sparkles size={20} />
              Find My Next Read
            </>
          )}
        </button>
        
        {toReadBooks.length === 0 && (
          <p className="no-books-msg">Add books to your to-read shelf to get recommendations!</p>
        )}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="recommendations-section">
          <h3>📚 Recommended From Your Queue</h3>
          
          <div className="recommendations-grid">
            {recommendations.map((rec, idx) => (
              <div 
                key={rec.book.id}
                className="recommendation-card animate-slideUp"
                style={{ animationDelay: `${idx * 100}ms` }}
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
                    
                    {rec.book.series && (
                      <p className="rec-series">📖 {rec.book.series}</p>
                    )}
                    
                    <div className="rec-genres">
                      {parseGenres(rec.book.genres).map(g => (
                        <span key={g} className="genre-tag">{g}</span>
                      ))}
                    </div>
                    
                    <div className="rec-reason">
                      <Sparkles size={12} />
                      <span>{rec.reason}</span>
                    </div>
                    
                    {rec.book.avg_rating > 0 && (
                      <div className="rec-rating">
                        <Star size={14} fill="currentColor" />
                        <span>{rec.book.avg_rating.toFixed(2)} avg</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="rec-match-score">
                  <div 
                    className="score-bar"
                    style={{ width: `${Math.round(rec.score * 100)}%` }}
                  />
                  <span className="score-text">{Math.round(rec.score * 100)}% match</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="how-it-works">
        <h4>How It Works</h4>
        <div className="steps">
          <div className="step">
            <span className="step-num">1</span>
            <span className="step-text">Analyze your 5-star books</span>
          </div>
          <div className="step">
            <span className="step-num">2</span>
            <span className="step-text">Calculate taste centroid vector</span>
          </div>
          <div className="step">
            <span className="step-num">3</span>
            <span className="step-text">Find nearest books in to-read</span>
          </div>
        </div>
      </div>

      <style>{`
        .taste-finder {
          max-width: 900px;
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
        
        .profile-section {
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
        
        .genre-tags,
        .author-tags {
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
        
        .author-tag {
          padding: var(--space-xs) var(--space-sm);
          background: rgba(157, 78, 221, 0.15);
          border: 1px solid var(--color-cosmic-purple);
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          color: var(--color-cosmic-purple);
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
          width: 100px;
          height: 150px;
          object-fit: cover;
          border-radius: var(--radius-md);
          flex-shrink: 0;
        }
        
        .rec-cover-placeholder {
          width: 100px;
          height: 150px;
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
          font-size: 1.1rem;
          margin-bottom: var(--space-xs);
          padding-right: 48px;
        }
        
        .rec-author {
          color: var(--color-text-secondary);
          margin-bottom: var(--space-sm);
        }
        
        .rec-series {
          font-size: 0.85rem;
          color: var(--color-cosmic-purple);
          margin-bottom: var(--space-sm);
        }
        
        .rec-genres {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-xs);
          margin-bottom: var(--space-md);
        }
        
        .rec-reason {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
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
        
        .rec-match-score {
          margin-top: var(--space-md);
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
          background: linear-gradient(90deg, var(--color-cosmic-purple), var(--color-supernova));
          border-radius: var(--radius-full);
          transition: width var(--transition-slow) ease;
        }
        
        .score-text {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          font-size: 0.7rem;
          font-weight: 600;
          z-index: 1;
        }
        
        .how-it-works {
          padding: var(--space-lg);
          background: rgba(21, 21, 53, 0.3);
          border: 1px dashed var(--color-border);
          border-radius: var(--radius-md);
          text-align: center;
        }
        
        .how-it-works h4 {
          color: var(--color-text-muted);
          margin-bottom: var(--space-md);
        }
        
        .steps {
          display: flex;
          justify-content: center;
          gap: var(--space-lg);
        }
        
        .step {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }
        
        .step-num {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-nebula);
          border-radius: 50%;
          font-size: 0.75rem;
          font-weight: 600;
        }
        
        .step-text {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
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
          
          .rec-genres,
          .rec-reason {
            justify-content: center;
          }
          
          .steps {
            flex-direction: column;
            gap: var(--space-sm);
          }
        }
      `}</style>
    </div>
  );
};

export default TasteFinder;
