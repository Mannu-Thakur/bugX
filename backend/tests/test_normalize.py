import re

def clean_query(url_or_slug: str) -> str:
    query = url_or_slug.strip()
    
    # Strip google: or google.com or google prefix
    if "google.com" in query.lower() or "google" in query.lower():
        query = re.sub(r"^google:", "", query, flags=re.IGNORECASE)
        query = re.sub(r"^https?://(www\.)?", "", query, flags=re.IGNORECASE)
        query = re.sub(r"^google\.com/(search\?q=|problems/)?", "", query, flags=re.IGNORECASE)
        query = re.sub(r"\bgoogle\b", "", query, flags=re.IGNORECASE)

    # Strip any leading colon or symbols left over
    query = re.sub(r"^[:\s\-\.\#\u2013\u2014]+", "", query)

    # Strip leading question number (e.g. "3161. ", "3161: ", "3161 ")
    # We DO NOT strip if it's directly followed by a dash (like "1-bit") to preserve title terms.
    query = re.sub(r"^\d+[\s\.:]+", "", query)

    # Strip any leading dashes or punctuation again in case the number was followed by a separator like " - "
    query = re.sub(r"^[:\s\-\.\#\u2013\u2014]+", "", query)

    # Also replace delimiters with spaces
    query = query.replace("+", " ").replace("/", " ").replace("-", " ")
    query = re.sub(r"\s+", " ", query).strip()
    
    return query

test_cases = [
    "google:3161. Block Placement Queries",
    "google: 3161 - Block Placement Queries",
    "3161. Block Placement Queries",
    "3sum",
    "15. 3sum",
    "google: 1-bit and 2-bit characters",
    "google:717. 1-bit and 2-bit characters",
    "  google:  :3161. Block Placement Queries"
]

for tc in test_cases:
    print(f"Original: {repr(tc)} => Cleaned: {repr(clean_query(tc))}")
