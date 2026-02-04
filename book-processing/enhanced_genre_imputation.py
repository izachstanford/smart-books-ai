#!/usr/bin/env python3
"""
Enhanced genre imputation using title keywords and Kaggle matching.
"""
import pandas as pd
import json
import re
from pathlib import Path

# Paths
PROCESSED_DATA_FILE = Path(__file__).parent / 'book_records_v4_enriched.csv'

# Comprehensive genre patterns
GENRE_PATTERNS = {
    # Nonfiction
    'Business': [
        'business', 'leadership', 'management', 'entrepreneur', 'startup', 'company',
        'ceo', 'executive', 'corporate', 'career', 'workplace', 'strategy', 'innovation',
        'marketing', 'sales', 'negotiate', 'economy', 'finance', 'invest', 'wealth',
        'success', 'winning', 'performance', 'productivity', 'efficiency', 'agile',
        'habit', 'atomic habit', 'power of', 'law of', 'principles', 'almanack'
    ],
    'Self Improvement': [
        'self-help', 'self help', 'improve yourself', 'better life', 'happiness',
        'confidence', 'anxiety', 'stress', 'mindset', 'meditation', 'mindfulness',
        'spiritual', 'inner peace', 'transformation', 'change your life', 'power of now',
        'untethered soul', 'let them', 'rewiring'
    ],
    'Psychology': [
        'psychology', 'brain', 'mind', 'mental', 'thinking', 'cognitive', 'behavior',
        'emotional intelligence', 'decision', 'bias', 'influence', 'persuasion',
        'unquiet mind', 'mood', 'depression'
    ],
    'Philosophy': [
        'philosophy', 'stoic', 'meditations', 'wisdom', 'meaning', 'existence',
        'ethics', 'moral', 'virtue', 'socrates', 'plato', 'aristotle', 'marcus aurelius',
        'seneca', 'epictetus'
    ],
    'Biography': [
        'biography', 'autobiography', 'memoir', 'my life', 'my story', 'life of',
        'journey of', 'promised land', 'becoming', 'educated'
    ],
    'History': [
        'history', 'historical', 'war', 'revolution', 'empire', 'civilization',
        'world war', 'civil war', 'ancient', 'hardcore history'
    ],
    'Science': [
        'science', 'physics', 'chemistry', 'biology', 'evolution', 'universe',
        'cosmos', 'genetics', 'quantum', 'neuroscience'
    ],
    'Technology': [
        'technology', 'programming', 'software', 'computer', 'algorithm', 'data',
        'artificial intelligence', 'ai', 'machine learning', 'llm', 'transformer',
        'rag', 'code', 'engineer', 'technical', 'system design', 'architecture'
    ],
    'Health': [
        'health', 'fitness', 'nutrition', 'diet', 'exercise', 'training', 'running',
        'marathon', 'athlete', 'body', 'wellness', 'medical', 'doctor', 'longevity',
        'outlive', 'not to age'
    ],
    'Sports': [
        'sports', 'athlete', 'running', 'race', 'marathon', 'ultramarathon', 'endure',
        'born to run', 'eat & run', 'racing weight', 'chirunning', 'football', 'basketball'
    ],
    'Travel': [
        'travel', 'journey', 'adventure', 'wilderness', 'ocean', 'zealand', 'guide'
    ],
    'Parenting': [
        'parenting', 'parent', 'kids', 'children', 'family', 'baby', 'toddler',
        'kids are all right'
    ],
    
    # Fiction
    'Fantasy': [
        'fantasy', 'magic', 'wizard', 'dragon', 'quest', 'sword', 'kingdom', 'realm',
        'stormlight', 'oathbringer', 'radiance', 'mistborn', 'elantris', 'narnia',
        'hobbit', 'lord of the rings', 'fellowship', 'harry potter', 'eragon',
        'inheritance', 'wheel of time', 'game of thrones', 'chronicles'
    ],
    'Science Fiction': [
        'science fiction', 'sci-fi', 'space', 'alien', 'robot', 'dystopia',
        'future', 'cyberpunk', 'androids', 'starship', 'galaxy', 'mars',
        'project hail mary', 'murderbot', 'expanse', '1984', 'brave new world'
    ],
    'Mystery': [
        'mystery', 'detective', 'murder', 'crime', 'investigation', 'thriller',
        'suspense', 'secret', 'da vinci code', 'girl with', 'gone girl'
    ],
    'Classics': [
        'classic', 'dickens', 'austen', 'shakespeare', 'brontë', 'hemingway',
        'fitzgerald', 'steinbeck', 'frankenstein', 'dracula', 'gatsby', 'mockingbird',
        'animal farm', 'grapes of wrath', 'scarlet letter', 'huckleberry finn',
        'oliver twist', 'tale of two cities'
    ],
    'Horror': [
        'horror', 'terror', 'fear', 'haunted', 'ghost', 'monster', 'nightmare',
        'dracula', 'frankenstein', 'shining'
    ],
    'Romance': [
        'romance', 'love', 'wedding', 'bride', 'heart', 'affair', 'passion'
    ],
    'Young Adult': [
        'young adult', 'ya', 'teen', 'adolescent', 'hunger games', 'divergent',
        'twilight', 'maze runner', 'perks of being'
    ],
}

