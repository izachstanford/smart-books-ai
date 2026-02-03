#!/usr/bin/env python3
"""
Aggressively search for book covers using multiple sources and fallbacks.
"""
import pandas as pd
import requests
import time
from urllib.parse import quote_plus
import re

def clean_for_search(text):
    """Clean text for better search results."""
    if pd.isna(text):
        return ''
    # Remove series info, parentheticals, subtitles after :
    text = re.sub(r'\([^)]*\)', '', str(text))
    text = re.sub(r':.*$', '', text)
    return text.strip()

def search_open_library_covers(title, author):
    """Search Open Library for covers using multiple strategies."""
    try:
        # Strategy 1: Search API
        clean_title = clean_for_search(title)
        clean_author = clean_for_search(author)
        query = f'{clean_title} {clean_author}'.strip()
        
        url = f'https://openlibrary.org/search.json?q={quote_plus(query)}&limit=5'
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('docs'):
                for doc in data['docs'][:3]:  # Check top 3 results
                    # Try cover_i
                    if doc.get('cover_i'):
                        cover_url = f'https://covers.openlibrary.org/b/id/{doc["cover_i"]}-L.jpg'
                        # Verify the cover exists
                        check = requests.head(cover_url, timeout=5)
                        if check.status_code == 200:
                            return cover_url
                    
                    # Try ISBN from result
                    if doc.get('isbn') and isinstance(doc['isbn'], list):
                        for isbn in doc['isbn'][:2]:
                            cover_url = f'https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg'
                            check = requests.head(cover_url, timeout=5)
                            if check.status_code == 200:
                                return cover_url
    except Exception as e:
        pass
    
    return None

def search_google_books_covers(title, author):
    """Search Google Books with cleaned query."""
    try:
        clean_title = clean_for_search(title)
        clean_author = clean_for_search(author)
        
        query = f'intitle:{clean_title} inauthor:{clean_author}'.strip()
        url = f'https://www.googleapis.com/books/v1/volumes?q={quote_plus(query)}&maxResults=3'
        
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('totalItems', 0) > 0:
                for item in data['items'][:3]:  # Check top 3
                    volume_info = item.get('volumeInfo', {})
                    if 'imageLinks' in volume_info:
                        cover_url = volume_info['imageLinks'].get('thumbnail') or \
                                   volume_info['imageLinks'].get('smallThumbnail')
                        if cover_url:
                            # Upgrade to higher res
                            cover_url = cover_url.replace('zoom=1', 'zoom=2')
                            cover_url = cover_url.replace('http://', 'https://')
                            return cover_url
    except Exception as e:
        pass
    
    return None

def try_isbn_direct(isbn):
    """Try to get cover directly from ISBN if available."""
    if not isbn or pd.isna(isbn):
        return None
    
    isbn_clean = str(isbn).replace('.0', '').strip()
    if len(isbn_clean) < 10:
        return None
    
    # Try Open Library ISBN lookup
    try:
        url = f'https://covers.openlibrary.org/b/isbn/{isbn_clean}-L.jpg'
        response = requests.head(url, timeout=5)
        if response.status_code == 200:
            return url
    except:
        pass
    
    # Try Google Books ISBN lookup
    try:
        url = f'https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn_clean}'
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('totalItems', 0) > 0:
                volume_info = data['items'][0].get('volumeInfo', {})
                if 'imageLinks' in volume_info:
                    cover_url = volume_info['imageLinks'].get('thumbnail') or \
                               volume_info['imageLinks'].get('smallThumbnail')
                    if cover_url:
                        cover_url = cover_url.replace('zoom=1', 'zoom=2')
                        cover_url = cover_url.replace('http://', 'https://')
                        return cover_url
    except:
        pass
    
    return None

def main():
    print("="*70)
    print("🔍 Aggressive Cover Search")
    print("="*70)
    
    # Load data
    df = pd.read_csv('book_records_v4_enriched.csv')
    
    # Find books without covers
    needs_cover = df[
        (df['is_read'] == True) & 
        ((df['cover_image_url'].isna()) | (df['cover_image_url'] == ''))
    ].copy()
    
    print(f"\n📊 Found {len(needs_cover)} read books needing covers\n")
    
    found_count = 0
    
    for idx, row in needs_cover.iterrows():
        title = row['title']
        author = row['author']
        isbn = row.get('isbn')
        
        print(f"[{found_count+1}/{len(needs_cover)}] {title[:60]}")
        print(f"   Author: {author}")
        
        cover_url = None
        
        # Try ISBN first (fastest if available)
        if isbn and not pd.isna(isbn):
            print(f"   Trying ISBN: {isbn}...")
            cover_url = try_isbn_direct(isbn)
            if cover_url:
                print(f"   ✓ Found via ISBN!")
        
        # Try Open Library
        if not cover_url:
            print(f"   Trying Open Library...")
            cover_url = search_open_library_covers(title, author)
            if cover_url:
                print(f"   ✓ Found via Open Library!")
        
        # Try Google Books
        if not cover_url:
            print(f"   Trying Google Books...")
            cover_url = search_google_books_covers(title, author)
            if cover_url:
                print(f"   ✓ Found via Google Books!")
        
        if cover_url:
            df.at[idx, 'cover_image_url'] = cover_url
            found_count += 1
        else:
            print(f"   ✗ No cover found")
        
        print()
        time.sleep(0.6)  # Be respectful to APIs
    
    # Save
    df.to_csv('book_records_v4_enriched.csv', index=False)
    
    print(f"\n✅ Found {found_count}/{len(needs_cover)} covers!")
    print(f"📁 Saved to: book_records_v4_enriched.csv")

if __name__ == '__main__':
    main()
