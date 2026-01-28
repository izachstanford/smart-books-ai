# Book Processing Pipeline

**Purpose**: Enrich Goodreads library data, generate embeddings, and build semantic search index.

---

## Quick Start

```bash
# 1. Build base dataset + enrich (reuses cache)
python build_base_dataset.py
python enrich_books.py \
  --queue enrichment_queue_v1.csv \
  --books book_records_v3_backfilled_local.csv \
  --out book_records_v4_enriched.csv \
  --cache enrichment_cache.json \
  --user_agent "YourApp/1.0" \
  --sleep 0.5

# 2. Generate embeddings, index, and analytics
cd ..
source venv/bin/activate
python book-processing/generate_embeddings_v2.py
python book-processing/build_index_v2.py
python book-processing/precompute_analytics_v2.py

# 3. Copy outputs to public folder
cp data/*.json public/data/
```

---

## Files

### Core Scripts
- **`build_base_dataset.py`** - Merges Goodreads + Kaggle, generates enrichment queue
- **`enrich_books.py`** - Enriches books via Google Books + Open Library APIs
- **`generate_embeddings_v2.py`** - Creates vector embeddings with Sentence Transformers
- **`build_index_v2.py`** - Builds ChromaDB vector index
- **`precompute_analytics_v2.py`** - Generates analytics and 3D Galaxy coordinates

### Data Files
- **`enrichment_cache.json`** - API response cache (2MB, reusable)
- **`book_records_v4_enriched.csv`** - Final enriched dataset (~10MB)
- **`enrichment_queue_v1.csv`** - Books needing API enrichment
- **`book_records_v3_backfilled_local.csv`** - Base merged dataset

### Outputs (copied to `../data/`)
- `library_with_embeddings.json` - All books with embeddings (47MB)
- `analytics_data.json` - Charts data (10KB)
- `galaxy_coordinates.json` - 3D visualization coords (2.3MB)
- `chroma_db/` - Vector database

---

## Pipeline Stages

### 1. Build Base Dataset
**Input**: 
- `../data/goodreads_library_export.csv` (your read books)
- `../data/books_1.Best_Books_Ever.csv` (Kaggle corpus)

**Process**:
- Filter Goodreads to `read` shelf
- Mark with `is_read=True`
- Add quality-filtered Kaggle books as `is_read=False`
- Deduplicate, backfill metadata
- Generate stable `book_key` (ISBN → Goodreads ID → title+author hash)

**Output**: `book_records_v3_backfilled_local.csv` (~3800 books: 466 read + 3362 unread)

### 2. API Enrichment
**Input**: `enrichment_queue_v1.csv` (~877 books)

**Process**:
- Query Google Books API (primary)
- Fall back to Open Library API
- Cache all responses locally
- Backfill descriptions, genres, covers

**Output**: `book_records_v4_enriched.csv`

**Note**: Uses cache - re-runs are fast!

### 3. Generate Embeddings
**Model**: `all-MiniLM-L6-v2` (384 dims, local)

**Output**: `../data/library_with_embeddings.json` (47MB, ~3750 books with embeddings)

### 4. Build ChromaDB Index
**Database**: Persistent ChromaDB with cosine similarity

**Features**: Filter by `is_read`, genre, rating, etc.

**Output**: `../data/chroma_db/`

### 5. Precompute Analytics
**Process**:
- Reading timeline, genre breakdown, ratings
- UMAP 3D projection for Galaxy View

**Output**: 
- `../data/analytics_data.json`
- `../data/galaxy_coordinates.json`

---

## Data Schema

```typescript
{
  id: "isbn:XXX" | "gr:XXX" | "ta:XXX",  // Stable key
  title: string,
  author: string,
  is_read: boolean,                      // ⭐ Primary flag
  my_rating: number,                     // 0-5
  shelf: "read" | "unread",             // Derived from is_read
  date_read: string | null,
  description: string,
  genres: string,                        // JSON array
  genre_primary: string,                 // Coarse category
  cover_url: string,
  popularity_score: number,              // For ranking suggestions
  embedding: number[],                   // 384 dims
  ...
}
```

---

## Stats

**Current Dataset** (as of last run):
- Total books: 3,828
- Read: 466 (matches Goodreads!)
- Unread: 3,362
- With embeddings: 3,751 (98%)
- Data coverage: 81.7%

**Performance**:
- Base dataset: ~10s
- Enrichment: ~7min (first run), ~30s (cached)
- Embeddings: ~12s
- ChromaDB: ~3s
- Analytics: ~30s

---

## Troubleshooting

### Missing read books?
Check `book_key` generation - books without ISBN use Goodreads ID fallback.

### Enrichment fails?
- Increase `--sleep` to 0.75-1.0 for rate limiting
- Cache is saved, so re-runs skip completed books

### Out of memory?
- Reduce batch size in `generate_embeddings_v2.py`
- Process in chunks

---

## Updating Data

To refresh with new Goodreads books:
1. Export updated CSV from Goodreads
2. Replace `../data/goodreads_library_export.csv`
3. Re-run pipeline (cache makes it fast!)

---

## Archive

Old documentation and intermediate files moved to `archive/`:
- `APP_MIGRATION_GUIDE.md` - React app migration guide
- `PIPELINE.md` - Detailed pipeline walkthrough
- `STATUS.md` - Migration status log
