import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.api.ai_api import _workbook_context
from app.models.database import Base, Workbook, WorkbookSheet


def make_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return Session(engine)


def test_ai_context_reads_latest_workbook_cells():
    with make_session() as db:
        workbook = Workbook(title="Báo cáo bán hàng")
        db.add(workbook)
        db.flush()
        db.add(WorkbookSheet(
            workbook_id=workbook.id,
            name="Hôm nay",
            sheet_order=0,
            data={"A1": {"v": "Doanh thu"}, "B1": {"v": 1250000}}
        ))
        db.commit()

        context = _workbook_context(db, workbook.id)

        assert "Báo cáo bán hàng" in context
        assert "Doanh thu" in context
        assert "1250000" in context
        assert "computed_numeric_column_summary" in context
        assert "numeric_sum" in context


def test_ai_context_rejects_unknown_workbook():
    with make_session() as db:
        try:
            _workbook_context(db, 999)
        except HTTPException as exc:
            assert exc.status_code == 404
        else:
            raise AssertionError("Expected 404 for an unknown workbook")
