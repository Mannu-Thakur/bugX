import pytest
from app.services.google_importer import GoogleImporter

@pytest.mark.parametrize(
    "input_val, expected",
    [
        ("google:3161. Block Placement Queries", "Block Placement Queries"),
        ("google: 3161 - Block Placement Queries", "Block Placement Queries"),
        ("3161. Block Placement Queries", "Block Placement Queries"),
        ("3sum", "3sum"),
        ("15. 3sum", "3sum"),
        ("google: 1-bit and 2-bit characters", "1 bit and 2 bit characters"),
        ("google:717. 1-bit and 2-bit characters", "1 bit and 2 bit characters"),
        ("  google:  :3161. Block Placement Queries", "Block Placement Queries"),
        ("3 sum", "3 sum"),
        ("4 sum", "4 sum"),
        ("two-sum", "two sum"),
        ("gfg:top view of the binary tree", "gfg:top view of the binary tree"), # GoogleImporter only strips google prefixes
    ]
)
def test_google_importer_normalize_query(input_val, expected):
    cleaned = GoogleImporter._normalize_query(input_val)
    assert cleaned == expected
