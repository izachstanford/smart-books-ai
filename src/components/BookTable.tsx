import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, ChevronUp, Star, ArrowUpDown, BookOpen
} from 'lucide-react';
import { GalaxyPoint } from '../App';

interface Props {
  books: GalaxyPoint[];
  onSelectBook?: (book: GalaxyPoint) => void;
}

type SortField = 'title' | 'author' | 'my_rating' | 'avg_rating' | 'shelf' | 'popularity_score' | 'date_read';
type SortDirection = 'asc' | 'desc';

/**
 * BookTable - Sortable data table for books
 * Shows below Galaxy View (filtering is handled by the parent component)
 */
const BookTable: React.FC<Props> = ({ books, onSelectBook }) => {
  // Sort states - default to rating descending
  const [sortField, setSortField] = useState<SortField>('my_rating');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Apply sorting
  const sortedBooks = useMemo(() => {
    let result = [...books];
    
    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      
      // Handle nulls
      if (aVal === null || aVal === undefined) aVal = sortDirection === 'asc' ? Infinity : -Infinity;
      if (bVal === null || bVal === undefined) bVal = sortDirection === 'asc' ? Infinity : -Infinity;
      
      // String comparison
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [books, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedBooks.length / itemsPerPage);
  const paginatedBooks = sortedBooks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when books change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [books]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderStars = (rating: number) => {
    if (rating === 0) return <span className="no-rating">—</span>;
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            size={12}
            className={i <= rating ? 'filled' : ''}
            fill={i <= rating ? 'currentColor' : 'none'}
          />
        ))}
      </div>
    );
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="sort-icon inactive" />;
    return sortDirection === 'asc' 
      ? <ChevronUp size={14} className="sort-icon active" />
      : <ChevronDown size={14} className="sort-icon active" />;
  };

  return (
    <div className="book-table-container">
      <div className="table-header">
        <div className="header-left">
          <h3>📚 Library Table</h3>
          <span className="book-count">
            {books.length} books
          </span>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="book-table">
          <thead>
            <tr>
              <th className="cover-col">Cover</th>
              <th className="sortable" onClick={() => handleSort('title')}>
                Title <SortIcon field="title" />
              </th>
              <th className="sortable" onClick={() => handleSort('author')}>
                Author <SortIcon field="author" />
              </th>
              <th className="sortable rating-col" onClick={() => handleSort('my_rating')}>
                My Rating <SortIcon field="my_rating" />
              </th>
              <th className="sortable avg-rating-col" onClick={() => handleSort('avg_rating')}>
                Avg <SortIcon field="avg_rating" />
              </th>
              <th className="sortable shelf-col" onClick={() => handleSort('shelf')}>
                Shelf <SortIcon field="shelf" />
              </th>
              <th className="sortable date-col" onClick={() => handleSort('date_read')}>
                Date Read <SortIcon field="date_read" />
              </th>
              <th className="genres-col">Genres</th>
              <th className="sortable ratings-col" onClick={() => handleSort('popularity_score')}>
                # Ratings <SortIcon field="popularity_score" />
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedBooks.map((book) => (
              <tr 
                key={book.id} 
                onClick={() => onSelectBook?.(book)}
                className="book-row"
              >
                <td className="cover-cell">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt="" className="mini-cover" />
                  ) : (
                    <div className="no-cover">
                      <BookOpen size={16} />
                    </div>
                  )}
                </td>
                <td className="title-cell">
                  <span className="book-title">{book.title}</span>
                </td>
                <td className="author-cell">{book.author}</td>
                <td className="rating-cell">{renderStars(book.my_rating)}</td>
                <td className="avg-rating-cell">
                  {book.avg_rating ? book.avg_rating.toFixed(2) : '—'}
                </td>
                <td className="shelf-cell">
                  <span className={`shelf-badge ${book.shelf}`}>
                    {book.shelf === 'read' ? '✅' : '📚'} {book.shelf}
                  </span>
                </td>
                <td className="date-cell">
                  {book.date_read || '—'}
                </td>
                <td className="genres-cell">
                  <div className="genre-tags">
                    {book.genres?.slice(0, 2).map(g => (
                      <span key={g} className="genre-tag">{g}</span>
                    ))}
                    {book.genres && book.genres.length > 2 && (
                      <span className="genre-more">+{book.genres.length - 2}</span>
                    )}
                  </div>
                </td>
                <td className="ratings-cell">
                  {book.popularity_score ? book.popularity_score.toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button 
            className="page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(1)}
          >
            First
          </button>
          <button 
            className="page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            Prev
          </button>
          
          <div className="page-info">
            Page {currentPage} of {totalPages}
          </div>
          
          <button 
            className="page-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Next
          </button>
          <button 
            className="page-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(totalPages)}
          >
            Last
          </button>
        </div>
      )}

      <style>{`
        .book-table-container {
          margin-top: var(--space-xl);
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        
        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-md) var(--space-lg);
          border-bottom: 1px solid var(--color-border);
          background: rgba(21, 21, 53, 0.5);
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }
        
        .header-left h3 {
          font-size: 1.1rem;
          margin: 0;
        }
        
        .book-count {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          padding: var(--space-xs) var(--space-sm);
          background: var(--color-nebula);
          border-radius: var(--radius-full);
        }
        
        .filter-toggle {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
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
        
        .filter-toggle:hover,
        .filter-toggle.active {
          background: var(--color-cosmic-purple);
          border-color: var(--color-cosmic-purple);
          color: white;
        }
        
        .filter-badge {
          background: var(--color-supernova);
          color: white;
          font-size: 0.7rem;
          padding: 2px 6px;
          border-radius: var(--radius-full);
          font-weight: 600;
        }
        
        .filters-bar {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-md);
          padding: var(--space-md) var(--space-lg);
          background: rgba(10, 10, 26, 0.5);
          border-bottom: 1px solid var(--color-border);
          animation: slideDown 0.2s ease;
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .filter-group {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          color: var(--color-text-muted);
        }
        
        .search-filter {
          flex: 1;
          min-width: 200px;
          max-width: 300px;
          position: relative;
        }
        
        .filter-input {
          flex: 1;
          padding: var(--space-sm) var(--space-md);
          padding-left: 0;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--color-border);
          color: var(--color-text-primary);
          font-family: var(--font-main);
          font-size: 0.875rem;
        }
        
        .filter-input:focus {
          outline: none;
          border-color: var(--color-cosmic-purple);
        }
        
        .clear-input {
          position: absolute;
          right: 0;
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: var(--space-xs);
        }
        
        .filter-select {
          padding: var(--space-sm) var(--space-md);
          background: var(--color-nebula-dark);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text-primary);
          font-family: var(--font-main);
          font-size: 0.8rem;
          cursor: pointer;
        }
        
        .filter-select:focus {
          outline: none;
          border-color: var(--color-cosmic-purple);
        }
        
        .clear-filters {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          padding: var(--space-sm) var(--space-md);
          background: transparent;
          border: 1px solid var(--color-supernova);
          border-radius: var(--radius-sm);
          color: var(--color-supernova);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .clear-filters:hover {
          background: var(--color-supernova);
          color: white;
        }
        
        .table-wrapper {
          overflow-x: auto;
        }
        
        .book-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        
        .book-table th {
          text-align: left;
          padding: var(--space-md);
          background: var(--color-nebula-dark);
          color: var(--color-text-secondary);
          font-weight: 500;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid var(--color-border);
          white-space: nowrap;
        }
        
        .book-table th.sortable {
          cursor: pointer;
          user-select: none;
          transition: color var(--transition-fast);
        }
        
        .book-table th.sortable:hover {
          color: var(--color-cosmic-purple);
        }
        
        .sort-icon {
          margin-left: var(--space-xs);
          vertical-align: middle;
        }
        
        .sort-icon.inactive {
          opacity: 0.3;
        }
        
        .sort-icon.active {
          color: var(--color-cosmic-purple);
        }
        
        .cover-col { width: 60px; }
        .rating-col { width: 100px; }
        .shelf-col { width: 100px; }
        .date-col { width: 110px; }
        .avg-rating-col { width: 70px; }
        .ratings-col { width: 100px; }
        .genres-col { width: 180px; }
        
        .book-table td {
          padding: var(--space-sm) var(--space-md);
          border-bottom: 1px solid var(--color-border);
          vertical-align: middle;
        }
        
        .book-row {
          cursor: pointer;
          transition: background var(--transition-fast);
        }
        
        .book-row:hover {
          background: rgba(157, 78, 221, 0.1);
        }
        
        .mini-cover {
          width: 40px;
          height: 60px;
          object-fit: cover;
          border-radius: var(--radius-sm);
        }
        
        .no-cover {
          width: 40px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-nebula);
          border-radius: var(--radius-sm);
          color: var(--color-text-muted);
        }
        
        .book-title {
          font-weight: 500;
          color: var(--color-text-primary);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .author-cell {
          color: var(--color-text-secondary);
        }
        
        .star-rating {
          display: flex;
          gap: 2px;
          color: var(--color-text-muted);
        }
        
        .star-rating .filled {
          color: var(--color-star-gold);
        }
        
        .no-rating {
          color: var(--color-text-muted);
        }
        
        .shelf-badge {
          display: inline-flex;
          align-items: center;
          gap: var(--space-xs);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 0.7rem;
          white-space: nowrap;
        }
        
        .shelf-badge.read {
          background: rgba(77, 166, 255, 0.15);
          color: var(--color-blue-giant);
        }
        
        .shelf-badge.to-read {
          background: rgba(255, 217, 61, 0.15);
          color: var(--color-star-gold);
        }
        
        .genre-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        
        .genre-tag {
          padding: 2px 6px;
          background: var(--color-nebula);
          border-radius: var(--radius-sm);
          font-size: 0.65rem;
          color: var(--color-text-secondary);
          white-space: nowrap;
        }
        
        .genre-more {
          padding: 2px 6px;
          background: var(--color-nebula-light);
          border-radius: var(--radius-sm);
          font-size: 0.65rem;
          color: var(--color-text-muted);
        }
        
        .pages-cell {
          color: var(--color-text-muted);
          font-family: var(--font-mono);
          font-size: 0.8rem;
        }
        
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-md);
          border-top: 1px solid var(--color-border);
          background: rgba(21, 21, 53, 0.5);
        }
        
        .page-btn {
          padding: var(--space-xs) var(--space-md);
          background: var(--color-nebula);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text-secondary);
          font-family: var(--font-main);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .page-btn:hover:not(:disabled) {
          background: var(--color-cosmic-purple);
          border-color: var(--color-cosmic-purple);
          color: white;
        }
        
        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .page-info {
          padding: 0 var(--space-md);
          font-size: 0.8rem;
          color: var(--color-text-muted);
        }
        
        @media (max-width: 768px) {
          .filters-bar {
            flex-direction: column;
          }
          
          .search-filter {
            max-width: none;
          }
          
          .genres-col,
          .ratings-col,
          .avg-rating-col {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default BookTable;
