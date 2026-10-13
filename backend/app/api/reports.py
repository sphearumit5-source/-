from datetime import date, timedelta
from io import BytesIO
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
import xlsxwriter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.dependencies import CurrentUser, DatabaseSession
from app.schemas.settings import SchoolSettings
from app.services.report_service import (
    daily_report_rows,
    daily_summary,
    iter_report_rows,
    report_rows,
    student_totals,
    summary_by_date,
    week_bounds,
)
from app.utils.helpers import read_json_object

router = APIRouter(prefix="/api/reports", tags=["របាយការណ៍"])


@router.get("/daily")
def daily_report(
    database: DatabaseSession,
    _: CurrentUser,
    report_date: date = Query(default_factory=date.today, alias="date"),
    class_id: int | None = Query(default=None, gt=0),
) -> dict[str, object]:
    summary = daily_summary(database, report_date, class_id)
    records = daily_report_rows(database, report_date, class_id)
    return {"date": report_date, **summary, "records": records}


@router.get("/monthly")
def monthly_report(
    database: DatabaseSession,
    _: CurrentUser,
    year: int = Query(ge=2000, le=2200),
    month: int = Query(ge=1, le=12),
    class_id: int | None = Query(default=None, gt=0),
) -> dict[str, object]:
    start_date = date(year, month, 1)
    end_date = date(year + (month == 12), month % 12 + 1, 1) - timedelta(days=1)
    return _summary_report(
        database,
        start_date,
        end_date,
        class_id,
        _school_settings().pass_attendance_times_monthly,
    )


@router.get("/weekly")
def weekly_report(
    database: DatabaseSession,
    _: CurrentUser,
    report_date: date = Query(default_factory=date.today, alias="date"),
    class_id: int | None = Query(default=None, gt=0),
) -> dict[str, object]:
    start_date, end_date = week_bounds(report_date)
    return _summary_report(
        database,
        start_date,
        end_date,
        class_id,
        _school_settings().pass_attendance_times_weekly,
    )


def _summary_report(
    database: Session,
    start_date: date,
    end_date: date,
    class_id: int | None,
    pass_attendance_times: int,
) -> dict[str, object]:
    """One row per student for the range, plus the per-day totals."""
    return {
        "start_date": start_date,
        "end_date": end_date,
        "pass_attendance_times": pass_attendance_times,
        "students": student_totals(
            database, start_date, end_date, class_id, None, pass_attendance_times
        ),
        "daily": [
            {"date": current_day, **summary}
            for current_day, summary in summary_by_date(database, start_date, end_date, class_id).items()
        ],
    }


def _school_settings() -> SchoolSettings:
    configuration = get_settings()
    return SchoolSettings.model_validate(
        read_json_object(configuration.school_settings_file, SchoolSettings().model_dump(mode="json"))
    )


def _pass_attendance_times(start_date: date, end_date: date) -> int:
    settings = _school_settings()
    if (end_date - start_date).days < 7:
        return settings.pass_attendance_times_weekly
    return settings.pass_attendance_times_monthly


@router.get("/student")
def student_report(
    database: DatabaseSession,
    _: CurrentUser,
    start_date: date,
    end_date: date,
    student_id: int = Query(gt=0),
) -> dict[str, object]:
    if end_date < start_date:
        raise HTTPException(status_code=422, detail="កាលបរិច្ឆេទបញ្ចប់ត្រូវក្រោយកាលបរិច្ឆេទចាប់ផ្ដើម។")
    return {
        "student_id": student_id,
        "start_date": start_date,
        "end_date": end_date,
        "records": report_rows(database, start_date, end_date, student_id=student_id),
    }


@router.get("/class")
def class_report(
    database: DatabaseSession,
    _: CurrentUser,
    start_date: date,
    end_date: date,
    class_id: int = Query(gt=0),
) -> dict[str, object]:
    if end_date < start_date:
        raise HTTPException(status_code=422, detail="កាលបរិច្ឆេទបញ្ចប់ត្រូវក្រោយកាលបរិច្ឆេទចាប់ផ្ដើម។")
    return {
        "class_id": class_id,
        "start_date": start_date,
        "end_date": end_date,
        "records": report_rows(database, start_date, end_date, class_id=class_id),
    }


