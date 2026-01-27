# Project Specification: SmartBooks AI
*A RAG-powered book recommendation & analytics platform*

## 1. Project Overview

**SmartBooks AI** transforms a static Goodreads export into an intelligent book discovery platform. It combines semantic search, visual analytics, and AI-powered recommendations to help users explore their reading taste and discover their next great read.

### Mission
Build a production-grade RAG application that:
1. **Teaches**: Demonstrates modern AI/ML retrieval patterns (LlamaIndex, ChromaDB, Sentence Transformers, BM25)
2. **Delights**: Provides beautiful, interactive analytics about reading behavior
3. **Delivers**: Offers genuinely useful book recommendations via semantic search and LLM reasoning

---

## 2. Architecture

### Tech Stack Overview
```
┌─────────────────────────────────────────────────────────┐
│  website-ai-with-zach (Astro + Netlify)                │
│  ├─ /public/smart-books-ai/ (React SPA)                │
│  │  ├─ /data/                                           │
│  │  │  ├─ enriched_library.json                        │
│  │  │  └─ analytics_precomputed.json                   │
│  │  └─ index.html (React app entry)                    │
│  │                                                      │
│  └─ /netlify/functions/                                │
│     ├─ books-semantic-search.js                        │
│     ├─ books-ai-chat.js                                │
│     └─ books-recommend.js                              │
│                                                         │
│  API calls from React → Netlify Functions              │
│  Functions access ChromaDB (hosted) or vector index    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  smart-books-ai (Standalone Repo)                      │
│  ├─ /data/                                             │
│  │  ├─ goodreads_library_export.csv (502 books)       │
│  │  └─ books_1.Best_Books_Ever.csv (63k books)        │
│  │                                                     │
│  ├─ /scripts/                                          │
│  │  ├─ 1_enrich_data.py (Waterfall enrichment)        │
│  │  ├─ 2_generate_embeddings.py (Sentence Transformers)│
│  │  ├─ 3_build_index.py (ChromaDB + LlamaIndex)       │
│  │  └─ 4_precompute_analytics.py (Charts data)        │
│  │                                                     │
│  ├─ /src/ (React App - similar to StrideAI)           │
│  │  ├─ App.tsx (Main app with tabs)                   │
│  │  └─ components/                                     │
│  │     ├─ SemanticSearch.tsx                          │
│  │     ├─ GalaxyView.tsx (3D with Three.js)           │
│  │     ├─ Analytics.tsx (3 charts)                    │
│  │     ├─ AIBookChat.tsx (stateless)                  │
│  │     ├─ TasteFinder.tsx                             │
│  │     └─ Architecture.tsx (Tech explainer)           │
│  │                                                     │
│  └─ deploy-to-website.js (Copy build to website)      │
└─────────────────────────────────────────────────────────┘
```

### Key Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **RAG Framework** | LlamaIndex | Orchestrates retrieval, chunking, metadata filtering |
| **Vector Store** | ChromaDB (persistent) | Stores embeddings, enables semantic search |
| **Embeddings** | Sentence Transformers (`all-MiniLM-L6-v2`) | Local, privacy-preserving, quality embeddings |
| **Hybrid Search** | BM25 (via LlamaIndex) | Lexical search for exact keyword matching |
| **LLM** | Anthropic Claude 3.5 Sonnet | Powers conversational recommendations |
| **Frontend** | React + TypeScript | Same pattern as StrideAI |
| **Charts** | Recharts | Interactive visualizations |
| **API Layer** | Netlify Functions | Serverless endpoints |
| **Hosting** | Netlify (via website-ai-with-zach) | Static site + functions |

---

## 3. Data Pipeline

### Inputs
- **User Library**: `goodreads_library_export.csv` (502 books)
- **Metadata Source**: `books_1.Best_Books_Ever.csv` (63,700 books)

### Pipeline Steps

#### **Stage 1: Enrichment** (`1_enrich_data.py`)
Waterfall join strategy to maximize metadata coverage:
1. Clean ISBNs (`="1234567890123"` → `1234567890123`)
2. Normalize author names (`"King, Stephen"` → `"Stephen King"`)
3. **Pass 1**: Join on `ISBN13` (high precision)
4. **Pass 2**: Join on `Title + Author` (high recall)
5. Output: `enriched_library.csv`

