#!/usr/bin/env python3
"""
Impute missing read dates for books in series based on when other books in that series were read.
This updates the raw Goodreads CSV before the main pipeline runs.
"""

import pandas as pd
import re
from datetime import datetime, timedelta

INPUT_FILE = '/Users/zachstanford/Development/smart-books-ai/data/goodreads_library_export.csv'
OUTPUT_FILE = '/Users/zachstanford/Development/smart-books-ai/data/goodreads_library_export.csv'

def extract_series_info(title):
    """Extract series name and book number from title like 'Book Title (Series Name, #3)'"""
    match = re.search(r'\(([^,]+),\s*#?(\d+(?:\.\d+)?)\)$', title)
    if match:
        return match.group(1).strip(), float(match.group(2))
    return None, None

def main():
    print("=" * 70)
    print("📅 Imputing Missing Read Dates")
    print("=" * 70)
    
    # Load data
    df = pd.read_csv(INPUT_FILE)
    read_books = df[df['Exclusive Shelf'] == 'read'].copy()
    
    print(f"\n[1/4] Analyzing read books...")
    print(f"   Total read books: {len(read_books)}")
    
    # Find books missing dates
    missing_dates = read_books[read_books['Date Read'].isna()]
    print(f"   Missing date_read: {len(missing_dates)}")
    
    # Extract series info
    read_books['series_name'], read_books['series_num'] = zip(
        *read_books['Title'].apply(extract_series_info)
    )
    
    # Group by series and find date patterns
    series_books = read_books[read_books['series_name'].notna()]
    series_with_dates = series_books[series_books['Date Read'].notna()]
    
    print(f"\n[2/4] Finding series patterns...")
    
    # Create series date lookup
    series_dates = {}
    for series in series_with_dates['series_name'].unique():
        series_data = series_with_dates[series_with_dates['series_name'] == series]
        dates = series_data[['series_num', 'Date Read']].values.tolist()
        if dates:
            series_dates[series] = sorted(dates, key=lambda x: x[0])
    
    print(f"   Found {len(series_dates)} series with date patterns")
    
    # Impute dates
    print(f"\n[3/4] Imputing dates...")
    imputed_count = 0
    imputed_books = []
    
    for idx, row in read_books.iterrows():
        if pd.isna(row['Date Read']) and row['series_name'] in series_dates:
            series = row['series_name']
            book_num = row['series_num']
            known_dates = series_dates[series]
            
            # Find closest known date and estimate
            closest_date = None
            min_diff = float('inf')
            closest_num = None
            
            for num, date_str in known_dates:
                diff = abs(num - book_num)
                if diff < min_diff:
                    min_diff = diff
                    closest_date = date_str
                    closest_num = num
            
            if closest_date:
                # Parse date and adjust based on book number difference
                try:
                    base_date = datetime.strptime(closest_date, '%Y/%m/%d')
                    # Estimate ~30 days per book in series
                    days_diff = int((book_num - closest_num) * 30)
                    imputed_date = base_date + timedelta(days=days_diff)
                    imputed_str = imputed_date.strftime('%Y/%m/%d')
                    
                    # Update the dataframe
                    df.loc[df['Title'] == row['Title'], 'Date Read'] = imputed_str
                    imputed_count += 1
                    imputed_books.append({
                        'title': row['Title'][:50],
                        'series': series,
                        'imputed_date': imputed_str,
                        'based_on': f"#{closest_num} read {closest_date}"
                    })
                except:
                    pass
    
    # Also handle non-series books - impute based on rating pattern or mark as "estimated"
    # For Harry Potter specifically
    hp_missing = read_books[
        (read_books['Title'].str.contains('Harry Potter', case=False)) & 
        (read_books['Date Read'].isna())
    ]
    
    for idx, row in hp_missing.iterrows():
        title = row['Title']
        # Harry Potter series reading order estimation based on known HP dates
        # User read HP1 on 2017/06/10, HP3 on 2017/07/18, HP4 on 2017/08/08, HP5 on 2017/09/22
        imputed = None
        if 'Chamber of Secrets' in title:  # HP2
            imputed = '2017/06/25'  # Between HP1 and HP3
        elif 'Half-Blood Prince' in title:  # HP6
            imputed = '2017/10/15'  # After HP5
        elif 'Deathly Hallows' in title:  # HP7
            imputed = '2017/11/01'  # After HP6
        
        if imputed and df.loc[df['Title'] == title, 'Date Read'].isna().any():
            df.loc[df['Title'] == title, 'Date Read'] = imputed
            imputed_count += 1
            imputed_books.append({
                'title': title[:50],
                'series': 'Harry Potter',
                'imputed_date': imputed,
                'based_on': 'HP reading sequence'
            })
    
    # Narnia books - user read Lion/Witch on 2021/03/10, Horse/Boy on 2021/05/15
    narnia_missing = read_books[
        (read_books['Title'].str.contains('Narnia|Magician.*Nephew|Prince Caspian|Dawn Treader|Silver Chair|Last Battle', case=False)) & 
        (read_books['Date Read'].isna())
    ]
    
    for idx, row in narnia_missing.iterrows():
        title = row['Title']
        imputed = None
        if "Magician's Nephew" in title:  # Book 1
            imputed = '2021/02/20'  # Before Lion/Witch
        elif 'Prince Caspian' in title:  # Book 2
            imputed = '2021/03/25'  # After Lion/Witch
        elif 'Dawn Treader' in title:  # Book 3
            imputed = '2021/04/10'
        elif 'Silver Chair' in title:  # Book 4
            imputed = '2021/04/25'
        elif 'Last Battle' in title:  # Book 7
            imputed = '2021/06/01'  # After Horse/Boy
        
        if imputed and df.loc[df['Title'] == title, 'Date Read'].isna().any():
            df.loc[df['Title'] == title, 'Date Read'] = imputed
            imputed_count += 1
            imputed_books.append({
                'title': title[:50],
                'series': 'Chronicles of Narnia',
                'imputed_date': imputed,
                'based_on': 'Narnia reading sequence'
            })
    
    print(f"   ✓ Imputed {imputed_count} dates")
    
    for book in imputed_books:
        print(f"      • {book['title']}")
        print(f"        → {book['imputed_date']} (based on: {book['based_on']})")
    
    # Save
    print(f"\n[4/4] Saving updated file...")
    df.to_csv(OUTPUT_FILE, index=False)
    print(f"   ✓ Saved: {OUTPUT_FILE}")
    
    # Verify
    remaining_missing = df[(df['Exclusive Shelf'] == 'read') & (df['Date Read'].isna())]
    print(f"\n   Remaining books without dates: {len(remaining_missing)}")
    if len(remaining_missing) > 0:
        print("   These books still need dates:")
        for _, row in remaining_missing.head(10).iterrows():
            print(f"      • {row['Title'][:60]}")
    
    print("\n" + "=" * 70)
    print("✅ Date imputation complete!")
    print("=" * 70)

if __name__ == '__main__':
    main()
