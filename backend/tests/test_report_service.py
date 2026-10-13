from datetime import date, time
from decimal import Decimal
from types import SimpleNamespace

from app.services.report_service import (
    daily_report_rows,
    report_rows,
    student_totals,
    week_bounds,
)


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
        "attendance_days": 0,
    }]


class AnswersDatabase:
    """Answers each query the report builder issues, in call order."""

    def __init__(self, *answers):
        self.answers = [iter(answer) for answer in answers]

    def _next_answer(self):
        return self.answers.pop(0)

    def execute(self, _query):
        return self._next_answer()

    def scalars(self, _query):
        return self._next_answer()


def test_attendance_days_repeats_the_student_total_on_every_row() -> None:
    student = SimpleNamespace(id=8, student_code="ST008", first_name="ដារ៉ា", last_name="សុខ")
    classroom = SimpleNamespace(class_name="ថ្នាក់ទី ១០A")
    attendance = SimpleNamespace(
        id=1,
        student_id=8,
        attendance_date=date(2026, 10, 8),
        check_in_time=time(7, 30),
        check_out_time=None,
        status="present",
        confidence=Decimal("91.00"),
    )
    database = AnswersDatabase([(student, classroom)], [attendance], [(8, 10)])

    rows = report_rows(database, date(2026, 10, 1), date(2026, 10, 10))

    assert len(rows) == 10
    assert {row["attendance_days"] for row in rows} == {10}
    assert [row["status"] for row in rows].count("present") == 1
    assert rows[7]["check_in_time"] == time(7, 30)


def test_student_totals_gives_one_row_per_student_with_a_pass_flag() -> None:
    student = SimpleNamespace(id=8, student_code="ST008", first_name="ដារ៉ា", last_name="សុខ")
    classroom = SimpleNamespace(class_name="ថ្នាក់ទី ១០A")
    database = AnswersDatabase([(8, "present", 3), (8, "late", 1)], [(student, classroom)])

    [row] = student_totals(
        database, date(2026, 10, 5), date(2026, 10, 11), pass_attendance_times=4
    )

    assert row["attendance_days"] == 4
    assert row["absent_days"] == 3
    assert row["passes"] is True


def test_a_student_below_the_required_attendance_times_fails() -> None:
    student = SimpleNamespace(id=8, student_code="ST008", first_name="ដារ៉ា", last_name="សុខ")
    classroom = SimpleNamespace(class_name="ថ្នាក់ទី ១០A")
    database = AnswersDatabase([(8, "present", 3)], [(student, classroom)])

    [row] = student_totals(
        database, date(2026, 10, 5), date(2026, 10, 11), pass_attendance_times=4
    )

    assert row["passes"] is False


def test_week_bounds_starts_on_monday() -> None:
    assert week_bounds(date(2026, 10, 8)) == (date(2026, 10, 5), date(2026, 10, 11))
    assert week_bounds(date(2026, 10, 11)) == (date(2026, 10, 5), date(2026, 10, 11))
