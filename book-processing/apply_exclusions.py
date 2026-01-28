#!/usr/bin/env python3
"""
Apply Exclusions - Filter out sensitive books before publishing

This script reads exclusions.json and filters out books from:
- library_with_embeddings.json
- galaxy_coordinates.json  
- analytics_data.json (recalculated based on filtered books)

Run this AFTER the main pipeline and BEFORE copying to public/data/
"""
import json
from pathlib import Path
from collections import Counter

# --- CONFIGURATION ---
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / 'data'
EXCLUSIONS_FILE = SCRIPT_DIR / 'exclusions.json'

# Input/Output files
LIBRARY_FILE = DATA_DIR / 'library_with_embeddings.json'
GALAXY_FILE = DATA_DIR / 'galaxy_coordinates.json'
ANALYTICS_FILE = DATA_DIR / 'analytics_data.json'


def load_exclusions():
    """Load exclusion rules from config file."""
    if not EXCLUSIONS_FILE.exists():
        print("⚠️  No exclusions.json found. Creating default config...")
        default_config = {
            "rules": {
                "exclude_no_date_read": True,
                "exclude_one_star": True,
                "exclude_unread": False
            },
            "exclude_titles": [],
            "exclude_authors": [],
            "exclude_ids": [],
            "_comment": "Add book titles, authors, or book_keys to exclude."
        }
        with open(EXCLUSIONS_FILE, 'w') as f:
            json.dump(default_config, f, indent=2)
        return default_config
    
    with open(EXCLUSIONS_FILE, 'r') as f:
        return json.load(f)


def should_exclude(book, exclusions):
    """Check if a book should be excluded based on rules and lists."""
    rules = exclusions.get('rules', {})
    exclude_titles = [t.lower() for t in exclusions.get('exclude_titles', [])]
    exclude_authors = [a.lower() for a in exclusions.get('exclude_authors', [])]
    exclude_ids = exclusions.get('exclude_ids', [])
    
    # Rule: exclude books without date_read (for read books only)
    if rules.get('exclude_no_date_read', False):
        if book.get('is_read', False) and not book.get('date_read'):
            return True, "no_date_read"
    
    # Rule: exclude 1-star books
    if rules.get('exclude_one_star', False):
        if book.get('my_rating') == 1:
            return True, "one_star"
    
    # Rule: exclude all unread books
    if rules.get('exclude_unread', False):
        if not book.get('is_read', False):
            return True, "unread"
    
    # Specific title exclusions
    if book.get('title', '').lower() in exclude_titles:
        return True, "title_list"
    
    # Specific author exclusions
    if book.get('author', '').lower() in exclude_authors:
        return True, "author_list"
    
    # Specific ID exclusions
    if book.get('id', '') in exclude_ids:
        return True, "id_list"
    
    return False, None


def recalculate_analytics(books):
    """Recalculate analytics based on filtered book list."""
    from datetime import datetime
    
    read_books = [b for b in books if b.get('is_read', False)]
    unread_books = [b for b in books if not b.get('is_read', False)]
    
    # Rating distribution
    rating_counts = Counter(b.get('my_rating', 0) for b in read_books)
    rating_distribution = [{"rating": r, "count": rating_counts.get(r, 0)} for r in [5, 4, 3, 2, 1, 0]]
    
    # Genre breakdown
    genre_counter = Counter()
    for book in read_books:
        genres = book.get('genres', '[]')
        if isinstance(genres, str):
            try:
                genres = json.loads(genres)
            except:
                genres = []
        for g in genres[:3]:  # Top 3 genres per book
            genre_counter[g] += 1
    genre_breakdown = [{"genre": g, "count": c} for g, c in genre_counter.most_common(15)]
    
    # Top authors
    author_counter = Counter(b.get('author', 'Unknown') for b in read_books)
    top_authors = [{"author": a, "count": c} for a, c in author_counter.most_common(10)]
    
    # Reading timeline
    timeline_counter = Counter()
    for book in read_books:
        date_read = book.get('date_read')
        if date_read:
            try:
                # Handle YYYY/MM/DD format
                year_month = date_read[:7].replace('/', '-')
                timeline_counter[year_month] += 1
            except:
                pass
    reading_timeline = [{"year_month": ym, "count": c} for ym, c in sorted(timeline_counter.items())]
    
    # Shelf summary
    shelf_summary = [
        {"shelf": "read", "count": len(read_books)},
        {"shelf": "unread", "count": len(unread_books)}
    ]
    
    # Calculate averages
    ratings = [b['my_rating'] for b in read_books if b.get('my_rating', 0) > 0]
    avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else 0
    
    # Books with descriptions
    books_with_desc = len([b for b in books if b.get('description') and len(b['description']) > 50])
    
    analytics = {
        "summary": {
            "total_books": len(books),
            "books_read": len(read_books),
            "books_unread": len(unread_books),
            "books_with_descriptions": books_with_desc,
            "five_star_books": len([b for b in read_books if b.get('my_rating') == 5]),
            "average_rating": avg_rating,
            "coverage_percent": round(books_with_desc / len(books) * 100, 1) if books else 0,
            "generated_at": datetime.now().isoformat()
        },
        "reading_timeline": reading_timeline,
        "genre_breakdown": genre_breakdown,
        "rating_distribution": rating_distribution,
        "top_authors": top_authors,
        "shelf_summary": shelf_summary
    }
    
    return analytics


