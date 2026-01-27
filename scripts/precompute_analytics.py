#!/usr/bin/env python3
"""
Stage 4: Analytics Pre-computation
Generates static JSON data for charts and 3D Galaxy View coordinates.
"""
import json
import numpy as np
import pandas as pd
from pathlib import Path
from collections import Counter
from datetime import datetime
import ast

# --- CONFIGURATION ---
DATA_DIR = Path(__file__).parent.parent / 'data'
INPUT_FILE = DATA_DIR / 'library_with_embeddings.json'
OUTPUT_FILE = DATA_DIR / 'analytics_data.json'
GALAXY_OUTPUT = DATA_DIR / 'galaxy_coordinates.json'

def parse_genres(genres_str):
    """Parse genres string to list."""
    if not genres_str or genres_str == '[]':
        return []
    try:
        return ast.literal_eval(genres_str)
    except:
        return []

def parse_date(date_str):
    """Parse date string to datetime object."""
    if not date_str:
        return None
    try:
        # Format: 2025/12/28
        return datetime.strptime(date_str, '%Y/%m/%d')
    except:
        try:
            # Try alternate formats
            return datetime.strptime(date_str, '%Y-%m-%d')
        except:
            return None

def run_pipeline():
    print("=" * 60)
    print("📊 SmartBooks AI - Analytics Pre-computation")
    print("=" * 60)
    
    # Load data
    print(f"\n[1/5] Loading library data...")
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        books = json.load(f)
    print(f"   ✓ Loaded {len(books)} books")
    
    # Convert to DataFrame for easier analysis
    df = pd.DataFrame(books)
    
    # --- CHART 1: Reading Timeline ---
    print(f"\n[2/5] Computing reading timeline...")
    read_books = df[(df['shelf'] == 'read') & (df['date_read'].notna())].copy()
    read_books['date_parsed'] = read_books['date_read'].apply(parse_date)
    read_books = read_books[read_books['date_parsed'].notna()]
    
    if len(read_books) > 0:
        read_books['year_month'] = read_books['date_parsed'].apply(
            lambda x: x.strftime('%Y-%m') if x else None
        )
        timeline = read_books.groupby('year_month').size().reset_index(name='count')
        timeline = timeline.sort_values('year_month')
        reading_timeline = timeline.to_dict(orient='records')
    else:
        reading_timeline = []
    print(f"   ✓ Timeline: {len(reading_timeline)} months of data")
    
    # --- CHART 2: Genre Breakdown ---
    print(f"\n[3/5] Computing genre breakdown...")
    all_genres = []
    for genres_str in df['genres']:
        genres = parse_genres(genres_str)
        all_genres.extend(genres[:3])  # Top 3 genres per book
    
    genre_counts = Counter(all_genres)
    top_genres = genre_counts.most_common(12)
    genre_breakdown = [{'genre': g, 'count': c} for g, c in top_genres]
    print(f"   ✓ Found {len(genre_counts)} unique genres, showing top 12")
    
    # --- CHART 3: Rating Distribution ---
    print(f"\n[4/5] Computing rating distribution...")
    read_with_rating = df[(df['shelf'] == 'read') & (df['my_rating'] > 0)]
    rating_counts = read_with_rating['my_rating'].value_counts().sort_index()
    rating_distribution = [
        {'rating': int(r), 'count': int(c)} 
        for r, c in rating_counts.items()
    ]
    avg_rating = read_with_rating['my_rating'].mean() if len(read_with_rating) > 0 else 0
    print(f"   ✓ {len(read_with_rating)} rated books, avg rating: {avg_rating:.2f}")
    
    # --- GALAXY VIEW: 3D Coordinates via UMAP ---
    print(f"\n[5/5] Computing 3D coordinates for Galaxy View...")
    books_with_embeddings = [b for b in books if b.get('embedding') is not None]
    
    if len(books_with_embeddings) > 10:
        import umap
        
        embeddings = np.array([b['embedding'] for b in books_with_embeddings])
        
        # UMAP to 3D
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
            min_val = coords_3d[:, dim].min()
            max_val = coords_3d[:, dim].max()
            if max_val > min_val:
                coords_3d[:, dim] = 2 * (coords_3d[:, dim] - min_val) / (max_val - min_val) - 1
        
        # Also compute 2D for fallback
        reducer_2d = umap.UMAP(
            n_components=2,
            n_neighbors=15,
            min_dist=0.1,
            metric='cosine',
            random_state=42
        )
        coords_2d = reducer_2d.fit_transform(embeddings)
        
        # Normalize 2D
        for dim in range(2):
            min_val = coords_2d[:, dim].min()
            max_val = coords_2d[:, dim].max()
            if max_val > min_val:
                coords_2d[:, dim] = 2 * (coords_2d[:, dim] - min_val) / (max_val - min_val) - 1
        
        galaxy_data = []
        for i, book in enumerate(books_with_embeddings):
            galaxy_data.append({
                'id': book['id'],
                'title': book['title'],
                'author': book['author'],
                'my_rating': book['my_rating'],
                'shelf': book['shelf'],
                'cover_url': book['cover_url'],
                'genres': parse_genres(book['genres'])[:3],
                'pages': book['pages'],
                'x': float(coords_3d[i, 0]),
                'y': float(coords_3d[i, 1]),
                'z': float(coords_3d[i, 2]),
                'x2d': float(coords_2d[i, 0]),
                'y2d': float(coords_2d[i, 1])
            })
        print(f"   ✓ Generated 3D coordinates for {len(galaxy_data)} books")
    else:
        galaxy_data = []
        print(f"   ⚠ Not enough books with embeddings for UMAP")
    
    # --- Additional Stats ---
    total_books = len(df)
    books_read = len(df[df['shelf'] == 'read'])
    books_to_read = len(df[df['shelf'] == 'to-read'])
    books_with_desc = len([b for b in books if b.get('description')])
    five_star_books = len(df[(df['shelf'] == 'read') & (df['my_rating'] == 5)])
    
    # Top authors
    author_counts = df[df['shelf'] == 'read']['author'].value_counts().head(10)
    top_authors = [{'author': a, 'count': int(c)} for a, c in author_counts.items()]
    
    # Shelf summary
    shelf_counts = df['shelf'].value_counts()
    shelf_summary = [{'shelf': s, 'count': int(c)} for s, c in shelf_counts.items()]
    
    # --- Compile Analytics ---
    analytics = {
        'summary': {
            'total_books': total_books,
            'books_read': books_read,
            'books_to_read': books_to_read,
            'books_with_descriptions': books_with_desc,
            'five_star_books': five_star_books,
            'average_rating': round(avg_rating, 2) if avg_rating else 0,
            'coverage_percent': round(books_with_desc / total_books * 100, 1),
            'generated_at': datetime.now().isoformat()
        },
        'reading_timeline': reading_timeline,
        'genre_breakdown': genre_breakdown,
        'rating_distribution': rating_distribution,
        'top_authors': top_authors,
        'shelf_summary': shelf_summary
    }
    
    # Save analytics
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(analytics, f, indent=2)
    
    # Save galaxy data separately (larger file)
    with open(GALAXY_OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(galaxy_data, f, indent=2)
    
    print("\n" + "=" * 60)
    print("✅ Analytics Pre-computation Complete!")
    print("=" * 60)
    print(f"\n📊 Library Summary:")
    print(f"   • Total books:      {total_books}")
    print(f"   • Books read:       {books_read}")
    print(f"   • To-read list:     {books_to_read}")
    print(f"   • 5-star books:     {five_star_books}")
    print(f"   • Average rating:   {avg_rating:.2f}")
    print(f"   • Data coverage:    {books_with_desc}/{total_books} ({books_with_desc/total_books*100:.1f}%)")
    print(f"\n📁 Analytics saved to: {OUTPUT_FILE}")
    print(f"📁 Galaxy data saved to: {GALAXY_OUTPUT}")
    
    return analytics, galaxy_data

if __name__ == "__main__":
    run_pipeline()