#### **Stage 2: Embedding Generation** (`2_generate_embeddings.py`)
```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')

for book in enriched_library:
    # Combine fields for rich semantic representation
    text = f"{book['Title']} by {book['Author']}. {book['description']}. Genres: {book['genres']}"
    book['embedding'] = model.encode(text)
```

**Why `all-MiniLM-L6-v2`?**
- ✅ Runs locally (privacy)
- ✅ Fast inference (~50ms per book)
- ✅ Good quality for book descriptions
- ✅ Widely used in production RAG systems

#### **Stage 3: Index Building** (`3_build_index.py`)
```python
import chromadb
from llama_index.core import VectorStoreIndex, Document
from llama_index.vector_stores.chroma import ChromaVectorStore

# Initialize ChromaDB
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection("books")

# Create LlamaIndex vector store
vector_store = ChromaVectorStore(chroma_collection=collection)

# Build index with metadata filtering
documents = [
    Document(
        text=book['description'],
        metadata={
            'title': book['Title'],
            'author': book['Author'],
            'my_rating': book['My Rating'],
            'shelf': book['Exclusive Shelf'],
            'genres': book['genres'],
            'cover_url': book['coverImg']
        }
    )
    for book in enriched_library
]

index = VectorStoreIndex.from_documents(documents, vector_store=vector_store)
```

**Benefits of LlamaIndex:**
- Handles chunking automatically (for long descriptions)
- Built-in hybrid search (vector + BM25)
- Metadata filtering (e.g., "only to-read books")
- Easy integration with LLMs for RAG

#### **Stage 4: Analytics Pre-computation** (`4_precompute_analytics.py`)
Generate static JSON for fast chart rendering:
- Reading timeline data
- Genre distributions
- Rating trends
- UMAP/PCA coordinates for Galaxy View
- Author statistics

Output: `analytics_precomputed.json` (served from /public/smart-books-ai/data/)

---

## 4. Application Features

### 🎨 Design Theme: Futuristic Galactic

**Visual Language:**
- **Color Palette**: Deep space blacks, cosmic purples, nebula blues, starburst whites
- **Typography**: Clean, modern sans-serif (Inter or Space Grotesk)
- **Animations**: Smooth transitions, particle effects, gentle glow/pulse on hover
- **Metaphor**: "Navigate your reading universe" - books as stars, genres as galaxies
- **Polish Level**: Premium dashboard aesthetic (think Stripe/Linear, not sci-fi game)

**Key Visual Elements:**
- Gradient backgrounds (deep blue → purple → black)
- Glassmorphism cards with subtle blur
- Glowing accents on interactive elements
- Particle effects for loading states
- Smooth 3D camera movements in Galaxy View

**Not too gimmicky**: The theme enhances understanding (3D space = vector space) without being cartoonish

---

### 📱 Frontend App (React SPA)

#### **Tab 1: Semantic Search** 🔍
- **Input**: Natural language query (e.g., "cozy mystery with quirky characters")
- **Action**: Calls `/api/books-semantic-search` Netlify function
- **Display**: 
  - Top 10 results with similarity scores
  - Book covers, titles, authors
  - Badges: `✅ Read (4★)` or `🆕 To-Read`
  - Expandable description
  - "Why this matches" AI explanation

**Technical Implementation:**
```typescript
// SemanticSearch.tsx
const handleSearch = async (query: string) => {
  const response = await fetch('/.netlify/functions/books-semantic-search', {
    method: 'POST',
    body: JSON.stringify({ query, filters: { shelf: 'to-read' } })
  });
  const results = await response.json();
  setSearchResults(results.matches);
};
```

#### **Tab 2: Galaxy View** 🌌
- **Visualization**: Interactive **3D scatter plot** (React Three Fiber / Three.js)
  - Fallback to 2D if performance issues
