import React, { useMemo } from 'react';
import {
  BarChart, Bar, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart
} from 'recharts';
import { 
  TrendingUp, BookOpen, Star, Calendar, Award, Target, Users, 
  Zap, Clock, Flame, BookMarked, BarChart2, PieChart as PieIcon
} from 'lucide-react';
import { AnalyticsData, GalaxyPoint } from '../App';

interface Props {
  data: AnalyticsData;
  galaxyData: GalaxyPoint[];
}

// Color palette
const COLORS = {
  gold: '#fbbf24',
  amber: '#d4a017',
  purple: '#8b5cf6',
  blue: '#3b82f6',
  cyan: '#06b6d4',
  emerald: '#10b981',
  pink: '#ec4899',
  orange: '#f97316',
  slate: '#64748b',
  gray: '#94a3b8',
};

const GENRE_COLORS = [
  '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#fbbf24',
  '#f97316', '#ec4899', '#ef4444', '#84cc16', '#6366f1',
  '#14b8a6', '#f43f5e'
];

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="tooltip-value" style={{ color: entry.color || entry.fill }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Analytics: React.FC<Props> = ({ data, galaxyData }) => {
  const { summary, reading_timeline, rating_distribution, top_authors } = data;

  // Compute additional analytics from galaxy data
  const computedStats = useMemo(() => {
    const readBooks = galaxyData.filter(b => b.is_read);
    const unreadBooks = galaxyData.filter(b => !b.is_read);
    
    // My reading stats
    const myRatings = readBooks.filter(b => b.my_rating > 0);
    const myAvgRating = myRatings.length > 0 
      ? myRatings.reduce((sum, b) => sum + b.my_rating, 0) / myRatings.length 
      : 0;
    
    // Genre analysis for my books
    const myGenres: Record<string, number> = {};
    readBooks.forEach(b => {
      const genre = b.genre_primary || 'Unknown';
      myGenres[genre] = (myGenres[genre] || 0) + 1;
    });
    
    // Genre analysis for all books (benchmark)
    const allGenres: Record<string, number> = {};
    galaxyData.forEach(b => {
      const genre = b.genre_primary || 'Unknown';
      allGenres[genre] = (allGenres[genre] || 0) + 1;
    });
    
    // Year published distribution
    const myYearDist: Record<number, number> = {};
    const allYearDist: Record<number, number> = {};
    
    readBooks.forEach(b => {
      if (b.year_published && b.year_published > 1800) {
        const decade = Math.floor(b.year_published / 10) * 10;
        myYearDist[decade] = (myYearDist[decade] || 0) + 1;
      }
    });
    
    galaxyData.forEach(b => {
      if (b.year_published && b.year_published > 1800) {
        const decade = Math.floor(b.year_published / 10) * 10;
        allYearDist[decade] = (allYearDist[decade] || 0) + 1;
      }
    });
    
    // Rating comparison
    const benchmarkRatings = unreadBooks.filter(b => b.avg_rating > 0);
    const benchmarkAvgRating = benchmarkRatings.length > 0
      ? benchmarkRatings.reduce((sum, b) => sum + b.avg_rating, 0) / benchmarkRatings.length
      : 0;
    
    // Books by year read
    const yearReadDist: Record<string, number> = {};
    readBooks.forEach(b => {
      if (b.date_read) {
        const year = b.date_read.split('/')[0];
        yearReadDist[year] = (yearReadDist[year] || 0) + 1;
      }
    });
    
    // Top rated books
    const topRated = [...readBooks]
      .filter(b => b.my_rating === 5)
      .slice(0, 10);
    
    // Reading streak / pace
    const sortedTimeline = [...reading_timeline].sort((a, b) => b.count - a.count);
    const bestMonth = sortedTimeline[0];
    const totalMonths = reading_timeline.filter(t => t.count > 0).length;
    const avgBooksPerMonth = readBooks.length / Math.max(totalMonths, 1);
    
    // Popularity comparison - am I reading popular or niche books?
    const myBooksWithPopularity = readBooks.filter(b => (b.num_ratings || 0) > 0);
    const avgPopularityRead = myBooksWithPopularity.length > 0
      ? myBooksWithPopularity.reduce((sum, b) => sum + (b.num_ratings || 0), 0) / myBooksWithPopularity.length
      : 0;
    
    const benchmarkWithPopularity = unreadBooks.filter(b => (b.num_ratings || 0) > 0);
    const avgPopularityBenchmark = benchmarkWithPopularity.length > 0
      ? benchmarkWithPopularity.reduce((sum, b) => sum + (b.num_ratings || 0), 0) / benchmarkWithPopularity.length
      : 0;
    
    // Fiction vs Nonfiction analysis
    const fictionBooks = readBooks.filter(b => (b as any).fiction_type === 'Fiction');
    const nonfictionBooks = readBooks.filter(b => (b as any).fiction_type === 'Nonfiction');
    const unknownTypeBooks = readBooks.filter(b => 
      !(b as any).fiction_type || (b as any).fiction_type === 'Unknown'
    );
    
    // Nonfiction subgenres
    const nonfictionGenres: Record<string, number> = {};
    nonfictionBooks.forEach(b => {
      const genre = b.genre_primary || 'Other';
      if (genre !== 'Unknown' && genre !== 'Nonfiction') {
        nonfictionGenres[genre] = (nonfictionGenres[genre] || 0) + 1;
      }
    });
    
    // Fiction subgenres
    const fictionGenres: Record<string, number> = {};
    fictionBooks.forEach(b => {
      const genre = b.genre_primary || 'Other';
      if (genre !== 'Unknown' && genre !== 'Fiction') {
        fictionGenres[genre] = (fictionGenres[genre] || 0) + 1;
      }
    });
    
    // Benchmark fiction vs nonfiction (from unread books)
    const benchmarkFiction = unreadBooks.filter(b => {
      const genre = b.genre_primary?.toLowerCase() || '';
      return ['fiction', 'fantasy', 'romance', 'mystery', 'thriller', 'horror', 
              'young adult', 'science fiction', 'classics'].some(g => genre.includes(g));
    }).length;
    const benchmarkNonfiction = unreadBooks.length - benchmarkFiction;

    return {
      readBooks,
      unreadBooks,
      myAvgRating,
      benchmarkAvgRating,
      myGenres,
      allGenres,
      myYearDist,
      allYearDist,
      yearReadDist,
      topRated,
      bestMonth,
      avgBooksPerMonth,
      avgPopularityRead,
      avgPopularityBenchmark,
      // New fiction/nonfiction stats
      fictionBooks,
      nonfictionBooks,
      unknownTypeBooks,
      nonfictionGenres,
      fictionGenres,
      benchmarkFiction,
      benchmarkNonfiction,
    };
  }, [galaxyData, reading_timeline]);

  // Prepare chart data
  const timelineData = reading_timeline.map(item => ({
    ...item,
    label: item.year_month,
  }));

  // Genre comparison data for radar chart - balanced between fiction and nonfiction
  const genreComparisonData = useMemo(() => {
    // Get top nonfiction genres from MY reading
    const myNonfictionGenres = Object.entries(computedStats.nonfictionGenres)
      .filter(([genre]) => genre !== 'Unknown' && genre !== 'Nonfiction')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    // Get top fiction genres from MY reading
    const myFictionGenres = Object.entries(computedStats.fictionGenres)
      .filter(([genre]) => genre !== 'Unknown' && genre !== 'Fiction')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    // Combine and create comparison data
    const myTopGenres = [...myNonfictionGenres, ...myFictionGenres];
    
    return myTopGenres.map(([genre, myCount]) => {
      const totalCount = computedStats.allGenres[genre] || 1;
      const myPercent = (myCount / computedStats.readBooks.length) * 100;
      const benchmarkPercent = (totalCount / galaxyData.length) * 100;
      
      return {
        genre: genre.length > 12 ? genre.slice(0, 12) + '...' : genre,
        fullGenre: genre,
        myTaste: Math.round(myPercent * 10) / 10,
        benchmark: Math.round(benchmarkPercent * 10) / 10,
        affinity: myPercent > 0 ? Math.round((myPercent / benchmarkPercent) * 100) / 100 : 0,
      };
    });
  }, [computedStats, galaxyData]);

  // Year distribution data
  const yearDistData = useMemo(() => {
    const decades = new Set([
      ...Object.keys(computedStats.myYearDist),
      ...Object.keys(computedStats.allYearDist)
    ]);
    
    return Array.from(decades)
      .map(d => parseInt(d))
      .filter(d => d >= 1900)
      .sort((a, b) => a - b)
      .map(decade => ({
        decade: `${decade}s`,
        myBooks: computedStats.myYearDist[decade] || 0,
        allBooks: Math.round((computedStats.allYearDist[decade] || 0) / 20), // Scale down for comparison
      }));
  }, [computedStats]);

  // Books read per year
  const booksPerYearData = useMemo(() => {
    return Object.entries(computedStats.yearReadDist)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, count]) => ({ year, count }));
  }, [computedStats]);

  // Genre affinity data (how much more/less I read vs benchmark)
  const genreAffinityData = useMemo(() => {
    return genreComparisonData
      .map(g => ({
        ...g,
        affinityScore: g.myTaste > 0 ? ((g.myTaste - g.benchmark) / g.benchmark * 100) : -100,
      }))
      .sort((a, b) => b.affinityScore - a.affinityScore);
  }, [genreComparisonData]);

  return (
    <div className="analytics">
      {/* ========== SECTION 1: MY READING JOURNEY ========== */}
      <section className="analytics-section">
        <div className="section-header">
          <div className="section-icon" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}>
            <BookMarked size={28} />
          </div>
          <div>
            <h2>My Reading Journey</h2>
            <p>Personal insights from {computedStats.readBooks.length} books read</p>
            <a 
              href="https://www.goodreads.com/review/list/31195433-zach-stanford?shelf=read" 
              target="_blank" 
              rel="noopener noreferrer"
              className="source-link"
            >
              📚 Source: My Goodreads Library →
            </a>
          </div>
        </div>

        {/* Hero Stats */}
        <div className="hero-stats">
          <div className="hero-stat primary">
            <span className="hero-value">{computedStats.readBooks.length}</span>
            <span className="hero-label">Books Read</span>
            <div className="hero-detail">
              <Flame size={14} /> Lifetime total
            </div>
          </div>
          <div className="hero-stat">
            <span className="hero-value">{computedStats.myAvgRating.toFixed(1)}</span>
            <span className="hero-label">Avg Rating</span>
            <div className="hero-detail">
              <Star size={14} /> Out of 5 stars
            </div>
          </div>
          <div className="hero-stat">
            <span className="hero-value">{summary.five_star_books}</span>
            <span className="hero-label">5-Star Books</span>
            <div className="hero-detail">
              <Award size={14} /> {((summary.five_star_books / computedStats.readBooks.length) * 100).toFixed(0)}% favorites
            </div>
          </div>
          <div className="hero-stat">
            <span className="hero-value">{computedStats.avgBooksPerMonth.toFixed(1)}</span>
            <span className="hero-label">Books/Month</span>
            <div className="hero-detail">
              <Clock size={14} /> Reading pace
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="charts-row">
          {/* Reading Timeline */}
          <div className="chart-card chart-large">
            <div className="chart-header">
              <h3><Calendar size={18} /> Reading Timeline</h3>
              <p>Books finished over time</p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorBooks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(138, 148, 168, 0.1)" />
                <XAxis dataKey="label" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" name="Books" stroke={COLORS.purple} fill="url(#colorBooks)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Books Per Year */}
          <div className="chart-card">
            <div className="chart-header">
              <h3><BarChart2 size={18} /> Books Per Year</h3>
              <p>Annual reading volume</p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={booksPerYearData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(138, 148, 168, 0.1)" />
                <XAxis dataKey="year" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Books" fill={COLORS.gold} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="charts-row">
          {/* Rating Distribution */}
          <div className="chart-card">
            <div className="chart-header">
              <h3><Star size={18} /> Rating Distribution</h3>
              <p>How I rate books</p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={rating_distribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(138, 148, 168, 0.1)" />
                <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="rating" stroke="#64748b" tick={{ fill: '#94a3b8' }} tickFormatter={(v) => `${v}★`} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Books" radius={[0, 4, 4, 0]}>
                  {rating_distribution.map((entry) => (
                    <Cell key={entry.rating} fill={
                      entry.rating === 5 ? COLORS.gold :
                      entry.rating === 4 ? COLORS.amber :
                      entry.rating === 3 ? COLORS.slate :
                      COLORS.blue
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Fiction vs Nonfiction Split */}
          <div className="chart-card">
            <div className="chart-header">
              <h3><PieIcon size={18} /> Fiction vs Nonfiction</h3>
              <p>Reading preference breakdown</p>
            </div>
            <div className="fiction-split">
              <div className="split-section nonfiction">
                <div className="split-header">
                  <span className="split-label">📚 Nonfiction</span>
                  <span className="split-count">{computedStats.nonfictionBooks.length} books ({((computedStats.nonfictionBooks.length / computedStats.readBooks.length) * 100).toFixed(0)}%)</span>
                </div>
                <div className="subgenre-bars">
                  {Object.entries(computedStats.nonfictionGenres)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([genre, count], i) => (
                      <div key={genre} className="subgenre-item">
                        <span className="subgenre-name">{genre}</span>
                        <div className="subgenre-bar-track">
                          <div 
                            className="subgenre-bar-fill nonfiction"
                            style={{ width: `${(count / computedStats.nonfictionBooks.length) * 100}%` }}
                          />
                        </div>
                        <span className="subgenre-count">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
              <div className="split-divider" />
              <div className="split-section fiction">
                <div className="split-header">
                  <span className="split-label">✨ Fiction</span>
                  <span className="split-count">{computedStats.fictionBooks.length} books ({((computedStats.fictionBooks.length / computedStats.readBooks.length) * 100).toFixed(0)}%)</span>
                </div>
                <div className="subgenre-bars">
                  {Object.entries(computedStats.fictionGenres)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([genre, count], i) => (
                      <div key={genre} className="subgenre-item">
                        <span className="subgenre-name">{genre}</span>
                        <div className="subgenre-bar-track">
                          <div 
                            className="subgenre-bar-fill fiction"
                            style={{ width: `${(count / Math.max(computedStats.fictionBooks.length, 1)) * 100}%` }}
                          />
                        </div>
                        <span className="subgenre-count">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Top Authors */}
          <div className="chart-card">
            <div className="chart-header">
              <h3><Users size={18} /> Favorite Authors</h3>
              <p>Most read authors</p>
            </div>
            <div className="author-list">
              {top_authors.slice(0, 8).map((author, index) => (
                <div key={author.author} className="author-item">
                  <span className="author-rank">#{index + 1}</span>
                  <span className="author-name">{author.author}</span>
                  <span className="author-count">{author.count} books</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECTION 2: THE LITERARY UNIVERSE ========== */}
      <section className="analytics-section">
        <div className="section-header">
          <div className="section-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
            <BookOpen size={28} />
          </div>
          <div>
            <h2>The Literary Universe</h2>
            <p>Overview of {galaxyData.length.toLocaleString()} books in the database</p>
            <span className="source-info">
              📊 Source: Top 10,000 most popular books from Kaggle's "Best Books Ever" dataset, ranked by total public ratings
            </span>
          </div>
        </div>

        {/* Universe Stats */}
        <div className="universe-stats">
          <div className="universe-stat">
            <span className="universe-value">{galaxyData.length.toLocaleString()}</span>
            <span className="universe-label">Total Books</span>
          </div>
          <div className="universe-stat">
            <span className="universe-value">{computedStats.unreadBooks.length.toLocaleString()}</span>
            <span className="universe-label">Unread by Me</span>
          </div>
          <div className="universe-stat">
            <span className="universe-value">{computedStats.benchmarkAvgRating.toFixed(2)}</span>
            <span className="universe-label">Public Avg Rating</span>
          </div>
          <div className="universe-stat">
            <span className="universe-value">{Object.keys(computedStats.allGenres).length}</span>
            <span className="universe-label">Genres</span>
          </div>
        </div>

        {/* Publication Era Chart */}
        <div className="charts-row">
          <div className="chart-card chart-large">
            <div className="chart-header">
              <h3><TrendingUp size={18} /> Publication Era Distribution</h3>
              <p>When books were published (my reads vs database)</p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={yearDistData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(138, 148, 168, 0.1)" />
                <XAxis dataKey="decade" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="allBooks" name="Database (scaled)" fill={COLORS.slate} opacity={0.5} radius={[4, 4, 0, 0]} />
                <Bar dataKey="myBooks" name="My Books" fill={COLORS.gold} radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Database Genre Distribution */}
          <div className="chart-card">
            <div className="chart-header">
              <h3><PieIcon size={18} /> Database Genres</h3>
              <p>Genre distribution across all books</p>
            </div>
            <div className="genre-bars">
              {Object.entries(computedStats.allGenres)
                .filter(([genre]) => genre !== 'Unknown')
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([genre, count], i) => {
                  const percent = (count / galaxyData.length) * 100;
                  return (
                    <div key={genre} className="genre-bar-item">
                      <div className="genre-bar-label">
                        <span>{genre}</span>
                        <span>{percent.toFixed(1)}%</span>
                      </div>
                      <div className="genre-bar-track">
                        <div 
                          className="genre-bar-fill" 
                          style={{ 
                            width: `${percent * 3}%`,
                            background: GENRE_COLORS[i % GENRE_COLORS.length]
                          }} 
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECTION 3: TASTE ANALYSIS ========== */}
      <section className="analytics-section">
        <div className="section-header">
          <div className="section-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <Target size={28} />
          </div>
          <div>
            <h2>Taste Analysis</h2>
            <p>How your preferences compare to the benchmark</p>
            <span className="source-info">
              🔍 Comparing your Goodreads ratings vs public Goodreads ratings from the top 10K books
            </span>
          </div>
        </div>

        {/* Comparison Stats */}
        <div className="comparison-cards">
          <div className="comparison-card">
            <div className="comparison-header">My Avg Rating vs Public Avg</div>
            <div className="comparison-values">
              <div className="value-with-label">
                <span className="your-value">{computedStats.myAvgRating.toFixed(2)}</span>
                <span className="value-sublabel">My Rating</span>
              </div>
              <span className="vs">vs</span>
              <div className="value-with-label">
                <span className="benchmark-value">{computedStats.benchmarkAvgRating.toFixed(2)}</span>
                <span className="value-sublabel">Public Avg</span>
              </div>
            </div>
            <div className="comparison-label">
              {computedStats.myAvgRating > computedStats.benchmarkAvgRating 
                ? `You rate ${((computedStats.myAvgRating - computedStats.benchmarkAvgRating) / computedStats.benchmarkAvgRating * 100).toFixed(0)}% higher than the public average`
                : `You rate ${((computedStats.benchmarkAvgRating - computedStats.myAvgRating) / computedStats.benchmarkAvgRating * 100).toFixed(0)}% more critically than the public`}
            </div>
          </div>

          <div className="comparison-card">
            <div className="comparison-header">Book Popularity (Public Ratings)</div>
            <div className="comparison-values">
              <div className="value-with-label">
                <span className="your-value">{(computedStats.avgPopularityRead / 1000).toFixed(0)}K</span>
                <span className="value-sublabel">My Books</span>
              </div>
              <span className="vs">vs</span>
              <div className="value-with-label">
                <span className="benchmark-value">{(computedStats.avgPopularityBenchmark / 1000).toFixed(0)}K</span>
                <span className="value-sublabel">Top 10K Avg</span>
              </div>
            </div>
            <div className="comparison-label">
              Avg # of public Goodreads ratings per book
            </div>
          </div>

          <div className="comparison-card">
            <div className="comparison-header">Discovery Rate</div>
            <div className="comparison-values">
              <span className="your-value highlight">{((computedStats.readBooks.length / galaxyData.length) * 100).toFixed(1)}%</span>
            </div>
            <div className="comparison-label">
              of the top 10K books explored
            </div>
          </div>
        </div>

        {/* Fiction vs Nonfiction Comparison */}
        <div className="fiction-comparison-card">
          <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '1rem' }}>Fiction vs Nonfiction Breakdown</h3>
          <div className="comparison-visual">
            <div className="fiction-bar-container">
              <div className="fiction-bar-row">
                <div className="fiction-bar-label-cell">
                  <span className="bar-label-main">📚 You</span>
                </div>
                <div className="fiction-bar">
                  <div 
                    className="fiction-segment nonfiction-you" 
                    style={{ width: `${(computedStats.nonfictionBooks.length / computedStats.readBooks.length) * 100}%` }}
                  >
                    <span>Nonfiction {((computedStats.nonfictionBooks.length / computedStats.readBooks.length) * 100).toFixed(0)}%</span>
                  </div>
                  <div 
                    className="fiction-segment fiction-you"
                    style={{ width: `${(computedStats.fictionBooks.length / computedStats.readBooks.length) * 100}%` }}
                  >
                    <span>Fiction {((computedStats.fictionBooks.length / computedStats.readBooks.length) * 100).toFixed(0)}%</span>
                  </div>
                  {computedStats.unknownTypeBooks.length > 0 && (
                    <div 
                      className="fiction-segment unknown-you"
                      style={{ width: `${(computedStats.unknownTypeBooks.length / computedStats.readBooks.length) * 100}%` }}
                    >
                      <span>Unknown {((computedStats.unknownTypeBooks.length / computedStats.readBooks.length) * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="fiction-bar-row">
                <div className="fiction-bar-label-cell">
                  <span className="bar-label-main">🌐 Top 10K</span>
                </div>
                <div className="fiction-bar benchmark">
                  <div 
                    className="fiction-segment nonfiction-benchmark" 
                    style={{ width: `${(computedStats.benchmarkNonfiction / computedStats.unreadBooks.length) * 100}%` }}
                  >
                    <span>Nonfiction {((computedStats.benchmarkNonfiction / computedStats.unreadBooks.length) * 100).toFixed(0)}%</span>
                  </div>
                  <div 
                    className="fiction-segment fiction-benchmark"
                    style={{ width: `${(computedStats.benchmarkFiction / computedStats.unreadBooks.length) * 100}%` }}
                  >
                    <span>Fiction {((computedStats.benchmarkFiction / computedStats.unreadBooks.length) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="fiction-insight">
              <strong>
                {computedStats.nonfictionBooks.length > computedStats.fictionBooks.length 
                  ? `You read ${((computedStats.nonfictionBooks.length / computedStats.readBooks.length) * 100).toFixed(0)}% nonfiction - heavily focused on learning & growth!`
                  : `You're a balanced reader with a slight fiction preference.`}
              </strong>
            </div>
          </div>
        </div>

        {/* Radar Chart - Taste Profile */}
        <div className="charts-row">
          <div className="chart-card chart-medium">
            <div className="chart-header">
              <h3><Zap size={18} /> Genre Taste Profile</h3>
              <p>Your reading % vs database % by genre</p>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={genreComparisonData}>
                <PolarGrid stroke="rgba(138, 148, 168, 0.2)" />
                <PolarAngleAxis dataKey="genre" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Radar name="Your Taste %" dataKey="myTaste" stroke={COLORS.gold} fill={COLORS.gold} fillOpacity={0.5} strokeWidth={2} />
                <Radar name="Benchmark %" dataKey="benchmark" stroke={COLORS.slate} fill={COLORS.slate} fillOpacity={0.2} strokeWidth={2} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Genre Affinity */}
          <div className="chart-card chart-medium">
            <div className="chart-header">
              <h3><Target size={18} /> Genre Affinity</h3>
              <p>How much more/less you read vs benchmark</p>
            </div>
            <div className="affinity-list">
              {genreAffinityData.map((genre, i) => {
                // Cap the bar width at 50% of container (max visual width from center)
                const maxBarWidth = 50;
                const normalizedScore = Math.min(Math.abs(genre.affinityScore), 200);
                const barWidth = (normalizedScore / 200) * maxBarWidth;
                
                return (
                  <div key={genre.fullGenre} className="affinity-item">
                    <span className="affinity-genre">{genre.fullGenre}</span>
                    <div className="affinity-bar-container">
                      <div 
                        className={`affinity-bar ${genre.affinityScore >= 0 ? 'positive' : 'negative'}`}
                        style={{ 
                          width: `${barWidth}%`
                        }}
                      />
                      <div className="affinity-center-line" />
                    </div>
                    <span className={`affinity-score ${genre.affinityScore >= 0 ? 'positive' : 'negative'}`}>
                      {genre.affinityScore >= 0 ? '+' : ''}{genre.affinityScore.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="affinity-legend">
              <span className="legend-negative">← Read Less</span>
              <span className="legend-positive">Read More →</span>
            </div>
          </div>
        </div>

        {/* Insight Cards */}
        <div className="insight-cards">
          <div className="insight-card">
            <div className="insight-icon">🎯</div>
            <div className="insight-content">
              <h4>Top Affinity Genre</h4>
              <p>{genreAffinityData[0]?.fullGenre || 'N/A'}</p>
              <span className="insight-detail">
                You read {genreAffinityData[0]?.affinityScore?.toFixed(0) || 0}% more than average
              </span>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon">📚</div>
            <div className="insight-content">
              <h4>Best Reading Month</h4>
              <p>{computedStats.bestMonth?.year_month || 'N/A'}</p>
              <span className="insight-detail">
                {computedStats.bestMonth?.count || 0} books finished
              </span>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon">⭐</div>
            <div className="insight-content">
              <h4>5-Star Rate</h4>
              <p>{((summary.five_star_books / computedStats.readBooks.length) * 100).toFixed(0)}%</p>
              <span className="insight-detail">
                of books get your highest rating
              </span>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon">🌟</div>
            <div className="insight-content">
              <h4>Taste Uniqueness</h4>
              <p>{genreAffinityData.filter(g => Math.abs(g.affinityScore) > 50).length} genres</p>
              <span className="insight-detail">
                where you differ significantly from average
              </span>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .analytics {
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .analytics-section {
          margin-bottom: var(--space-2xl);
          padding-bottom: var(--space-xl);
          border-bottom: 1px solid var(--color-border);
        }
        
        .analytics-section:last-child {
          border-bottom: none;
        }
        
        .section-header {
          display: flex;
          align-items: center;
          gap: var(--space-lg);
          margin-bottom: var(--space-xl);
        }
        
        .section-icon {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        
        .section-header h2 {
          font-size: 1.5rem;
          margin-bottom: 4px;
        }
        
        .section-header p {
          color: var(--color-text-secondary);
          font-size: 0.9rem;
        }
        
        .source-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          color: ${COLORS.gold};
          text-decoration: none;
          margin-top: 4px;
          transition: opacity 0.2s;
        }
        
        .source-link:hover {
          opacity: 0.8;
          text-decoration: underline;
        }
        
        .source-info {
          display: block;
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-top: 4px;
          font-style: italic;
        }
        
        /* Hero Stats */
        .hero-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-lg);
          margin-bottom: var(--space-xl);
        }
        
        .hero-stat {
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
          text-align: center;
        }
        
        .hero-stat.primary {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.05));
          border-color: rgba(251, 191, 36, 0.3);
        }
        
        .hero-value {
          display: block;
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .hero-label {
          display: block;
          font-size: 0.85rem;
          color: var(--color-text-secondary);
          margin-top: var(--space-xs);
        }
        
        .hero-detail {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-top: var(--space-sm);
        }
        
        /* Charts */
        .charts-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: var(--space-lg);
          margin-bottom: var(--space-lg);
        }
        
        .chart-card {
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
        }
        
        .chart-card.chart-large {
          grid-column: span 2;
        }
        
        .chart-card.chart-medium {
          min-height: 420px;
        }
        
        .chart-header {
          margin-bottom: var(--space-md);
        }
        
        .chart-header h3 {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: 1rem;
          margin-bottom: 4px;
        }
        
        .chart-header p {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
        }
        
        /* Genre Legend Mini */
        .genre-legend-mini {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-xs);
          margin-top: var(--space-md);
        }
        
        .legend-tag {
          font-size: 0.7rem;
          padding: 4px 8px;
          border: 1px solid;
          border-radius: var(--radius-full);
          color: var(--color-text-secondary);
        }
        
        /* Fiction/Nonfiction Split */
        .fiction-split {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        
        .split-section {
          padding: var(--space-md);
          border-radius: var(--radius-md);
        }
        
        .split-section.nonfiction {
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.2);
        }
        
        .split-section.fiction {
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.2);
        }
        
        .split-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-sm);
        }
        
        .split-label {
          font-size: 0.9rem;
          font-weight: 600;
        }
        
        .split-count {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
        
        .split-divider {
          height: 1px;
          background: var(--color-border);
        }
        
        .subgenre-bars {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .subgenre-item {
          display: grid;
          grid-template-columns: 90px 1fr 30px;
          align-items: center;
          gap: var(--space-sm);
        }
        
        .subgenre-name {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .subgenre-bar-track {
          height: 8px;
          background: rgba(100, 116, 139, 0.2);
          border-radius: 4px;
          overflow: hidden;
        }
        
        .subgenre-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s ease;
        }
        
        .subgenre-bar-fill.nonfiction {
          background: linear-gradient(90deg, ${COLORS.gold}, ${COLORS.amber});
        }
        
        .subgenre-bar-fill.fiction {
          background: linear-gradient(90deg, ${COLORS.purple}, ${COLORS.blue});
        }
        
        .subgenre-count {
          font-size: 0.7rem;
          color: var(--color-text-muted);
          text-align: right;
        }
        
        /* Author List */
        .author-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        
        .author-item {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-sm);
          background: rgba(139, 92, 246, 0.05);
          border-radius: var(--radius-sm);
        }
        
        .author-rank {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text-muted);
          width: 24px;
        }
        
        .author-name {
          flex: 1;
          font-size: 0.85rem;
        }
        
        .author-count {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
        
        /* Universe Stats */
        .universe-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-md);
          margin-bottom: var(--space-xl);
        }
        
        .universe-stat {
          text-align: center;
          padding: var(--space-md);
          background: rgba(59, 130, 246, 0.1);
          border-radius: var(--radius-md);
        }
        
        .universe-value {
          display: block;
          font-size: 1.75rem;
          font-weight: 700;
          color: ${COLORS.blue};
        }
        
        .universe-label {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
        }
        
        /* Genre Bars */
        .genre-bars {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        
        .genre-bar-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .genre-bar-label {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }
        
        .genre-bar-track {
          height: 8px;
          background: rgba(100, 116, 139, 0.2);
          border-radius: 4px;
          overflow: hidden;
        }
        
        .genre-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s ease;
        }
        
        /* Comparison Cards */
        .comparison-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-lg);
          margin-bottom: var(--space-xl);
        }
        
        .comparison-card {
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
          text-align: center;
        }
        
        .comparison-header {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          margin-bottom: var(--space-sm);
        }
        
        .comparison-values {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-md);
        }
        
        .your-value {
          font-size: 2rem;
          font-weight: 700;
          color: ${COLORS.gold};
        }
        
        .your-value.highlight {
          font-size: 2.5rem;
          background: linear-gradient(135deg, #10b981, #059669);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .vs {
          font-size: 0.8rem;
          color: var(--color-text-muted);
        }
        
        .benchmark-value {
          font-size: 1.5rem;
          font-weight: 500;
          color: var(--color-text-secondary);
        }
        
        .comparison-label {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          margin-top: var(--space-sm);
        }
        
        .value-with-label {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .value-sublabel {
          font-size: 0.65rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        /* Fiction vs Nonfiction Comparison */
        .fiction-comparison-card {
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-xl);
          margin-bottom: var(--space-lg);
        }
        
        .fiction-bar-label-cell {
          width: 100px;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        
        .bar-label-main {
          display: block;
        }
        
        .fiction-bar-row {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          margin-bottom: var(--space-md);
        }
        
        .fiction-bar {
          display: flex;
          height: 36px;
          border-radius: var(--radius-md);
          overflow: hidden;
          flex: 1;
        }
        
        .fiction-segment {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 500;
          color: white;
          transition: width 0.5s ease;
        }
        
        .fiction-segment span {
          white-space: nowrap;
          padding: 0 8px;
        }
        
        .fiction-segment.nonfiction-you {
          background: linear-gradient(135deg, ${COLORS.gold}, ${COLORS.amber});
        }
        
        .fiction-segment.fiction-you {
          background: linear-gradient(135deg, ${COLORS.purple}, ${COLORS.blue});
        }
        
        .fiction-segment.nonfiction-benchmark {
          background: rgba(251, 191, 36, 0.4);
          color: rgba(255, 255, 255, 0.8);
        }
        
        .fiction-segment.fiction-benchmark {
          background: rgba(139, 92, 246, 0.4);
          color: rgba(255, 255, 255, 0.8);
        }
        
        .fiction-segment.unknown-you {
          background: rgba(100, 116, 139, 0.5);
          color: rgba(255, 255, 255, 0.7);
        }
        
        .fiction-insight {
          text-align: center;
          margin-top: var(--space-md);
          padding-top: var(--space-md);
          border-top: 1px solid var(--color-border);
          font-size: 0.9rem;
          color: var(--color-text-secondary);
          letter-spacing: 0.5px;
        }

        /* Affinity List */
        .affinity-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        
        .affinity-item {
          display: grid;
          grid-template-columns: 120px 1fr 60px;
          align-items: center;
          gap: var(--space-sm);
        }
        
        .affinity-genre {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .affinity-bar-container {
          position: relative;
          height: 12px;
        }
        
        .affinity-center-line {
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 1px;
          background: var(--color-border);
        }
        
        .affinity-bar {
          position: absolute;
          top: 2px;
          height: 8px;
          border-radius: 4px;
          max-width: 50%;
        }
        
        .affinity-bar.positive {
          background: linear-gradient(90deg, ${COLORS.emerald}, ${COLORS.cyan});
          left: 50%;
        }
        
        .affinity-bar.negative {
          background: linear-gradient(90deg, ${COLORS.pink}, ${COLORS.orange});
          right: 50%;
        }
        
        .affinity-score {
          font-size: 0.8rem;
          font-weight: 600;
          text-align: right;
        }
        
        .affinity-score.positive {
          color: ${COLORS.emerald};
        }
        
        .affinity-score.negative {
          color: ${COLORS.pink};
        }
        
        .affinity-legend {
          display: flex;
          justify-content: space-between;
          margin-top: var(--space-md);
          font-size: 0.7rem;
          color: var(--color-text-muted);
        }
        
        .legend-negative {
          color: ${COLORS.pink};
        }
        
        .legend-positive {
          color: ${COLORS.emerald};
        }
        
        /* Insight Cards */
        .insight-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-md);
        }
        
        .insight-card {
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
          display: flex;
          gap: var(--space-md);
        }
        
        .insight-icon {
          font-size: 2rem;
        }
        
        .insight-content h4 {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        
        .insight-content p {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        
        .insight-detail {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }
        
        /* Custom Tooltip */
        .custom-tooltip {
          background: rgba(10, 10, 26, 0.95);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--space-sm) var(--space-md);
        }
        
        .tooltip-label {
          color: var(--color-text-primary);
          font-weight: 500;
          margin-bottom: var(--space-xs);
        }
        
        .tooltip-value {
          font-size: 0.875rem;
        }
        
        /* Responsive */
        @media (max-width: 1024px) {
          .hero-stats,
          .universe-stats,
          .comparison-cards,
          .insight-cards {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .chart-card.chart-large {
            grid-column: span 1;
          }
        }
        
        @media (max-width: 768px) {
          .hero-stats,
          .universe-stats,
          .comparison-cards,
          .insight-cards {
            grid-template-columns: 1fr;
          }
          
          .charts-row {
            grid-template-columns: 1fr;
          }
          
          .affinity-item {
            grid-template-columns: 80px 1fr 50px;
          }
        }
      `}</style>
    </div>
  );
};

export default Analytics;
