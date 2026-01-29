#!/usr/bin/env python3
"""
build_base_dataset.py

Builds the unified book records dataset by combining:
1. Goodreads export (read books with is_read=True)
2. Kaggle Best Books dataset (unread corpus with is_read=False)

Outputs:
- book_records_v3_backfilled_local.csv (unified dataset)
- enrichment_queue_v1.csv (books needing API enrichment)

Usage:
  python build_base_dataset.py
"""

import pandas as pd
import re
import hashlib
import json
from pathlib import Path
from typing import Optional

# --- PATHS ---
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / 'data'
OUTPUT_DIR = SCRIPT_DIR

GOODREADS_FILE = DATA_DIR / 'goodreads_library_export.csv'
KAGGLE_FILE = DATA_DIR / 'books_1.Best_Books_Ever.csv'
OUTPUT_FILE = OUTPUT_DIR / 'book_records_v3_backfilled_local.csv'
QUEUE_FILE = OUTPUT_DIR / 'enrichment_queue_v1.csv'

# --- THRESHOLDS ---
MIN_DESCRIPTION_LENGTH = 80  # Characters
MIN_KAGGLE_RATINGS_COUNT = 1000  # Minimum ratings for quality filter
TOP_N_POPULAR_BOOKS = 10000  # Take top N most popular unread books
DESCRIPTION_EMBEDDING_MAX_CHARS = 2000  # Cap for embedding input


# --- HELPERS ---

def clean_isbn(val) -> Optional[str]:
    """Standardize ISBN by removing Excel formatting and non-numeric chars."""
    if pd.isna(val):
        return None
    # Remove Excel: ="1234567890" -> 1234567890
    cleaned = re.sub(r'[=""\s-]', '', str(val)).strip()
    # Remove any remaining non-numeric (except X for ISBN10)
    cleaned = re.sub(r'[^0-9Xx]', '', cleaned).upper()
    if len(cleaned) < 10:
        return None
    return cleaned


def normalize_text(text: str) -> str:
    """Normalize for matching: lowercase, strip, collapse whitespace."""
    if pd.isna(text):
        return ''
    text = str(text).lower().strip()
    text = re.sub(r'\s+', ' ', text)
    return text


def normalize_title_for_dedup(title: str) -> str:
    """
    Normalize title for deduplication by removing:
    - Series info like "(Harry Potter, #1)"
    - Edition info like "[Special Edition]"
    - Subtitle markers
    """
    if pd.isna(title):
        return ''
    title = str(title).strip()
    
    # Remove series info in parentheses at the end: "Book Title (Series, #3)"
    title = re.sub(r'\s*\([^)]*,\s*#?\d+(?:\.\d+)?\)\s*$', '', title)
    
    # Remove other parenthetical info at end
    title = re.sub(r'\s*\([^)]+\)\s*$', '', title)
    
    # Remove bracketed info: [Hardcover], [Special Edition]
    title = re.sub(r'\s*\[[^\]]+\]\s*', '', title)
    
    # Normalize
    title = title.lower().strip()
    title = re.sub(r'\s+', ' ', title)
    
    # Remove common subtitle patterns
    title = re.sub(r':\s+a novel.*$', '', title)
    title = re.sub(r':\s+book \d+.*$', '', title)
    
    return title


def normalize_author(author: str) -> str:
    """Convert 'Last, First' to 'First Last' for better matching."""
    if pd.isna(author):
        return ''
    author = str(author).strip()
    # Handle "King, Stephen" -> "Stephen King"
    if ',' in author:
        parts = [p.strip() for p in author.split(',', 1)]
        if len(parts) == 2:
            author = f"{parts[1]} {parts[0]}"
    return author