- **Data**: UMAP-reduced embeddings (502 points in 3D space)
- **Styling**: 
  - **Futuristic galactic theme**: Books as glowing particles/stars
  - Color by rating: 5★ (gold supernova), 4★ (blue giant), 3★ (white dwarf), unread (nebula)
  - Size by page count (larger = longer books)
  - Connecting lines between similar books (optional, can toggle)
- **Interactions**:
  - Orbit controls: Rotate, zoom, pan through your reading universe
  - Hover: Show book title + author overlay
  - Click: Open detailed modal with cover + description
  - "Fly to" animation when selecting from search
- **Background**: Deep space with subtle star field
- **Performance**: LOD (Level of Detail) optimization for 500+ points

**Insight**: Reveals "taste clusters" in 3D space - books you loved are gravitationally grouped by theme/style, creating galaxies of genres

#### **Tab 3: Analytics Dashboard** 📊

**Priority Charts (Phase 1):**

1. **Reading Timeline** (Line chart)
   - Books read per month/year
   - Trend line showing reading velocity
   - Galactic-themed: Constellation line connecting points

2. **Genre Breakdown** (Donut chart)
   - Top 10 genres by volume
   - Orbital rings visualization
   - Interactive: Click to filter other views

3. **Rating Distribution** (Bar chart)
   - Histogram of 1-5 star ratings
   - Star field density visualization
   - Shows you're a "tough critic" or "generous reader"

**Future Enhancement Charts (Phase 5):**

4. **Rating Trends Over Time** (Line chart)
   - Average rating per year
   - Answer: "Am I getting more critical?"

5. **Author Loyalty** (Bar chart)
   - Authors with 3+ books read
   - Shows your "go-to" authors

6. **Page Count Analysis** (Scatter plot)
   - Page count vs. rating
   - Do you prefer doorstoppers or novellas?

7. **Genre Affinity Heatmap**
   - Genres × Average Rating
   - Which genres do you rate highest?

8. **Reading Diversity Score**
   - Shannon entropy across genres
   - Gamified "diversity meter"

9. **Pace Analysis**
   - Days between finishes
   - Identify reading sprints vs. droughts

10. **To-Read Prioritization**
    - Oldest unread books
    - Books matching your 5★ taste

**Data Source**: All charts load from `/data/analytics_precomputed.json` (no API calls needed)

#### **Tab 4: AI Book Chat** 💬
- **Feature**: Conversational interface to discuss books
- **Example Queries**:
  - "What should I read if I loved 'Project Hail Mary'?"
  - "Recommend a book for a 10-hour flight"
  - "What are my reading blindspots?"
- **Implementation (Phase 1)**: **Stateless Q&A**
  - Each query is independent
  - No conversation memory
  - Fast, simple, effective
- **Technical**:
  - Uses LlamaIndex QueryEngine
  - Retrieves relevant books via semantic search
  - Passes context to Claude 3.5 Sonnet
  - Streams response back to UI

**API Call:**
```typescript
const response = await fetch('/.netlify/functions/books-ai-chat', {
  method: 'POST',
  body: JSON.stringify({ 
    message: "Recommend a sci-fi I haven't read"
    // No conversation_history in Phase 1
  })
});
```

**Future Enhancement (Phase 5)**: Add conversation memory for multi-turn dialogues

#### **Tab 5: Taste Finder ("Surprise Me")** ✨
- **Goal**: Recommend unread books that match your proven taste
- **Algorithm**:
  1. Filter user's 5★ books
  2. Calculate centroid vector (average embedding)
  3. Search for nearest neighbors
  4. **Hard filter**: Must be on `to-read` shelf
  5. Return top 5 with AI-generated "Why you'll love this"
- **UI**: 
  - Cosmic reveal animation (particle convergence)
  - "Try Again" button for variety
  - Visual: Show centroid point + nearby books in mini 3D view
  - Save favorite recommendations

#### **Tab 6: Architecture** 🔬
*Tech Explainer Page*

**Purpose**: Visualize and explain the RAG architecture + vector space indexing

**Sections:**

1. **The Tech Stack** (Top of page)
   - Visual diagram showing data flow: CSV → Embeddings → ChromaDB → LlamaIndex → Claude
   - Interactive: Click each component to see details
   - Tech badges: Python, React, Netlify, Anthropic, ChromaDB

