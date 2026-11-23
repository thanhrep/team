"""
BIZWORK Core Database Models
Supports PostgreSQL and SQLite with automatic schema migration, indexes, and full relationship tracking.
"""
import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column, Integer, String, Boolean, Float, Text, DateTime, ForeignKey, 
    Enum, Table, UniqueConstraint, Index, JSON
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class UserRoleEnum(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    STAFF = "STAFF"
    VIEWER = "VIEWER"

class UserStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    LOCKED = "LOCKED"

class OrderStatusEnum(str, enum.Enum):
    NEW = "NEW"
    CONFIRMED = "CONFIRMED"
    PREPARING = "PREPARING"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    RETURNED = "RETURNED"
    CANCELLED = "CANCELLED"

class ProductStatusEnum(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    OUT_OF_STOCK = "OUT_OF_STOCK"
    ARCHIVED = "ARCHIVED"

class InventoryTypeEnum(str, enum.Enum):
    IN = "IN"
    OUT = "OUT"
    ADJUSTMENT = "ADJUSTMENT"
    AUDIT = "AUDIT"

# Many-to-many: Product <-> MediaImage
product_images_table = Table(
    "product_images",
    Base.metadata,
    Column("product_id", Integer, ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
    Column("image_id", Integer, ForeignKey("media_images.id", ondelete="CASCADE"), primary_key=True),
    Column("is_primary", Boolean, default=False),
    Column("sort_order", Integer, default=0)
)

# Many-to-many: Image <-> ImageTag
image_tags_association = Table(
    "image_tags_association",
    Base.metadata,
    Column("image_id", Integer, ForeignKey("media_images.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("image_tags.id", ondelete="CASCADE"), primary_key=True)
)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRoleEnum), default=UserRoleEnum.STAFF, nullable=False)
    status = Column(Enum(UserStatusEnum), default=UserStatusEnum.PENDING, index=True, nullable=False)
    failed_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Audit & associations
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    workbooks = relationship("Workbook", back_populates="creator")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(50), nullable=False) # CREATE, UPDATE, DELETE, LOGIN, APPROVE, EXPORT
    entity_name = Column(String(100), nullable=False) # Product, Order, User, Workbook
    entity_id = Column(String(100), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    before_data = Column(JSON, nullable=True)
    after_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    user = relationship("User", back_populates="audit_logs")

class MediaImage(Base):
    __tablename__ = "media_images"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False) # e.g. @1, @2
    original_filename = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    file_path = Column(String(500), nullable=False)
    thumbnail_path = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)
    mime_type = Column(String(50), default="image/webp")
    category = Column(String(100), default="jersey") # jersey, logo, mockup, badge
    created_at = Column(DateTime, default=datetime.utcnow)
    
    tags = relationship("ImageTag", secondary=image_tags_association, back_populates="images")
    products = relationship("Product", secondary=product_images_table, back_populates="images")

class ImageTag(Base):
    __tablename__ = "image_tags"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    
    images = relationship("MediaImage", secondary=image_tags_association, back_populates="tags")

class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    name_ja = Column(String(150), nullable=True)
    name_en = Column(String(150), nullable=True)
    league = Column(String(100), nullable=True) # J-League, Premier League, National Team
    season = Column(String(50), nullable=True) # 2024/2025
    logo_image_code = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    ip_rights_notes = Column(Text, nullable=True) # Commercial IP rights note for Japan compliance
    created_at = Column(DateTime, default=datetime.utcnow)
    
    products = relationship("Product", back_populates="team")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False) # e.g. TS-JAP-24H
    name = Column(String(255), nullable=False, index=True)
    name_ja = Column(String(255), nullable=True)
    name_en = Column(String(255), nullable=True)
    category = Column(String(100), default="jersey") # match, training, team_uniform, shorts, accessory
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    season = Column(String(50), default="2024/2025")
    edition = Column(String(50), default="Home") # Home, Away, Third, Player Issue, Fan Issue
    color = Column(String(100), nullable=True)
    material = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    cost_price_jpy = Column(Float, default=0.0)
    selling_price_jpy = Column(Float, default=0.0)
    selling_price_vnd = Column(Float, default=0.0)
    expected_profit_jpy = Column(Float, default=0.0)
    status = Column(Enum(ProductStatusEnum), default=ProductStatusEnum.ACTIVE, index=True)
    primary_image_code = Column(String(50), nullable=True)
    ip_verified = Column(Boolean, default=False)
    ip_rights_notice = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    team = relationship("Team", back_populates="products")
    images = relationship("MediaImage", secondary=product_images_table, back_populates="products")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    order_items = relationship("OrderItem", back_populates="product")

class ProductVariant(Base):
    __tablename__ = "product_variants"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    sku = Column(String(100), unique=True, index=True, nullable=False)
    size = Column(String(20), nullable=False) # S, M, L, XL, XXL, Custom
    color = Column(String(50), nullable=True)
    stock_quantity = Column(Integer, default=0)
    low_stock_threshold = Column(Integer, default=5)
    
    product = relationship("Product", back_populates="variants")
    inventory_transactions = relationship("InventoryTransaction", back_populates="variant")

