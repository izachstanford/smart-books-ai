#!/usr/bin/env python3
"""
Impute missing genres for books based on:
1. Matching to Kaggle dataset by title/author
2. Keyword patterns in titles
3. Known author genres
"""

import json
import re
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / 'data'
PUBLIC_DATA_DIR = Path(__file__).parent.parent / 'public' / 'data'

# Genre keyword patterns for imputation
GENRE_KEYWORDS = {
    # Nonfiction categories
    'Business': [
        'leadership', 'management', 'business', 'entrepreneur', 'startup', 'company', 
        'marketing', 'sales', 'negotiat', 'strategy', 'innovation', 'ceo', 'executive',
        'corporate', 'career', 'workplace', 'productivity', 'efficiency', 'agile', 'lean',
        'habits', 'success', 'winning', 'performance', 'peak', 'teams', 'organizations'
    ],
    'Self-Help': [
        'self-help', 'self help', 'habits', 'mindset', 'motivation', 'happiness', 
        'confidence', 'anxiety', 'stress', 'well-being', 'wellbeing', 'improve', 
        'better', 'transform', 'change your', 'how to', 'guide to', 'secrets of',
        'power of', 'art of', 'way of', 'path to', 'rules for', 'principles'
    ],
    'Psychology': [
        'psychology', 'brain', 'mind', 'cognitive', 'behavior', 'thinking', 'mental',
        'emotional', 'intelligence', 'decision', 'bias', 'influence', 'persuasion',
        'neuroscience', 'consciousness', 'perception', 'memory', 'learning'
    ],
    'Philosophy': [
        'philosophy', 'philosophical', 'stoic', 'stoicism', 'meditations', 'wisdom',
        'meaning', 'purpose', 'existence', 'ethics', 'moral', 'virtue', 'truth',
        'socrates', 'plato', 'aristotle', 'nietzsche', 'kant', 'seneca', 'marcus aurelius'
    ],
    'Biography': [
        'biography', 'autobiography', 'memoir', 'life of', 'story of', 'journey of',
        'my life', 'my story', 'letters', 'diaries', 'journals'
    ],
    'History': [
        'history', 'historical', 'war', 'revolution', 'empire', 'ancient', 'medieval',
        'century', 'civilization', 'world war', 'civil war', 'american revolution'
    ],
    'Science': [
        'science', 'scientific', 'physics', 'chemistry', 'biology', 'evolution',
        'universe', 'cosmos', 'quantum', 'astronomy', 'space', 'nature', 'natural'
    ],
    'Technology': [
        'technology', 'tech', 'software', 'programming', 'code', 'coding', 'developer',
        'engineering', 'data', 'ai', 'artificial intelligence', 'machine learning',
        'algorithm', 'computer', 'digital', 'internet', 'web', 'cloud', 'system'
    ],
    'Finance': [
        'finance', 'financial', 'money', 'investing', 'investment', 'stock', 'market',
        'wealth', 'rich', 'millionaire', 'economy', 'economic', 'capital', 'trading'
    ],
    'Religion': [
        'religion', 'religious', 'god', 'jesus', 'christ', 'christian', 'bible', 
        'faith', 'prayer', 'spiritual', 'church', 'gospel', 'scripture', 'prophet',
        'mormon', 'lds', 'latter-day', 'book of mormon', 'doctrine'
    ],
    'Parenting': [
        'parenting', 'parent', 'child', 'children', 'kids', 'baby', 'toddler',
        'family', 'raising', 'discipline', 'education', 'school'
    ],
    'Health': [
        'health', 'healthy', 'diet', 'nutrition', 'exercise', 'fitness', 'body',
        'weight', 'sleep', 'medical', 'medicine', 'healing', 'wellness', 'energy'
    ],
    # Fiction categories  
    'Fantasy': [
        'fantasy', 'magic', 'wizard', 'dragon', 'sword', 'quest', 'kingdom', 'throne',
        'elves', 'dwarves', 'mythical', 'enchant', 'sorcerer', 'witch', 'spell'
    ],
    'Science Fiction': [
        'science fiction', 'sci-fi', 'scifi', 'space', 'future', 'dystopia', 'robot',
        'alien', 'galactic', 'starship', 'mars', 'moon', 'planet', 'cyberpunk'
    ],
    'Mystery': [
        'mystery', 'detective', 'murder', 'crime', 'thriller', 'suspense', 'investigation',
        'clue', 'whodunit', 'police', 'forensic'
    ],
    'Romance': [
        'romance', 'love story', 'love', 'heart', 'passion', 'desire', 'wedding',
        'bride', 'marriage', 'relationship'
    ],
    'Classics': [
        'classic', 'literary', 'literature'
    ]
}

