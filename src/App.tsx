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
        return <GalaxyView points={data.galaxy} />;
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
              <h1>SmartBooks AI</h1>
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
        <p>
          Built with LlamaIndex • ChromaDB • Sentence Transformers • React Three Fiber
        </p>
      </footer>
    </div>
  );
}

export default App;