2. **Data Pipeline Visualization** 
   - Animated flowchart showing 4 stages:
     ```
     📁 Raw Data → 🧹 Enrichment → 🧠 Embeddings → 🗄️ Index → 🔍 Search
     ```
   - Show actual metrics: "502 books → 487 enriched (97%) → 512-dim vectors"
   - Progress bars for each stage

3. **Understanding Vector Embeddings**
   - **Visual**: Take 3 sample books, show their raw text, then their position in 2D/3D space
   - Example: "Project Hail Mary", "The Martian", "Ready Player One" cluster together
   - Interactive slider: Adjust similarity threshold, watch results change
   - Explanation: "Books with similar themes get similar numbers"

4. **How Semantic Search Works**
   - Side-by-side comparison:
     - Left: Traditional keyword search (misses synonyms)
     - Right: Vector search (finds conceptual matches)
   - Live demo: Input query, watch it get embedded, see nearest neighbors light up in mini galaxy
   - Show actual similarity scores

5. **The RAG Process** (Animated diagram)
   ```
   User Query
      ↓
   [1] Embed Query → Vector
      ↓
   [2] Search ChromaDB → Top 10 Books
      ↓
   [3] Build Prompt with Context
      ↓
   [4] Claude Generates Response
      ↓
   Answer with Sources
   ```
   - Each step expands on click to show technical details
   - Code snippets (syntax highlighted)

6. **3D Vector Space Explained**
   - Interactive 3D visualization showing:
     - How 512 dimensions get compressed to 3D (UMAP)
     - Why distance = similarity
     - Rotating cube showing different "slices" of the space
   - Analogy: "Like GPS coordinates, but for book themes"

7. **Performance Metrics Dashboard**
   - Live stats:
     - Index size: 502 books, 487 with embeddings
     - Average query time: <200ms
     - Storage: 12MB ChromaDB
     - Model: all-MiniLM-L6-v2 (512 dimensions)
   - Chart: Query latency distribution

8. **Try It Yourself** (Interactive sandbox)
   - Input custom text, see its embedding
   - Click 2 books, see their cosine similarity
   - Adjust search parameters, see how results change

**Design**: 
- Futuristic but educational
- Heavy use of animations (but skippable/accessible)
- Code blocks for developers
- Plain language explanations for non-technical users
- Can be used as a portfolio piece to demonstrate RAG knowledge

**Goal**: Make the "black box" transparent and impressive

---

## 5. API Layer (Netlify Functions)

### **Endpoint 1: `/books-semantic-search`**
**Request:**
```json
{
  "query": "fast-paced thrillers with unreliable narrators",
  "filters": {
    "shelf": "to-read",
    "min_rating": 4.0
  },
  "top_k": 10
}
```

**Response:**
```json
{
  "matches": [
    {
      "title": "Gone Girl",
      "author": "Gillian Flynn",
      "similarity": 0.89,
      "rating": 4.5,
      "shelf": "read",
      "cover_url": "https://...",
      "description": "...",
      "match_explanation": "Strong match on 'unreliable narrator' theme..."
    }
  ],
  "query_time_ms": 45
}
```

**Implementation:**
```javascript
// netlify/functions/books-semantic-search.js
const { LlamaIndex } = require('llamaindex');

exports.handler = async (event) => {
  const { query, filters, top_k = 10 } = JSON.parse(event.body);
  
  // Load index (cached in function memory)
  const index = await loadOrInitializeIndex();
  
  // Retrieve with hybrid search
  const retriever = index.asRetriever({ 
    similarityTopK: top_k,
    filters: filters 
  });
  
  const results = await retriever.retrieve(query);
  
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ matches: results })
  };
};
```

### **Endpoint 2: `/books-ai-chat`**
**Request:**
```json
{
  "message": "I loved 'The Martian'. What should I read next?",
  "conversation_history": []
}
```

**Response:**
```json
{
  "response": "Based on your love of The Martian, I'd recommend...",
  "sources": [
    { "title": "Project Hail Mary", "relevance": 0.92 },
    { "title": "Artemis", "relevance": 0.87 }
  ]
}
```