def run_exclusions():
    print("=" * 70)
    print("🔒 SmartBooks AI - Apply Exclusions")
    print("=" * 70)
    
    # Load exclusions config
    print("\n[1/5] Loading exclusions config...")
    exclusions = load_exclusions()
    rules = exclusions.get('rules', {})
    print(f"   ✓ Rules:")
    for rule, enabled in rules.items():
        print(f"      • {rule}: {'✅ ON' if enabled else '❌ OFF'}")
    print(f"   ✓ Exclude titles: {len(exclusions.get('exclude_titles', []))}")
    print(f"   ✓ Exclude authors: {len(exclusions.get('exclude_authors', []))}")
    print(f"   ✓ Exclude IDs: {len(exclusions.get('exclude_ids', []))}")
    
    # Load library data
    print("\n[2/5] Loading library data...")
    with open(LIBRARY_FILE, 'r') as f:
        books = json.load(f)
    print(f"   ✓ Loaded {len(books)} books")
    
    # Apply exclusions
    print("\n[3/5] Applying exclusions...")
    excluded_books = []
    filtered_books = []
    exclusion_reasons = Counter()
    
    for book in books:
        exclude, reason = should_exclude(book, exclusions)
        if exclude:
            excluded_books.append(book)
            exclusion_reasons[reason] += 1
        else:
            filtered_books.append(book)
    
    print(f"   ✓ Excluded {len(excluded_books)} books:")
    for reason, count in exclusion_reasons.most_common():
        print(f"      • {reason}: {count}")
    print(f"   ✓ Keeping {len(filtered_books)} books")
    
    # Save filtered library
    print("\n[4/5] Saving filtered data...")
    with open(LIBRARY_FILE, 'w') as f:
        json.dump(filtered_books, f, indent=2)
    print(f"   ✓ Saved {LIBRARY_FILE.name}")
    
    # Filter and save galaxy coordinates
    filtered_ids = {b['id'] for b in filtered_books}
    with open(GALAXY_FILE, 'r') as f:
        galaxy_data = json.load(f)
    filtered_galaxy = [g for g in galaxy_data if g['id'] in filtered_ids]
    with open(GALAXY_FILE, 'w') as f:
        json.dump(filtered_galaxy, f, indent=2)
    print(f"   ✓ Saved {GALAXY_FILE.name} ({len(filtered_galaxy)} points)")
    
    # Recalculate and save analytics
    print("\n[5/5] Recalculating analytics...")
    analytics = recalculate_analytics(filtered_books)
    with open(ANALYTICS_FILE, 'w') as f:
        json.dump(analytics, f, indent=2)
    print(f"   ✓ Saved {ANALYTICS_FILE.name}")
    
    # Print excluded books for review
    print("\n" + "=" * 70)
    print("📋 Excluded Books Summary:")
    print("=" * 70)
    for reason in exclusion_reasons:
        print(f"\n{reason}:")
        for book in excluded_books:
            _, r = should_exclude(book, exclusions)
            if r == reason:
                rating = '★' * book.get('my_rating', 0) if book.get('my_rating', 0) > 0 else 'unrated'
                print(f"   • {book['title']} by {book['author']} ({rating})")
    
    print("\n" + "=" * 70)
    print("✅ Exclusions Applied Successfully!")
    print("=" * 70)
    print(f"\n📊 Final counts:")
    print(f"   • Original: {len(books)} books")
    print(f"   • Excluded: {len(excluded_books)} books")
    print(f"   • Published: {len(filtered_books)} books")
    print(f"\n💡 To add more exclusions, edit: {EXCLUSIONS_FILE}")
    
    return filtered_books, excluded_books


if __name__ == "__main__":
    run_exclusions()
