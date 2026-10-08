from datetime import time

from app.services.attendance_service import status_for_check_in


def test_check_in_before_cutoff_is_present() -> None:
    assert status_for_check_in(time(7, 59, 59), time(8, 0)) == "present"


def test_check_in_at_or_after_cutoff_is_late() -> None:
    assert status_for_check_in(time(8, 0), time(8, 0)) == "late"
    assert status_for_check_in(time(8, 1), time(8, 0)) == "late"