def normalize_author_for_dedup(author: str) -> str:
    """
    Extract primary author for deduplication.
    Handles cases like "J.K. Rowling, Mary GrandPré (Illustrator)" -> "j.k. rowling"
    """
    if pd.isna(author):
        return ''
    author = str(author).strip()
    
    # Remove parenthetical info (Illustrator), (Editor), etc.
    author = re.sub(r'\s*\([^)]+\)', '', author)
    
    # Take only first author (before comma that separates co-authors)
    # But be careful not to split "Rowling, J.K." style names
    # If there's a comma followed by a capitalized word, it's likely a co-author
    parts = re.split(r',\s+(?=[A-Z])', author)
    if parts:
        author = parts[0].strip()
    
    # Handle "Last, First" format
    if ',' in author:
        name_parts = [p.strip() for p in author.split(',', 1)]
        if len(name_parts) == 2 and len(name_parts[1].split()) <= 2:
            author = f"{name_parts[1]} {name_parts[0]}"
    
    return author.lower().strip()


def generate_book_key(isbn13: Optional[str], title: str, author: str, book_id: Optional[str] = None) -> str:
    """Generate stable book_key: isbn:<isbn13>, gr:<book_id>, or ta:<hash>."""
    # Priority 1: ISBN (most stable) - check for valid ISBN, not just truthy
    if isbn13 and not pd.isna(isbn13) and isbn13 != 'nan':
        return f"isbn:{isbn13}"
    # Priority 2: Goodreads Book ID (for user's read books)
    if book_id and not pd.isna(book_id):
        return f"gr:{book_id}"
    # Priority 3: Hash title+author (for Kaggle books without ISBN)
    combined = f"{normalize_text(title)}|{normalize_text(author)}"
    hash_hex = hashlib.md5(combined.encode('utf-8')).hexdigest()[:12]
    return f"ta:{hash_hex}"


def clean_description(desc: str) -> str:
    """Clean description: strip HTML, normalize whitespace, handle em dashes."""
    if pd.isna(desc):
        return ''
    desc = str(desc)
    # Strip HTML tags
    desc = re.sub(r'<[^>]+>', '', desc)
    # Replace em dash with period+space (better for sentence breaks)
    desc = desc.replace('—', '. ').replace('–', '. ')
    # Normalize whitespace
    desc = re.sub(r'\s+', ' ', desc).strip()
    return desc


def prepare_embedding_text(title: str, author: str, description: str, genres: str) -> str:
    """Prepare text for embedding: Title + Author + Genres + Description (capped)."""
    parts = []
    if title:
        parts.append(f"Title: {title}")
    if author:
        parts.append(f"Author: {author}")
    if genres:
        parts.append(f"Genres: {genres}")
    if description:
        # Cap description length
        if len(description) > DESCRIPTION_EMBEDDING_MAX_CHARS:
            description = description[:DESCRIPTION_EMBEDDING_MAX_CHARS] + "..."
        parts.append(f"Description: {description}")
    
    return " | ".join(parts)


def parse_genres(genres_val) -> list:
    """Parse genres field (might be string list or JSON)."""
    if pd.isna(genres_val):
        return []
    if isinstance(genres_val, list):
        return genres_val
    # Try parsing as JSON/string list
    try:
        if isinstance(genres_val, str):
            genres_val = genres_val.strip()
            # Handle string like "['Fiction', 'Fantasy']"
            if genres_val.startswith('['):
                import ast
                return ast.literal_eval(genres_val)
            # Handle comma-separated
            return [g.strip() for g in genres_val.split(',') if g.strip()]
    except:
        pass
    return []


def infer_primary_genre(genres_list: list) -> str:
    """Map genres to coarse categories for UI filtering."""
    if not genres_list:
        return 'Unknown'
    
    # Simple mapping (expand as needed)
    genre_map = {
        'fiction': 'Fiction',
        'fantasy': 'Fantasy',
        'science fiction': 'Science Fiction',
        'mystery': 'Mystery',
        'thriller': 'Thriller',
        'romance': 'Romance',
        'historical': 'Historical',
        'biography': 'Biography',
        'nonfiction': 'Nonfiction',
        'self help': 'Self-Help',
        'business': 'Business',
        'history': 'History',
        'science': 'Science',
        'philosophy': 'Philosophy',
        'technology': 'Technology',
    }
    
    first_genre = str(genres_list[0]).lower()
    for key, value in genre_map.items():
        if key in first_genre:
            return value
    
    return genres_list[0] if genres_list else 'Unknown'


