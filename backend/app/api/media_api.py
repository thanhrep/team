import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from PIL import Image
from app.core.database import get_db
from app.core.auth import get_current_user, require_roles, log_audit
from app.models.database import MediaImage, ImageTag, User, UserRoleEnum, Product

router = APIRouter(prefix="/media", tags=["Media Images"])

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static", "uploads"))
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
            "url": f"/static/uploads/{os.path.basename(img.file_path)}",
            "thumbnail_url": f"/static/uploads/thumbnails/{os.path.basename(img.thumbnail_path)}",
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
        "url": f"/static/uploads/{os.path.basename(img.file_path)}",
        "thumbnail_url": f"/static/uploads/thumbnails/{os.path.basename(img.thumbnail_path)}"
    }

@router.post("/upload")
async def upload_images(
    files: List[UploadFile] = File(...),
    category: str = Form("jersey"),
    tags: str = Form(""),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.ADMIN, UserRoleEnum.MANAGER, UserRoleEnum.STAFF))
):
    results = []
    tag_list = [t.strip() for t in tags.split(",") if t.strip()]

    for file in files:
        # Validate extensions
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
            continue

        unique_filename = f"{uuid.uuid4().hex}{ext}"
        saved_file_path = os.path.join(UPLOAD_DIR, unique_filename)
        thumb_filename = f"thumb_{unique_filename}.webp"
        saved_thumb_path = os.path.join(THUMBNAIL_DIR, thumb_filename)

        content = await file.read()
        with open(saved_file_path, "wb") as f:
            f.write(content)

        # Generate lightweight WebP thumbnail (120x120) for lightning-fast spreadsheet rendering
        try:
            with Image.open(saved_file_path) as im:
                im.thumbnail((160, 160))
                im.save(saved_thumb_path, "WEBP", quality=80)
        except Exception:
            saved_thumb_path = saved_file_path

        code = generate_next_image_code(db)
        media_img = MediaImage(
            code=code,
            original_filename=file.filename,
            display_name=os.path.splitext(file.filename)[0],
            file_path=saved_file_path,
            thumbnail_path=saved_thumb_path,
            file_size=len(content),
            category=category
        )
        db.add(media_img)
        db.flush()

        # Handle tags
        for t_name in tag_list:
            tag_obj = db.query(ImageTag).filter(ImageTag.name == t_name).first()
            if not tag_obj:
                tag_obj = ImageTag(name=t_name)
                db.add(tag_obj)
                db.flush()
            media_img.tags.append(tag_obj)

        db.commit()
        db.refresh(media_img)

        results.append({
            "id": media_img.id,
            "code": media_img.code,
            "display_name": media_img.display_name,
            "thumbnail_url": f"/static/uploads/thumbnails/{thumb_filename}",
            "url": f"/static/uploads/{unique_filename}"
        })

    return {"success": True, "uploaded": results}

@router.delete("/delete/{image_id}")
def delete_image(
    image_id: int,
    confirm_force: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.ADMIN))
):
    img = db.query(MediaImage).filter(MediaImage.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Không tìm thấy ảnh.")

    # Check reference integrity: Is image used in products?
    if len(img.products) > 0 and not confirm_force:
        raise HTTPException(
            status_code=400,
            detail=f"Ảnh {img.code} đang được sử dụng trong {len(img.products)} sản phẩm. Hãy xác nhận confirm_force=True nếu muốn xóa triệt để."
        )

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
