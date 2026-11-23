import os
from fastapi import FastAPI, Depends, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from app.core.database import init_db, get_db
from app.api.auth_api import router as auth_router
from app.api.media_api import router as media_router
from app.api.products_api import router as products_router
from app.api.orders_api import router as orders_router
from app.api.spreadsheets_api import router as spreadsheets_router

app = FastAPI(
    title="BIZWORK - Hệ Thống Quản Lý Doanh Nghiệp Áo Bóng Đá Nhật Bản",
    description="Hệ thống Modular Monolith độc lập, bảo mật, tích hợp Spreadsheet nội bộ và Thư viện ảnh @mã.",
    version="1.0.0"
)

# CORS
cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:8000,http://127.0.0.1:8000"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files (Uploads, CSS, JS)
static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "static"))
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Include Modular API Routers
app.include_router(auth_router, prefix="/api")
app.include_router(media_router, prefix="/api")
app.include_router(products_router, prefix="/api")
app.include_router(orders_router, prefix="/api")
app.include_router(spreadsheets_router, prefix="/api")

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": "BIZWORK",
        "system": "Production Ready",
        "version": "1.0.0"
    }

@app.get("/", response_class=HTMLResponse)
def index_page():
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return HTMLResponse("<h1>BIZWORK API Running</h1>")
