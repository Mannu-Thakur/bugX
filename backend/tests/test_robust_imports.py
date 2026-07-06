import pytest
from app.services.import_utils import (
    normalize_title_aggressive,
    get_search_variants,
    compute_match_score
)
from app.services.leetcode_importer import LeetCodeImporter
from app.services.gfg_importer import GFGImporter

@pytest.mark.parametrize(
    "input_val, expected",
    [
        ("All Subsets XOR Sum", "all subset xor sum"),
        ("All Subsets Xor Sum", "all subset xor sum"),
        ("sum of xor of all possible subsets", "sum of xor of all possible subset"),
        ("Two Sum", "two sum"),
        ("Fruit Into Baskets", "fruit into basket"),
    ]
)
def test_normalize_title_aggressive(input_val, expected):
    assert normalize_title_aggressive(input_val) == expected

def test_search_variants():
    variants = get_search_variants("All Subsets Xor Sum")
    assert "All Subsets Xor Sum" in variants
    assert "all subset xor sum" in variants
    assert "all subset xor sum" in variants

def test_similarity_scoring():
    # Order-independent matching
    score1 = compute_match_score("All Subsets XOR Sum", "Sum of All Subset XOR Totals")
    assert score1 >= 0.80
    
    score2 = compute_match_score("sum of xor of all possible subsets", "All Subsets Xor Sum")
    assert score2 >= 0.80

    score3 = compute_match_score("Two Sum", "two-sum")
    assert score3 >= 0.90