def classify_book(title, description, author):
    """Classify book into specific genres using title, description, and author."""
    text = f"{title} {description} {author}".lower()
    
    matched_genres = []
    
    # Check each genre's keywords
    for genre, keywords in GENRE_PATTERNS.items():
        if any(keyword in text for keyword in keywords):
            matched_genres.append(genre)
    
    # If no match, make educated guesses
    if not matched_genres:
        # Check for obvious nonfiction markers
        nonfiction_markers = ['guide', 'how to', 'manual', 'handbook', 'introduction to',
                             'understanding', 'mastering', 'complete', 'essential']
        if any(marker in text for marker in nonfiction_markers):
            matched_genres.append('Nonfiction')
        else:
            # Default to Fiction for novels
            matched_genres.append('Fiction')
    
    return matched_genres

def main():
    print("="*70)
    print("🎯 Enhanced Genre Imputation")
    print("="*70)
    
    df = pd.read_csv(PROCESSED_DATA_FILE)
    
    updated_count = 0
    
    for idx, row in df[df['is_read'] == True].iterrows():
        title = str(row.get('title', ''))
        description = str(row.get('description_clean', ''))[:500]
        author = str(row.get('author', ''))
        
        # Parse existing genres
        genres_str = row.get('genres_list', '[]')
        try:
            existing_genres = json.loads(genres_str) if isinstance(genres_str, str) else genres_str
        except:
            existing_genres = []
        
        # Only update if just generic "Fiction" or "Nonfiction"
        if existing_genres in [['Fiction'], ['Nonfiction'], []]:
            # Classify using keywords
            new_genres = classify_book(title, description, author)
            
            # Determine Fiction/Nonfiction category
            fiction_genres = ['Fantasy', 'Science Fiction', 'Mystery', 'Classics', 'Horror', 'Romance', 'Young Adult']
            has_fiction_genre = any(g in fiction_genres for g in new_genres)
            
            if has_fiction_genre and 'Fiction' not in new_genres:
                new_genres.append('Fiction')
            
            if new_genres != existing_genres:
                df.at[idx, 'genres_list'] = json.dumps(new_genres)
                df.at[idx, 'genre_primary'] = new_genres[0] if new_genres else 'Unknown'
                updated_count += 1
                print(f"✓ {title[:50]:50} | {existing_genres} → {new_genres}")
    
    # Save
    df.to_csv(PROCESSED_DATA_FILE, index=False)
    
    print(f"\n✅ Updated {updated_count} books with specific genres!")

if __name__ == '__main__':
    main()
