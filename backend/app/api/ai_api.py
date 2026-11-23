import json
import os
import requests
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.database import User, Workbook, WorkbookSheet

router = APIRouter(prefix="/ai", tags=["BIZWORK AI"])
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:1b")

class AIChatRequest(BaseModel):
    question: str = Field(min_length=2, max_length=4000)
    workbook_id: int | None = None

def _workbook_context(db: Session, workbook_id: int | None) -> str:
    query = db.query(Workbook).order_by(Workbook.updated_at.desc())
    if workbook_id is not None:
        query = query.filter(Workbook.id == workbook_id)
    workbooks = query.limit(8).all()
    if workbook_id is not None and not workbooks:
        raise HTTPException(status_code=404, detail="Không tìm thấy bảng tính.")
    payload = []
    for workbook in workbooks:
        sheets = db.query(WorkbookSheet).filter(WorkbookSheet.workbook_id == workbook.id).order_by(WorkbookSheet.sheet_order.asc()).all()
        payload.append({"workbook": workbook.title, "sheets": [{"sheet": s.name, "cells": s.data or {}} for s in sheets]})
    return json.dumps(payload, ensure_ascii=False, default=str)[:24000]

@router.get("/status")
def ai_status(user: User = Depends(get_current_user)):
    try:
        response = requests.get(f"{OLLAMA_URL}/api/tags", timeout=2)
        response.raise_for_status()
        models = [item.get("name") for item in response.json().get("models", [])]
        return {"available": True, "provider": "ollama", "model": OLLAMA_MODEL, "installed_models": models}
    except requests.RequestException:
        return {"available": False, "provider": "ollama", "model": OLLAMA_MODEL, "installed_models": []}

@router.post("/chat")
def chat(req: AIChatRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    context = _workbook_context(db, req.workbook_id)
    if context == "[]":
        raise HTTPException(status_code=404, detail="Chưa có dữ liệu bảng tính để phân tích.")
    prompt = ("Bạn là trợ lý phân tích nội bộ BIZWORK. Chỉ sử dụng dữ liệu Sheet được cung cấp. "
        "Không tự bịa số liệu, không giả định ô trống là 0. Nếu thiếu dữ liệu hoặc không xác định được ý nghĩa cột, hãy nói rõ. "
        "Phân biệt số liệu tính được với nhận xét. Không được sửa dữ liệu. Trả lời bằng tiếng Việt.\n\n"
        f"DỮ LIỆU SHEET (JSON):\n{context}\n\nCÂU HỎI NHÂN VIÊN:\n{req.question}")
    def generate():
        try:
            with requests.post(f"{OLLAMA_URL}/api/generate", json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": True}, stream=True, timeout=(5, 180)) as response:
                if response.status_code != 200:
                    yield "AI server trả lỗi. Kiểm tra Ollama và model đã cài.\n"
                    return
                for line in response.iter_lines(decode_unicode=True):
                    if not line:
                        continue
                    try:
                        item = json.loads(line)
                        token = item.get("response", "")
                        if token:
                            yield token
                        if item.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue
        except requests.RequestException:
            yield "Không kết nối được Ollama trên máy chủ. Hãy kiểm tra dịch vụ Ollama và model."
    return StreamingResponse(generate(), media_type="text/plain; charset=utf-8", headers={"Cache-Control":"no-cache","X-Accel-Buffering":"no"})