**Implementation:**
```javascript
// netlify/functions/books-ai-chat.js
const Anthropic = require('@anthropic-ai/sdk');
const { queryEngine } = require('./shared/llamaindex-setup');

exports.handler = async (event) => {
  const { message, conversation_history } = JSON.parse(event.body);
  
  // Retrieve relevant books
  const context = await queryEngine.query(message);
  
  // Build prompt with context
  const prompt = buildRAGPrompt(message, context, conversation_history);
  
  // Call Anthropic
  const anthropic = new Anthropic({ 
    apiKey: process.env.ANTHROPIC_API_KEY 
  });
  
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }]
  });
  
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      response: response.content[0].text,
      sources: context.sourceNodes
    })
  };
};
```

### **Endpoint 3: `/books-recommend`**
**Request:**
```json
{
  "strategy": "surprise_me",
  "filters": { "shelf": "to-read" }
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "title": "Station Eleven",
      "author": "Emily St. John Mandel",
      "match_score": 0.94,
      "reasoning": "This matches your love of literary sci-fi like 'The Road'..."
    }
  ]
}
```

---

## 6. Deployment Architecture

### Development Workflow
```bash
# In smart-books-ai repo
npm run build              # Build React app
npm run deploy             # Copy to website-ai-with-zach/public/smart-books-ai/
```

### Website Integration
```javascript
// deploy-to-website.js (mirrors StrideAI pattern)
const fs = require('fs-extra');
const path = require('path');

const sourceBuild = './build';
const websitePath = '../website-ai-with-zach/public/smart-books-ai';

// Clean and copy
fs.emptyDirSync(websitePath);
fs.copySync(sourceBuild, websitePath);

console.log('✅ Deployed to website-ai-with-zach');
```

### Netlify Functions Setup
1. Add functions to `website-ai-with-zach/netlify/functions/`
2. Install Python dependencies:
   ```toml
   # netlify.toml
   [functions]
   node_bundler = "esbuild"
   
   [[plugins]]
   package = "@netlify/plugin-python"
   
   [build.environment]
   PYTHON_VERSION = "3.9"
   ```

3. Add env vars in Netlify dashboard:
   - `ANTHROPIC_API_KEY` (already configured from StrideAI)
   - `CHROMA_HOST` (if using hosted ChromaDB)

### ChromaDB Hosting Options

**Option A: Embedded (Simple MVP)**
- Bundle ChromaDB index as static files
- Load in-memory on first function call
- ⚠️ 300ms+ cold start

