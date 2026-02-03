#!/usr/bin/env python3
"""
Standardize all dates to YYYY-MM-DD format for proper sorting.
"""
import pandas as pd
from datetime import datetime
import argparse

def parse_date(date_str):
    """Parse date from various formats and return YYYY-MM-DD."""
    if pd.isna(date_str) or date_str == '':
        return None
    
    date_str = str(date_str).strip()
    
    # Try different date formats
    formats = [
        '%Y/%m/%d',    # 2025/12/30
        '%Y/%m/%-d',   # 2025/12/6 (no leading zero)
        '%m/%d/%Y',    # 9/30/2020
        '%-m/%-d/%Y',  # 9/30/2020 (no leading zeros)
        '%Y-%m-%d',    # 2025-12-30
        '%m-%d-%Y',    # 9-30-2020
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.strftime('%Y-%m-%d')
        except:
            continue
    
    # If no format works, try parsing with pandas
    try:
        dt = pd.to_datetime(date_str)
        return dt.strftime('%Y-%m-%d')
    except:
        print(f"  ⚠ Could not parse date: {date_str}")
        return date_str

def main():
    parser = argparse.ArgumentParser(description='Standardize dates to YYYY-MM-DD')
    parser.add_argument('--input', default='book_records_v4_enriched.csv', help='Input CSV')
    parser.add_argument('--output', default='book_records_v4_enriched.csv', help='Output CSV')
    args = parser.parse_args()
    
    print("="*70)
    print("📅 Standardizing Dates to YYYY-MM-DD")
    print("="*70)
    
    # Load data
    df = pd.read_csv(args.input)
    
    # Standardize date_read column
    if 'date_read' in df.columns:
        print(f"\n[1/2] Processing date_read column...")
        original_dates = df['date_read'].copy()
        df['date_read'] = df['date_read'].apply(parse_date)
        
        # Count changes
        changed = (original_dates != df['date_read']).sum()
        print(f"   ✓ Standardized {changed} dates")
        
        # Show examples
        if changed > 0:
            changed_idx = (original_dates != df['date_read']) & df['date_read'].notna()
            if changed_idx.any():
                print("\n   Examples:")
                for idx in df[changed_idx].head(5).index:
                    print(f"     {original_dates[idx]} → {df.loc[idx, 'date_read']}")
    
    # Save
    print(f"\n[2/2] Saving to {args.output}...")
    df.to_csv(args.output, index=False)
    
    print(f"\n✅ Complete!")
    print(f"📁 Saved to: {args.output}")

if __name__ == '__main__':
    main()
