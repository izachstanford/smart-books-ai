# 📚 SmartBooks AI

A RAG-powered book recommendation & analytics platform that transforms your Goodreads export into an intelligent semantic search engine.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.2-blue.svg)
![Python](https://img.shields.io/badge/Python-3.9+-green.svg)

## ✨ Features

- **🔍 Semantic Search** - Find books by concept, theme, or feeling—not just keywords
- **🌌 Galaxy View** - 3D visualization of your reading universe using UMAP-reduced embeddings
- **📊 Analytics** - Interactive charts showing reading patterns and preferences
- **💬 AI Chat** - Conversational book recommendations powered by RAG
- **✨ Taste Finder** - Discover unread books that match your 5-star taste profile
- **🔬 Architecture** - Learn how the RAG system works under the hood

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| RAG Framework | LlamaIndex |
| Vector Store | ChromaDB |
| Embeddings | Sentence Transformers (all-MiniLM-L6-v2) |
| 3D Visualization | React Three Fiber / Three.js |
| Frontend | React + TypeScript |
| Charts | Recharts |
| LLM | Anthropic Claude |
| API | Netlify Functions |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- Your Goodreads library export (`goodreads_library_export.csv`)

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Prepare Your Data

Place your data files in the `data/` folder:
- `goodreads_library_export.csv` - Your Goodreads library export
- `books_1.Best_Books_Ever.csv` - Kaggle Best Books Ever dataset

### 3. Run the Data Pipeline

```bash
# Run all 4 stages
bash run_pipeline.sh

# Or run stages individually
python scripts/enrich_data.py        # Stage 1: Data enrichment
python scripts/generate_embeddings.py # Stage 2: Embeddings
python scripts/build_index.py         # Stage 3: ChromaDB index
python scripts/precompute_analytics.py # Stage 4: Analytics
```

### 4. Start the App

```bash
# Copy generated data to public folder
mkdir -p public/data
cp data/library_with_embeddings.json public/data/
cp data/analytics_data.json public/data/
cp data/galaxy_coordinates.json public/data/

# Start development server
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
smart-books-ai/
├── data/                      # Data files
│   ├── goodreads_library_export.csv
│   ├── books_1.Best_Books_Ever.csv
│   ├── enriched_library.csv   # Stage 1 output
│   ├── library_with_embeddings.json  # Stage 2 output
│   ├── chroma_db/             # Stage 3 output
│   ├── analytics_data.json    # Stage 4 output
│   └── galaxy_coordinates.json
├── scripts/                   # Python data pipeline
│   ├── enrich_data.py
│   ├── generate_embeddings.py
│   ├── build_index.py
│   └── precompute_analytics.py
├── src/                       # React frontend
│   ├── App.tsx
│   └── components/
│       ├── SemanticSearch.tsx
│       ├── GalaxyView.tsx
│       ├── Analytics.tsx
│       ├── AIBookChat.tsx
│       ├── TasteFinder.tsx
│       └── Architecture.tsx
├── public/
│   └── data/                  # Runtime data files
├── requirements.txt           # Python dependencies
├── package.json               # Node.js dependencies
└── SPEC.md                    # Full specification
```

## 🏗️ Deployment

### Deploy to website-ai-with-zach

```bash
# Build the React app
npm run build

# Deploy to website
npm run deploy
```

This copies the build to `../website-ai-with-zach/public/smart-books-ai/`

## 🔧 Configuration

### Environment Variables

For the Netlify functions (in Netlify dashboard):
- `ANTHROPIC_API_KEY` - Your Anthropic API key for AI chat

### Embedding Model

The default model is `all-MiniLM-L6-v2` (384 dimensions). To change:

```python
# In scripts/generate_embeddings.py
MODEL_NAME = 'all-MiniLM-L6-v2'  # Change to desired model
```

## 📊 Data Pipeline Details

### Stage 1: Enrichment
Joins your Goodreads export with Kaggle metadata using a waterfall strategy:
1. **ISBN Match** (high precision)
2. **Title + Author Match** (high recall for unmatched)

### Stage 2: Embeddings
Generates 384-dimensional vectors for each book using:
- Title
- Author
- Series (if available)
- Description
- Top 5 genres

### Stage 3: ChromaDB Index
Creates a persistent vector store with:
- Cosine similarity metric
- Metadata filtering support
- ~100ms query latency

### Stage 4: Analytics
Pre-computes:
- Reading timeline
- Genre breakdown
- Rating distribution
- UMAP 3D coordinates for Galaxy View

## 🎨 Design Theme

**Futuristic Galactic** - A polished, premium aesthetic inspired by the concept of navigating through vector space:
- Deep space color palette (cosmic purples, nebula blues)
- 3D book visualization as stars in a galaxy
- Smooth animations and glassmorphism effects

## 📝 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- [LlamaIndex](https://www.llamaindex.ai/) - RAG framework
- [ChromaDB](https://www.trychroma.com/) - Vector database
- [Sentence Transformers](https://www.sbert.net/) - Embedding models
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/) - 3D rendering
- [Goodreads](https://www.goodreads.com/) - Book data export
- [Kaggle Best Books Ever](https://www.kaggle.com/datasets/thedevastator/comprehensive-overview-of-52478-goodreads-best-b) - Metadata source

---

Built with ❤️ using agentic AI coding