**Option B: Chroma Cloud (Production)**
- Use hosted ChromaDB (https://www.trychroma.com/cloud)
- Fast persistent queries
- ✅ Recommended for production

**Option C: Self-hosted (Advanced)**
- Deploy ChromaDB to Railway/Render
- Connect via API

**Decision**: Use **Option A (Embedded)** for free hosting and simplicity

---

## 7. Engineering Standards

### Performance Targets
- **Search Latency**: <500ms (including LLM time)
- **Page Load**: <2s (analytics cached)
- **Galaxy View**: 60 FPS interactions

### Privacy & Security
- ✅ **Embeddings**: Generated locally (Sentence Transformers)
- ✅ **User Data**: Never sent to external training APIs
- ⚠️ **Anthropic API**: Query text sent to Claude (acceptable since Goodreads data is public)
- ✅ **Data Storage**: Static files only, no user authentication needed

### Code Quality
- **TypeScript**: Strict mode enabled
- **Testing**: React Testing Library for components
- **Linting**: ESLint + Prettier (consistent with StrideAI)

### Reproducibility
- All scripts are idempotent
- Requirements.txt for Python deps
- package.json for Node deps
- Clear README with setup steps

---

## 8. Success Metrics

### Technical Goals
- [x] Build production RAG pipeline with LlamaIndex
- [x] Implement hybrid search (vector + BM25)
- [x] Integrate Anthropic API for chat
- [x] Deploy to live website

### User Experience Goals
- [x] Search quality: >80% relevant results in top 5
- [x] Visual appeal: Modern, polished UI matching StrideAI aesthetic
- [x] Performance: <1s average query time
- [x] Insights: 10+ meaningful analytics charts

### Learning Goals
- [x] Understand RAG patterns (retrieval → augment → generate)
- [x] Master LlamaIndex framework
- [x] Experience ChromaDB in production
- [x] Implement hybrid search strategies

---

## 9. Project Phases

### **Phase 1: Data Pipeline** (MVP Foundation)
- [ ] Script 1: Enrichment pipeline
- [ ] Script 2: Embedding generation
- [ ] Script 3: ChromaDB index building
- [ ] Script 4: Analytics pre-computation
- [ ] Validation: >90% metadata coverage

### **Phase 2: Core Search** (RAG Implementation)
- [ ] Netlify function: Semantic search
- [ ] Netlify function: AI chat (with RAG)
- [ ] React component: Search UI
- [ ] React component: Chat interface
- [ ] Test: Search quality validation

### **Phase 3: Visual Features** (Analytics & Galaxy View)
- [ ] React component: Analytics dashboard (3 priority charts)
  - [ ] Reading Timeline (with constellation theme)
  - [ ] Genre Breakdown (orbital rings)
  - [ ] Rating Distribution (star field)
- [ ] React component: Galaxy View (3D with Three.js, fallback to 2D if needed)
- [ ] React component: Taste Finder (with mini 3D preview)
- [ ] React component: Architecture page (tech explainer with animations)
- [ ] Polish: Futuristic galactic theme, responsive design

### **Phase 4: Integration & Launch** (Deployment)
- [ ] Main App.tsx with tab navigation (mirroring StrideAI)
- [ ] Deploy script to website-ai-with-zach
- [ ] Add to /demos page
- [ ] Create demo video
- [ ] Write blog post

### **Phase 5: Enhancements** (Future)
- [ ] Add remaining 7 analytics charts
- [ ] Conversation memory for AI chat (multi-turn dialogue)
- [ ] Share/export recommendations
- [ ] Multi-user support (upload Goodreads CSV)
- [ ] Genre-specific embeddings
- [ ] Integration with library APIs (check availability)
- [ ] Mobile-optimized views
- [ ] VR mode for Galaxy View (WebXR)

---

## 10. Dependencies

### Python (`requirements.txt`)
```txt
pandas==2.0.3
sentence-transformers==2.2.2
chromadb==0.4.15
llama-index==0.9.0
llama-index-vector-stores-chroma==0.1.3
scikit-learn==1.3.1
umap-learn==0.5.4
numpy==1.24.3
```

### Node.js (`package.json`)
```json
{
  "name": "smart-books-ai",
  "version": "1.0.0",
  "homepage": "/smart-books-ai",
  "dependencies": {
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "typescript": "^4.9.5",
    "recharts": "^3.1.2",
    "lucide-react": "^0.542.0",
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.92.0",
    "three": "^0.160.0",
    "framer-motion": "^10.16.0"
  },
  "devDependencies": {
    "react-scripts": "5.0.1",
    "fs-extra": "^11.3.1",
    "@types/three": "^0.160.0"
  }
}
```

### Netlify Function Dependencies
- `@anthropic-ai/sdk` (already installed in website)
- `llamaindex` (Node.js version)
- `chromadb-client` (if using hosted Chroma)

---

## 11. FAQ

### Q: How difficult is it to build and host an API like this?

**A: Surprisingly straightforward with Netlify!**

**Difficulty**: 🟢 Beginner-friendly
- Netlify Functions are just JavaScript files in a folder
- No server config, no Docker, no DevOps headaches
- You already have the pattern working with `anthropic-generate-plan.js`

**Development Time**: 
- First endpoint: ~1 hour (learning curve)
- Additional endpoints: ~15 min each
- Total API layer: ~2-3 hours

**Key Benefits**:
- Serverless: Auto-scales, pay-per-use
- Local testing: `netlify dev` runs functions locally
- Environment vars: Managed in Netlify dashboard
- CORS: Built-in support

**What you'll add**:
```
netlify/functions/
├── anthropic-generate-plan.js (✅ already exists)
├── books-semantic-search.js (➕ new - 50 lines)
├── books-ai-chat.js (➕ new - 80 lines)
└── books-recommend.js (➕ new - 40 lines)
```

Each function is self-contained, easy to test, and follows the same pattern you've already implemented.

---

### Q: What about privacy/data sharing?

**A: Embeddings are public-safe, LLM calls are auditable**

**Embeddings (Sentence Transformers)**:
- ✅ Generated **locally** on your machine
- ✅ Never sent to external services
- ✅ Safe to host publicly (they're just numbers representing book themes)
- ✅ Can't reverse-engineer original text from embeddings

**Anthropic API Calls**:
- ⚠️ Query text + retrieved book descriptions sent to Claude
- ✅ **BUT**: This data is already public (Goodreads/Kaggle)
- ✅ Anthropic doesn't train on API data (per their policy)
- ✅ Your personal ratings are NOT sent (only book metadata)

**What's shared in API calls**:
```
SENT TO ANTHROPIC:
- User query: "fast-paced space opera"
- Retrieved context: Book titles, descriptions, genres (public data)

NOT SENT:
- Your personal ratings
- Date read timestamps
- Private notes/annotations
```

**Conclusion**: You're just asking an LLM about publicly available books. Your personal reading history stays private.

---

### Q: Can I see examples from StrideAI?

**A: Yes! Here's the parallel structure:**

| StrideAI | SmartBooks AI | Purpose |
|----------|---------------|---------|
| `AICoach.tsx` | `AIBookChat.tsx` | LLM-powered recommendations |
| `ThePulse.tsx` | `Analytics.tsx` | Dashboard with charts |
| `SeasonStats.tsx` | `GalaxyView.tsx` | Visual exploration |
| `PerformanceLab.tsx` | `SemanticSearch.tsx` | Data-driven insights |
| N/A | `Architecture.tsx` | **NEW**: Tech explainer page |
| N/A | `TasteFinder.tsx` | **NEW**: Centroid-based discovery |
| `/data/activities_mapped.json` | `/data/enriched_library.json` | Pre-processed data |
| `/.netlify/functions/anthropic-generate-plan.js` | `/.netlify/functions/books-ai-chat.js` | AI API endpoint |

The architecture is nearly identical - just different domain data + 3D visualization!

---

## 12. Next Steps

### Immediate Actions (Before Building)
1. ✅ Review this spec - any questions/changes?
2. ⏭️ Run Stage 1 pipeline (enrichment) to validate data quality
3. ⏭️ Set up Python environment: `pip install -r requirements.txt`
4. ⏭️ Create React app scaffold (mirroring StrideAI)
5. ⏭️ Build Stage 2-4 pipelines (embeddings, index, analytics)

### ✅ Confirmed Decisions
- ✅ **ChromaDB hosting**: Embedded (free, simple)
- ✅ **Chart priorities**: Top 3 first, document remaining 7 for Phase 5
- ✅ **AI Chat**: Stateless Q&A for MVP, document conversation memory as future enhancement
- ✅ **Galaxy View**: Try 3D first (Three.js), fallback to 2D if performance issues
- ✅ **Design Theme**: Futuristic galactic (polished, not gimmicky)
- ✅ **New Feature**: "Architecture" tech explainer page with RAG visualizations

---

## 13. Appendix

### Glossary
- **RAG**: Retrieval-Augmented Generation - pattern where LLMs get context via search
- **Embeddings**: Numerical vectors representing semantic meaning
- **Hybrid Search**: Combining vector similarity + keyword matching (BM25)
- **LlamaIndex**: Python framework for building RAG applications
- **ChromaDB**: Open-source vector database
- **Sentence Transformers**: Library for generating embeddings
- **Centroid**: Average vector (used in "Surprise Me" feature)
- **UMAP**: Dimensionality reduction (3D→2D) for visualization

### Related Resources
- [LlamaIndex Docs](https://docs.llamaindex.ai/)
- [ChromaDB Guide](https://docs.trychroma.com/)
- [Sentence Transformers Models](https://www.sbert.net/docs/pretrained_models.html)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)

---

**Version**: 2.0  
**Last Updated**: January 2026  
**Status**: Ready for Implementation 🚀
