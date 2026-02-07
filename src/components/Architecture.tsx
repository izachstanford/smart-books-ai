import React, { useState, useRef } from 'react';
import { 
  Database, Brain, Search, Cpu, 
  ArrowRight, Layers, GitBranch, Code,
  CheckCircle, FileText, ChevronDown, ChevronUp,
  Download, Sparkles, Box, Rocket
} from 'lucide-react';
import { AnalyticsData } from '../App';

interface Props {
  analytics: AnalyticsData;
}

/**
 * Architecture - Visual journey through the SmartBooksAI pipeline
 */
const Architecture: React.FC<Props> = ({ analytics }) => {
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  
  // Refs for scroll-to-section
  const collectRef = useRef<HTMLDivElement>(null);
  const enrichRef = useRef<HTMLDivElement>(null);
  const embedRef = useRef<HTMLDivElement>(null);
  const reduceRef = useRef<HTMLDivElement>(null);
  const serveRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const stages = [
    { 
      id: 'collect', 
      icon: <Download size={24} />, 
      title: 'Collect', 
      subtitle: 'Data Sources',
      tools: ['Goodreads', 'Kaggle'],
      stat: '2 CSVs',
      statLabel: '~10K books',
      color: '#9d4edd',
      ref: collectRef
    },
    { 
      id: 'enrich', 
      icon: <Sparkles size={24} />, 
      title: 'Enrich', 
      subtitle: 'Add Metadata',
      tools: ['Google Books', 'Open Library'],
      stat: `${analytics.summary.coverage_percent}%`,
      statLabel: 'enriched',
      color: '#4da6ff',
      ref: enrichRef
    },
    { 
      id: 'embed', 
      icon: <Brain size={24} />, 
      title: 'Embed', 
      subtitle: 'Vectorize',
      tools: ['Sentence Transformers', 'all-MiniLM-L6-v2'],
      stat: '384',
      statLabel: 'dimensions',
      color: '#00f5d4',
      ref: embedRef
    },
    { 
      id: 'reduce', 
      icon: <Box size={24} />, 
      title: 'Reduce', 
      subtitle: '3D Mapping',
      tools: ['UMAP', 'ChromaDB'],
      stat: '384D→3D',
      statLabel: 'projection',
      color: '#ff6b9d',
      ref: reduceRef
    },
    { 
      id: 'serve', 
      icon: <Rocket size={24} />, 
      title: 'Serve', 
      subtitle: 'Frontend App',
      tools: ['React', 'Three.js', 'Transformers.js'],
      stat: '<200ms',
      statLabel: 'search',
      color: '#ffd93d',
      ref: serveRef
    },
  ];

  return (
    <div className="architecture">
      <div className="arch-header">
        <h2>Architecture</h2>
        <p>Follow the data: from raw exports to intelligent recommendations</p>
      </div>

      {/* Hero Flowchart */}
      <div className="hero-flowchart">
        <div className="flowchart-title">How SmartBooksAI Works</div>
        <div className="flowchart-container">
          {stages.map((stage, index) => (
            <React.Fragment key={stage.id}>
              <div 
                className="flow-stage"
                style={{ '--stage-color': stage.color } as React.CSSProperties}
                onClick={() => scrollToSection(stage.ref)}
              >
                <div className="stage-icon">{stage.icon}</div>
                <div className="stage-title">{stage.title}</div>
                <div className="stage-subtitle">{stage.subtitle}</div>
                <div className="stage-tools">
                  {stage.tools.slice(0, 2).map(tool => (
                    <span key={tool} className="tool-tag">{tool}</span>
                  ))}
                </div>
                <div className="stage-stat">
                  <span className="stat-value">{stage.stat}</span>
                  <span className="stat-label">{stage.statLabel}</span>
                </div>
              </div>
              {index < stages.length - 1 && (
                <div className="flow-connector">
                  <div className="connector-line"></div>
                  <ArrowRight className="connector-arrow" size={20} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="flowchart-summary">
          <span>💾 {analytics.summary.books_read} personal books</span>
          <span>→</span>
          <span>📚 {analytics.summary.total_books.toLocaleString()} total indexed</span>
          <span>→</span>
          <span>🔢 {(analytics.summary.total_books * 384).toLocaleString()} embedding values</span>
          <span>→</span>
          <span>⚡ Instant semantic search</span>
        </div>
        <div className="flowchart-hint">Click any stage to learn more ↓</div>
      </div>

      {/* Stage 1: Collect */}
      <section ref={collectRef} className="pipeline-stage" id="collect">
        <div className="stage-header" style={{ borderColor: '#9d4edd' }}>
          <div className="stage-number" style={{ background: '#9d4edd' }}>1</div>
          <div className="stage-header-content">
            <h3><Download size={20} /> Collect: Data Sources</h3>
            <p>Combining personal reading history with a rich public book database</p>
          </div>
        </div>
        
        <div className="stage-content">
          <div className="source-cards">
            <div className="source-card">
              <div className="source-icon" style={{ background: 'rgba(157, 78, 221, 0.2)' }}>
                <FileText size={32} color="#9d4edd" />
              </div>
              <h4>Goodreads Export</h4>
              <p>Your personal reading data exported as CSV</p>
              <ul className="source-details">
                <li><strong>{analytics.summary.books_read}</strong> books you've read</li>
                <li>Your ratings (1-5 stars)</li>
                <li>Dates read</li>
                <li>Shelves & notes</li>
              </ul>
              <div className="source-format">
                <span className="format-label">Format:</span>
                <code>goodreads_library_export.csv</code>
              </div>
            </div>
            
            <div className="source-card">
              <div className="source-icon" style={{ background: 'rgba(77, 166, 255, 0.2)' }}>
                <Database size={32} color="#4da6ff" />
              </div>
              <h4>Kaggle "Best Books Ever"</h4>
              <p>Top 10,000 most-rated books on Goodreads</p>
              <ul className="source-details">
                <li><strong>10,000</strong> popular books</li>
                <li>Descriptions & genres</li>
                <li>Cover images</li>
                <li>Public ratings & reviews</li>
              </ul>
              <div className="source-format">
                <span className="format-label">Source:</span>
                <a href="https://www.kaggle.com/datasets/mdhamani/goodreads-books-100k" target="_blank" rel="noopener noreferrer">Kaggle Dataset</a>
              </div>
            </div>
          </div>
          
          <div className="stage-output">
            <div className="output-arrow">↓</div>
            <div className="output-result">
              <strong>Output:</strong> Combined dataset with {analytics.summary.total_books.toLocaleString()} unique books
              <span className="output-detail">({analytics.summary.books_read} read + {(analytics.summary.books_unread || 0).toLocaleString()} unread)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stage 2: Enrich */}
      <section ref={enrichRef} className="pipeline-stage" id="enrich">
        <div className="stage-header" style={{ borderColor: '#4da6ff' }}>
          <div className="stage-number" style={{ background: '#4da6ff' }}>2</div>
          <div className="stage-header-content">
            <h3><Sparkles size={20} /> Enrich: Add Metadata</h3>
            <p>Filling in missing descriptions, covers, and genres via API enrichment</p>
          </div>
        </div>
        
        <div className="stage-content">
          <div className="enrich-strategy">
            <h4>Waterfall Matching Strategy</h4>
            <p>Books are matched and enriched in priority order:</p>
            
            <div className="waterfall-flow">
              <div className="waterfall-step">
                <div className="waterfall-num">1</div>
                <div className="waterfall-info">
                  <strong>ISBN Match</strong>
                  <span>Exact ISBN-13 lookup in Kaggle data</span>
                  <span className="match-rate">~60% match rate</span>
                </div>
              </div>
              <div className="waterfall-arrow">↓</div>
              <div className="waterfall-step">
                <div className="waterfall-num">2</div>
                <div className="waterfall-info">
                  <strong>Title + Author Match</strong>
                  <span>Fuzzy matching for remaining books</span>
                  <span className="match-rate">~25% additional</span>
                </div>
              </div>
              <div className="waterfall-arrow">↓</div>
              <div className="waterfall-step">
                <div className="waterfall-num">3</div>
                <div className="waterfall-info">
                  <strong>API Enrichment</strong>
                  <span>Google Books + Open Library fallback</span>
                  <span className="match-rate">~10% via APIs</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="code-section">
            <button 
              className="code-toggle"
              onClick={() => setExpandedCode(expandedCode === 'enrich' ? null : 'enrich')}
            >
              <Code size={16} />
              <span>View Python Code</span>
              {expandedCode === 'enrich' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedCode === 'enrich' && (
              <div className="code-block animate-slideUp">
                <div className="code-filename">build_base_dataset.py</div>
                <pre>{`# Waterfall Join Strategy
def match_and_enrich(goodreads_df, kaggle_df):
    # Pass 1: High-precision ISBN match
    merged = pd.merge(
        goodreads_df, kaggle_df, 
        on='ISBN13', how='left'
    )
    
    # Pass 2: Fuzzy title+author for remaining
    unmatched = merged[merged['description'].isna()]
    title_matched = pd.merge(
        unmatched, kaggle_df,
        on=['title_normalized', 'author_normalized'], 
        how='left'
    )
    
    # Pass 3: API enrichment for still-missing
    still_missing = title_matched[
        title_matched['description'].isna()
    ]
    enriched = fetch_from_apis(still_missing)
    
    return pd.concat([matched, title_matched, enriched])`}</pre>
              </div>
            )}
          </div>
          
          <div className="enrich-apis">
            <h4>External APIs Used</h4>
            <div className="api-cards">
              <div className="api-card">
                <strong>Google Books API</strong>
                <span>Descriptions, categories, covers</span>
              </div>
              <div className="api-card">
                <strong>Open Library API</strong>
                <span>Fallback for missing covers</span>
              </div>
            </div>
          </div>
          
          <div className="stage-output">
            <div className="output-arrow">↓</div>
            <div className="output-result">
              <strong>Output:</strong> {analytics.summary.coverage_percent}% of books enriched with descriptions
              <span className="output-detail">(genres, covers, publication dates)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stage 3: Embed */}
      <section ref={embedRef} className="pipeline-stage" id="embed">
        <div className="stage-header" style={{ borderColor: '#00f5d4' }}>
          <div className="stage-number" style={{ background: '#00f5d4', color: '#0a0a1a' }}>3</div>
          <div className="stage-header-content">
            <h3><Brain size={20} /> Embed: Convert to Vectors</h3>
            <p>Transforming book descriptions into 384-dimensional semantic vectors</p>
          </div>
        </div>
        
        <div className="stage-content">
          <div className="embed-explainer">
            <div className="embed-what">
              <h4>What are Embeddings?</h4>
              <p>
                Embeddings are numerical representations of text that capture <strong>semantic meaning</strong>. 
                Similar concepts get similar numbers, enabling "meaning-based" search rather than keyword matching.
              </p>
              
              <div className="embed-demo">
                <div className="demo-input">
                  <span className="demo-label">Book Description</span>
                  <div className="demo-text">"A space explorer stranded on Mars must use science to survive"</div>
                </div>
                <ArrowRight className="demo-arrow" />
                <div className="demo-output">
                  <span className="demo-label">384-Dimensional Vector</span>
                  <div className="demo-vector">[0.23, -0.15, 0.87, 0.42, -0.33, ... ]</div>
                </div>
              </div>
            </div>
            
            <div className="embed-similarity">
              <h4>Similarity in Action</h4>
              <p>Similar books cluster together in vector space:</p>
              <div className="similarity-examples">
                <div className="sim-row high">
                  <span className="sim-book">"Astronaut survival story"</span>
                  <span className="sim-score">0.91</span>
                  <span className="sim-label">High similarity</span>
                </div>
                <div className="sim-row medium">
                  <span className="sim-book">"Engineering adventure"</span>
                  <span className="sim-score">0.67</span>
                  <span className="sim-label">Medium</span>
                </div>
                <div className="sim-row low">
                  <span className="sim-book">"Victorian romance novel"</span>
                  <span className="sim-score">0.23</span>
                  <span className="sim-label">Low similarity</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="model-card">
            <h4>Model: all-MiniLM-L6-v2</h4>
            <div className="model-stats">
              <div className="model-stat">
                <span className="stat-val">22M</span>
                <span className="stat-label">Parameters</span>
              </div>
              <div className="model-stat">
                <span className="stat-val">384</span>
                <span className="stat-label">Dimensions</span>
              </div>
              <div className="model-stat">
                <span className="stat-val">~50ms</span>
                <span className="stat-label">Per Embedding</span>
              </div>
              <div className="model-stat">
                <span className="stat-val">100%</span>
                <span className="stat-label">Local/Private</span>
              </div>
            </div>
          </div>
          
          <div className="math-section">
            <h4>The Math: Cosine Similarity</h4>
            <p>We measure similarity using the angle between vectors:</p>
            
            <div className="math-cards">
              <div className="math-card">
                <div className="math-title">Cosine Similarity</div>
                <div className="math-formula">cos(θ) = (A · B) / (||A|| × ||B||)</div>
                <div className="math-desc">Result ranges from -1 (opposite) to +1 (identical)</div>
              </div>
              <div className="math-card">
                <div className="math-title">Dot Product</div>
                <div className="math-formula">A · B = Σ(aᵢ × bᵢ)</div>
                <div className="math-desc">Sum across all 384 dimensions</div>
              </div>
              <div className="math-card">
                <div className="math-title">Magnitude</div>
                <div className="math-formula">||A|| = √(Σ(aᵢ²))</div>
                <div className="math-desc">Length of vector in 384D space</div>
              </div>
            </div>
          </div>
          
          <div className="code-section">
            <button 
              className="code-toggle"
              onClick={() => setExpandedCode(expandedCode === 'embed' ? null : 'embed')}
            >
              <Code size={16} />
              <span>View Python Code</span>
              {expandedCode === 'embed' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedCode === 'embed' && (
              <div className="code-block animate-slideUp">
                <div className="code-filename">generate_embeddings_v2.py</div>
                <pre>{`from sentence_transformers import SentenceTransformer

# Load the embedding model
model = SentenceTransformer('all-MiniLM-L6-v2')

def generate_embeddings(books):
    texts = [
        f"{b['title']} by {b['author']}. {b['description']}"
        for b in books
    ]
    
    # Generate 384-dim vectors for all books
    embeddings = model.encode(
        texts, 
        batch_size=32,
        show_progress_bar=True
    )
    
    return embeddings  # Shape: (n_books, 384)`}</pre>
              </div>
            )}
          </div>
          
          <div className="stage-output">
            <div className="output-arrow">↓</div>
            <div className="output-result">
              <strong>Output:</strong> {analytics.summary.total_books.toLocaleString()} × 384 = {(analytics.summary.total_books * 384).toLocaleString()} embedding values
              <span className="output-detail">(stored in library_with_embeddings.json)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stage 4: Reduce */}
      <section ref={reduceRef} className="pipeline-stage" id="reduce">
        <div className="stage-header" style={{ borderColor: '#ff6b9d' }}>
          <div className="stage-number" style={{ background: '#ff6b9d' }}>4</div>
          <div className="stage-header-content">
            <h3><Box size={20} /> Reduce: 3D Projection</h3>
            <p>Compressing 384 dimensions to 3D for visualization while preserving structure</p>
          </div>
        </div>
        
        <div className="stage-content">
          <div className="umap-explainer">
            <h4>UMAP: Dimensionality Reduction</h4>
            <p>
              <strong>Uniform Manifold Approximation and Projection</strong> compresses high-dimensional 
              data while preserving local neighborhood structure. Books that are similar in 384D 
              stay close together in 3D.
            </p>
            
            <div className="umap-flow">
              <div className="umap-step">
                <span className="dim">384D</span>
                <span className="label">Embedding Space</span>
                <span className="detail">Raw semantic vectors</span>
              </div>
              <ArrowRight className="umap-arrow" />
              <div className="umap-step highlight">
                <span className="dim">UMAP</span>
                <span className="label">Transform</span>
                <span className="detail">~30 seconds</span>
              </div>
              <ArrowRight className="umap-arrow" />
              <div className="umap-step">
                <span className="dim">3D</span>
                <span className="label">Visual Space</span>
                <span className="detail">x, y, z coordinates</span>
              </div>
            </div>
          </div>
          
          <div className="galaxy-meaning">
            <h4>What You See in the Galaxy View</h4>
            <div className="meaning-grid">
              <div className="meaning-item">
                <span className="meaning-icon">🔵</span>
                <strong>Clusters</strong>
                <span>Books with similar themes/genres</span>
              </div>
              <div className="meaning-item">
                <span className="meaning-icon">📏</span>
                <strong>Distance</strong>
                <span>Semantic difference between books</span>
              </div>
              <div className="meaning-item">
                <span className="meaning-icon">🌟</span>
                <strong>Color</strong>
                <span>Your rating (gold=5★ → purple=1★)</span>
              </div>
              <div className="meaning-item">
                <span className="meaning-icon">⚫</span>
                <strong>Gray dots</strong>
                <span>Unread books (unexplored territory)</span>
              </div>
            </div>
          </div>
          
          <div className="code-section">
            <button 
              className="code-toggle"
              onClick={() => setExpandedCode(expandedCode === 'reduce' ? null : 'reduce')}
            >
              <Code size={16} />
              <span>View Python Code</span>
              {expandedCode === 'reduce' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedCode === 'reduce' && (
              <div className="code-block animate-slideUp">
                <div className="code-filename">precompute_analytics_v2.py</div>
                <pre>{`import umap
import numpy as np

def generate_3d_coordinates(embeddings):
    # UMAP for 3D projection
    reducer = umap.UMAP(
        n_components=3,
        n_neighbors=15,
        min_dist=0.1,
        metric='cosine',
        random_state=42
    )
    
    coords_3d = reducer.fit_transform(embeddings)
    
    # Normalize to [-1, 1] range for Three.js
    for dim in range(3):
        min_val, max_val = coords_3d[:, dim].min(), coords_3d[:, dim].max()
        coords_3d[:, dim] = 2 * (coords_3d[:, dim] - min_val) / (max_val - min_val) - 1
    
    return coords_3d  # Shape: (n_books, 3)`}</pre>
              </div>
            )}
          </div>
          
          <div className="stage-output">
            <div className="output-arrow">↓</div>
            <div className="output-result">
              <strong>Output:</strong> {(analytics.summary.total_books * 3).toLocaleString()} 3D coordinates
              <span className="output-detail">(stored in galaxy_coordinates.json)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stage 5: Serve */}
      <section ref={serveRef} className="pipeline-stage" id="serve">
        <div className="stage-header" style={{ borderColor: '#ffd93d' }}>
          <div className="stage-number" style={{ background: '#ffd93d', color: '#0a0a1a' }}>5</div>
          <div className="stage-header-content">
            <h3><Rocket size={20} /> Serve: Client-Side Search</h3>
            <p>Real-time semantic search running entirely in your browser</p>
          </div>
        </div>
        
        <div className="stage-content">
          <div className="serve-flow">
            <h4>How Search Works</h4>
            <div className="search-steps">
              <div className="search-step">
                <div className="search-num">1</div>
                <div className="search-info">
                  <strong>You type a query</strong>
                  <span>"books about mindfulness and stoicism"</span>
                </div>
              </div>
              <div className="search-step">
                <div className="search-num">2</div>
                <div className="search-info">
                  <strong>Transformers.js embeds it</strong>
                  <span>Query → 384-dim vector (in browser)</span>
                </div>
              </div>
              <div className="search-step">
                <div className="search-num">3</div>
                <div className="search-info">
                  <strong>Compare to all books</strong>
                  <span>Cosine similarity × {analytics.summary.total_books.toLocaleString()} books</span>
                </div>
              </div>
              <div className="search-step">
                <div className="search-num">4</div>
                <div className="search-info">
                  <strong>Return top matches</strong>
                  <span>Ranked by semantic similarity</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="tech-stack-grid">
            <h4>Frontend Tech Stack</h4>
            <div className="tech-cards">
              <div className="tech-card">
                <Code size={24} color="#61dafb" />
                <strong>React</strong>
                <span>UI framework</span>
              </div>
              <div className="tech-card">
                <Box size={24} color="#000" style={{ background: '#fff', borderRadius: 4, padding: 2 }} />
                <strong>Three.js</strong>
                <span>3D rendering</span>
              </div>
              <div className="tech-card">
                <Cpu size={24} color="#00f5d4" />
                <strong>Transformers.js</strong>
                <span>Browser ML</span>
              </div>
              <div className="tech-card">
                <Layers size={24} color="#ff8c42" />
                <strong>Recharts</strong>
                <span>Analytics charts</span>
              </div>
            </div>
          </div>
          
          <div className="benefits-section">
            <h4>Why Client-Side?</h4>
            <div className="benefits-grid">
              <div className="benefit">
                <CheckCircle size={20} color="#00f5d4" />
                <div>
                  <strong>Private</strong>
                  <span>All computation in your browser</span>
                </div>
              </div>
              <div className="benefit">
                <CheckCircle size={20} color="#00f5d4" />
                <div>
                  <strong>Fast</strong>
                  <span>No network latency</span>
                </div>
              </div>
              <div className="benefit">
                <CheckCircle size={20} color="#00f5d4" />
                <div>
                  <strong>Free</strong>
                  <span>No API costs or rate limits</span>
                </div>
              </div>
              <div className="benefit">
                <CheckCircle size={20} color="#00f5d4" />
                <div>
                  <strong>Offline-Ready</strong>
                  <span>Works after initial load</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="code-section">
            <button 
              className="code-toggle"
              onClick={() => setExpandedCode(expandedCode === 'serve' ? null : 'serve')}
            >
              <Code size={16} />
              <span>View JavaScript Code</span>
              {expandedCode === 'serve' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedCode === 'serve' && (
              <div className="code-block animate-slideUp">
                <div className="code-filename">TasteFinder.tsx</div>
                <pre>{`import { pipeline } from '@xenova/transformers';

// Load model once (cached in browser)
const embedder = await pipeline(
  'feature-extraction',
  'Xenova/all-MiniLM-L6-v2'
);

async function semanticSearch(query: string, books: Book[]) {
  // Embed the query
  const queryEmbedding = await embedder(query, {
    pooling: 'mean',
    normalize: true
  });
  
  // Calculate similarity to all books
  const results = books.map(book => ({
    ...book,
    similarity: cosineSimilarity(
      queryEmbedding.data,
      book.embedding
    )
  }));
  
  // Return top matches
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 20);
}`}</pre>
              </div>
            )}
          </div>
          
          <div className="stage-output final">
            <div className="output-result">
              <strong>Result:</strong> Instant semantic search in &lt;200ms
              <span className="output-detail">(no server, no API keys, complete privacy)</span>
            </div>
          </div>
        </div>
      </section>

      {/* System Metrics */}
      <section className="metrics-section">
        <h3>📈 System Metrics</h3>
        <div className="metrics-grid">
          <div className="metric-card">
            <Cpu size={24} />
            <span className="metric-val">{analytics.summary.total_books.toLocaleString()}</span>
            <span className="metric-label">Indexed Books</span>
          </div>
          <div className="metric-card">
            <Database size={24} />
            <span className="metric-val">384</span>
            <span className="metric-label">Vector Dimensions</span>
          </div>
          <div className="metric-card">
            <Search size={24} />
            <span className="metric-val">&lt;200ms</span>
            <span className="metric-label">Search Latency</span>
          </div>
          <div className="metric-card">
            <CheckCircle size={24} />
            <span className="metric-val">{analytics.summary.coverage_percent}%</span>
            <span className="metric-label">Data Coverage</span>
          </div>
        </div>
      </section>

      {/* Learn More */}
      <section className="learn-more">
        <h3>📚 Learn More</h3>
        <div className="resource-links">
          <a href="https://huggingface.co/docs/transformers.js/" target="_blank" rel="noopener noreferrer">
            Transformers.js Docs →
          </a>
          <a href="https://www.sbert.net/" target="_blank" rel="noopener noreferrer">
            Sentence Transformers →
          </a>
          <a href="https://umap-learn.readthedocs.io/" target="_blank" rel="noopener noreferrer">
            UMAP Algorithm →
          </a>
          <a href="https://threejs.org/docs/" target="_blank" rel="noopener noreferrer">
            Three.js Documentation →
          </a>
        </div>
      </section>

      <style>{`
        .architecture {
          max-width: 1000px;
          margin: 0 auto;
        }
        
        .arch-header {
          text-align: center;
          margin-bottom: var(--space-xl);
        }
        
        .arch-header h2 {
          font-size: 1.75rem;
          margin-bottom: var(--space-xs);
        }
        
        .arch-header p {
          color: var(--color-text-secondary);
        }
        
        /* Hero Flowchart */
        .hero-flowchart {
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-xl);
          margin-bottom: var(--space-2xl);
        }
        
        .flowchart-title {
          text-align: center;
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: var(--space-lg);
          color: var(--color-text-primary);
        }
        
        .flowchart-container {
          display: flex;
          align-items: stretch;
          justify-content: center;
          gap: var(--space-sm);
          overflow-x: auto;
          padding: var(--space-md) 0;
        }
        
        .flow-stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--space-md);
          background: var(--color-nebula-dark);
          border: 2px solid var(--stage-color);
          border-radius: var(--radius-md);
          min-width: 140px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .flow-stage:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }
        
        .stage-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--stage-color) 20%, transparent);
          border-radius: 50%;
          color: var(--stage-color);
          margin-bottom: var(--space-sm);
        }
        
        .stage-title {
          font-weight: 700;
          font-size: 1rem;
          color: var(--stage-color);
        }
        
        .stage-subtitle {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-bottom: var(--space-sm);
        }
        
        .stage-tools {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-bottom: var(--space-sm);
        }
        
        .tool-tag {
          font-size: 0.65rem;
          padding: 2px 6px;
          background: var(--color-nebula);
          border-radius: var(--radius-sm);
          color: var(--color-text-secondary);
        }
        
        .stage-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: auto;
        }
        
        .stage-stat .stat-value {
          font-size: 1rem;
          font-weight: 700;
          color: var(--stage-color);
          font-family: var(--font-mono);
        }
        
        .stage-stat .stat-label {
          font-size: 0.6rem;
          color: var(--color-text-muted);
        }
        
        .flow-connector {
          display: flex;
          align-items: center;
          color: var(--color-text-muted);
        }
        
        .connector-line {
          width: 20px;
          height: 2px;
          background: linear-gradient(90deg, var(--color-border), var(--color-text-muted));
        }
        
        .connector-arrow {
          flex-shrink: 0;
        }
        
        .flowchart-summary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-sm);
          margin-top: var(--space-lg);
          padding-top: var(--space-lg);
          border-top: 1px solid var(--color-border);
          flex-wrap: wrap;
          font-size: 0.85rem;
          color: var(--color-text-secondary);
        }
        
        .flowchart-hint {
          text-align: center;
          margin-top: var(--space-md);
          font-size: 0.8rem;
          color: var(--color-aurora);
        }
        
        /* Pipeline Stages */
        .pipeline-stage {
          margin-bottom: var(--space-2xl);
          scroll-margin-top: 80px;
        }
        
        .stage-header {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-lg);
          background: var(--color-nebula-dark);
          border-left: 4px solid;
          border-radius: var(--radius-md);
          margin-bottom: var(--space-lg);
        }
        
        .stage-number {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-weight: 700;
          font-size: 1.1rem;
          color: white;
          flex-shrink: 0;
        }
        
        .stage-header-content h3 {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin: 0 0 var(--space-xs) 0;
          font-size: 1.1rem;
        }
        
        .stage-header-content p {
          margin: 0;
          font-size: 0.9rem;
          color: var(--color-text-secondary);
        }
        
        .stage-content {
          padding-left: var(--space-lg);
        }
        
        /* Source Cards */
        .source-cards {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-lg);
          margin-bottom: var(--space-lg);
        }
        
        .source-card {
          padding: var(--space-lg);
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }
        
        .source-icon {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
          margin-bottom: var(--space-md);
        }
        
        .source-card h4 {
          margin-bottom: var(--space-sm);
        }
        
        .source-card > p {
          color: var(--color-text-secondary);
          font-size: 0.9rem;
          margin-bottom: var(--space-md);
        }
        
        .source-details {
          list-style: none;
          margin-bottom: var(--space-md);
        }
        
        .source-details li {
          padding: var(--space-xs) 0;
          font-size: 0.85rem;
          color: var(--color-text-secondary);
          display: flex;
          gap: var(--space-xs);
        }
        
        .source-format {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: 0.8rem;
        }
        
        .format-label {
          color: var(--color-text-muted);
        }
        
        .source-format code {
          color: var(--color-aurora);
          font-family: var(--font-mono);
        }
        
        .source-format a {
          color: var(--color-aurora);
        }
        
        /* Stage Output */
        .stage-output {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: var(--space-lg);
          padding-top: var(--space-lg);
          border-top: 1px dashed var(--color-border);
        }
        
        .output-arrow {
          font-size: 1.5rem;
          color: var(--color-text-muted);
          margin-bottom: var(--space-sm);
        }
        
        .output-result {
          padding: var(--space-md) var(--space-lg);
          background: rgba(0, 245, 212, 0.1);
          border: 1px solid var(--color-aurora);
          border-radius: var(--radius-md);
          text-align: center;
        }
        
        .output-detail {
          display: block;
          font-size: 0.8rem;
          color: var(--color-text-muted);
          margin-top: var(--space-xs);
        }
        
        .stage-output.final .output-result {
          background: rgba(255, 217, 61, 0.1);
          border-color: #ffd93d;
        }
        
        /* Waterfall */
        .enrich-strategy {
          padding: var(--space-lg);
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-lg);
        }
        
        .enrich-strategy h4 {
          margin-bottom: var(--space-sm);
        }
        
        .enrich-strategy > p {
          color: var(--color-text-secondary);
          margin-bottom: var(--space-lg);
        }
        
        .waterfall-flow {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        
        .waterfall-step {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-md);
          background: var(--color-nebula);
          border-radius: var(--radius-md);
        }
        
        .waterfall-num {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #4da6ff;
          border-radius: 50%;
          font-weight: 700;
          font-size: 0.85rem;
          flex-shrink: 0;
        }
        
        .waterfall-info {
          display: flex;
          flex-direction: column;
        }
        
        .waterfall-info strong {
          font-size: 0.9rem;
        }
        
        .waterfall-info span {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
        }
        
        .match-rate {
          color: var(--color-aurora) !important;
          font-family: var(--font-mono);
        }
        
        .waterfall-arrow {
          text-align: center;
          color: var(--color-text-muted);
          font-size: 1.2rem;
        }
        
        /* Code Section */
        .code-section {
          margin: var(--space-lg) 0;
        }
        
        .code-toggle {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-sm) var(--space-md);
          background: var(--color-nebula);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
          width: 100%;
        }
        
        .code-toggle:hover {
          background: var(--color-nebula-dark);
          color: var(--color-text-primary);
        }
        
        .code-block {
          margin-top: var(--space-sm);
          background: var(--color-void);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        
        .code-filename {
          padding: var(--space-sm) var(--space-md);
          background: var(--color-nebula-dark);
          border-bottom: 1px solid var(--color-border);
          font-size: 0.75rem;
          color: var(--color-text-muted);
          font-family: var(--font-mono);
        }
        
        .code-block pre {
          padding: var(--space-md);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--color-aurora);
          overflow-x: auto;
          margin: 0;
          line-height: 1.5;
        }
        
        /* API Cards */
        .enrich-apis {
          margin-bottom: var(--space-lg);
        }
        
        .enrich-apis h4 {
          margin-bottom: var(--space-md);
        }
        
        .api-cards {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-md);
        }
        
        .api-card {
          padding: var(--space-md);
          background: var(--color-nebula);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
        }
        
        .api-card strong {
          font-size: 0.9rem;
          margin-bottom: var(--space-xs);
        }
        
        .api-card span {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
        }
        
        /* Embed Explainer */
        .embed-explainer {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-lg);
          margin-bottom: var(--space-lg);
        }
        
        .embed-what, .embed-similarity {
          padding: var(--space-lg);
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }
        
        .embed-what h4, .embed-similarity h4 {
          margin-bottom: var(--space-sm);
        }
        
        .embed-what > p {
          color: var(--color-text-secondary);
          font-size: 0.9rem;
          margin-bottom: var(--space-lg);
        }
        
        .embed-demo {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          flex-wrap: wrap;
        }
        
        .demo-input, .demo-output {
          flex: 1;
          min-width: 150px;
        }
        
        .demo-label {
          display: block;
          font-size: 0.7rem;
          color: var(--color-text-muted);
          margin-bottom: var(--space-xs);
          text-transform: uppercase;
        }
        
        .demo-text {
          padding: var(--space-sm);
          background: var(--color-nebula);
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          font-style: italic;
        }
        
        .demo-vector {
          padding: var(--space-sm);
          background: var(--color-nebula);
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-family: var(--font-mono);
          color: var(--color-aurora);
        }
        
        .demo-arrow {
          flex-shrink: 0;
          color: var(--color-text-muted);
        }
        
        .embed-similarity > p {
          color: var(--color-text-secondary);
          font-size: 0.9rem;
          margin-bottom: var(--space-md);
        }
        
        .similarity-examples {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        
        .sim-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-sm);
          background: var(--color-nebula);
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
        }
        
        .sim-book {
          flex: 1;
        }
        
        .sim-score {
          font-family: var(--font-mono);
          font-weight: 600;
          margin: 0 var(--space-md);
        }
        
        .sim-row.high .sim-score { color: #00f5d4; }
        .sim-row.medium .sim-score { color: #ffd93d; }
        .sim-row.low .sim-score { color: #ff6b9d; }
        
        .sim-label {
          font-size: 0.7rem;
          color: var(--color-text-muted);
        }
        
        /* Model Card */
        .model-card {
          padding: var(--space-lg);
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-lg);
        }
        
        .model-card h4 {
          margin-bottom: var(--space-md);
        }
        
        .model-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-md);
        }
        
        .model-stat {
          text-align: center;
        }
        
        .model-stat .stat-val {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: #00f5d4;
        }
        
        .model-stat .stat-label {
          font-size: 0.7rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
        }
        
        /* Math Section */
        .math-section {
          margin-bottom: var(--space-lg);
        }
        
        .math-section h4 {
          margin-bottom: var(--space-sm);
        }
        
        .math-section > p {
          color: var(--color-text-secondary);
          margin-bottom: var(--space-lg);
        }
        
        .math-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-md);
        }
        
        .math-card {
          padding: var(--space-lg);
          background: var(--color-nebula-dark);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          text-align: center;
        }
        
        .math-title {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          margin-bottom: var(--space-sm);
        }
        
        .math-formula {
          font-family: var(--font-mono);
          font-size: 1rem;
          color: var(--color-aurora);
          margin-bottom: var(--space-sm);
        }
        
        .math-desc {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }
        
        /* UMAP */
        .umap-explainer {
          padding: var(--space-lg);
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-lg);
        }
        
        .umap-explainer h4 {
          margin-bottom: var(--space-sm);
        }
        
        .umap-explainer > p {
          color: var(--color-text-secondary);
          margin-bottom: var(--space-lg);
        }
        
        .umap-flow {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-md);
        }
        
        .umap-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--space-md) var(--space-lg);
          background: var(--color-nebula);
          border-radius: var(--radius-md);
          text-align: center;
        }
        
        .umap-step.highlight {
          background: #ff6b9d;
        }
        
        .umap-step .dim {
          font-size: 1.25rem;
          font-weight: 700;
        }
        
        .umap-step .label {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }
        
        .umap-step.highlight .label {
          color: rgba(255, 255, 255, 0.8);
        }
        
        .umap-step .detail {
          font-size: 0.65rem;
          color: var(--color-text-muted);
        }
        
        .umap-arrow {
          color: var(--color-text-muted);
        }
        
        /* Galaxy Meaning */
        .galaxy-meaning {
          margin-bottom: var(--space-lg);
        }
        
        .galaxy-meaning h4 {
          margin-bottom: var(--space-md);
        }
        
        .meaning-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-md);
        }
        
        .meaning-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: var(--space-md);
          background: var(--color-nebula);
          border-radius: var(--radius-md);
        }
        
        .meaning-icon {
          font-size: 1.5rem;
          margin-bottom: var(--space-xs);
        }
        
        .meaning-item strong {
          font-size: 0.85rem;
          margin-bottom: var(--space-xs);
        }
        
        .meaning-item span {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }
        
        /* Search Steps */
        .serve-flow {
          padding: var(--space-lg);
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-lg);
        }
        
        .serve-flow h4 {
          margin-bottom: var(--space-lg);
        }
        
        .search-steps {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-md);
        }
        
        .search-step {
          display: flex;
          gap: var(--space-sm);
          padding: var(--space-md);
          background: var(--color-nebula);
          border-radius: var(--radius-md);
        }
        
        .search-num {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffd93d;
          color: #0a0a1a;
          border-radius: 50%;
          font-weight: 700;
          font-size: 0.8rem;
          flex-shrink: 0;
        }
        
        .search-info {
          display: flex;
          flex-direction: column;
        }
        
        .search-info strong {
          font-size: 0.85rem;
          margin-bottom: var(--space-xs);
        }
        
        .search-info span {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }
        
        /* Tech Stack Grid */
        .tech-stack-grid {
          margin-bottom: var(--space-lg);
        }
        
        .tech-stack-grid h4 {
          margin-bottom: var(--space-md);
        }
        
        .tech-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-md);
        }
        
        .tech-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: var(--space-md);
          background: var(--color-nebula);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }
        
        .tech-card svg {
          margin-bottom: var(--space-sm);
        }
        
        .tech-card strong {
          font-size: 0.9rem;
          margin-bottom: var(--space-xs);
        }
        
        .tech-card span {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }
        
        /* Benefits */
        .benefits-section {
          margin-bottom: var(--space-lg);
        }
        
        .benefits-section h4 {
          margin-bottom: var(--space-md);
        }
        
        .benefits-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-md);
        }
        
        .benefit {
          display: flex;
          align-items: flex-start;
          gap: var(--space-sm);
          padding: var(--space-md);
          background: var(--color-nebula);
          border-radius: var(--radius-md);
        }
        
        .benefit svg {
          flex-shrink: 0;
          margin-top: 2px;
        }
        
        .benefit div {
          display: flex;
          flex-direction: column;
        }
        
        .benefit strong {
          font-size: 0.9rem;
        }
        
        .benefit span {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }
        
        /* Metrics */
        .metrics-section {
          margin-bottom: var(--space-xl);
        }
        
        .metrics-section h3 {
          margin-bottom: var(--space-lg);
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-md);
        }
        
        .metric-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--space-lg);
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          text-align: center;
        }
        
        .metric-card svg {
          color: var(--color-cosmic-purple);
          margin-bottom: var(--space-sm);
        }
        
        .metric-val {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: var(--space-xs);
        }
        
        .metric-label {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
        
        /* Learn More */
        .learn-more h3 {
          margin-bottom: var(--space-lg);
        }
        
        .resource-links {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-md);
        }
        
        .resource-links a {
          padding: var(--space-sm) var(--space-md);
          background: var(--color-nebula);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          transition: all var(--transition-fast);
        }
        
        .resource-links a:hover {
          background: var(--color-cosmic-purple);
          border-color: var(--color-cosmic-purple);
          color: white;
        }
        
        /* Mobile Responsiveness */
        @media (max-width: 768px) {
          .flowchart-container {
            flex-direction: column;
            align-items: center;
          }
          
          .flow-stage {
            width: 100%;
            max-width: 280px;
          }
          
          .flow-connector {
            transform: rotate(90deg);
            margin: var(--space-xs) 0;
          }
          
          .flowchart-summary {
            flex-direction: column;
            gap: var(--space-xs);
          }
          
          .flowchart-summary span:nth-child(even) {
            display: none;
          }
          
          .source-cards {
            grid-template-columns: 1fr;
          }
          
          .embed-explainer {
            grid-template-columns: 1fr;
          }
          
          .math-cards {
            grid-template-columns: 1fr;
          }
          
          .umap-flow {
            flex-direction: column;
          }
          
          .umap-arrow {
            transform: rotate(90deg);
          }
          
          .meaning-grid,
          .search-steps,
          .tech-cards,
          .benefits-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .model-stats,
          .metrics-grid,
          .api-cards {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .stage-content {
            padding-left: 0;
          }
        }
        
        @media (max-width: 480px) {
          .meaning-grid,
          .search-steps,
          .tech-cards,
          .benefits-grid,
          .model-stats,
          .metrics-grid,
          .api-cards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Architecture;
