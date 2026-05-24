import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from scripts.rescore_submission import rescore

@pytest.mark.asyncio
async def test_rescore_argument_validation():
    # If invalid UUID is passed, it should exit with 1
    with patch("sys.exit") as mock_exit:
        await rescore("invalid-uuid")
        mock_exit.assert_called_once_with(1)

@pytest.mark.asyncio
async def test_rescore_not_found():
    # If submission is not found, exit 1
    with patch("sys.exit") as mock_exit, \
         patch("app.repositories.submission_repo.SubmissionRepo.get_by_id", return_value=None):
        await rescore("00000000-0000-0000-0000-000000000000")
        mock_exit.assert_called_once_with(1)
