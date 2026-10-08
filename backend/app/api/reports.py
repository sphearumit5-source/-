from datetime import date, timedelta
from io import BytesIO
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.core.config import get_settings
from app.core.dependencies import CurrentUser, DatabaseSession
from app.services.report_service import daily_report_rows, daily_summary, report_rows

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
    records = report_rows(database, start_date, end_date, class_id)
    daily = [
        {
            "date": current_day,
            **daily_summary(database, current_day, class_id),
        }
        for current_day in (start_date + timedelta(days=offset) for offset in range((end_date - start_date).days + 1))
    ]
    return {"year": year, "month": month, "records": records, "daily": daily}


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
    records = report_rows(database, start_date, end_date, class_id, student_id)
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
    )

    if format == "excel":
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "របាយការណ៍វត្តមាន"
        sheet.append([label for _, label in columns])
        for record in records:
            sheet.append([_export_value(key, record.get(key)) for key, _ in columns])
        sheet.freeze_panes = "A2"
        sheet.auto_filter.ref = sheet.dimensions
        workbook.save(output)
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
        content = [Paragraph("របាយការណ៍វត្តមានសិស្ស", title_style), Spacer(1, 12)]
        rows = [[label for _, label in columns]]
        rows.extend([[_export_value(key, record.get(key)) for key, _ in columns] for record in records])
        table = Table(rows, repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#174ea6")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("FONTNAME", (0, 0), (-1, -1), font_name),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        content.append(table)
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
    return str(value)