# Fiction vs Nonfiction classification
NONFICTION_GENRES = {
    'Business', 'Self-Help', 'Psychology', 'Philosophy', 'Biography', 'History',
    'Science', 'Technology', 'Finance', 'Religion', 'Parenting', 'Health',
    'Nonfiction', 'Memoir', 'Economics', 'Politics', 'Sociology', 'Education',
    'Leadership', 'Spirituality', 'Personal Development', 'True Crime'
}

FICTION_GENRES = {
    'Fantasy', 'Science Fiction', 'Mystery', 'Romance', 'Classics', 'Fiction',
    'Thriller', 'Horror', 'Young Adult', 'Childrens', 'Graphic Novels',
    'Historical Fiction', 'Literary Fiction', 'Adventure', 'Action'
}

# Known author genres
AUTHOR_GENRES = {
    'Malcolm Gladwell': ['Nonfiction', 'Psychology', 'Business'],
    'Brené Brown': ['Nonfiction', 'Self-Help', 'Psychology'],
    'Adam Grant': ['Nonfiction', 'Business', 'Psychology'],
    'Simon Sinek': ['Nonfiction', 'Business', 'Leadership'],
    'Ryan Holiday': ['Nonfiction', 'Philosophy', 'Stoicism'],
    'Cal Newport': ['Nonfiction', 'Business', 'Productivity'],
    'James Clear': ['Nonfiction', 'Self-Help', 'Habits'],
    'Daniel Kahneman': ['Nonfiction', 'Psychology', 'Economics'],
    'Yuval Noah Harari': ['Nonfiction', 'History', 'Science'],
    'Stephen R. Covey': ['Nonfiction', 'Self-Help', 'Business'],
    'Dale Carnegie': ['Nonfiction', 'Self-Help', 'Business'],
    'Napoleon Hill': ['Nonfiction', 'Self-Help', 'Business'],
    'Robert Kiyosaki': ['Nonfiction', 'Finance', 'Business'],
    'Tim Ferriss': ['Nonfiction', 'Business', 'Self-Help'],
    'Tony Robbins': ['Nonfiction', 'Self-Help', 'Motivation'],
    'Jordan Peterson': ['Nonfiction', 'Psychology', 'Philosophy'],
    'Seth Godin': ['Nonfiction', 'Business', 'Marketing'],
    'Patrick Lencioni': ['Nonfiction', 'Business', 'Leadership'],
    'John C. Maxwell': ['Nonfiction', 'Leadership', 'Business'],
    'Stephen King': ['Fiction', 'Horror', 'Thriller'],
    'Brandon Sanderson': ['Fiction', 'Fantasy', 'Epic Fantasy'],
    'J.K. Rowling': ['Fiction', 'Fantasy', 'Young Adult'],
    'J.R.R. Tolkien': ['Fiction', 'Fantasy', 'Classics'],
    'C.S. Lewis': ['Fiction', 'Fantasy', 'Classics'],
    'Orson Scott Card': ['Fiction', 'Science Fiction', 'Fantasy'],
    'Rick Riordan': ['Fiction', 'Fantasy', 'Young Adult'],
    'Dan Brown': ['Fiction', 'Thriller', 'Mystery'],
    'Roald Dahl': ['Fiction', 'Childrens', 'Fantasy'],
    'Suzanne Collins': ['Fiction', 'Young Adult', 'Science Fiction'],
    'Marcus Aurelius': ['Nonfiction', 'Philosophy', 'Classics'],
    'Seneca': ['Nonfiction', 'Philosophy', 'Stoicism'],
    'Mel Robbins': ['Nonfiction', 'Self-Help', 'Motivation'],
    'Chip Heath': ['Nonfiction', 'Business', 'Psychology'],
    'Dan Heath': ['Nonfiction', 'Business', 'Psychology'],
    'Angela Duckworth': ['Nonfiction', 'Psychology', 'Self-Help'],
    'Carol S. Dweck': ['Nonfiction', 'Psychology', 'Education'],
    'David Attenborough': ['Nonfiction', 'Science', 'Nature'],
    'Walter Isaacson': ['Nonfiction', 'Biography', 'History'],
    'Michael Lewis': ['Nonfiction', 'Business', 'Finance'],
    'Nassim Nicholas Taleb': ['Nonfiction', 'Finance', 'Philosophy'],
    'Ray Dalio': ['Nonfiction', 'Finance', 'Business'],
    'David Goggins': ['Nonfiction', 'Memoir', 'Self-Help'],
    'Matthew McConaughey': ['Nonfiction', 'Memoir', 'Self-Help'],
    'Michelle Obama': ['Nonfiction', 'Biography', 'Memoir'],
    'Barack Obama': ['Nonfiction', 'Biography', 'Politics'],
}


