#!/usr/bin/env python3
"""
Impute missing genres and Fiction/Nonfiction classification for books.
"""
import pandas as pd
import json
import re
from pathlib import Path

# Paths
PROCESSED_DATA_FILE = Path(__file__).parent / 'book_records_v4_enriched.csv'

# Nonfiction keywords (if any match, it's nonfiction)
NONFICTION_KEYWORDS = [
    'business', 'leadership', 'management', 'entrepreneur', 'startup',
    'biography', 'autobiography', 'memoir', 'history', 'historical',
    'psychology', 'philosophy', 'science', 'technology', 'programming',
    'self-help', 'self help', 'guide to', 'how to', 'politics', 'economics',
    'religion', 'spiritual', 'meditation', 'mindfulness', 'health', 'fitness',
    'running', 'training', 'nutrition', 'cookbook', 'travel', 'essay', 'essays',
    'reference', 'textbook', 'manual', 'handbook', 'encyclopedia'
]

# Fiction genres for keyword matching
FICTION_GENRES = {
    'Fantasy': ['fantasy', 'magic', 'wizard', 'dragon', 'quest', 'sword', 'kingdom', 'realm'],
    'Science Fiction': ['science fiction', 'sci-fi', 'space', 'alien', 'robot', 'dystopian', 'cyberpunk'],
    'Mystery': ['mystery', 'detective', 'murder', 'investigation', 'crime', 'thriller'],
    'Romance': ['romance', 'love story', 'wedding', 'bride'],
    'Horror': ['horror', 'terror', 'fear', 'haunted', 'ghost'],
    'Adventure': ['adventure', 'journey', 'expedition', 'survival'],
}

def is_nonfiction_by_keywords(title, description):
    """Check if book is nonfiction based on keywords."""
    text = f"{title} {description}".lower()
    return any(keyword in text for keyword in NONFICTION_KEYWORDS)

def infer_fiction_genre(title, description):
    """Infer specific fiction genre from keywords."""
    text = f"{title} {description}".lower()
    for genre, keywords in FICTION_GENRES.items():
        if any(keyword in text for keyword in keywords):
            return genre
    return 'Fiction'  # Generic fiction

def classify_and_impute_genres(row):
    """Classify as Fiction/Nonfiction and impute genres."""
    title = str(row.get('title', '')).lower()
    description = str(row.get('description_clean', ''))[:500].lower()  # First 500 chars
    
    # Parse existing genres
    genres_str = row.get('genres_list', '[]')
    try:
        existing_genres = json.loads(genres_str) if isinstance(genres_str, str) else genres_str
        if not isinstance(existing_genres, list):
            existing_genres = []
    except:
        existing_genres = []
    
    # If already has Fiction or Nonfiction, use it
    has_fiction = any('fiction' in str(g).lower() and 'nonfiction' not in str(g).lower() for g in existing_genres)
    has_nonfiction = any('nonfiction' in str(g).lower() or 'non-fiction' in str(g).lower() for g in existing_genres)
    
    if has_fiction:
        category = 'Fiction'
        if not any(g in existing_genres for g in FICTION_GENRES.keys()):
            # Add specific fiction genre
            fiction_genre = infer_fiction_genre(title, description)
            if fiction_genre not in existing_genres:
                existing_genres.insert(0, fiction_genre)
    elif has_nonfiction:
        category = 'Nonfiction'
    else:
        # Infer from keywords
        if is_nonfiction_by_keywords(title, description):
            category = 'Nonfiction'
            if 'Nonfiction' not in existing_genres:
                existing_genres.insert(0, 'Nonfiction')
        else:
            # Assume fiction
            category = 'Fiction'
            fiction_genre = infer_fiction_genre(title, description)
            if fiction_genre not in existing_genres:
                existing_genres.insert(0, fiction_genre)
    
    # Set genre_primary to the category
    genre_primary = existing_genres[0] if existing_genres else category
    
    return {
        'genres_list': json.dumps(existing_genres),
        'genre_primary': genre_primary,
        'fiction_category': category
    }

def main():
    print("="*70)
    print("🏷️  Imputing Genres and Fiction/Nonfiction Classification")
    print("="*70)
    
    # Load data
    df = pd.read_csv(PROCESSED_DATA_FILE)
    read_books = df[df['is_read'] == True]
    
    print(f"\n📊 Read books: {len(read_books)}")
    
    # Check current state
    with_genres = read_books[read_books['genres_list'].notna() & (read_books['genres_list'] != '[]')]
    print(f"   Currently with genres: {len(with_genres)} ({len(with_genres)/len(read_books)*100:.1f}%)")
    
    # Impute for all read books
    print("\n[1/3] Classifying and imputing genres...")
    results = []
    for _, row in df.iterrows():
        if row['is_read']:
            result = classify_and_impute_genres(row)
            results.append(result)
        else:
            # Keep existing for unread books
            results.append({
                'genres_list': row.get('genres_list', '[]'),
                'genre_primary': row.get('genre_primary', 'Unknown'),
                'fiction_category': None
            })
    
    # Update dataframe
    df['genres_list'] = [r['genres_list'] for r in results]
    df['genre_primary'] = [r['genre_primary'] for r in results]
    
    # Count results
    fiction_count = sum(1 for r in results if r['fiction_category'] == 'Fiction')
    nonfiction_count = sum(1 for r in results if r['fiction_category'] == 'Nonfiction')
    
    print(f"   ✓ Fiction: {fiction_count}")
    print(f"   ✓ Nonfiction: {nonfiction_count}")
    
    # Save
    print("\n[2/3] Saving updated CSV...")
    df.to_csv(PROCESSED_DATA_FILE, index=False)
    print(f"   ✓ Saved to: {PROCESSED_DATA_FILE.name}")
    
    print("\n✅ Complete!")
    print(f"   All {len(read_books)} read books now have genre classification!")

if __name__ == '__main__':
    main()
