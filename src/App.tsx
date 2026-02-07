import React, { useState, useEffect } from 'react';
import './App.css';
import { Sparkles, BarChart3, Compass, Cpu } from 'lucide-react';

// Components
import GalaxyView from './components/GalaxyView';
import Analytics from './components/Analytics';
import TasteFinder from './components/TasteFinder';
import Architecture from './components/Architecture';
import StarField from './components/StarField';

// Types
export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  my_rating: number;
  avg_rating: number;
  shelf: string;
  is_read: boolean;  // ⭐ NEW: Primary read status flag
  date_read: string | null;
  date_added?: string | null;
  pages: number | null;
  year_published: number | null;
  description: string | null;
  genres: string;
  genre_primary?: string;  // ⭐ NEW: Coarse category
  cover_url: string | null;
  popularity_score?: number;  // ⭐ NEW: For ranking unread books
  num_ratings?: number;  // ⭐ NEW: Number of public ratings for popularity
  series?: string | null;
  review?: string | null;
  embedding: number[] | null;
  embedding_text?: string | null;
}

export interface GalaxyPoint {
  id: string;
  title: string;
  author: string;
  my_rating: number;
  avg_rating: number;
  shelf: string;
  is_read: boolean;
  date_read?: string | null;
  cover_url: string | null;
  description?: string;
  genres: string[];
  genre_primary?: string;
  pages: number | null;
  year_published?: number | null;
  popularity_score?: number;
  num_ratings?: number;
  x: number;
  y: number;
  z: number;
  x2d: number;
  y2d: number;
}

export interface AnalyticsData {
  summary: {
    total_books: number;
    books_read: number;
    books_to_read?: number;  // Optional (old schema)
    books_unread?: number;   // NEW: Replaces books_to_read
    books_with_descriptions: number;
    five_star_books: number;
    average_rating: number;
    coverage_percent: number;
    generated_at: string;
  };
  reading_timeline: Array<{ year_month: string; count: number }>;
  genre_breakdown: Array<{ genre: string; count: number }>;
  rating_distribution: Array<{ rating: number; count: number }>;
  top_authors: Array<{ author: string; count: number }>;
  shelf_summary: Array<{ shelf: string; count: number }>;
}

export interface AppData {
  books: Book[];
  analytics: AnalyticsData;
  galaxy: GalaxyPoint[];
}

type TabId = 'galaxy' | 'analytics' | 'discover' | 'architecture';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'galaxy', label: 'Galaxy', icon: <Sparkles size={18} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  { id: 'discover', label: 'Discover', icon: <Compass size={18} /> },
  { id: 'architecture', label: 'Architecture', icon: <Cpu size={18} /> },
];

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('galaxy');
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [booksRes, analyticsRes, galaxyRes] = await Promise.all([
          fetch(`${process.env.PUBLIC_URL}/data/library_with_embeddings.json`),
          fetch(`${process.env.PUBLIC_URL}/data/analytics_data.json`),
          fetch(`${process.env.PUBLIC_URL}/data/galaxy_coordinates.json`),
        ]);

        if (!booksRes.ok || !analyticsRes.ok || !galaxyRes.ok) {
          throw new Error('Failed to load data files');
        }

        const [books, analytics, galaxy] = await Promise.all([
          booksRes.json(),
          analyticsRes.json(),
          galaxyRes.json(),
        ]);

        setData({ books, analytics, galaxy });
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load library data. Please run the data pipeline first.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <div className="loading-orb"></div>
          <p>Loading your reading universe...</p>
        </div>
      );
    }

    if (error || !data) {
      return (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h2>Data Not Found</h2>
          <p>{error || 'No data available'}</p>
          <div className="error-instructions">
            <p>Run the data pipeline first:</p>
            <code>bash run_pipeline.sh</code>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'galaxy':
        return <GalaxyView points={data.galaxy} books={data.books} />;
      case 'analytics':
        return <Analytics data={data.analytics} galaxyData={data.galaxy} />;
      case 'discover':
        return <TasteFinder books={data.books} />;
      case 'architecture':
        return <Architecture analytics={data.analytics} />;
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <StarField />
      
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">📚</div>
            <div className="logo-text">
              <h1>SmartBooksAI</h1>
              <span className="tagline">Navigate Your Reading Universe</span>
            </div>
          </div>
          
          <nav className="tab-nav">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="app-main">
        {renderContent()}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p className="footer-tech">
            Built with Sentence Transformers • ChromaDB • React Three Fiber • Transformers.js
          </p>
          <div className="footer-links">
            <a 
              href="https://github.com/izachstanford/smart-books-ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-link"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              GitHub
            </a>
            <span className="footer-separator">•</span>
            <a 
              href="https://aiwithzach.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-link"
            >
              More Projects
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
