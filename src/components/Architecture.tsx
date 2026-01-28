import React, { useState } from 'react';
import { 
  Database, Brain, Search, MessageSquare, Cpu, 
  ArrowRight, Layers, GitBranch, Zap, Code,
  CheckCircle, FileText, ChevronDown, ChevronUp
} from 'lucide-react';
import { AnalyticsData } from '../App';

interface Props {
  analytics: AnalyticsData;
}

interface TechBadgeProps {
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const TechBadge: React.FC<TechBadgeProps> = ({ name, icon, description, color }) => (
  <div className="tech-badge" style={{ borderColor: color }}>
    <div className="badge-icon" style={{ background: `${color}20`, color }}>
      {icon}
    </div>
    <div className="badge-info">
      <span className="badge-name">{name}</span>
      <span className="badge-desc">{description}</span>
    </div>
  </div>
);

/**
 * Architecture - Tech explainer page with RAG visualizations
 * Shows how the system works under the hood
 */
const Architecture: React.FC<Props> = ({ analytics }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('pipeline');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="architecture">
      <div className="arch-header">
        <h2>Architecture</h2>
        <p>How SmartBooks AI transforms your reading data into intelligent recommendations</p>
      </div>

      {/* Tech Stack Overview */}
      <section className="tech-stack-section">
        <h3>🛠️ Tech Stack</h3>
        <div className="tech-grid">
          <TechBadge
            name="LlamaIndex"
            icon={<Layers size={20} />}
            description="RAG orchestration framework"
            color="#9d4edd"
          />
          <TechBadge
            name="ChromaDB"
            icon={<Database size={20} />}
            description="Vector database for embeddings"
            color="#4da6ff"
          />
          <TechBadge
            name="Sentence Transformers"
            icon={<Brain size={20} />}
            description="Local embedding generation"
            color="#00f5d4"
          />
          <TechBadge
            name="React + Three.js"
            icon={<Code size={20} />}
            description="3D visualization frontend"
            color="#ffd93d"
          />
          <TechBadge
            name="Anthropic Claude"
            icon={<MessageSquare size={20} />}
            description="LLM for chat & reasoning"
            color="#ff6b9d"
          />
          <TechBadge
            name="Netlify Functions"
            icon={<Zap size={20} />}
            description="Serverless API endpoints"
            color="#ff8c42"
          />
        </div>
      </section>

      {/* Pipeline Visualization */}
      <section className="pipeline-section">
        <div 
          className="section-header clickable"
          onClick={() => toggleSection('pipeline')}
        >
          <h3>📊 Data Pipeline</h3>
          {expandedSection === 'pipeline' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {expandedSection === 'pipeline' && (
          <div className="pipeline-content animate-slideUp">
            <div className="pipeline-flow">
              <div className="pipeline-step">
                <div className="step-icon" style={{ background: '#9d4edd20' }}>
                  <FileText size={24} color="#9d4edd" />
                </div>
                <div className="step-info">
                  <h4>1. Raw Data</h4>
                  <p>Goodreads export + Kaggle metadata</p>
                  <div className="step-stats">
                    <span>{analytics.summary.total_books} books</span>
                    <span>2 CSV sources</span>
                  </div>
                </div>
              </div>
              
              <ArrowRight className="flow-arrow" />
              
              <div className="pipeline-step">
                <div className="step-icon" style={{ background: '#4da6ff20' }}>
                  <GitBranch size={24} color="#4da6ff" />
                </div>
                <div className="step-info">
                  <h4>2. Enrichment</h4>
                  <p>Waterfall join (ISBN → Title+Author)</p>
                  <div className="step-stats">
                    <span>{analytics.summary.coverage_percent}% enriched</span>
                    <span>Descriptions + genres</span>
                  </div>
                </div>
              </div>
              
              <ArrowRight className="flow-arrow" />
              
              <div className="pipeline-step">
                <div className="step-icon" style={{ background: '#00f5d420' }}>
                  <Brain size={24} color="#00f5d4" />
                </div>
                <div className="step-info">
                  <h4>3. Embeddings</h4>
                  <p>Sentence Transformers (all-MiniLM-L6-v2)</p>
                  <div className="step-stats">
                    <span>384 dimensions</span>
                    <span>~50ms per book</span>
                  </div>
                </div>
              </div>
              
              <ArrowRight className="flow-arrow" />
              
              <div className="pipeline-step">
                <div className="step-icon" style={{ background: '#ffd93d20' }}>
                  <Database size={24} color="#ffd93d" />
                </div>
                <div className="step-info">
                  <h4>4. Vector Index</h4>
                  <p>ChromaDB with cosine similarity</p>
                  <div className="step-stats">
                    <span>{analytics.summary.books_with_descriptions} vectors</span>
                    <span>&lt;100ms search</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="code-preview">
              <div className="code-header">
                <span>enrich_data.py</span>
              </div>
              <pre className="code-block">
{`# Waterfall Join Strategy
# Pass 1: High-precision ISBN match
merged = pd.merge(goodreads, kaggle, 
                  on='ISBN13', how='left')

# Pass 2: Fuzzy title+author for remaining
unmatched = merged[merged['description'].isna()]
merged = pd.merge(unmatched, kaggle,
                  on=['title', 'author'], how='left')`}
              </pre>
            </div>
          </div>
        )}
      </section>

      {/* Embedding Explanation */}
      <section className="embedding-section">
        <div 
          className="section-header clickable"
          onClick={() => toggleSection('embeddings')}
        >
          <h3>🧠 Understanding Embeddings</h3>
          {expandedSection === 'embeddings' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {expandedSection === 'embeddings' && (
          <div className="embedding-content animate-slideUp">
            <div className="embed-explainer">
              <div className="embed-card">
                <h4>What are embeddings?</h4>
                <p>
                  Embeddings are numerical representations of text that capture semantic meaning. 
                  Similar concepts get similar numbers, enabling "meaning-based" search.
                </p>
              </div>
              
              <div className="embed-example">
                <div className="example-text">
                  <h5>"Space exploration sci-fi"</h5>
                  <ArrowRight className="transform-arrow" />
                  <div className="vector-preview">
                    [0.23, -0.15, 0.87, ..., 0.42]
                    <span className="dim-note">384 dimensions</span>
                  </div>
                </div>
                
                <div className="similarity-demo">
                  <h5>Similar queries get similar vectors:</h5>
                  <div className="sim-pair">
                    <span>"astronaut adventure"</span>
                    <span className="sim-score">0.91 similarity</span>
                  </div>
                  <div className="sim-pair">
                    <span>"romance novel"</span>
                    <span className="sim-score low">0.23 similarity</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="model-info">
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
          </div>
        )}
      </section>

      {/* RAG Process */}
      <section className="rag-section">
        <div 
          className="section-header clickable"
          onClick={() => toggleSection('rag')}
        >
          <h3>🔄 RAG Process</h3>
          {expandedSection === 'rag' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {expandedSection === 'rag' && (
          <div className="rag-content animate-slideUp">
            <p className="rag-intro">
              <strong>Retrieval-Augmented Generation (RAG)</strong> combines search with LLMs. 
              Instead of the LLM making up facts, we first retrieve relevant context, then ask the LLM to reason over it.
            </p>
            
            <div className="rag-flow">
              <div className="rag-step">
                <div className="rag-num">1</div>
                <div className="rag-content-inner">
                  <h4>Query Embedding</h4>
                  <p>User question → 384-dim vector</p>
                  <code>"Find cozy mysteries"</code>
                </div>
              </div>
              
              <div className="rag-step">
                <div className="rag-num">2</div>
                <div className="rag-content-inner">
                  <h4>Vector Search</h4>
                  <p>Find nearest neighbors in ChromaDB</p>
                  <code>Top 10 similar books</code>
                </div>
              </div>
              
              <div className="rag-step">
                <div className="rag-num">3</div>
                <div className="rag-content-inner">
                  <h4>Context Building</h4>
                  <p>Format retrieved books as prompt context</p>
                  <code>"Given these books: ..."</code>
                </div>
              </div>
              
              <div className="rag-step">
                <div className="rag-num">4</div>
                <div className="rag-content-inner">
                  <h4>LLM Generation</h4>
                  <p>Claude reasons over context to answer</p>
                  <code>Grounded recommendations</code>
                </div>
              </div>
            </div>
            
            <div className="rag-benefits">
              <h4>Why RAG?</h4>
              <ul>
                <li><CheckCircle size={16} /> <strong>Grounded:</strong> Answers based on your actual books</li>
                <li><CheckCircle size={16} /> <strong>Current:</strong> No knowledge cutoff - uses your data</li>
                <li><CheckCircle size={16} /> <strong>Transparent:</strong> Can cite which books informed the answer</li>
                <li><CheckCircle size={16} /> <strong>Private:</strong> Your library stays in your control</li>
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* 3D Space Explanation */}
      <section className="space-section">
        <div 
          className="section-header clickable"
          onClick={() => toggleSection('space')}
        >
          <h3>🌌 3D Vector Space Visualization</h3>
          {expandedSection === 'space' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {expandedSection === 'space' && (
          <div className="space-content animate-slideUp">
            <div className="space-explainer">
              <div className="space-card">
                <h4>From 384D to 3D</h4>
                <p>
                  The Galaxy View uses <strong>UMAP</strong> (Uniform Manifold Approximation and Projection) 
                  to compress 384-dimensional embeddings down to 3 dimensions while preserving 
                  local neighborhood structure.
                </p>
              </div>
              
              <div className="umap-flow">
                <div className="umap-step">
                  <span className="dim">384D</span>
                  <span className="label">Embedding Space</span>
                </div>
                <ArrowRight className="umap-arrow" />
                <div className="umap-step highlight">
                  <span className="dim">UMAP</span>
                  <span className="label">Dimensionality Reduction</span>
                </div>
                <ArrowRight className="umap-arrow" />
                <div className="umap-step">
                  <span className="dim">3D</span>
                  <span className="label">Visual Space</span>
                </div>
              </div>
              
              <div className="space-insight">
                <h4>What you're seeing:</h4>
                <ul>
                  <li><strong>Clusters</strong> = Books with similar themes/genres</li>
                  <li><strong>Distance</strong> = Semantic difference between books</li>
                  <li><strong>Color</strong> = Your rating (gold=5★, blue=4★)</li>
                  <li><strong>Size</strong> = Page count</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Performance Metrics */}
      <section className="metrics-section">
        <h3>📈 System Metrics</h3>
        <div className="metrics-grid">
          <div className="metric-card">
            <Cpu size={24} />
            <span className="metric-val">{analytics.summary.books_with_descriptions}</span>
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
          <a href="https://docs.llamaindex.ai/" target="_blank" rel="noopener noreferrer">
            LlamaIndex Docs →
          </a>
          <a href="https://docs.trychroma.com/" target="_blank" rel="noopener noreferrer">
            ChromaDB Guide →
          </a>
          <a href="https://www.sbert.net/" target="_blank" rel="noopener noreferrer">
            Sentence Transformers →
          </a>
          <a href="https://umap-learn.readthedocs.io/" target="_blank" rel="noopener noreferrer">
            UMAP Algorithm →
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
        
        section {
          margin-bottom: var(--space-xl);
        }
        
        section h3 {
          margin-bottom: var(--space-lg);
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-md);
          background: var(--color-nebula-dark);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-md);
        }
        
        .section-header.clickable {
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .section-header.clickable:hover {
          border-color: var(--color-cosmic-purple);
        }
        
        .section-header h3 {
          margin: 0;
          font-size: 1.1rem;
        }
        
        /* Tech Stack */
        .tech-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: var(--space-md);
        }
        
        .tech-badge {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-md);
          background: var(--gradient-card);
          border: 1px solid;
          border-radius: var(--radius-md);
          transition: transform var(--transition-fast);
        }
        
        .tech-badge:hover {
          transform: translateY(-2px);
        }
        
        .badge-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
        }
        
        .badge-name {
          font-weight: 600;
          display: block;
        }
        
        .badge-desc {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
        
        /* Pipeline */
        .pipeline-flow {
          display: flex;
          align-items: flex-start;
          gap: var(--space-sm);
          overflow-x: auto;
          padding: var(--space-lg);
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-lg);
        }
        
        .pipeline-step {
          min-width: 180px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: var(--space-sm);
        }
        
        .step-icon {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        
        .step-info h4 {
          font-size: 0.9rem;
          margin-bottom: var(--space-xs);
        }
        
        .step-info p {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          margin-bottom: var(--space-sm);
        }
        
        .step-stats {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .step-stats span {
          font-size: 0.7rem;
          color: var(--color-aurora);
          font-family: var(--font-mono);
        }
        
        .flow-arrow {
          flex-shrink: 0;
          color: var(--color-text-muted);
          margin-top: 24px;
        }
        
        .code-preview {
          background: var(--color-void);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        
        .code-header {
          padding: var(--space-sm) var(--space-md);
          background: var(--color-nebula-dark);
          border-bottom: 1px solid var(--color-border);
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
        
        .code-block {
          padding: var(--space-md);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--color-aurora);
          overflow-x: auto;
          margin: 0;
        }
        
        /* Embeddings */
        .embed-explainer {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: var(--space-lg);
          margin-bottom: var(--space-lg);
        }
        
        .embed-card {
          padding: var(--space-lg);
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }
        
        .embed-card h4 {
          margin-bottom: var(--space-sm);
        }
        
        .embed-card p {
          font-size: 0.9rem;
          color: var(--color-text-secondary);
        }
        
        .embed-example {
          padding: var(--space-lg);
          background: var(--color-nebula-dark);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }
        
        .example-text {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          margin-bottom: var(--space-lg);
          flex-wrap: wrap;
        }
        
        .example-text h5 {
          padding: var(--space-sm) var(--space-md);
          background: var(--color-cosmic-purple);
          border-radius: var(--radius-sm);
        }
        
        .transform-arrow {
          color: var(--color-text-muted);
        }
        
        .vector-preview {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--color-aurora);
          display: flex;
          flex-direction: column;
        }
        
        .dim-note {
          font-size: 0.65rem;
          color: var(--color-text-muted);
        }
        
        .similarity-demo h5 {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          margin-bottom: var(--space-sm);
        }
        
        .sim-pair {
          display: flex;
          justify-content: space-between;
          padding: var(--space-xs) 0;
          font-size: 0.85rem;
        }
        
        .sim-score {
          font-family: var(--font-mono);
          color: var(--color-aurora);
        }
        
        .sim-score.low {
          color: var(--color-supernova);
        }
        
        .model-info {
          padding: var(--space-lg);
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }
        
        .model-info h4 {
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
        
        .stat-val {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-cosmic-purple);
        }
        
        .stat-label {
          font-size: 0.7rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
        }
        
        /* RAG */
        .rag-intro {
          margin-bottom: var(--space-lg);
          padding: var(--space-md);
          background: rgba(157, 78, 221, 0.1);
          border-left: 3px solid var(--color-cosmic-purple);
          border-radius: var(--radius-sm);
        }
        
        .rag-flow {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-md);
          margin-bottom: var(--space-lg);
        }
        
        .rag-step {
          display: flex;
          gap: var(--space-sm);
          padding: var(--space-md);
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }
        
        .rag-num {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-cosmic-purple);
          border-radius: 50%;
          font-weight: 700;
          font-size: 0.85rem;
          flex-shrink: 0;
        }
        
        .rag-content-inner h4 {
          font-size: 0.9rem;
          margin-bottom: var(--space-xs);
        }
        
        .rag-content-inner p {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          margin-bottom: var(--space-xs);
        }
        
        .rag-content-inner code {
          font-size: 0.7rem;
          color: var(--color-aurora);
          font-family: var(--font-mono);
        }
        
        .rag-benefits {
          padding: var(--space-lg);
          background: var(--color-nebula-dark);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }
        
        .rag-benefits h4 {
          margin-bottom: var(--space-md);
        }
        
        .rag-benefits ul {
          list-style: none;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-sm);
        }
        
        .rag-benefits li {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: 0.9rem;
        }
        
        .rag-benefits li svg {
          color: var(--color-aurora);
          flex-shrink: 0;
        }
        
        /* 3D Space */
        .space-explainer {
          padding: var(--space-lg);
          background: var(--gradient-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
        }
        
        .space-card {
          margin-bottom: var(--space-lg);
        }
        
        .space-card h4 {
          margin-bottom: var(--space-sm);
        }
        
        .space-card p {
          color: var(--color-text-secondary);
        }
        
        .umap-flow {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-md);
          margin-bottom: var(--space-lg);
        }
        
        .umap-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--space-md);
          background: var(--color-nebula);
          border-radius: var(--radius-md);
        }
        
        .umap-step.highlight {
          background: var(--color-cosmic-purple);
        }
        
        .umap-step .dim {
          font-size: 1.25rem;
          font-weight: 700;
        }
        
        .umap-step .label {
          font-size: 0.7rem;
          color: var(--color-text-secondary);
        }
        
        .umap-step.highlight .label {
          color: rgba(255, 255, 255, 0.8);
        }
        
        .umap-arrow {
          color: var(--color-text-muted);
        }
        
        .space-insight h4 {
          margin-bottom: var(--space-sm);
        }
        
        .space-insight ul {
          list-style: none;
        }
        
        .space-insight li {
          padding: var(--space-xs) 0;
          font-size: 0.9rem;
          color: var(--color-text-secondary);
        }
        
        /* Metrics */
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
        
        @media (max-width: 768px) {
          .pipeline-flow {
            flex-direction: column;
            align-items: stretch;
          }
          
          .flow-arrow {
            transform: rotate(90deg);
            margin: var(--space-sm) auto;
          }
          
          .embed-explainer {
            grid-template-columns: 1fr;
          }
          
          .rag-flow {
            grid-template-columns: 1fr;
          }
          
          .rag-benefits ul {
            grid-template-columns: 1fr;
          }
          
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .model-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default Architecture;
