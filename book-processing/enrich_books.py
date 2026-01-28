#!/usr/bin/env python3
"""
enrich_books.py

Goal:
- Backfill missing book descriptions, genres/categories, and cover image URLs.
- Uses Google Books (primary) plus Open Library (fallback).
- Caches results locally so reruns are fast and cheap.

Usage:
  python enrich_books.py --queue enrichment_queue_v1.csv --books book_records_v3_backfilled_local.csv --out book_records_v4_enriched.csv

Notes:
- Add a clear User-Agent string. Open Library may block frequent anonymous traffic.
- Be gentle with rate limiting. Start with 2 to 5 requests per second total.
"""

import argparse
import csv
import json
import os
import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

import requests


GOOGLE_VOLUMES_URL = "https://www.googleapis.com/books/v1/volumes"
OPENLIB_BOOKS_URL = "https://openlibrary.org/api/books"
OPENLIB_COVERS_URL = "https://covers.openlibrary.org/b/isbn/{isbn}-{size}.jpg?default=false"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean_isbn(isbn: str) -> str:
    s = (isbn or "").strip()
    s = s.replace('="', "").replace('"', "").replace("=", "")
    s = re.sub(r"[^0-9Xx]", "", s)
    return s.upper()


def safe_get(d: Dict[str, Any], path: str, default=None):
    cur = d
    for part in path.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return default
        cur = cur[part]
    return cur


def http_get_json(session: requests.Session, url: str, params: Dict[str, Any], timeout: int = 20) -> Dict[str, Any]:
    r = session.get(url, params=params, timeout=timeout)
    r.raise_for_status()
    return r.json()


def google_lookup(session: requests.Session, isbn: str) -> Optional[Dict[str, Any]]:
    # Query by ISBN
    params = {"q": f"isbn:{isbn}", "maxResults": 1, "printType": "books"}
    data = http_get_json(session, GOOGLE_VOLUMES_URL, params=params)
    items = data.get("items") or []
    if not items:
        return None
    item = items[0]
    info = item.get("volumeInfo") or {}
    return {
        "google_volume_id": item.get("id"),
        "title": info.get("title"),
        "authors": info.get("authors"),
        "description": info.get("description"),
        "categories": info.get("categories"),
        "language": info.get("language"),
        "publishedDate": info.get("publishedDate"),
        "imageLinks": info.get("imageLinks") or {},
    }


def openlibrary_lookup(session: requests.Session, isbn: str) -> Optional[Dict[str, Any]]:
    # jscmd=data gives richer fields
    bibkey = f"ISBN:{isbn}"
    params = {"bibkeys": bibkey, "format": "json", "jscmd": "data"}
    data = http_get_json(session, OPENLIB_BOOKS_URL, params=params)
    entry = data.get(bibkey)
    if not entry:
        return None
    # description can be string or dict in some OL responses, handle both
    desc = entry.get("description")
    if isinstance(desc, dict):
        desc = desc.get("value")
    subjects = entry.get("subjects") or []
    subjects_names = []
    for s in subjects:
        if isinstance(s, dict) and "name" in s:
            subjects_names.append(s["name"])
        elif isinstance(s, str):
            subjects_names.append(s)
    return {
        "openlibrary_key": entry.get("key"),
        "description": desc,
        "subjects": subjects_names,
        "cover": entry.get("cover") or {},
    }


def openlibrary_cover_url(isbn: str, size: str = "L") -> str:
    return OPENLIB_COVERS_URL.format(isbn=isbn, size=size)


def url_exists(session: requests.Session, url: str, timeout: int = 15) -> bool:
    try:
        r = session.head(url, timeout=timeout, allow_redirects=True)
        return r.status_code == 200
    except Exception:
        return False


