"""
Comprehensive Description Enrichment
Fetches missing descriptions for all books using multiple APIs with fallback strategies.
"""

import pandas as pd
import requests
import time
import json
from pathlib import Path
from typing import Optional, Dict

# Paths
PROCESSED_DATA_FILE = Path(__file__).parent / 'book_records_v4_enriched.csv'
CACHE_FILE = Path(__file__).parent / 'enrichment_cache.json'

# Load cache
cache = {}
if CACHE_FILE.exists():
    with open(CACHE_FILE, 'r') as f:
        cache = json.load(f)

def clean_description(text: str) -> str:
    """Clean and truncate description."""
    if not text:
        return ""
    # Remove HTML tags
    import re
    text = re.sub(r'<[^>]+>', '', text)
    # Normalize whitespace
    text = ' '.join(text.split())
    return text[:1000]  # Limit to 1000 chars

def fetch_google_books(isbn: str = None, title: str = None, author: str = None) -> Optional[Dict]:
    """Fetch book data from Google Books API."""
    if isbn:
        query = f"isbn:{isbn}"
    else:
        query = f"intitle:{title}"
        if author:
            query += f"+inauthor:{author}"
    
    url = f"https://www.googleapis.com/books/v1/volumes?q={query}&maxResults=1"
    
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('totalItems', 0) > 0:
                volume = data['items'][0]['volumeInfo']
                return {
                    'description': volume.get('description', ''),
                    'cover_url': volume.get('imageLinks', {}).get('thumbnail', '').replace('http:', 'https:')
                }
    except Exception as e:
        print(f"  ⚠️  Google Books error: {e}")
    
    return None

def fetch_open_library(isbn: str = None, title: str = None, author: str = None) -> Optional[Dict]:
    """Fetch book data from Open Library API."""
    try:
        if isbn:
            url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data"
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                book_data = data.get(f"ISBN:{isbn}", {})
                if book_data:
                    description = ''
                    if 'description' in book_data:
                        desc = book_data['description']
                        description = desc.get('value', desc) if isinstance(desc, dict) else desc
                    
                    cover_url = ''
                    if 'cover' in book_data and 'large' in book_data['cover']:
                        cover_url = book_data['cover']['large']
                    
                    return {
                        'description': description,
                        'cover_url': cover_url
                    }
        else:
            # Search by title
            search_url = f"https://openlibrary.org/search.json?title={title}&limit=1"
            if author:
                search_url += f"&author={author}"
            
            response = requests.get(search_url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('docs'):
                    doc = data['docs'][0]
                    # Try to get full work details
                    if 'key' in doc:
                        work_key = doc['key']
                        work_url = f"https://openlibrary.org{work_key}.json"
                        work_response = requests.get(work_url, timeout=10)
                        if work_response.status_code == 200:
                            work_data = work_response.json()
                            description = ''
                            if 'description' in work_data:
                                desc = work_data['description']
                                description = desc.get('value', desc) if isinstance(desc, dict) else desc
                            
                            cover_id = doc.get('cover_i')
                            cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg" if cover_id else ''
                            
                            return {
                                'description': description,
                                'cover_url': cover_url
                            }
    except Exception as e:
        print(f"  ⚠️  Open Library error: {e}")
    
    return None

def enrich_book(row: pd.Series, idx: int, total: int) -> Dict:
    """Attempt to enrich a single book."""
    book_key = row['book_key']
    title = row['title']
    author = row['author']
    isbn = row.get('isbn')
    
    # Check cache
    cache_key = f"{isbn}_{title}_{author}"
    if cache_key in cache:
        return cache[cache_key]
    
    print(f"\n[{idx+1}/{total}] {title} by {author}")
    
    result = {'description': '', 'cover_url': ''}
    
    # Try Google Books first (with ISBN if available)
    if isbn:
        print(f"  🔍 Trying Google Books (ISBN)...")
        data = fetch_google_books(isbn=isbn)
        if data and data.get('description'):
            result = data
            print(f"  ✅ Found via Google Books (ISBN)!")
            cache[cache_key] = result
            return result
        time.sleep(0.5)
    
    # Try Google Books with title+author
    print(f"  🔍 Trying Google Books (Title+Author)...")
    data = fetch_google_books(title=title, author=author)
    if data and data.get('description'):
        result = data
        print(f"  ✅ Found via Google Books (Title+Author)!")
        cache[cache_key] = result
        return result
    time.sleep(0.5)
    
    # Try Open Library with ISBN
    if isbn:
        print(f"  🔍 Trying Open Library (ISBN)...")
        data = fetch_open_library(isbn=isbn)
        if data and data.get('description'):
            result = data
            print(f"  ✅ Found via Open Library (ISBN)!")
            cache[cache_key] = result
            return result
        time.sleep(0.5)
    
    # Try Open Library with title+author
    print(f"  🔍 Trying Open Library (Title+Author)...")
    data = fetch_open_library(title=title, author=author)
    if data and data.get('description'):
        result = data
        print(f"  ✅ Found via Open Library (Title+Author)!")
        cache[cache_key] = result
        return result
    
    print(f"  ❌ No description found")
    cache[cache_key] = result
    return result

def main():
    print("=" * 70)
    print("📚 Comprehensive Description Enrichment")
    print("=" * 70)
    
    # Load data
    df = pd.read_csv(PROCESSED_DATA_FILE)
    print(f"\n✓ Loaded {len(df)} books")
    
    # Find books missing descriptions
    missing_desc = df[
        (df['description_clean'].isna()) | 
        (df['description_clean'].str.len() < 80)
    ].copy()
    
    print(f"✓ Found {len(missing_desc)} books missing good descriptions")
    
    if len(missing_desc) == 0:
        print("\n✅ All books have descriptions!")
        return
    
    print(f"\n🔄 Starting enrichment for {len(missing_desc)} books...")
    print("   This will take approximately {:.1f} minutes".format(len(missing_desc) * 3 / 60))
    
    # Enrich each book
    enriched_count = 0
    for idx, (_, row) in enumerate(missing_desc.iterrows()):
        result = enrich_book(row, idx, len(missing_desc))
        
        if result['description']:
            # Update the main dataframe
            df.loc[df['book_key'] == row['book_key'], 'description_clean'] = clean_description(result['description'])
            enriched_count += 1
        
        if result['cover_url'] and (pd.isna(row.get('cover_image_url')) or not row.get('cover_image_url')):
            df.loc[df['book_key'] == row['book_key'], 'cover_image_url'] = result['cover_url']
        
        # Save cache every 10 books
        if (idx + 1) % 10 == 0:
            with open(CACHE_FILE, 'w') as f:
                json.dump(cache, f, indent=2)
            print(f"\n  💾 Saved cache ({enriched_count}/{idx+1} enriched so far)")
        
        # Rate limiting
        time.sleep(1)
    
    # Save results
    print(f"\n💾 Saving results...")
    df.to_csv(PROCESSED_DATA_FILE, index=False)
    
    # Save final cache
    with open(CACHE_FILE, 'w') as f:
        json.dump(cache, f, indent=2)
    
    print("\n" + "=" * 70)
    print("✅ Enrichment Complete!")
    print("=" * 70)
    print(f"📊 Statistics:")
    print(f"   • Books processed: {len(missing_desc)}")
    print(f"   • Descriptions found: {enriched_count}")
    print(f"   • Success rate: {enriched_count/len(missing_desc)*100:.1f}%")
    print(f"\n📁 Updated: {PROCESSED_DATA_FILE.name}")

if __name__ == "__main__":
    main()
