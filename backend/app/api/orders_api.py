from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import get_current_user, require_roles, log_audit
from app.models.database import (
    Order, OrderItem, Customer, Product, ProductVariant, InventoryTransaction,
    User, UserRoleEnum, OrderStatusEnum, InventoryTypeEnum
)

router = APIRouter(prefix="/orders", tags=["Japan Orders"])

class OrderItemInput(BaseModel):
    product_id: int
    size: str
    quantity: int = 1
    custom_name: Optional[str] = None # In tên sau lưng: e.g. "ENDOH"
    custom_number: Optional[str] = None # In số: e.g. "6"
    unit_price_jpy: float

class CreateOrderRequest(BaseModel):
    # Customer / Shipping details (Japan localized)
    customer_name: str
    customer_name_kana: Optional[str] = None # Furigana
    customer_email: Optional[str] = None
    customer_phone: str
    postal_code: str # e.g. "160-0022"
    prefecture: str # e.g. "Tokyo" / "東京都"
    city_ward: str # e.g. "Shinjuku-ku" / "新宿区"
    address_line: str # e.g. "Shinjuku 3-1-1"
    building_room: Optional[str] = None
    items: List[OrderItemInput]
    shipping_fee_jpy: float = 800.0 # Standard Yamato / Sagawa delivery fee
    discount_jpy: float = 0.0
    carrier: str = "Yamato Transport (ヤマト運輸)"
    internal_notes: Optional[str] = None

class UpdateOrderStatusRequest(BaseModel):
    status: OrderStatusEnum
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None

