#!/usr/bin/env python3
"""
Stage 1: Data Enrichment Pipeline
Joins Goodreads library export with Kaggle Best Books metadata.
Uses waterfall strategy: ISBN match first, then Title+Author fallback.
"""
import pandas as pd
import re
import sys
from pathlib import Path

# --- CONFIGURATION ---
DATA_DIR = Path(__file__).parent.parent / 'data'
USER_FILE = DATA_DIR / 'goodreads_library_export.csv'
METADATA_FILE = DATA_DIR / 'books_1.Best_Books_Ever.csv'
OUTPUT_FILE = DATA_DIR / 'enriched_library.csv'

# --- HELPERS ---
def clean_isbn(val):
    """Standardizes ISBNs by stripping non-numeric chars and Excel formatting."""
    if pd.isna(val): 
        return None
    # Remove Excel formatting: ="1234567890" -> 1234567890
    cleaned = re.sub(r'[=""\s]', '', str(val)).strip()
    # Return None if empty or too short
    if len(cleaned) < 10:
        return None
    return cleaned

def normalize_author(name):
    """Converts 'Last, First' to 'First Last' for better matching."""
    if pd.isna(name): 
        return ""
    name = str(name).strip()
    if "," in name:
        parts = name.split(",", 1)
        return f"{parts[1].strip()} {parts[0].strip()}"
    return name

def clean_kaggle_author(author):
    """Cleans Kaggle author field (may have illustrators, etc.)."""
    if pd.isna(author):
        return ""
    # Take first author only (before comma or parenthesis)
    author = str(author).split(',')[0].split('(')[0].strip()
    return author

def normalize_title(title):
    """Normalizes title for fuzzy matching."""
    if pd.isna(title):
        return ""
    # Lowercase, remove special chars, collapse whitespace
    title = str(title).lower()
    title = re.sub(r'[^\w\s]', '', title)
    title = re.sub(r'\s+', ' ', title).strip()
    return title

# --- EXECUTION ---
def run_pipeline():
    print("=" * 60)
    print("📚 SmartBooks AI - Data Enrichment Pipeline")
    print("=" * 60)
    
    # Load data
    print(f"\n[1/5] Loading data files...")
    try:
        goodreads = pd.read_csv(USER_FILE, encoding='utf-8')
        kaggle = pd.read_csv(METADATA_FILE, encoding='utf-8')
        print(f"   ✓ Goodreads: {len(goodreads)} books")
        print(f"   ✓ Kaggle:    {len(kaggle)} books")
    except FileNotFoundError as e:
        print(f"   ✗ Error: {e}")
        sys.exit(1)
    
    # Standardization
    print(f"\n[2/5] Standardizing ISBNs and Authors...")
    goodreads['ISBN13_clean'] = goodreads['ISBN13'].apply(clean_isbn)
    goodreads['Author_clean'] = goodreads['Author'].apply(normalize_author)
    goodreads['Title_norm'] = goodreads['Title'].apply(normalize_title)
    
    kaggle['isbn_clean'] = kaggle['isbn'].apply(clean_isbn)
    kaggle['author_clean'] = kaggle['author'].apply(clean_kaggle_author)
    kaggle['title_norm'] = kaggle['title'].apply(normalize_title)
    
    isbn_count = goodreads['ISBN13_clean'].notna().sum()
    print(f"   ✓ {isbn_count}/{len(goodreads)} books have valid ISBN13")
    
    # Pass 1: Strict ISBN Match (High Precision)
    print(f"\n[3/5] Pass 1: ISBN13 matching...")
    kaggle_cols = ['isbn_clean', 'description', 'genres', 'coverImg', 'series', 'pages', 'rating']
    
    merged = pd.merge(
        goodreads,
        kaggle[kaggle_cols].drop_duplicates(subset=['isbn_clean']),
        left_on='ISBN13_clean',
        right_on='isbn_clean',
        how='left'
    )
    
    isbn_matches = merged['description'].notna().sum()
    print(f"   ✓ Matched {isbn_matches} books via ISBN")
    
    # Pass 2: Title + Author Match (High Recall)
    print(f"\n[4/5] Pass 2: Title + Author matching...")
    
    # Identify rows that failed Pass 1
    mask_missed = merged['description'].isna()
    missing = merged[mask_missed].drop(
        columns=['description', 'genres', 'coverImg', 'series', 'pages', 'rating', 'isbn_clean'],
        errors='ignore'
    )
    found = merged[~mask_missed]
    
    # Prepare fallback dataset (unique title/author pairs from Kaggle)
    kaggle_unique = kaggle.drop_duplicates(subset=['title_norm', 'author_clean'])
    
    # Fallback join
    missing_filled = pd.merge(
        missing,
        kaggle_unique[['title_norm', 'author_clean', 'description', 'genres', 'coverImg', 'series', 'pages', 'rating']],
        left_on=['Title_norm', 'Author_clean'],
        right_on=['title_norm', 'author_clean'],
        how='left'
    )
    
    title_matches = missing_filled['description'].notna().sum()
    print(f"   ✓ Matched {title_matches} additional books via Title+Author")
    
    # Final Merge & Cleanup
    print(f"\n[5/5] Finalizing enriched dataset...")
    final_df = pd.concat([found, missing_filled], ignore_index=True)
    
    # Select columns for app
    app_columns = [
        'Book Id', 'Title', 'Author', 'My Rating', 'Average Rating',
        'Exclusive Shelf', 'Date Read', 'Date Added', 'Number of Pages',
        'Year Published', 'Original Publication Year', 'My Review',
        'ISBN13_clean', 'description', 'genres', 'coverImg', 'series'
    ]
    
    # Keep only columns that exist
    cols_to_keep = [c for c in app_columns if c in final_df.columns]
    final_df = final_df[cols_to_keep]
    
    # Clean up genres field (convert string representation of list to actual list)
    def parse_genres(genres_str):
        if pd.isna(genres_str):
            return []
        try:
            # Parse string like "['Fantasy', 'Fiction']"
            import ast
            return ast.literal_eval(genres_str)
        except:
            return []
    
    final_df['genres_list'] = final_df['genres'].apply(parse_genres)
    
    # Export
    final_df.to_csv(OUTPUT_FILE, index=False)
    
    # Validation Stats
    coverage = final_df['description'].notna().mean()
    total_matched = isbn_matches + title_matches
    
    print("\n" + "=" * 60)
    print("✅ Pipeline Complete!")
    print("=" * 60)
    print(f"\n📊 Results:")
    print(f"   • Total books:        {len(final_df)}")
    print(f"   • With descriptions:  {total_matched} ({coverage:.1%} coverage)")
    print(f"   • ISBN matches:       {isbn_matches}")
    print(f"   • Title+Author:       {title_matches}")
    print(f"\n📁 Output saved to: {OUTPUT_FILE}")
    
    return final_df

if __name__ == "__main__":
    run_pipeline()
