#!/usr/bin/env python3
"""
Stage 3: ChromaDB Index Building (v2 - New Schema)
Creates a persistent ChromaDB vector store with unified book index (read + unread).
"""
import json
import shutil
from pathlib import Path

# --- CONFIGURATION ---
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / 'data'
INPUT_FILE = DATA_DIR / 'library_with_embeddings.json'
CHROMA_DIR = DATA_DIR / 'chroma_db'
COLLECTION_NAME = 'smart_books'

def run_pipeline():
    print("=" * 70)
    print("🗄️ SmartBooks AI - ChromaDB Index Builder (v2)")
    print("=" * 70)
    
    # Load embeddings
    print(f"\n[1/4] Loading embeddings...")
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        books = json.load(f)
    
    books_with_embeddings = [b for b in books if b.get('embedding') is not None]
    books_read = [b for b in books_with_embeddings if b.get('is_read')]
    books_unread = [b for b in books_with_embeddings if not b.get('is_read')]
    
    print(f"   ✓ Loaded {len(books)} books")
    print(f"      - With embeddings: {len(books_with_embeddings)}")
    print(f"      - Read:            {len(books_read)}")
    print(f"      - Unread:          {len(books_unread)}")
    
    # Initialize ChromaDB
    print(f"\n[2/4] Initializing ChromaDB...")
    import chromadb
    from chromadb.config import Settings
    
    # Remove existing DB if present (for clean rebuild)
    if CHROMA_DIR.exists():
        print(f"   ⚠ Removing existing database at {CHROMA_DIR}")
        shutil.rmtree(CHROMA_DIR)
    
    # Create persistent client
    client = chromadb.PersistentClient(
        path=str(CHROMA_DIR),
        settings=Settings(anonymized_telemetry=False)
    )
    
    # Create collection
    collection = client.create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"}  # Use cosine similarity
    )
    print(f"   ✓ Created collection: {COLLECTION_NAME}")
    
    # Add documents to ChromaDB
    print(f"\n[3/4] Adding {len(books_with_embeddings)} books to index...")
    
    # Prepare data for batch insert
    ids = []
    embeddings = []
    documents = []
    metadatas = []
    
    for book in books_with_embeddings:
        ids.append(book['id'])
        embeddings.append(book['embedding'])
        documents.append(book.get('description', '') or '')
        
        # Store metadata for filtering (ChromaDB doesn't accept None values)
        metadata = {
            'title': str(book.get('title', '')),
            'author': str(book.get('author', '')),
            'isbn': str(book.get('isbn', '')),
            'my_rating': int(book.get('my_rating') or 0),
            'avg_rating': float(book.get('avg_rating') or 0.0),
            'shelf': str(book.get('shelf', 'unread')),
            'is_read': 'true' if book.get('is_read') else 'false',
            'date_read': str(book.get('date_read') or ''),
            'pages': int(book.get('pages') or 0),
            'year_published': int(book.get('year_published') or 0),
            'genres': str(book.get('genres', '[]')),
            'genre_primary': str(book.get('genre_primary', 'Unknown')),
            'cover_url': str(book.get('cover_url') or ''),
            'popularity_score': int(book.get('popularity_score') or 0)
        }
        metadatas.append(metadata)
    
    # Batch insert (ChromaDB handles batching internally)
    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas
    )
    
    print(f"   ✓ Added {len(ids)} documents to index")
    
    # Verify
    print(f"\n[4/4] Verifying index...")
    count = collection.count()
    print(f"   ✓ Index contains {count} documents")
    
    # Quick test queries
    print(f"\n   Testing semantic search...")
    test_results = collection.query(
        query_texts=["science fiction space adventure"],
        n_results=3
    )
    print(f"   ✓ General query returned {len(test_results['ids'][0])} results")
    
    # Test filtering by read status
    read_results = collection.query(
        query_texts=["productivity and time management"],
        n_results=5,
        where={"is_read": "true"}
    )
    print(f"   ✓ Read-only query returned {len(read_results['ids'][0])} results")
    
    print("\n" + "=" * 70)
    print("✅ Index Building Complete!")
    print("=" * 70)
    print(f"\n📊 Results:")
    print(f"   • Documents indexed: {count}")
    print(f"      - Read books:     {len(books_read)}")
    print(f"      - Unread books:   {len(books_unread)}")
    print(f"   • Collection name:   {COLLECTION_NAME}")
    print(f"   • Similarity metric: cosine")
    print(f"\n📁 ChromaDB saved to: {CHROMA_DIR}")
    print(f"\n💡 Tip: Use is_read filter to search only your read books")
    print(f"   or search all books for better semantic recommendations!")
    
    return collection

if __name__ == "__main__":
    run_pipeline()
