import io
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from app.core.database import get_db
from app.core.auth import get_current_user, require_roles
from app.models.database import (
    Workbook, WorkbookSheet, SpreadsheetVersion, User, UserRoleEnum, MediaImage
)

router = APIRouter(prefix="/spreadsheets", tags=["Spreadsheets Engine"])

class CreateWorkbookRequest(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = "general"

class SaveSheetDataRequest(BaseModel):
    sheet_id: int
    data: Dict[str, Any] # {"A1": {"v": "100", "f": "=SUM(A2:A5)", "s": {...}}}
    styles: Optional[Dict[str, Any]] = None
    column_widths: Optional[Dict[str, int]] = None
    row_heights: Optional[Dict[str, int]] = None
    comment: Optional[str] = "Lưu tự động"

@router.get("/workbooks")
def list_workbooks(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    wbs = db.query(Workbook).order_by(Workbook.updated_at.desc()).all()
    return [
        {
            "id": wb.id,
            "title": wb.title,
            "description": wb.description,
            "category": wb.category,
            "is_locked": wb.is_locked,
            "sheets_count": len(wb.sheets),
            "updated_at": wb.updated_at.isoformat() if wb.updated_at else None
        }
        for wb in wbs
    ]

@router.get("/workbook/{workbook_id}")
def get_workbook_details(
    workbook_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    wb = db.query(Workbook).filter(Workbook.id == workbook_id).first()
    if not wb:
        raise HTTPException(status_code=404, detail="Không tìm thấy Workbook.")

    sheets = []
    for s in wb.sheets:
        sheets.append({
            "id": s.id,
            "name": s.name,
            "sheet_order": s.sheet_order,
            "row_count": s.row_count,
            "col_count": s.col_count,
            "data": s.data or {},
            "styles": s.styles or {},
            "column_widths": s.column_widths or {},
            "row_heights": s.row_heights or {},
            "frozen_rows": s.frozen_rows,
            "frozen_cols": s.frozen_cols
        })

    return {
        "id": wb.id,
        "title": wb.title,
        "description": wb.description,
        "category": wb.category,
        "is_locked": wb.is_locked,
        "sheets": sheets
    }

@router.post("/workbook/create")
def create_workbook(
    req: CreateWorkbookRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.ADMIN, UserRoleEnum.MANAGER, UserRoleEnum.STAFF))
):
    wb = Workbook(
        title=req.title,
        description=req.description,
        category=req.category,
        created_by_user_id=user.id
    )
    db.add(wb)
    db.flush()

    # Create default first Sheet
    first_sheet = WorkbookSheet(
        workbook_id=wb.id,
        name="Sheet1",
        sheet_order=0,
        row_count=100,
        col_count=26,
        data={}
    )
    db.add(first_sheet)
    db.commit()
    db.refresh(wb)

    return {"success": True, "id": wb.id, "title": wb.title}

@router.post("/save-sheet")
def save_sheet_data(
    req: SaveSheetDataRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.ADMIN, UserRoleEnum.MANAGER, UserRoleEnum.STAFF))
):
    sheet = db.query(WorkbookSheet).filter(WorkbookSheet.id == req.sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Không tìm thấy Sheet.")

    if sheet.workbook.is_locked and user.role not in [UserRoleEnum.SUPER_ADMIN, UserRoleEnum.ADMIN]:
        raise HTTPException(status_code=403, detail="Bảng tính này đã bị khóa chế độ chỉ đọc.")

    sheet.data = req.data
    if req.styles is not None:
        sheet.styles = req.styles
    if req.column_widths is not None:
        sheet.column_widths = req.column_widths
    if req.row_heights is not None:
        sheet.row_heights = req.row_heights

    # Create version history snapshot
    ver_count = db.query(SpreadsheetVersion).filter(SpreadsheetVersion.workbook_id == sheet.workbook_id).count()
    version = SpreadsheetVersion(
        workbook_id=sheet.workbook_id,
        version_num=ver_count + 1,
        snapshot_data={"sheet_id": sheet.id, "name": sheet.name, "data": req.data},
        saved_by=user.username,
        comment=req.comment
    )
    db.add(version)
    db.commit()

    return {"success": True, "message": "Đã lưu dữ liệu bảng tính thành công.", "version": ver_count + 1}

@router.get("/export-xlsx/{workbook_id}")
def export_xlsx(
    workbook_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    wb_record = db.query(Workbook).filter(Workbook.id == workbook_id).first()
    if not wb_record:
        raise HTTPException(status_code=404, detail="Không tìm thấy bảng tính.")

    pxl = openpyxl.Workbook()
    # Remove default sheet
    pxl.remove(pxl.active)

    for sheet_record in wb_record.sheets:
        ws = pxl.create_sheet(title=sheet_record.name[:31]) # Excel sheet name max 31 chars
        cell_data = sheet_record.data or {}

        for cell_ref, item in cell_data.items():
            try:
                # Cell value or formula
                val = item.get("v")
                formula = item.get("f")
                if formula:
                    ws[cell_ref] = formula
                else:
                    ws[cell_ref] = val
            except Exception:
                continue

    stream = io.BytesIO()
    pxl.save(stream)
    stream.seek(0)

    filename = f"{wb_record.title}.xlsx"
    return Response(
        content=stream.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