@router.get("/export")
def export_report(
    database: DatabaseSession,
    _: CurrentUser,
    start_date: date,
    end_date: date,
    format: Literal["pdf", "excel"],
    class_id: int | None = Query(default=None, gt=0),
    student_id: int | None = Query(default=None, gt=0),
) -> StreamingResponse:
    if end_date < start_date:
        raise HTTPException(status_code=422, detail="កាលបរិច្ឆេទបញ្ចប់ត្រូវក្រោយកាលបរិច្ឆេទចាប់ផ្ដើម។")
    pass_attendance_times = _pass_attendance_times(start_date, end_date)
    totals = student_totals(database, start_date, end_date, class_id, student_id, pass_attendance_times)
    records = iter_report_rows(database, start_date, end_date, class_id, student_id)
    output = BytesIO()
    columns = (
        ("student_code", "លេខសម្គាល់"),
        ("student_name", "ឈ្មោះសិស្ស"),
        ("class_name", "ថ្នាក់"),
        ("attendance_date", "កាលបរិច្ឆេទ"),
        ("check_in_time", "ម៉ោងចូល"),
        ("check_out_time", "ម៉ោងចេញ"),
        ("status", "ស្ថានភាព"),
        ("confidence", "ភាពស្រដៀងមុខ"),
        ("attendance_days", "ចំនួនវត្តមានសរុប"),
    )
    summary_columns = (
        ("student_code", "លេខសម្គាល់"),
        ("student_name", "ឈ្មោះសិស្ស"),
        ("class_name", "ថ្នាក់"),
        ("attendance_days", "ចំនួនមានវត្តមាន (ដង)"),
        ("present_days", "ចំនួនថ្ងៃមានវត្តមាន"),
        ("late_days", "ចំនួនថ្ងៃមកយឺត"),
        ("absent_days", "ចំនួនថ្ងៃអវត្តមាន"),
        ("total_days", "ចំនួនថ្ងៃសរុប"),
        ("attendance_rate", "អត្រាវត្តមាន (%)"),
        ("passes", "លទ្ធផល"),
    )
    title = f"របាយការណ៍វត្តមានសិស្ស ({start_date} ដល់ {end_date})"
    requirement = f"លក្ខខណ្ឌជាប់៖ មានវត្តមានយ៉ាងតិច {pass_attendance_times} ដង"

    if format == "excel":
        # Constant-memory mode streams rows straight to the file, so large
        # exports stay fast and flat in RAM.
        workbook = xlsxwriter.Workbook(output, {"constant_memory": True, "in_memory": True})
        summary = workbook.add_worksheet("សង្ខេបតាមសិស្ស")
        summary.freeze_panes(1, 0)
        summary.write_row(0, 0, [label for _, label in summary_columns])
        summary_last_row = 0
        for row_index, student_summary in enumerate(totals, start=1):
            summary.write_row(row_index, 0, [_export_value(key, student_summary.get(key)) for key, _ in summary_columns])
            summary_last_row = row_index
        summary.autofilter(0, 0, summary_last_row, len(summary_columns) - 1)

        sheet = workbook.add_worksheet("របាយការណ៍វត្តមាន")
        sheet.freeze_panes(1, 0)
        sheet.write_row(0, 0, [label for _, label in columns])
        last_row = 0
        for row_index, record in enumerate(records, start=1):
            sheet.write_row(row_index, 0, [_export_value(key, record.get(key)) for key, _ in columns])
            last_row = row_index
        sheet.autofilter(0, 0, last_row, len(columns) - 1)
        workbook.close()
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = "attendance-report.xlsx"
    else:
        font_path = get_settings().khmer_font_path
        if not font_path.is_file():
            raise HTTPException(status_code=503, detail="មិនទាន់មាន Font ខ្មែរ។ សូមរត់ python scripts/download_face_models.py។")
        font_name = "NotoSansKhmer"
        if font_name not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(TTFont(font_name, str(font_path), shapable=True))
        document = SimpleDocTemplate(output, pagesize=landscape(A4), rightMargin=24, leftMargin=24)
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle("KhmerReportTitle", parent=styles["Title"], fontName=font_name)
        note_style = ParagraphStyle("KhmerReportNote", parent=styles["Normal"], fontName=font_name, fontSize=9)
        content = [
            Paragraph(title, title_style),
            Spacer(1, 6),
            Paragraph(requirement, note_style),
            Spacer(1, 12),
        ]
        for headings, rows in (
            (summary_columns, totals),
            (columns, records),
        ):
            table_rows = [[label for _, label in headings]]
            table_rows.extend([[_export_value(key, row.get(key)) for key, _ in headings] for row in rows])
            table = Table(table_rows, repeatRows=1)
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#174ea6")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("FONTNAME", (0, 0), (-1, -1), font_name),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]))
            content.append(table)
            content.append(Spacer(1, 18))
        document.build(content)
        media_type = "application/pdf"
        filename = "attendance-report.pdf"

    output.seek(0)
    return StreamingResponse(
        output,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _export_value(key: str, value: object) -> str:
    if value is None:
        return "-"
    if key == "status":
        return {"present": "មានវត្តមាន", "absent": "អវត្តមាន", "late": "មកយឺត"}.get(str(value), str(value))
    if key == "passes":
        return "ជាប់" if value else "មិនជាប់"
    return str(value)