@router.get("/list")
def list_orders(
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    query = db.query(Order)
    if status:
        query = query.filter(Order.status == status)
    if search:
        query = query.filter(
            (Order.order_code.ilike(f"%{search}%")) |
            (Order.shipping_name.ilike(f"%{search}%")) |
            (Order.shipping_phone.ilike(f"%{search}%")) |
            (Order.tracking_number.ilike(f"%{search}%"))
        )

    orders = query.order_by(Order.id.desc()).all()
    return [
        {
            "id": o.id,
            "order_code": o.order_code,
            "shipping_name": o.shipping_name,
            "shipping_phone": o.shipping_phone,
            "postal_code": o.shipping_postal_code,
            "prefecture": o.shipping_prefecture,
            "shipping_address": o.shipping_address,
            "subtotal_jpy": o.subtotal_jpy,
            "shipping_fee_jpy": o.shipping_fee_jpy,
            "total_amount_jpy": o.total_amount_jpy,
            "profit_jpy": o.profit_jpy,
            "status": o.status.value,
            "carrier": o.carrier,
            "tracking_number": o.tracking_number,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "items_count": len(o.items),
            "items": [
                {
                    "product_name": item.product.name,
                    "product_code": item.product.code,
                    "image_code": item.product.primary_image_code,
                    "size": item.size,
                    "quantity": item.quantity,
                    "custom_name": item.custom_name,
                    "custom_number": item.custom_number,
                    "unit_price_jpy": item.unit_price_jpy,
                    "total_price_jpy": item.total_price_jpy
                }
                for item in o.items
            ]
        }
        for o in orders
    ]

@router.post("/create")
def create_order(
    req: CreateOrderRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.ADMIN, UserRoleEnum.MANAGER, UserRoleEnum.STAFF))
):
    # Customer registration or lookup
    cust = db.query(Customer).filter(Customer.phone == req.customer_phone).first()
    full_addr = f"{req.prefecture} {req.city_ward} {req.address_line}"
    if req.building_room:
        full_addr += f" {req.building_room}"

    if not cust:
        cust = Customer(
            full_name=req.customer_name,
            name_kana=req.customer_name_kana,
            email=req.customer_email,
            phone=req.customer_phone,
            postal_code=req.postal_code,
            prefecture=req.prefecture,
            city_ward=req.city_ward,
            address_line=req.address_line,
            building_room=req.building_room
        )
        db.add(cust)
        db.flush()

    # Generate sequential Order code e.g. ORD-202611-0001
    today_prefix = datetime.utcnow().strftime("ORD-%Y%m-")
    last_order = db.query(Order).filter(Order.order_code.like(f"{today_prefix}%")).order_by(Order.id.desc()).first()
    next_num = 1
    if last_order:
        try:
            next_num = int(last_order.order_code.split("-")[-1]) + 1
        except Exception:
            next_num = 1
    order_code = f"{today_prefix}{next_num:04d}"

    subtotal = 0.0
    total_cost = 0.0
    items_to_create = []

    for item_input in req.items:
        prod = db.query(Product).filter(Product.id == item_input.product_id).first()
        if not prod:
            raise HTTPException(status_code=400, detail=f"Sản phẩm ID {item_input.product_id} không tồn tại.")

        # Inventory check & deduction
        variant = db.query(ProductVariant).filter(
            ProductVariant.product_id == prod.id,
            ProductVariant.size == item_input.size
        ).first()

        item_total = item_input.unit_price_jpy * item_input.quantity
        item_cost = prod.cost_price_jpy * item_input.quantity

        subtotal += item_total
        total_cost += item_cost

        order_item = OrderItem(
            product_id=prod.id,
            size=item_input.size,
            custom_name=item_input.custom_name,
            custom_number=item_input.custom_number,
            quantity=item_input.quantity,
            unit_price_jpy=item_input.unit_price_jpy,
            unit_cost_jpy=prod.cost_price_jpy,
            total_price_jpy=item_total
        )
        items_to_create.append((order_item, variant, item_input.quantity))

    total_amount = subtotal + req.shipping_fee_jpy - req.discount_jpy
    profit = total_amount - total_cost - (req.shipping_fee_jpy * 0.7) # estimated shipping base cost

    new_order = Order(
        order_code=order_code,
        customer_id=cust.id,
        shipping_name=req.customer_name,
        shipping_phone=req.customer_phone,
        shipping_postal_code=req.postal_code,
        shipping_prefecture=req.prefecture,
        shipping_address=full_addr,
        subtotal_jpy=subtotal,
        shipping_fee_jpy=req.shipping_fee_jpy,
        discount_jpy=req.discount_jpy,
        total_amount_jpy=total_amount,
        total_cost_jpy=total_cost,
        profit_jpy=profit,
        status=OrderStatusEnum.NEW,
        carrier=req.carrier,
        internal_notes=req.internal_notes
    )
    db.add(new_order)
    db.flush()

    for o_item, variant, qty in items_to_create:
        o_item.order_id = new_order.id
        db.add(o_item)
        if variant:
            variant.stock_quantity = max(0, variant.stock_quantity - qty)
            txn = InventoryTransaction(
                variant_id=variant.id,
                type=InventoryTypeEnum.OUT,
                quantity=qty,
                balance_after=variant.stock_quantity,
                reference_order_id=new_order.id,
                note=f"Xuất bán cho đơn {new_order.order_code}"
            )
            db.add(txn)

    # Update customer stats
    cust.total_spent_jpy += total_amount
    cust.orders_count += 1

    db.commit()
    db.refresh(new_order)

    log_audit(db, user, "CREATE_ORDER", "Order", str(new_order.id), after_data={"order_code": new_order.order_code, "total": total_amount}, request=request)

    return {"success": True, "order_code": new_order.order_code, "id": new_order.id, "total_amount_jpy": total_amount}

@router.put("/{order_id}/status")
def update_status(
    order_id: int,
    req: UpdateOrderStatusRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.ADMIN, UserRoleEnum.MANAGER, UserRoleEnum.STAFF))
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng.")

    before_status = order.status.value
    order.status = req.status
    if req.tracking_number:
        order.tracking_number = req.tracking_number
    if req.carrier:
        order.carrier = req.carrier
    if req.status == OrderStatusEnum.SHIPPED and not order.shipped_at:
        order.shipped_at = datetime.utcnow()

    db.commit()

    log_audit(db, user, "UPDATE_ORDER_STATUS", "Order", str(order.id), before_data={"status": before_status}, after_data={"status": order.status.value}, request=request)

    return {"success": True, "message": f"Đơn hàng {order.order_code} đã cập nhật sang trạng thái {req.status.value}."}
