import pytest
from unittest.mock import AsyncMock
from app.services.scoring_service import ScoringService

def test_calculate_score_easy_accepted():
    # Easy accepted, passed all
    score = ScoringService.calculate_score(
        status="ACCEPTED",
        passed_weight=10,
        total_weight=10,
        difficulty="EASY"
    )
    assert score == 3

def test_calculate_score_medium_accepted():
    # Medium accepted, passed all
    score = ScoringService.calculate_score(
        status="ACCEPTED",
        passed_weight=10,
        total_weight=10,
        difficulty="MEDIUM"
    )
    assert score == 6

def test_calculate_score_hard_accepted():
    # Hard accepted, passed all
    score = ScoringService.calculate_score(
        status="ACCEPTED",
        passed_weight=10,
        total_weight=10,
        difficulty="HARD"
    )
    assert score == 10

def test_calculate_score_not_accepted():
    # Wrong answer status
    score = ScoringService.calculate_score(
        status="WRONG_ANSWER",
        passed_weight=10,
        total_weight=10,
        difficulty="MEDIUM"
    )
    assert score == 0

def test_calculate_score_partial_credit():
    # Passed weight < total weight
    score = ScoringService.calculate_score(
        status="ACCEPTED",
        passed_weight=9,
        total_weight=10,
        difficulty="HARD"
    )
    assert score == 0
