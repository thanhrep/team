import os
import io
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from PIL import Image
from app.core.database import get_db
from app.core.auth import get_current_user, require_roles, log_audit
from app.models.database import MediaImage, ImageTag, User, UserRoleEnum, Product

router = APIRouter(prefix="/media", tags=["Media Images"])

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "media"))
THUMBNAIL_DIR = os.path.join(UPLOAD_DIR, "thumbnails")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(THUMBNAIL_DIR, exist_ok=True)

def generate_next_image_code(db: Session) -> str:
    """Generates unique sequential code @1, @2, @3... stable regardless of rename."""
    last_img = db.query(MediaImage).order_by(MediaImage.id.desc()).first()
    next_id = (last_img.id + 1) if last_img else 1
    return f"@{next_id}"

@router.get("/list")
def list_images(
    search: Optional[str] = None,
    tag: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    query = db.query(MediaImage)
    if search:
        query = query.filter(
            (MediaImage.display_name.ilike(f"%{search}%")) |
            (MediaImage.code.ilike(f"%{search}%")) |
            (MediaImage.original_filename.ilike(f"%{search}%"))
        )
    if tag:
        query = query.join(MediaImage.tags).filter(ImageTag.name == tag)

    images = query.order_by(MediaImage.id.desc()).all()
    return [
        {
            "id": img.id,
            "code": img.code,
            "display_name": img.display_name,
            "original_filename": img.original_filename,
            "description": img.description,
            "category": img.category,
            "file_size": img.file_size,
            "url": f"/api/media/file/{img.id}",
            "thumbnail_url": f"/api/media/thumbnail/{img.id}",
            "tags": [t.name for t in img.tags],
            "created_at": img.created_at.isoformat() if img.created_at else None
        }
        for img in images
    ]

@router.get("/resolve/{code}")
def resolve_image_code(code: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Resolves @code (e.g. @1) into thumbnail & full details for Spreadsheet engine."""
    clean_code = code.strip()
    if not clean_code.startswith("@"):
        clean_code = f"@{clean_code}"
        
    img = db.query(MediaImage).filter(MediaImage.code == clean_code).first()
    if not img:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy ảnh với mã {code}")

    return {
        "id": img.id,
        "code": img.code,
        "display_name": img.display_name,
        "url": f"/api/media/file/{img.id}",
        "thumbnail_url": f"/api/media/thumbnail/{img.id}"
    }

@router.post("/upload")
async def upload_images(
    files: List[UploadFile] = File(...),
    category: str = Form("jersey"),
    tags: str = Form(""),
    display_name: str = Form(""),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.ADMIN, UserRoleEnum.MANAGER, UserRoleEnum.STAFF))
):
    if not files:
        raise HTTPException(status_code=400, detail="Vui lòng chọn ít nhất một ảnh.")
    if len(files) > 30:
        raise HTTPException(status_code=400, detail="Mỗi lần chỉ được tải tối đa 30 ảnh.")

    results = []
    tag_list = [t.strip()[:100] for t in tags.split(",") if t.strip()]
    allowed_formats = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}

    for file in files:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
            raise HTTPException(status_code=400, detail=f"Định dạng ảnh không được hỗ trợ: {file.filename}")

        content = await file.read()
        if not content or len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Ảnh phải có dung lượng từ 1 byte đến 10 MB.")
        try:
            with Image.open(io.BytesIO(content)) as check_image:
                image_format = check_image.format
                check_image.verify()
            if image_format not in allowed_formats:
                raise ValueError("Unsupported image format")
        except Exception:
            raise HTTPException(status_code=400, detail=f"Tệp {file.filename} không phải ảnh hợp lệ.")

        unique_filename = f"{uuid.uuid4().hex}{allowed_formats[image_format]}"
        saved_file_path = os.path.join(UPLOAD_DIR, unique_filename)
        thumb_filename = f"thumb_{uuid.uuid4().hex}.webp"
        saved_thumb_path = os.path.join(THUMBNAIL_DIR, thumb_filename)

        try:
            with Image.open(io.BytesIO(content)) as im:
                im.thumbnail((160, 160))
                im.save(saved_thumb_path, "WEBP", quality=80)
            with open(saved_file_path, "wb") as output_file:
                output_file.write(content)

            media_img = MediaImage(
                code=f"pending-{uuid.uuid4().hex}",
                original_filename=os.path.basename(file.filename or "upload"),
                display_name=(display_name.strip()[:255] or os.path.splitext(os.path.basename(file.filename or "Ảnh"))[0]),
                file_path=saved_file_path,
                thumbnail_path=saved_thumb_path,
                file_size=len(content),
                mime_type={"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}[image_format],
                category=category
            )
            db.add(media_img)
            db.flush()
            media_img.code = f"@{media_img.id}"

            for tag_name in tag_list:
                tag_obj = db.query(ImageTag).filter(ImageTag.name == tag_name).first()
                if not tag_obj:
                    tag_obj = ImageTag(name=tag_name)
                    db.add(tag_obj)
                    db.flush()
                media_img.tags.append(tag_obj)

            db.commit()
            db.refresh(media_img)
        except Exception:
            db.rollback()
            for path in (saved_file_path, saved_thumb_path):
                if os.path.exists(path):
                    os.remove(path)
            raise

        results.append({
            "id": media_img.id,
            "code": media_img.code,
            "display_name": media_img.display_name,
            "thumbnail_url": f"/api/media/thumbnail/{media_img.id}",
            "url": f"/api/media/file/{media_img.id}"
        })

    return {"success": True, "uploaded": results}

@router.delete("/delete/{image_id}")
def delete_image(
    image_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.ADMIN))
):
    img = db.query(MediaImage).filter(MediaImage.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Không tìm thấy ảnh.")

    # Check reference integrity: Is image used in products?
    if len(img.products) > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Ảnh {img.code} đang được sử dụng trong {len(img.products)} sản phẩm. Hãy gỡ ảnh khỏi sản phẩm trước khi xóa."
        )

    def contains_code(value):
        if isinstance(value, str):
            return img.code in value
        if isinstance(value, dict):
            return any(contains_code(v) for v in value.values())
        if isinstance(value, list):
            return any(contains_code(v) for v in value)
        return False
    referenced_sheets = [sheet.id for sheet in db.query(WorkbookSheet).all() if contains_code(sheet.data or {})]
    if referenced_sheets:
        raise HTTPException(status_code=409, detail=f"Ảnh {img.code} đang được sử dụng trong {len(referenced_sheets)} trang tính. Hãy gỡ tham chiếu trước khi xóa.")

    # Clean up physical files
    if os.path.exists(img.file_path):
        try: os.remove(img.file_path)
        except Exception: pass
    if os.path.exists(img.thumbnail_path):
        try: os.remove(img.thumbnail_path)
        except Exception: pass

    db.delete(img)
    db.commit()
    return {"success": True, "message": f"Đã xóa ảnh {img.code}."}


@router.get("/file/{image_id}")
def get_image_file(image_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    img = db.query(MediaImage).filter(MediaImage.id == image_id).first()
    if not img or not os.path.isfile(img.file_path):
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp ảnh.")
    return FileResponse(img.file_path, media_type=img.mime_type or "application/octet-stream",
        headers={"Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff"})

@router.get("/thumbnail/{image_id}")
def get_image_thumbnail(image_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    img = db.query(MediaImage).filter(MediaImage.id == image_id).first()
    if not img or not os.path.isfile(img.thumbnail_path):
        raise HTTPException(status_code=404, detail="Không tìm thấy ảnh xem trước.")
    return FileResponse(img.thumbnail_path, media_type="image/webp",
        headers={"Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff"})

class RenameImageRequest(BaseModel):
    display_name: str

@router.patch("/rename/{image_id}")
def rename_image(image_id: int, req: RenameImageRequest, db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.ADMIN, UserRoleEnum.MANAGER))):
    name = req.display_name.strip()
    if not name or len(name) > 255:
        raise HTTPException(status_code=400, detail="Tên ảnh phải có từ 1 đến 255 ký tự.")
    img = db.query(MediaImage).filter(MediaImage.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Không tìm thấy ảnh.")
    img.display_name = name
    db.commit()
    return {"success": True, "id": img.id, "code": img.code, "display_name": img.display_name}