class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"
    id = Column(Integer, primary_key=True, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False)
    type = Column(Enum(InventoryTypeEnum), nullable=False)
    quantity = Column(Integer, nullable=False)
    balance_after = Column(Integer, nullable=False)
    reference_order_id = Column(Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    variant = relationship("ProductVariant", back_populates="inventory_transactions")

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False, index=True)
    name_kana = Column(String(255), nullable=True) # Furigana for Japanese customers
    email = Column(String(255), index=True, nullable=True)
    phone = Column(String(50), nullable=True)
    postal_code = Column(String(20), nullable=True) # e.g. 100-0001
    prefecture = Column(String(50), nullable=True) # e.g. Tokyo-to, Osaka-fu
    city_ward = Column(String(100), nullable=True) # e.g. Shinjuku-ku
    address_line = Column(String(255), nullable=True)
    building_room = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    total_spent_jpy = Column(Float, default=0.0)
    orders_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    orders = relationship("Order", back_populates="customer")

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    order_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. ORD-202611-001
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    shipping_name = Column(String(255), nullable=False)
    shipping_phone = Column(String(50), nullable=False)
    shipping_postal_code = Column(String(20), nullable=False)
    shipping_prefecture = Column(String(50), nullable=False)
    shipping_address = Column(String(300), nullable=False)
    subtotal_jpy = Column(Float, default=0.0)
    shipping_fee_jpy = Column(Float, default=0.0)
    discount_jpy = Column(Float, default=0.0)
    total_amount_jpy = Column(Float, default=0.0)
    total_cost_jpy = Column(Float, default=0.0)
    profit_jpy = Column(Float, default=0.0)
    status = Column(Enum(OrderStatusEnum), default=OrderStatusEnum.NEW, index=True)
    tracking_number = Column(String(100), nullable=True) # Yamato, Sagawa, Japan Post
    carrier = Column(String(100), default="Yamato Transport")
    shipped_at = Column(DateTime, nullable=True)
    internal_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    size = Column(String(20), nullable=False)
    custom_name = Column(String(100), nullable=True) # e.g. "MITOMA"
    custom_number = Column(String(10), nullable=True) # e.g. "7"
    quantity = Column(Integer, default=1, nullable=False)
    unit_price_jpy = Column(Float, default=0.0, nullable=False)
    unit_cost_jpy = Column(Float, default=0.0, nullable=False)
    total_price_jpy = Column(Float, default=0.0, nullable=False)
    
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    contact_person = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(100), nullable=True)
    address = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ExchangeRate(Base):
    __tablename__ = "exchange_rates"
    id = Column(Integer, primary_key=True, index=True)
    base_currency = Column(String(10), default="JPY")
    target_currency = Column(String(10), default="VND")
    rate = Column(Float, nullable=False) # e.g. 1 JPY = 165 VND
    source = Column(String(100), default="Admin Manual Entry")
    created_at = Column(DateTime, default=datetime.utcnow)

class Workbook(Base):
    __tablename__ = "workbooks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), default="general")
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_locked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    creator = relationship("User", back_populates="workbooks")
    sheets = relationship("WorkbookSheet", back_populates="workbook", cascade="all, delete-orphan")
    versions = relationship("SpreadsheetVersion", back_populates="workbook", cascade="all, delete-orphan")

class WorkbookSheet(Base):
    __tablename__ = "workbook_sheets"
    id = Column(Integer, primary_key=True, index=True)
    workbook_id = Column(Integer, ForeignKey("workbooks.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    sheet_order = Column(Integer, default=0)
    row_count = Column(Integer, default=100)
    col_count = Column(Integer, default=26)
    data = Column(JSON, default=dict) # Cells data { "A1": {"v": "Val", "f": "=SUM(B1:B5)", "s": {...}} }
    styles = Column(JSON, default=dict)
    column_widths = Column(JSON, default=dict) # {"A": 120, "B": 200}
    row_heights = Column(JSON, default=dict)
    frozen_rows = Column(Integer, default=0)
    frozen_cols = Column(Integer, default=0)
    
    workbook = relationship("Workbook", back_populates="sheets")

class SpreadsheetVersion(Base):
    __tablename__ = "spreadsheet_versions"
    id = Column(Integer, primary_key=True, index=True)
    workbook_id = Column(Integer, ForeignKey("workbooks.id", ondelete="CASCADE"), nullable=False)
    version_num = Column(Integer, nullable=False)
    snapshot_data = Column(JSON, nullable=False)
    saved_by = Column(String(100), nullable=True)
    comment = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    workbook = relationship("Workbook", back_populates="versions")

class SystemSetting(Base):
    __tablename__ = "system_settings"
    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