def load_cache(path: str) -> Dict[str, Any]:
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_cache(path: str, cache: Dict[str, Any]) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def enrich_one(session: requests.Session, isbn: str) -> Dict[str, Any]:
    isbn = clean_isbn(isbn)
    out: Dict[str, Any] = {"isbn": isbn, "fetched_at": now_iso()}

    g = google_lookup(session, isbn)
    if g:
        out["google"] = g

    ol = openlibrary_lookup(session, isbn)
    if ol:
        out["openlibrary"] = ol

    # Pick description
    desc = None
    desc_source = None
    if g and g.get("description"):
        desc = g.get("description")
        desc_source = "google_books"
    elif ol and ol.get("description"):
        desc = ol.get("description")
        desc_source = "open_library"

    out["description"] = desc
    out["description_source"] = desc_source

    # Pick genres or categories
    categories = (g or {}).get("categories")
    subjects = (ol or {}).get("subjects")
    out["categories_raw"] = categories
    out["subjects_raw"] = subjects

    # Pick cover URL
    cover_url = None
    cover_source = None

    # Prefer Open Library covers by ISBN when it exists
    ol_cover = openlibrary_cover_url(isbn, "L")
    if url_exists(session, ol_cover):
        cover_url = ol_cover
        cover_source = "open_library_covers"
    else:
        # Fallback to Google Books imageLinks
        if g:
            links = g.get("imageLinks") or {}
            # Prefer larger if present
            cover_url = links.get("thumbnail") or links.get("smallThumbnail")
            if cover_url:
                cover_source = "google_books"

    out["cover_image_url"] = cover_url
    out["cover_source"] = cover_source
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--queue", required=True, help="CSV of rows to enrich. Must include book_key and isbn columns.")
    ap.add_argument("--books", required=True, help="Your book_records CSV to update.")
    ap.add_argument("--out", required=True, help="Output enriched book_records CSV.")
    ap.add_argument("--cache", default="enrichment_cache.json", help="Path to JSON cache.")
    ap.add_argument("--sleep", type=float, default=0.35, help="Seconds to sleep between requests. Tune up if you hit rate limits.")
    ap.add_argument("--user_agent", default="AIWithZachBookEnricher/1.0 (contact: you@example.com)", help="User-Agent header.")
    args = ap.parse_args()

    cache = load_cache(args.cache)

    session = requests.Session()
    session.headers.update({"User-Agent": args.user_agent})

    # Read queue
    queue_rows = []
    with open(args.queue, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            queue_rows.append(row)

    results: Dict[str, Any] = {}

    for i, row in enumerate(queue_rows, start=1):
        book_key = row.get("book_key") or ""
        isbn = clean_isbn(row.get("isbn") or "")
        if not isbn:
            # You can add a title+author fallback here later, but ISBN-based is most reliable.
            continue

        if isbn in cache:
            results[book_key] = cache[isbn]
        else:
            try:
                enriched = enrich_one(session, isbn)
                cache[isbn] = enriched
                results[book_key] = enriched
                save_cache(args.cache, cache)
            except Exception as e:
                results[book_key] = {"isbn": isbn, "error": str(e), "fetched_at": now_iso()}
            time.sleep(args.sleep)

        if i % 100 == 0:
            print(f"Processed {i}/{len(queue_rows)}")

    # Load books and update
    import pandas as pd
    books = pd.read_csv(args.books, low_memory=False)

    # Create mapping frames
    rows_out = []
    for bk, payload in results.items():
        rows_out.append({
            "book_key": bk,
            "enriched_isbn": payload.get("isbn"),
            "description_new": payload.get("description"),
            "description_source_new": payload.get("description_source"),
            "categories_raw_new": json.dumps(payload.get("categories_raw"), ensure_ascii=False) if payload.get("categories_raw") is not None else "",
            "subjects_raw_new": json.dumps(payload.get("subjects_raw"), ensure_ascii=False) if payload.get("subjects_raw") is not None else "",
            "cover_image_url_new": payload.get("cover_image_url") or "",
            "cover_source_new": payload.get("cover_source") or "",
            "google_volume_id": safe_get(payload, "google.google_volume_id", ""),
            "openlibrary_key": safe_get(payload, "openlibrary.openlibrary_key", ""),
            "fetched_at": payload.get("fetched_at"),
            "error": payload.get("error", ""),
        })
    enriched_df = pd.DataFrame(rows_out)

    merged = books.merge(enriched_df, how="left", on="book_key")

    # Fill description if missing or short
    def is_missing_desc(x: Any) -> bool:
        s = "" if pd.isna(x) else str(x)
        return len(s.strip()) < 80

    if "description_raw" not in merged.columns:
        merged["description_raw"] = ""

    # Add provenance columns
    if "description_source" not in merged.columns:
        merged["description_source"] = ""
    if "cover_image_source" not in merged.columns:
        merged["cover_image_source"] = ""

    mask_desc = merged["description_raw"].apply(is_missing_desc) & (merged["description_new"].fillna("").astype(str).str.len() >= 80)
    merged.loc[mask_desc, "description_raw"] = merged.loc[mask_desc, "description_new"]
    merged.loc[mask_desc, "description_source"] = merged.loc[mask_desc, "description_source_new"].fillna("")

    # Fill cover if missing
    def is_missing_cover(x: Any) -> bool:
        s = "" if pd.isna(x) else str(x)
        return len(s.strip()) == 0

    if "cover_image_url" not in merged.columns:
        merged["cover_image_url"] = ""

    mask_cover = merged["cover_image_url"].apply(is_missing_cover) & (merged["cover_image_url_new"].fillna("").astype(str).str.len() > 0)
    merged.loc[mask_cover, "cover_image_url"] = merged.loc[mask_cover, "cover_image_url_new"]
    merged.loc[mask_cover, "cover_image_source"] = merged.loc[mask_cover, "cover_source_new"].fillna("")

    # Optional: keep raw categories and subjects
    if "categories_raw" not in merged.columns:
        merged["categories_raw"] = ""
    if "subjects_raw" not in merged.columns:
        merged["subjects_raw"] = ""

    mask_cat = merged["categories_raw"].fillna("").astype(str).str.len() == 0
    merged.loc[mask_cat, "categories_raw"] = merged.loc[mask_cat, "categories_raw_new"].fillna("")

    mask_sub = merged["subjects_raw"].fillna("").astype(str).str.len() == 0
    merged.loc[mask_sub, "subjects_raw"] = merged.loc[mask_sub, "subjects_raw_new"].fillna("")

    # Write output
    merged.to_csv(args.out, index=False)
    print(f"Wrote {args.out}")

    # Also write enrichment results for debugging
    debug_out = os.path.splitext(args.out)[0] + "_enrichment_results.csv"
    enriched_df.to_csv(debug_out, index=False)
    print(f"Wrote {debug_out}")


if __name__ == "__main__":
    main()