def classify_fiction_nonfiction(genres):
    """Classify a book as Fiction or Nonfiction based on genres"""
    if not genres:
        return 'Unknown'
    
    nonfiction_count = sum(1 for g in genres if g in NONFICTION_GENRES or 
                          any(ng.lower() in g.lower() for ng in NONFICTION_GENRES))
    fiction_count = sum(1 for g in genres if g in FICTION_GENRES or
                       any(fg.lower() in g.lower() for fg in FICTION_GENRES))
    
    if nonfiction_count > fiction_count:
        return 'Nonfiction'
    elif fiction_count > nonfiction_count:
        return 'Fiction'
    else:
        return 'Unknown'


def impute_genre_from_keywords(title, existing_genres=None):
    """Impute genre based on title keywords"""
    title_lower = title.lower()
    imputed_genres = set(existing_genres or [])
    
    for genre, keywords in GENRE_KEYWORDS.items():
        for keyword in keywords:
            if keyword.lower() in title_lower:
                imputed_genres.add(genre)
                break
    
    return list(imputed_genres)


def impute_genre_from_author(author):
    """Get genres based on known author mappings"""
    # Check exact match first
    if author in AUTHOR_GENRES:
        return AUTHOR_GENRES[author]
    
    # Check partial match (for variations like "Stephen R. Covey" vs "Stephen Covey")
    author_lower = author.lower()
    for known_author, genres in AUTHOR_GENRES.items():
        # Get last name
        known_parts = known_author.lower().split()
        if known_parts[-1] in author_lower:
            # Check if first name also matches
            if known_parts[0] in author_lower:
                return genres
    
    return []


def get_primary_genre(genres, is_nonfiction=None):
    """Determine the primary genre from a list"""
    if not genres:
        return 'Unknown'
    
    # Priority order for nonfiction
    nonfiction_priority = ['Business', 'Self-Help', 'Psychology', 'Philosophy', 
                          'Biography', 'History', 'Science', 'Technology', 
                          'Finance', 'Religion', 'Health', 'Parenting']
    
    # Priority order for fiction
    fiction_priority = ['Fantasy', 'Science Fiction', 'Mystery', 'Thriller',
                       'Romance', 'Horror', 'Classics', 'Young Adult']
    
    if is_nonfiction:
        for g in nonfiction_priority:
            if g in genres or any(g.lower() in genre.lower() for genre in genres):
                return g
        return 'Nonfiction'
    elif is_nonfiction is False:
        for g in fiction_priority:
            if g in genres or any(g.lower() in genre.lower() for genre in genres):
                return g
        return 'Fiction'
    else:
        # Unknown - just return first genre
        return genres[0] if genres else 'Unknown'


