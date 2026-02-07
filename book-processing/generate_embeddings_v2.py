#!/usr/bin/env python3
"""
Stage 2: Embedding Generation (v2 - New Schema)
Generates vector embeddings using the unified book_records dataset.
Model: all-MiniLM-L6-v2 (384 dimensions, fast, quality balance)
"""
import pandas as pd
import numpy as np
import json
from pathlib import Path
from tqdm import tqdm

# --- CONFIGURATION ---
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / 'data'
INPUT_FILE = SCRIPT_DIR / 'book_records_v4_enriched.csv'
OUTPUT_FILE = DATA_DIR / 'library_with_embeddings.json'
MODEL_NAME = 'all-MiniLM-L6-v2'

def safe_year(val):
    """Safely convert year to int, handling various formats."""
    if pd.isna(val):
        return None
    try:
        # Try direct float->int conversion
        return int(float(val))
    except (ValueError, TypeError):
        # Handle date strings or other formats
        val_str = str(val)
        # Extract first 4-digit year if present
        import re
        match = re.search(r'\b(19|20)\d{2}\b', val_str)
        if match:
            return int(match.group())
        return None

def run_pipeline():
    print("=" * 70)
    print("🧠 SmartBooksAI - Embedding Generation (v2)")
    print("=" * 70)
    
    # Load enriched data
    print(f"\n[1/4] Loading book records...")
    df = pd.read_csv(INPUT_FILE, low_memory=False)
    print(f"   ✓ Loaded {len(df)} books")
    print(f"      - Read: {df['is_read'].sum()}")
    print(f"      - Unread: {(~df['is_read']).sum()}")
    
    # Filter to books with descriptions
    # Use description_for_embedding if available, else description_clean
    if 'description_for_embedding' in df.columns:
        df_with_desc = df[df['description_for_embedding'].notna() & (df['description_for_embedding'].str.len() > 50)].copy()
        embedding_col = 'description_for_embedding'
    else:
        df_with_desc = df[df['description_clean'].notna() & (df['description_clean'].str.len() > 50)].copy()
        embedding_col = 'description_clean'
    
    print(f"   ✓ {len(df_with_desc)} books have descriptions for embedding")
    
    # Load model
    print(f"\n[2/4] Loading Sentence Transformer model: {MODEL_NAME}")
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(MODEL_NAME)
    embedding_dim = model.get_sentence_embedding_dimension()
    print(f"   ✓ Model loaded (embedding dimension: {embedding_dim})")
    
    # Get embedding texts - add fallback for books without descriptions
    print(f"\n[3/4] Preparing texts for embedding...")
    
    def create_embedding_text(row):
        """Get embedding text, using title+author+genres as fallback."""
        # Try description first
        desc = row.get(embedding_col, '')
        if pd.notna(desc) and str(desc).strip() != '' and len(str(desc)) > 50:
            return str(desc)
        
        # Fallback: title + author + genres
        parts = []
        if pd.notna(row.get('title')):
            parts.append(str(row['title']))
        if pd.notna(row.get('author')):
            parts.append(f"by {str(row['author'])}")
        
        # Add genres if available
        genres_str = row.get('genres_list', '[]')
        try:
            genres = json.loads(genres_str) if isinstance(genres_str, str) else genres_str
            if genres and isinstance(genres, list):
                parts.append(f"Genres: {', '.join(genres[:3])}")
        except:
            pass
        
        return '. '.join(parts) if parts else 'Unknown book'
    
    # Create embedding texts for ALL books (not just those with descriptions)
    df['embedding_text_final'] = df.apply(create_embedding_text, axis=1)
    texts = df['embedding_text_final'].tolist()
    
    print(f"   ✓ Prepared {len(texts)} texts for embedding")
    print(f"     - With descriptions: {len(df_with_desc)}")
    print(f"     - Using fallback: {len(df) - len(df_with_desc)}")
    
    # Generate embeddings
    print(f"\n[4/4] Generating embeddings...")
    print(f"   (This may take a few minutes for {len(texts)} books)")
    
    # Batch encode for efficiency
    embeddings = model.encode(
        texts,
        batch_size=32,
        show_progress_bar=True,
        convert_to_numpy=True
    )
    
    print(f"   ✓ Generated {len(embeddings)} embeddings")
    
    # Prepare output data
    output_data = []
    
    # ALL books now have embeddings
    for idx, (_, row) in enumerate(df.iterrows()):
        # Parse genres
        genres_str = row.get('genres_list', '[]')
        try:
            genres = json.loads(genres_str) if isinstance(genres_str, str) else genres_str
        except:
            genres = []
        
        book_data = {
            'id': str(row['book_key']),
            'title': str(row['title']) if pd.notna(row['title']) else '',
            'author': str(row['author']) if pd.notna(row['author']) else '',
            'isbn': str(row.get('isbn', '')) if pd.notna(row.get('isbn')) else '',
            'my_rating': int(row['my_rating']) if pd.notna(row['my_rating']) else 0,
            'avg_rating': float(row['avg_rating']) if pd.notna(row['avg_rating']) else 0,
            'shelf': 'read' if row['is_read'] else 'unread',
            'is_read': bool(row['is_read']),
            'date_read': str(row['date_read']) if pd.notna(row['date_read']) else None,
            'pages': int(row.get('pages', 0)) if pd.notna(row.get('pages')) else None,
            'year_published': safe_year(row['publish_year']),
            'description': str(row['description_clean']) if pd.notna(row['description_clean']) else '',
            'genres': json.dumps(genres) if genres else '[]',
            'genre_primary': str(row.get('genre_primary', 'Unknown')) if pd.notna(row.get('genre_primary')) else 'Unknown',
            'cover_url': str(row['cover_image_url']) if pd.notna(row['cover_image_url']) else None,
            'popularity_score': int(row['popularity_score']) if pd.notna(row['popularity_score']) else 0,
            'embedding': embeddings[idx].tolist(),
            'embedding_text': str(row['embedding_text_final']) if pd.notna(row.get('embedding_text_final')) else ''
        }
        output_data.append(book_data)
    
    # Save to JSON
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2)
    
    # Stats
    books_with_embeddings = len([b for b in output_data if b['embedding'] is not None])
    books_read = len([b for b in output_data if b['is_read']])
    books_unread = len([b for b in output_data if not b['is_read']])
    
    print("\n" + "=" * 70)
    print("✅ Embedding Generation Complete!")
    print("=" * 70)
    print(f"\n📊 Results:")
    print(f"   • Total books:        {len(output_data)}")
    print(f"   • With embeddings:    {books_with_embeddings}")
    print(f"   • Without embeddings: {len(output_data) - books_with_embeddings}")
    print(f"   • Read books:         {books_read}")
    print(f"   • Unread books:       {books_unread}")
    print(f"   • Embedding model:    {MODEL_NAME}")
    print(f"   • Embedding dimension: {embedding_dim}")
    print(f"\n📁 Output saved to: {OUTPUT_FILE}")
    
    return output_data

if __name__ == "__main__":
    run_pipeline()
