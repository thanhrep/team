from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import get_current_user, require_roles, log_audit
from app.models.database import (
    Product, ProductVariant, Team, MediaImage, User, UserRoleEnum, ProductStatusEnum
)

router = APIRouter(prefix="/products", tags=["Football Products"])

class VariantCreate(BaseModel):
    size: str
    color: Optional[str] = "Default"
    stock_quantity: int = 0
    low_stock_threshold: int = 5

class ProductCreate(BaseModel):
    code: str # e.g. TS-JAP-24H
    name: str
    name_ja: Optional[str] = None
    name_en: Optional[str] = None
    category: str = "jersey"
    team_name: Optional[str] = None
    season: str = "2024/2025"
    edition: str = "Home"
    color: Optional[str] = None
    material: Optional[str] = "Dri-FIT Polyester"
    description: Optional[str] = None
    cost_price_jpy: float = 0.0
    selling_price_jpy: float = 0.0
    selling_price_vnd: float = 0.0
    primary_image_code: Optional[str] = None # e.g. @1
    ip_verified: bool = False
    ip_rights_notice: Optional[str] = None
    variants: Optional[List[VariantCreate]] = None

@router.get("/list")
def list_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    team_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    query = db.query(Product)
    if search:
        query = query.filter(
            (Product.name.ilike(f"%{search}%")) |
            (Product.code.ilike(f"%{search}%")) |
            (Product.name_ja.ilike(f"%{search}%"))
        )
    if category:
        query = query.filter(Product.category == category)
    if team_id:
        query = query.filter(Product.team_id == team_id)

    products = query.order_by(Product.id.desc()).all()
    
    result = []
    for p in products:
        total_stock = sum(v.stock_quantity for v in p.variants)
        result.append({
            "id": p.id,
            "code": p.code,
            "name": p.name,
            "name_ja": p.name_ja,
            "name_en": p.name_en,
            "category": p.category,
            "team": p.team.name if p.team else None,
            "season": p.season,
            "edition": p.edition,
            "cost_price_jpy": p.cost_price_jpy,
            "selling_price_jpy": p.selling_price_jpy,
            "selling_price_vnd": p.selling_price_vnd,
            "expected_profit_jpy": p.selling_price_jpy - p.cost_price_jpy,
            "status": p.status.value,
            "primary_image_code": p.primary_image_code,
            "ip_verified": p.ip_verified,
            "ip_rights_notice": p.ip_rights_notice,
            "total_stock": total_stock,
            "variants": [
                {"id": v.id, "sku": v.sku, "size": v.size, "stock": v.stock_quantity}
                for v in p.variants
            ]
        })
    return result

@router.post("/create")
def create_product(
    req: ProductCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.ADMIN, UserRoleEnum.MANAGER))
):
    if db.query(Product).filter(Product.code == req.code).first():
        raise HTTPException(status_code=400, detail=f"Mã sản phẩm {req.code} đã tồn tại.")

    team_obj = None
    if req.team_name:
        team_obj = db.query(Team).filter(Team.name == req.team_name).first()
        if not team_obj:
            team_obj = Team(name=req.team_name)
            db.add(team_obj)
            db.flush()

    new_prod = Product(
        code=req.code,
        name=req.name,
        name_ja=req.name_ja,
        name_en=req.name_en,
        category=req.category,
        team_id=team_obj.id if team_obj else None,
        season=req.season,
        edition=req.edition,
        color=req.color,
        material=req.material,
        description=req.description,
        cost_price_jpy=req.cost_price_jpy,
        selling_price_jpy=req.selling_price_jpy,
        selling_price_vnd=req.selling_price_vnd,
        expected_profit_jpy=req.selling_price_jpy - req.cost_price_jpy,
        primary_image_code=req.primary_image_code,
        ip_verified=req.ip_verified,
        ip_rights_notice=req.ip_rights_notice,
        status=ProductStatusEnum.ACTIVE
    )
    db.add(new_prod)
    db.flush()

    # Create default sizes (S, M, L, XL, XXL) if not provided
    variant_inputs = req.variants if req.variants else [
        VariantCreate(size="S", stock_quantity=10),
        VariantCreate(size="M", stock_quantity=20),
        VariantCreate(size="L", stock_quantity=20),
        VariantCreate(size="XL", stock_quantity=15),
        VariantCreate(size="XXL", stock_quantity=5),
    ]

    for v in variant_inputs:
        sku = f"{new_prod.code}-{v.size}"
        pvar = ProductVariant(
            product_id=new_prod.id,
            sku=sku,
            size=v.size,
            color=v.color,
            stock_quantity=v.stock_quantity,
            low_stock_threshold=v.low_stock_threshold
        )
        db.add(pvar)

    db.commit()
    db.refresh(new_prod)

    log_audit(db, user, "CREATE_PRODUCT", "Product", str(new_prod.id), after_data={"code": new_prod.code, "name": new_prod.name}, request=request)

    return {"success": True, "id": new_prod.id, "code": new_prod.code, "message": "Tạo sản phẩm thành công."}