def main():
    print("=" * 70)
    print("📚 Genre Imputation for Read Books")
    print("=" * 70)
    
    # Load data
    with open(PUBLIC_DATA_DIR / 'library_with_embeddings.json', 'r') as f:
        books = json.load(f)
    
    with open(PUBLIC_DATA_DIR / 'galaxy_coordinates.json', 'r') as f:
        galaxy = json.load(f)
    
    # Create lookup for galaxy data
    galaxy_lookup = {b['id']: i for i, b in enumerate(galaxy)}
    
    # Statistics
    stats = {
        'total_read': 0,
        'had_genres': 0,
        'imputed_from_author': 0,
        'imputed_from_keywords': 0,
        'still_missing': 0,
    }
    
    # Process each book
    for book in books:
        if not book.get('is_read'):
            continue
        
        stats['total_read'] += 1
        existing_genres = book.get('genres', [])
        
        if isinstance(existing_genres, str):
            try:
                existing_genres = json.loads(existing_genres)
            except:
                existing_genres = []
        
        if existing_genres and len(existing_genres) > 0:
            stats['had_genres'] += 1
            imputed_genres = existing_genres
        else:
            imputed_genres = []
            
            # Try author-based imputation
            author_genres = impute_genre_from_author(book.get('author', ''))
            if author_genres:
                imputed_genres.extend(author_genres)
                stats['imputed_from_author'] += 1
            
            # Try keyword-based imputation
            keyword_genres = impute_genre_from_keywords(book.get('title', ''), imputed_genres)
            if len(keyword_genres) > len(imputed_genres):
                imputed_genres = keyword_genres
                if not author_genres:
                    stats['imputed_from_keywords'] += 1
        
        # Classify as fiction/nonfiction
        fiction_class = classify_fiction_nonfiction(imputed_genres)
        
        # Get primary genre
        is_nonfiction = fiction_class == 'Nonfiction' if fiction_class != 'Unknown' else None
        primary_genre = get_primary_genre(imputed_genres, is_nonfiction)
        
        # Update book data
        book['genres'] = imputed_genres if imputed_genres else []
        book['genre_primary'] = primary_genre
        book['fiction_type'] = fiction_class
        
        # Update galaxy data if exists
        if book['id'] in galaxy_lookup:
            idx = galaxy_lookup[book['id']]
            galaxy[idx]['genres'] = imputed_genres[:3] if imputed_genres else []
            galaxy[idx]['genre_primary'] = primary_genre
            galaxy[idx]['fiction_type'] = fiction_class
        
        if not imputed_genres:
            stats['still_missing'] += 1
    
    # Save updated data
    with open(PUBLIC_DATA_DIR / 'library_with_embeddings.json', 'w') as f:
        json.dump(books, f, indent=2)
    
    with open(PUBLIC_DATA_DIR / 'galaxy_coordinates.json', 'w') as f:
        json.dump(galaxy, f, indent=2)
    
    # Also save to data folder
    with open(DATA_DIR / 'library_with_embeddings.json', 'w') as f:
        json.dump(books, f, indent=2)
    
    with open(DATA_DIR / 'galaxy_coordinates.json', 'w') as f:
        json.dump(galaxy, f, indent=2)
    
    # Print results
    print(f"\n[Results]")
    print(f"   Total read books: {stats['total_read']}")
    print(f"   Already had genres: {stats['had_genres']}")
    print(f"   Imputed from author: {stats['imputed_from_author']}")
    print(f"   Imputed from keywords: {stats['imputed_from_keywords']}")
    print(f"   Still missing: {stats['still_missing']}")
    
    # Show genre distribution after imputation
    print("\n[Genre Distribution After Imputation]")
    genre_counts = {}
    fiction_counts = {'Fiction': 0, 'Nonfiction': 0, 'Unknown': 0}
    
    for book in books:
        if book.get('is_read'):
            primary = book.get('genre_primary', 'Unknown')
            genre_counts[primary] = genre_counts.get(primary, 0) + 1
            fiction_type = book.get('fiction_type', 'Unknown')
            fiction_counts[fiction_type] = fiction_counts.get(fiction_type, 0) + 1
    
    print("\n   Primary Genres:")
    for genre, count in sorted(genre_counts.items(), key=lambda x: -x[1])[:15]:
        print(f"      {genre}: {count}")
    
    print(f"\n   Fiction/Nonfiction Split:")
    for ftype, count in sorted(fiction_counts.items(), key=lambda x: -x[1]):
        print(f"      {ftype}: {count}")
    
    print("\n" + "=" * 70)
    print("✅ Genre imputation complete!")
    print("=" * 70)


if __name__ == '__main__':
    main()
