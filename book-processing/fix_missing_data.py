#!/usr/bin/env python3
"""
Fix missing descriptions and covers for books that failed enrichment.
"""
import pandas as pd
import requests
import time
import argparse
from urllib.parse import quote_plus

def search_google_books(title: str, author: str) -> dict:
    """Search Google Books API."""
    query = f'intitle:{title} inauthor:{author}'.strip()
    url = f'https://www.googleapis.com/books/v1/volumes?q={quote_plus(query)}&maxResults=1'
    
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('totalItems', 0) > 0:
                item = data['items'][0]
                volume_info = item.get('volumeInfo', {})
                
                description = volume_info.get('description', '')
                cover_url = ''
                if 'imageLinks' in volume_info:
                    cover_url = volume_info['imageLinks'].get('thumbnail', '') or \
                               volume_info['imageLinks'].get('smallThumbnail', '')
                    # Upgrade to higher res
                    if cover_url:
                        cover_url = cover_url.replace('zoom=1', 'zoom=2')
                
                return {'description': description, 'cover': cover_url}
    except Exception as e:
        print(f"      Google Books error: {e}")
    
    return {}

def search_open_library(title: str, author: str, isbn: str = None) -> dict:
    """Search Open Library API."""
    try:
        # Try ISBN first if available
        if isbn and len(str(isbn)) >= 10:
            url = f'https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data'
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data:
                    book_data = list(data.values())[0]
                    description = ''
                    if 'excerpts' in book_data and book_data['excerpts']:
                        description = book_data['excerpts'][0].get('text', '')
                    
                    cover_url = ''
                    if 'cover' in book_data:
                        cover_url = book_data['cover'].get('large', '') or \
                                   book_data['cover'].get('medium', '')
                    
                    if description or cover_url:
                        return {'description': description, 'cover': cover_url}
        
        # Fallback to title+author search
        query = f'{title} {author}'.strip()
        url = f'https://openlibrary.org/search.json?q={quote_plus(query)}&limit=1'
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('docs'):
                doc = data['docs'][0]
                cover_id = doc.get('cover_i')
                cover_url = f'https://covers.openlibrary.org/b/id/{cover_id}-L.jpg' if cover_id else ''
                
                # Open Library doesn't provide descriptions in search API
                return {'description': '', 'cover': cover_url}
    
    except Exception as e:
        print(f"      Open Library error: {e}")
    
    return {}

def main():
    parser = argparse.ArgumentParser(description='Fix missing book data')
    parser.add_argument('--input', default='book_records_v4_enriched.csv', help='Input CSV')
    parser.add_argument('--output', default='book_records_v4_enriched.csv', help='Output CSV')
    parser.add_argument('--sleep', type=float, default=0.5, help='Sleep between API calls')
    args = parser.parse_args()
    
    print("="*70)
    print("🔧 Fixing Missing Book Data")
    print("="*70)
    
    # Load data
    df = pd.read_csv(args.input)
    read_books = df[df['is_read'] == True]
    
    # Find books needing enrichment
    needs_description = (df['description_raw'].isna()) | (df['description_raw'] == '') | (df['description_raw'].str.len() < 50)
    needs_cover = (df['cover_image_url'].isna()) | (df['cover_image_url'] == '')
    needs_enrichment = needs_description | needs_cover
    
    books_to_fix = df[needs_enrichment & df['is_read']].copy()
    
    print(f"\n📊 Found {len(books_to_fix)} read books needing enrichment:")
    print(f"   - Need description: {len(books_to_fix[needs_description & df['is_read']])}")
    print(f"   - Need cover: {len(books_to_fix[needs_cover & df['is_read']])}")
    
    if len(books_to_fix) == 0:
        print("\n✅ All books already have data!")
        return
    
    # Enrich each book
    enriched_count = 0
    for idx, row in books_to_fix.iterrows():
        title = row['title']
        author = row['author']
        isbn = row.get('isbn', '')
        
        needs_desc = pd.isna(row['description_raw']) or row['description_raw'] == '' or len(str(row['description_raw'])) < 50
        needs_cov = pd.isna(row['cover_image_url']) or row['cover_image_url'] == ''
        
        print(f"\n[{enriched_count+1}/{len(books_to_fix)}] {title[:60]}")
        print(f"   Need: {'desc' if needs_desc else ''} {'cover' if needs_cov else ''}")
        
        # Try Google Books
        result = search_google_books(title, author)
        time.sleep(args.sleep)
        
        # Try Open Library if needed
        if (needs_desc and not result.get('description')) or (needs_cov and not result.get('cover')):
            ol_result = search_open_library(title, author, isbn)
            time.sleep(args.sleep)
            if not result.get('description') and ol_result.get('description'):
                result['description'] = ol_result['description']
            if not result.get('cover') and ol_result.get('cover'):
                result['cover'] = ol_result['cover']
        
        # Update dataframe
        updated = False
        if needs_desc and result.get('description'):
            df.at[idx, 'description_raw'] = result['description']
            updated = True
            print(f"   ✓ Added description ({len(result['description'])} chars)")
        
        if needs_cov and result.get('cover'):
            df.at[idx, 'cover_image_url'] = result['cover']
            updated = True
            print(f"   ✓ Added cover image")
        
        if updated:
            enriched_count += 1
        else:
            print(f"   ✗ No data found")
    
    # Save
    df.to_csv(args.output, index=False)
    print(f"\n✅ Enriched {enriched_count}/{len(books_to_fix)} books")
    print(f"📁 Saved to: {args.output}")

if __name__ == '__main__':
    main()
