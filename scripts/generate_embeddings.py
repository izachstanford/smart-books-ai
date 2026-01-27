#!/usr/bin/env python3
"""
Stage 2: Embedding Generation
Generates vector embeddings for book descriptions using Sentence Transformers.
Model: all-MiniLM-L6-v2 (384 dimensions, fast, quality balance)
"""
import pandas as pd
import numpy as np
import json
from pathlib import Path
from tqdm import tqdm

# --- CONFIGURATION ---
DATA_DIR = Path(__file__).parent.parent / 'data'
INPUT_FILE = DATA_DIR / 'enriched_library.csv'
OUTPUT_FILE = DATA_DIR / 'library_with_embeddings.json'
MODEL_NAME = 'all-MiniLM-L6-v2'

def create_embedding_text(row):
    """
    Creates rich text for embedding by combining multiple fields.
    This gives the embedding more semantic context than description alone.
    """
    parts = []
    
    # Title and author (always present)
    parts.append(f"Title: {row['Title']}")
    parts.append(f"Author: {row['Author']}")
    
    # Series if available
    if pd.notna(row.get('series')) and row['series']:
        parts.append(f"Series: {row['series']}")
    
    # Description (main content)
    if pd.notna(row.get('description')) and row['description']:
        # Truncate very long descriptions to ~500 words
        desc = str(row['description'])
        words = desc.split()
        if len(words) > 500:
            desc = ' '.join(words[:500]) + '...'
        parts.append(f"Description: {desc}")
    
    # Genres
    if pd.notna(row.get('genres')) and row['genres']:
        try:
            import ast
            genres = ast.literal_eval(row['genres']) if isinstance(row['genres'], str) else row['genres']
            if genres:
                parts.append(f"Genres: {', '.join(genres[:5])}")  # Top 5 genres
        except:
            pass
    
    return " | ".join(parts)

def run_pipeline():
    print("=" * 60)
    print("🧠 SmartBooks AI - Embedding Generation")
    print("=" * 60)
    
    # Load enriched data
    print(f"\n[1/4] Loading enriched library...")
    df = pd.read_csv(INPUT_FILE)
    print(f"   ✓ Loaded {len(df)} books")
    
    # Filter to books with descriptions (can't embed empty text)
    df_with_desc = df[df['description'].notna()].copy()
    print(f"   ✓ {len(df_with_desc)} books have descriptions for embedding")
    
    # Load model
    print(f"\n[2/4] Loading Sentence Transformer model: {MODEL_NAME}")
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(MODEL_NAME)
    embedding_dim = model.get_sentence_embedding_dimension()
    print(f"   ✓ Model loaded (embedding dimension: {embedding_dim})")
    
    # Generate embedding texts
    print(f"\n[3/4] Creating embedding texts...")
    df_with_desc['embedding_text'] = df_with_desc.apply(create_embedding_text, axis=1)
    texts = df_with_desc['embedding_text'].tolist()
    print(f"   ✓ Prepared {len(texts)} texts for embedding")
    
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
    for idx, (_, row) in enumerate(df_with_desc.iterrows()):
        book_data = {
            'id': str(row.get('Book Id', idx)),
            'title': row['Title'],
            'author': row['Author'],
            'my_rating': int(row['My Rating']) if pd.notna(row['My Rating']) else 0,
            'avg_rating': float(row['Average Rating']) if pd.notna(row['Average Rating']) else 0,
            'shelf': row['Exclusive Shelf'] if pd.notna(row['Exclusive Shelf']) else 'unknown',
            'date_read': row['Date Read'] if pd.notna(row['Date Read']) else None,
            'date_added': row['Date Added'] if pd.notna(row['Date Added']) else None,
            'pages': int(row['Number of Pages']) if pd.notna(row['Number of Pages']) else None,
            'year_published': int(row['Year Published']) if pd.notna(row['Year Published']) else None,
            'description': row['description'],
            'genres': row['genres'] if pd.notna(row['genres']) else '[]',
            'cover_url': row['coverImg'] if pd.notna(row['coverImg']) else None,
            'series': row['series'] if pd.notna(row['series']) else None,
            'review': row['My Review'] if pd.notna(row.get('My Review')) else None,
            'embedding': embeddings[idx].tolist(),
            'embedding_text': row['embedding_text']
        }
        output_data.append(book_data)
    
    # Also include books WITHOUT descriptions (but no embedding)
    df_no_desc = df[df['description'].isna()]
    for _, row in df_no_desc.iterrows():
        book_data = {
            'id': str(row.get('Book Id', '')),
            'title': row['Title'],
            'author': row['Author'],
            'my_rating': int(row['My Rating']) if pd.notna(row['My Rating']) else 0,
            'avg_rating': float(row['Average Rating']) if pd.notna(row['Average Rating']) else 0,
            'shelf': row['Exclusive Shelf'] if pd.notna(row['Exclusive Shelf']) else 'unknown',
            'date_read': row['Date Read'] if pd.notna(row['Date Read']) else None,
            'date_added': row['Date Added'] if pd.notna(row['Date Added']) else None,
            'pages': int(row['Number of Pages']) if pd.notna(row['Number of Pages']) else None,
            'year_published': int(row['Year Published']) if pd.notna(row['Year Published']) else None,
            'description': None,
            'genres': '[]',
            'cover_url': None,
            'series': None,
            'review': row['My Review'] if pd.notna(row.get('My Review')) else None,
            'embedding': None,  # No embedding for books without descriptions
            'embedding_text': None
        }
        output_data.append(book_data)
    
    # Save to JSON
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2)
    
    # Stats
    books_with_embeddings = len([b for b in output_data if b['embedding'] is not None])
    
    print("\n" + "=" * 60)
    print("✅ Embedding Generation Complete!")
    print("=" * 60)
    print(f"\n📊 Results:")
    print(f"   • Total books:        {len(output_data)}")
    print(f"   • With embeddings:    {books_with_embeddings}")
    print(f"   • Without embeddings: {len(output_data) - books_with_embeddings}")
    print(f"   • Embedding model:    {MODEL_NAME}")
    print(f"   • Embedding dimension: {embedding_dim}")
    print(f"\n📁 Output saved to: {OUTPUT_FILE}")
    
    return output_data

if __name__ == "__main__":
    run_pipeline()