# --- MAIN PIPELINE ---

def main():
    print("=" * 70)
    print("📚 Building Unified Book Records Dataset")
    print("=" * 70)
    
    # ===== LOAD DATA =====
    print("\n[1/6] Loading data files...")
    
    try:
        goodreads = pd.read_csv(GOODREADS_FILE, encoding='utf-8')
        print(f"   ✓ Goodreads: {len(goodreads)} rows")
    except FileNotFoundError:
        print(f"   ✗ Error: {GOODREADS_FILE} not found")
        return
    
    try:
        kaggle = pd.read_csv(KAGGLE_FILE, encoding='utf-8')
        print(f"   ✓ Kaggle: {len(kaggle)} rows")
    except FileNotFoundError:
        print(f"   ✗ Error: {KAGGLE_FILE} not found")
        return
    
    # ===== PROCESS GOODREADS =====
    print("\n[2/6] Processing Goodreads library...")
    
    # Keep only 'read' shelf (drop to-read)
    if 'Exclusive Shelf' in goodreads.columns:
        goodreads = goodreads[goodreads['Exclusive Shelf'] == 'read'].copy()
        print(f"   ✓ Filtered to 'read' shelf: {len(goodreads)} books")
    
    # Normalize ISBNs
    goodreads['isbn13_clean'] = goodreads['ISBN13'].apply(clean_isbn)
    goodreads['isbn10_clean'] = goodreads['ISBN'].apply(clean_isbn)
    goodreads['author_norm'] = goodreads['Author'].apply(normalize_author)
    goodreads['title_norm'] = goodreads['Title'].apply(normalize_text)
    
    # Generate book_key (use Book Id for Goodreads books to avoid duplicates)
    goodreads['book_key'] = goodreads.apply(
        lambda row: generate_book_key(
            row['isbn13_clean'], 
            row['Title'], 
            row['Author'],
            str(row['Book Id'])  # Include Goodreads ID
        ),
        axis=1
    )
    
    # Prepare Goodreads output schema
    gr_records = pd.DataFrame({
        'book_key': goodreads['book_key'],
        'title': goodreads['Title'],
        'author': goodreads['Author'],
        'isbn': goodreads['isbn13_clean'],  # Primary ISBN
        'isbn13': goodreads['isbn13_clean'],
        'isbn10': goodreads['isbn10_clean'],
        'publish_year': goodreads['Year Published'] if 'Year Published' in goodreads.columns else goodreads.get('Original Publication Year'),
        'description_raw': '',  # Will backfill from Kaggle
        'description_clean': '',
        'description_for_embedding': '',
        'genres_list': '[]',
        'genre_primary': 'Unknown',
        'cover_image_url': '',
        'avg_rating': goodreads.get('Average Rating'),
        'num_ratings': None,
        'popularity_score': None,
        'is_read': True,
        'my_rating': goodreads.get('My Rating'),
        'date_read': goodreads.get('Date Read'),
        'source': 'goodreads_export',
        'source_book_id': goodreads['Book Id'],
    })
    
    print(f"   ✓ Prepared {len(gr_records)} Goodreads records")
    
    # ===== PROCESS KAGGLE =====
    print("\n[3/6] Processing Kaggle dataset...")
    
    # Normalize Kaggle data
    kaggle['isbn_clean'] = kaggle['isbn'].apply(clean_isbn)
    kaggle['author_norm'] = kaggle['author'].apply(normalize_author)
    kaggle['title_norm'] = kaggle['title'].apply(normalize_text)
    
    # Quality filters for unread corpus
    # Filter to English language books
    kaggle = kaggle[
        (kaggle['language'] == 'English') |
        (kaggle['language'].str.contains('English', na=False)) |
        (pd.isna(kaggle['language']))
    ].copy()
    print(f"   ✓ Language filter: {len(kaggle)} English books")
    
    # Filter by minimum ratings and sort by popularity
    if 'numRatings' in kaggle.columns:
        kaggle = kaggle[kaggle['numRatings'] >= MIN_KAGGLE_RATINGS_COUNT].copy()
        kaggle = kaggle.sort_values('numRatings', ascending=False)
        print(f"   ✓ Ratings filter (>= {MIN_KAGGLE_RATINGS_COUNT}): {len(kaggle)} books")
    
    print(f"   ✓ Filtered Kaggle to {len(kaggle)} quality English books")
    
    # Check which Kaggle books are already in Goodreads (mark as read)
    kaggle_isbns = set(kaggle['isbn_clean'].dropna())
    kaggle_titles_authors = set(
        zip(kaggle['title_norm'].fillna(''), kaggle['author_norm'].fillna(''))
    )
    
    goodreads_isbns = set(goodreads['isbn13_clean'].dropna())
    goodreads_titles_authors = set(
        zip(goodreads['title_norm'].fillna(''), goodreads['author_norm'].fillna(''))
    )
    
    # Mark Kaggle books as read if they match Goodreads
    def is_already_read(row):
        if row['isbn_clean'] and row['isbn_clean'] in goodreads_isbns:
            return True
        ta_tuple = (row['title_norm'], row['author_norm'])
        if ta_tuple in goodreads_titles_authors:
            return True
        return False
    
    kaggle['is_read'] = kaggle.apply(is_already_read, axis=1)
    
    # Keep only unread books for the corpus, limited to top N most popular
    kaggle_unread = kaggle[~kaggle['is_read']].copy()
    print(f"   ✓ {len(kaggle_unread)} unread books from Kaggle (excluded duplicates)")
    
    # Limit to top N most popular unread books
    if len(kaggle_unread) > TOP_N_POPULAR_BOOKS:
        kaggle_unread = kaggle_unread.head(TOP_N_POPULAR_BOOKS)
        print(f"   ✓ Limited to top {TOP_N_POPULAR_BOOKS} most popular unread books")
    
    # Prepare Kaggle output schema (no book_id for Kaggle books)
    kaggle_records = pd.DataFrame({
        'book_key': kaggle_unread.apply(
            lambda row: generate_book_key(row['isbn_clean'], row['title'], row['author'], None),
            axis=1
        ),
        'title': kaggle_unread['title'],
        'author': kaggle_unread['author'],
        'isbn': kaggle_unread['isbn_clean'],
        'isbn13': kaggle_unread['isbn_clean'],
        'isbn10': None,
        'publish_year': kaggle_unread.get('publishDate'),
        'description_raw': kaggle_unread.get('description', ''),
        'description_clean': '',  # Will compute below
        'description_for_embedding': '',
        'genres_list': kaggle_unread.get('genres', '[]'),
        'genre_primary': 'Unknown',
        'cover_image_url': kaggle_unread.get('coverImg', ''),
        'avg_rating': kaggle_unread.get('rating'),
        'num_ratings': kaggle_unread.get('numRatings'),
        'popularity_score': kaggle_unread.get('numRatings'),  # Simple proxy - number of ratings
        'is_read': False,
        'my_rating': None,
        'date_read': None,
        'source': 'kaggle_best_books',
        'source_book_id': kaggle_unread.get('bookId'),
    })
    
    print(f"   ✓ Prepared {len(kaggle_records)} Kaggle records")
    
    # ===== BACKFILL GOODREADS FROM KAGGLE =====
    print("\n[4/6] Backfilling Goodreads metadata from Kaggle...")
    
    # Create lookup dictionaries from Kaggle (drop duplicates first)
    kaggle_by_isbn = kaggle.dropna(subset=['isbn_clean']).drop_duplicates(subset=['isbn_clean']).set_index('isbn_clean').to_dict('index')
    kaggle_by_title_author = kaggle.drop_duplicates(subset=['title_norm', 'author_norm']).set_index(['title_norm', 'author_norm']).to_dict('index')
    
    backfill_count = 0
    
    for idx, row in gr_records.iterrows():
        # Try ISBN match first
        kaggle_match = None
        if row['isbn13'] and row['isbn13'] in kaggle_by_isbn:
            kaggle_match = kaggle_by_isbn[row['isbn13']]
        # Try title+author fallback
        elif (row['title'], row['author']) in goodreads_titles_authors:
            title_norm = normalize_text(row['title'])
            author_norm = normalize_text(normalize_author(row['author']))
            if (title_norm, author_norm) in kaggle_by_title_author:
                kaggle_match = kaggle_by_title_author[(title_norm, author_norm)]
        
        if kaggle_match:
            gr_records.at[idx, 'description_raw'] = kaggle_match.get('description', '')
            gr_records.at[idx, 'genres_list'] = kaggle_match.get('genres', '[]')
            gr_records.at[idx, 'cover_image_url'] = kaggle_match.get('coverImg', '')
            if pd.isna(row['avg_rating']):
                gr_records.at[idx, 'avg_rating'] = kaggle_match.get('rating')
            # Backfill popularity_score (numRatings) from Kaggle
            if pd.isna(row['popularity_score']) or row['popularity_score'] == 0:
                gr_records.at[idx, 'popularity_score'] = kaggle_match.get('numRatings', 0)
                gr_records.at[idx, 'num_ratings'] = kaggle_match.get('numRatings', 0)
            backfill_count += 1
    
    print(f"   ✓ Backfilled {backfill_count}/{len(gr_records)} Goodreads books from Kaggle")
    
    # ===== COMBINE & FINALIZE =====
    print("\n[5/6] Combining and finalizing dataset...")
    print(f"   Before merge: {len(gr_records)} Goodreads + {len(kaggle_records)} Kaggle")
    
    # Combine Goodreads + Kaggle
    all_records = pd.concat([gr_records, kaggle_records], ignore_index=True)
    print(f"   After concat: {len(all_records)} total")
    print(f"     - is_read=True: {all_records['is_read'].sum()}")
    print(f"     - is_read=False: {(~all_records['is_read']).sum()}")
    
    # Clean descriptions
    all_records['description_clean'] = all_records['description_raw'].apply(clean_description)
    
    # Parse genres
    all_records['genres_list_parsed'] = all_records['genres_list'].apply(parse_genres)
    all_records['genre_primary'] = all_records['genres_list_parsed'].apply(infer_primary_genre)
    
    # Prepare embedding text
    all_records['description_for_embedding'] = all_records.apply(
        lambda row: prepare_embedding_text(
            row['title'],
            row['author'],
            row['description_clean'],
            ', '.join(row['genres_list_parsed']) if row['genres_list_parsed'] else ''
        ),
        axis=1
    )
    
    # Convert genres_list_parsed back to JSON string for CSV storage
    all_records['genres_list'] = all_records['genres_list_parsed'].apply(json.dumps)
    all_records = all_records.drop(columns=['genres_list_parsed'])
    
    # Remove duplicates by book_key (keep first - Goodreads should come first)
    before_dedup = len(all_records)
    read_before_dedup = all_records['is_read'].sum()
    all_records = all_records.drop_duplicates(subset=['book_key'], keep='first')
    print(f"   Deduplication (book_key): {before_dedup} → {len(all_records)} ({before_dedup - len(all_records)} removed)")
    
    # SECOND PASS: Remove Kaggle books where a normalized title+author exists in read books
    # This handles cases like "Harry Potter..." vs "Harry Potter... (Harry Potter, #1)"
    # and "J.K. Rowling" vs "J.K. Rowling, Mary GrandPré (Illustrator)"
    all_records['title_norm_dedup'] = all_records['title'].apply(normalize_title_for_dedup)
    all_records['author_norm_dedup'] = all_records['author'].apply(normalize_author_for_dedup)
    all_records['dedup_key'] = all_records['title_norm_dedup'] + '|' + all_records['author_norm_dedup']
    
    # Get all dedup keys for read books
    read_dedup_keys = set(all_records[all_records['is_read']]['dedup_key'].values)
    
    # Mark unread books for removal if they match a read book's dedup key
    before_title_dedup = len(all_records)
    mask_keep = all_records['is_read'] | ~all_records['dedup_key'].isin(read_dedup_keys)
    removed_titles = all_records[(~mask_keep)]['title'].tolist()
    all_records = all_records[mask_keep]
    
    if removed_titles:
        print(f"   Deduplication (title+author): {before_title_dedup} → {len(all_records)} ({len(removed_titles)} Kaggle duplicates removed)")
        for t in removed_titles[:10]:
            print(f"      • Removed Kaggle duplicate: {t[:50]}")
        if len(removed_titles) > 10:
            print(f"      ... and {len(removed_titles) - 10} more")
    
    # Clean up temp columns
    all_records = all_records.drop(columns=['title_norm_dedup', 'author_norm_dedup', 'dedup_key'])
    
    print(f"     - Read books: {read_before_dedup} → {all_records['is_read'].sum()} ({read_before_dedup - all_records['is_read'].sum()} lost)")
    
    print(f"   ✓ Final dataset: {len(all_records)} unique books")
    print(f"      - Read: {all_records['is_read'].sum()}")
    print(f"      - Unread: {(~all_records['is_read']).sum()}")
    
    # Save main dataset
    all_records.to_csv(OUTPUT_FILE, index=False)
    print(f"\n   ✓ Saved: {OUTPUT_FILE}")
    
    # ===== GENERATE ENRICHMENT QUEUE =====
    print("\n[6/6] Generating enrichment queue...")
    
    # Identify books needing enrichment
    needs_description = all_records['description_clean'].str.len() < MIN_DESCRIPTION_LENGTH
    needs_cover = all_records['cover_image_url'].isna() | (all_records['cover_image_url'] == '')
    
    needs_enrichment = needs_description | needs_cover
    
    enrichment_queue = all_records[needs_enrichment].copy()
    
    # Add flags for enrichment script
    enrichment_queue['needs_description'] = needs_description[needs_enrichment]
    enrichment_queue['needs_cover'] = needs_cover[needs_enrichment]
    enrichment_queue['description_quality_flag'] = ''
    
    # Select columns for queue
    queue_cols = [
        'book_key', 'title', 'author', 'isbn', 'publish_year',
        'is_read', 'source', 'source_book_id',
        'needs_description', 'needs_cover', 'description_quality_flag'
    ]
    
    # Rename for cleaner output
    queue_output = enrichment_queue[queue_cols].copy()
    queue_output = queue_output.rename(columns={
        'title': 'title_clean',
        'author': 'author_clean'
    })
    
    queue_output.to_csv(QUEUE_FILE, index=False)
    print(f"   ✓ Enrichment queue: {len(queue_output)} books")
    print(f"      - Need description: {queue_output['needs_description'].sum()}")
    print(f"      - Need cover: {queue_output['needs_cover'].sum()}")
    print(f"   ✓ Saved: {QUEUE_FILE}")
    
    # ===== SUMMARY =====
    print("\n" + "=" * 70)
    print("✅ Pipeline complete!")
    print("=" * 70)
    print(f"\nNext steps:")
    print(f"1. Run API enrichment:")
    print(f"   python enrich_books.py \\")
    print(f"     --queue {QUEUE_FILE.name} \\")
    print(f"     --books {OUTPUT_FILE.name} \\")
    print(f"     --out book_records_v4_enriched.csv \\")
    print(f"     --cache enrichment_cache.json \\")
    print(f"     --user_agent 'AIWithZachBookEnricher/1.0 (contact: you@yourdomain.com)' \\")
    print(f"     --sleep 0.35")
    print(f"\n2. Replace data files in ../data/ with enriched output")
    print(f"3. Update app to use new schema")


if __name__ == '__main__':
    main()
