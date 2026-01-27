#!/usr/bin/env python3
"""
Stage 3: ChromaDB Index Building
Creates a persistent ChromaDB vector store for semantic search.
Uses LlamaIndex for RAG orchestration.
"""
import json
import shutil
from pathlib import Path

# --- CONFIGURATION ---
DATA_DIR = Path(__file__).parent.parent / 'data'
INPUT_FILE = DATA_DIR / 'library_with_embeddings.json'
CHROMA_DIR = DATA_DIR / 'chroma_db'
COLLECTION_NAME = 'smart_books'

def run_pipeline():
    print("=" * 60)
    print("🗄️ SmartBooks AI - ChromaDB Index Builder")
    print("=" * 60)
    
    # Load embeddings
    print(f"\n[1/4] Loading embeddings...")
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        books = json.load(f)
    
    books_with_embeddings = [b for b in books if b.get('embedding') is not None]
    print(f"   ✓ Loaded {len(books)} books, {len(books_with_embeddings)} with embeddings")
    
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
        
        # Store metadata for filtering
        metadatas.append({
            'title': book['title'],
            'author': book['author'],
            'my_rating': book['my_rating'],
            'avg_rating': book['avg_rating'],
            'shelf': book['shelf'],
            'date_read': book['date_read'] or '',
            'pages': book['pages'] or 0,
            'year_published': book['year_published'] or 0,
            'genres': book['genres'],
            'cover_url': book['cover_url'] or '',
            'series': book['series'] or ''
        })
    
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
    
    # Quick test query
    test_results = collection.query(
        query_texts=["science fiction space adventure"],
        n_results=3
    )
    print(f"   ✓ Test query returned {len(test_results['ids'][0])} results")
    
    print("\n" + "=" * 60)
    print("✅ Index Building Complete!")
    print("=" * 60)
    print(f"\n📊 Results:")
    print(f"   • Documents indexed: {count}")
    print(f"   • Collection name:   {COLLECTION_NAME}")
    print(f"   • Similarity metric: cosine")
    print(f"\n📁 ChromaDB saved to: {CHROMA_DIR}")
    
    return collection

if __name__ == "__main__":
    run_pipeline()
