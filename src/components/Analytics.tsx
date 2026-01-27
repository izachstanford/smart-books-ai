import React from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, BookOpen, Star, Calendar } from 'lucide-react';
import { AnalyticsData } from '../App';

interface Props {
  data: AnalyticsData;
}

// Custom colors for charts
const COLORS = {
  primary: '#9d4edd',
  secondary: '#4da6ff',
  accent: '#00f5d4',
  gold: '#ffd93d',
  pink: '#ff6b9d',
  muted: '#5a6478',
};

const GENRE_COLORS = [
  '#9d4edd', '#4da6ff', '#00f5d4', '#ffd93d', '#ff6b9d',
  '#ff8c42', '#98d8c8', '#7eb8da', '#c9b1ff', '#ffb5b5',
  '#a8b4c4', '#6c5b7b'
];

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="tooltip-value" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/**
 * Analytics - Dashboard with reading statistics
 * Priority charts: Timeline, Genre Breakdown, Rating Distribution
 */
const Analytics: React.FC<Props> = ({ data }) => {
  const { summary, reading_timeline, genre_breakdown, rating_distribution } = data;

  // Format timeline data
  const timelineData = reading_timeline.map(item => ({
    ...item,
    month: item.year_month.slice(5), // Extract MM
    year: item.year_month.slice(0, 4),
    label: item.year_month,
  }));

  // Calculate rating average
  const totalRatings = rating_distribution.reduce((sum, r) => sum + r.count, 0);
  const weightedSum = rating_distribution.reduce((sum, r) => sum + r.rating * r.count, 0);
  const avgRating = totalRatings > 0 ? (weightedSum / totalRatings).toFixed(2) : '0';

  return (
    <div className="analytics">
      <div className="analytics-header">
        <h2>📊 Analytics Dashboard</h2>
        <p>Insights into your reading patterns and preferences</p>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(157, 78, 221, 0.2)' }}>
            <BookOpen size={24} color={COLORS.primary} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{summary.total_books}</span>
            <span className="stat-label">Total Books</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(77, 166, 255, 0.2)' }}>
            <TrendingUp size={24} color={COLORS.secondary} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{summary.books_read}</span>
            <span className="stat-label">Books Read</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(255, 217, 61, 0.2)' }}>
            <Star size={24} color={COLORS.gold} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{summary.five_star_books}</span>
            <span className="stat-label">5-Star Books</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(0, 245, 212, 0.2)' }}>
            <Calendar size={24} color={COLORS.accent} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{summary.books_to_read}</span>
            <span className="stat-label">To-Read Queue</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Chart 1: Reading Timeline */}
        <div className="chart-card chart-wide">
          <div className="chart-header">
            <h3>📅 Reading Timeline</h3>
            <p>Books finished over time</p>
          </div>
          <div className="chart-body">
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(138, 148, 168, 0.1)" />
                  <XAxis 
                    dataKey="label" 
                    stroke="#5a6478"
                    tick={{ fill: '#8892a8', fontSize: 12 }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    stroke="#5a6478"
                    tick={{ fill: '#8892a8', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Books"
                    stroke={COLORS.primary}
                    strokeWidth={3}
                    dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 8, fill: COLORS.accent }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No reading history with dates available</div>
            )}
          </div>
        </div>

        {/* Chart 2: Genre Breakdown */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>🎭 Genre Breakdown</h3>
            <p>Your most-read genres</p>
          </div>
          <div className="chart-body">
            {genre_breakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={genre_breakdown.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="genre"
                    label={({ genre, percent }) => 
                      `${genre.length > 12 ? genre.slice(0, 12) + '...' : genre} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={{ stroke: '#5a6478' }}
                  >
                    {genre_breakdown.slice(0, 8).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={GENRE_COLORS[index % GENRE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No genre data available</div>
            )}
          </div>
          
          {/* Genre legend */}
          <div className="genre-legend">
            {genre_breakdown.slice(0, 6).map((item, index) => (
              <div key={item.genre} className="legend-item">
                <span 
                  className="legend-color" 
                  style={{ background: GENRE_COLORS[index % GENRE_COLORS.length] }}
                />
                <span className="legend-label">{item.genre}</span>
                <span className="legend-count">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3: Rating Distribution */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>⭐ Rating Distribution</h3>
            <p>Average: {avgRating} stars</p>
          </div>
          <div className="chart-body">
            {rating_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={rating_distribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(138, 148, 168, 0.1)" />
                  <XAxis 
                    type="number"
                    stroke="#5a6478"
                    tick={{ fill: '#8892a8', fontSize: 12 }}
                  />
                  <YAxis 
                    type="category"
                    dataKey="rating"
                    stroke="#5a6478"
                    tick={{ fill: '#8892a8', fontSize: 12 }}
                    tickFormatter={(value) => `${value} ★`}
                    width={50}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="count" 
                    name="Books"
                    radius={[0, 8, 8, 0]}
                  >
                    {rating_distribution.map((entry) => (
                      <Cell 
                        key={`cell-${entry.rating}`} 
                        fill={entry.rating === 5 ? COLORS.gold : 
                              entry.rating === 4 ? COLORS.secondary : 
                              entry.rating === 3 ? COLORS.muted :
                              COLORS.pink}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No rating data available</div>
            )}
          </div>
          
          {/* Rating insights */}
          <div className="rating-insights">
            <div className="insight">
              <span className="insight-value" style={{ color: COLORS.gold }}>
                {rating_distribution.find(r => r.rating === 5)?.count || 0}
              </span>
              <span className="insight-label">5-star</span>
            </div>
            <div className="insight">
              <span className="insight-value" style={{ color: COLORS.secondary }}>
                {rating_distribution.find(r => r.rating === 4)?.count || 0}
              </span>
              <span className="insight-label">4-star</span>
            </div>
            <div className="insight">
              <span className="insight-value" style={{ color: COLORS.muted }}>
                {rating_distribution.filter(r => r.rating <= 3).reduce((sum, r) => sum + r.count, 0)}
              </span>
              <span className="insight-label">3 & below</span>
            </div>
          </div>
        </div>
      </div>

      {/* Future Charts Placeholder */}
      <div className="future-charts">
        <h4>🚀 Coming Soon</h4>
        <div className="future-items">
          <span>Rating Trends Over Time</span>
          <span>Author Loyalty</span>
          <span>Page Count Analysis</span>
          <span>Genre Affinity Heatmap</span>
          <span>Reading Diversity Score</span>
          <span>Pace Analysis</span>
          <span>To-Read Prioritization</span>
        </div>
      </div>

      <style>{`
        .analytics {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .analytics-header {
          text-align: center;
          margin-bottom: var(--space-xl);
        }
        
        .analytics-header h2 {
          font-size: 1.75rem;
          margin-bottom: var(--space-xs);
        }
        
        .analytics-header p {
          color: var(--color-text-secondary);
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-md);
          margin-bottom: var(--space-xl);
        }
        
        .stat-card {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-lg);
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }
        
        .stat-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
        }
        
        .stat-content {
          display: flex;
          flex-direction: column;
        }
        
        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          line-height: 1;
        }
        
        .stat-label {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .charts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-lg);
          margin-bottom: var(--space-xl);
        }
        
        .chart-card {
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
        }
        
        .chart-card.chart-wide {
          grid-column: 1 / -1;
        }
        
        .chart-header {
          margin-bottom: var(--space-lg);
        }
        
        .chart-header h3 {
          font-size: 1.1rem;
          margin-bottom: var(--space-xs);
        }
        
        .chart-header p {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
        }
        
        .chart-body {
          margin-bottom: var(--space-md);
        }
        
        .no-data {
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-muted);
          font-size: 0.9rem;
        }
        
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
        
        .genre-legend {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-sm);
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: 0.75rem;
        }
        
        .legend-color {
          width: 10px;
          height: 10px;
          border-radius: 2px;
          flex-shrink: 0;
        }
        
        .legend-label {
          flex: 1;
          color: var(--color-text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .legend-count {
          color: var(--color-text-muted);
          font-family: var(--font-mono);
        }
        
        .rating-insights {
          display: flex;
          justify-content: space-around;
          padding-top: var(--space-md);
          border-top: 1px solid var(--color-border);
        }
        
        .insight {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-xs);
        }
        
        .insight-value {
          font-size: 1.5rem;
          font-weight: 700;
        }
        
        .insight-label {
          font-size: 0.7rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
        }
        
        .future-charts {
          padding: var(--space-lg);
          background: rgba(21, 21, 53, 0.3);
          border: 1px dashed var(--color-border);
          border-radius: var(--radius-md);
          text-align: center;
        }
        
        .future-charts h4 {
          color: var(--color-text-muted);
          margin-bottom: var(--space-md);
        }
        
        .future-items {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: var(--space-sm);
        }
        
        .future-items span {
          padding: var(--space-xs) var(--space-sm);
          background: var(--color-nebula);
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
        
        @media (max-width: 768px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }
          
          .genre-legend {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Analytics;
