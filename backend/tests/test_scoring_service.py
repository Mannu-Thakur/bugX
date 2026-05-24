import pytest
from unittest.mock import AsyncMock
from app.services.scoring_service import ScoringService

def test_calculate_score_accepted_exact():
    # Passed all, no runtime_ms
    score = ScoringService.calculate_score(
        status="ACCEPTED",
        passed_weight=10,
        total_weight=10,
        runtime_ms=None,
        time_limit_ms=2000,
        score_base=100,
        bonus_max=20
    )
    assert score == 100

def test_calculate_score_runtime_bonus():
    # Passed all, runtime_ms is 500ms out of 2000ms
    # ratio = 500/2000 = 0.25
    # bonus = 20 * (1 - 0.25) = 20 * 0.75 = 15
    # total = 100 + 15 = 115
    score = ScoringService.calculate_score(
        status="ACCEPTED",
        passed_weight=10,
        total_weight=10,
        runtime_ms=500,
        time_limit_ms=2000,
        score_base=100,
        bonus_max=20
    )
    assert score == 115

def test_calculate_score_not_accepted():
    # Wrong answer status
    score = ScoringService.calculate_score(
        status="WRONG_ANSWER",
        passed_weight=10,
        total_weight=10,
        runtime_ms=500,
        time_limit_ms=2000,
        score_base=100,
        bonus_max=20
    )
    assert score == 0

def test_calculate_score_partial_credit():
    # Passed weight < total weight
    score = ScoringService.calculate_score(
        status="ACCEPTED",
        passed_weight=9,
        total_weight=10,
        runtime_ms=500,
        time_limit_ms=2000,
        score_base=100,
        bonus_max=20
    )
    assert score == 0

def test_calculate_score_invalid_config():
    with pytest.raises(ValueError):
        ScoringService.calculate_score(
            status="ACCEPTED",
            passed_weight=10,
            total_weight=10,
            runtime_ms=500,
            time_limit_ms=0,
            score_base=100,
            bonus_max=20
        )
