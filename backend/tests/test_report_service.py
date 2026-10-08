from datetime import date
from types import SimpleNamespace

from app.services.report_service import daily_report_rows


class FakeDatabase:
    def __init__(self, rows):
        self.rows = rows

    def execute(self, _query):
        return self.rows


def test_missing_attendance_is_reported_as_absent() -> None:
    student = SimpleNamespace(
        id=8,
        student_code="ST008",
        first_name="ដារ៉ា",
        last_name="សុខ",
    )
    classroom = SimpleNamespace(class_name="ថ្នាក់ទី ១០A")
    rows = daily_report_rows(FakeDatabase([(student, classroom, None)]), date(2026, 10, 8))
    assert rows == [{
        "id": -8,
        "student_id": 8,
        "student_code": "ST008",
        "student_name": "សុខ ដារ៉ា",
        "class_name": "ថ្នាក់ទី ១០A",
        "attendance_date": date(2026, 10, 8),
        "check_in_time": None,
        "check_out_time": None,
        "status": "absent",
        "confidence": None,
    }]