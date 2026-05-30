import pytest
from app.services.output_compare_service import OutputCompareService

def test_compare_strict():
    # Identical structures should always match
    assert OutputCompareService.compare("[1, 2, 3]", "[1, 2, 3]", "some-prob")
    assert OutputCompareService.compare('{"a": 1, "b": 2}', '{"b": 2, "a": 1}', "some-prob")
    # Order matters for standard problems
    assert not OutputCompareService.compare("[1, 2, 3]", "[3, 2, 1]", "some-prob")

def test_compare_three_sum_order_agnostic():
    # 3Sum should be order-agnostic for both outer elements (triplets) and inner elements
    expected = "[[-1, -1, 2], [-1, 0, 1]]"
    
    # 1. Same triplets, permuted outer order
    actual1 = "[[-1, 0, 1], [-1, -1, 2]]"
    assert OutputCompareService.compare(expected, actual1, "3sum")
    assert OutputCompareService.compare(expected, actual1, "three-sum")
    assert OutputCompareService.compare(expected, actual1, "3-sum")
    
    # 2. Permuted inner order
    actual2 = "[[1, 0, -1], [2, -1, -1]]"
    assert OutputCompareService.compare(expected, actual2, "3sum")
    
    # 3. Completely shuffled
    actual3 = "[[2, -1, -1], [0, 1, -1]]"
    assert OutputCompareService.compare(expected, actual3, "3sum")

    # 4. Incorrect triplets should fail
    actual_fail = "[[-1, -1, 2], [-1, 0, 2]]"
    assert not OutputCompareService.compare(expected, actual_fail, "3sum")

def test_compare_two_sum_order_agnostic():
    expected = "[0, 1]"
    actual = "[1, 0]"
    # Two Sum slug should match permuted lists
    assert OutputCompareService.compare(expected, actual, "two-sum")
    assert not OutputCompareService.compare(expected, "[0, 2]", "two-sum")

def test_compare_group_anagrams_order_agnostic():
    expected = '[["bat"], ["nat", "tan"], ["ate", "eat", "tea"]]'
    
    # Different group order and inner order
    actual = '[["ate", "eat", "tea"], ["bat"], ["tan", "nat"]]'
    assert OutputCompareService.compare(expected, actual, "group-anagrams")
    
    # Shuffled elements in groups
    actual2 = '[["tan", "nat"], ["eat", "tea", "ate"], ["bat"]]'
    assert OutputCompareService.compare(expected, actual2, "group-anagrams")

    # Incorrect groups should fail
    actual_fail = '[["bat"], ["nat", "tan"], ["ate", "eat", "xyz"]]'
    assert not OutputCompareService.compare(expected, actual_fail, "group-anagrams")
