from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base


class Product(Base):
    __tablename__ = "products"

    id                  = Column(Integer, primary_key=True, index=True)
    company_id          = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name                = Column(String(300), nullable=False)
    description         = Column(Text, nullable=True)
    category            = Column(String(100), nullable=True)
    barcode             = Column(String(100), nullable=True, index=True)
    nexum_code          = Column(String(20), nullable=True, unique=True, index=True)
    sale_price          = Column(Float, nullable=False, default=0.0)
    cost_price          = Column(Float, nullable=True, default=0.0)
    iva_rate            = Column(Float, default=21.0)   # 0, 4, 10, 21
    stock_quantity      = Column(Integer, default=0)
    low_stock_threshold = Column(Integer, default=5)
    is_active           = Column(Boolean, default=True)
    created_at          = Column(DateTime, server_default=func.now())
    updated_at          = Column(DateTime, server_default=func.now(), onupdate=func.now())

    sale_items = relationship("SaleItem", back_populates="product")


class Sale(Base):
    __tablename__ = "sales"

    id             = Column(Integer, primary_key=True, index=True)
    company_id     = Column(Integer, ForeignKey("companies.id"), nullable=False)
    sale_date      = Column(Date, nullable=False)
    sale_time      = Column(String(10), nullable=True)
    payment_method = Column(String(50), default="efectivo")  # efectivo|tarjeta|bizum|otro
    subtotal       = Column(Float, default=0.0)
    iva_amount     = Column(Float, default=0.0)
    total          = Column(Float, default=0.0)
    notes          = Column(Text, nullable=True)
    created_at     = Column(DateTime, server_default=func.now())

    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")


class SaleItem(Base):
    __tablename__ = "sale_items"

    id         = Column(Integer, primary_key=True, index=True)
    sale_id    = Column(Integer, ForeignKey("sales.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    quantity   = Column(Integer, default=1)
    unit_price = Column(Float, nullable=False)
    iva_rate   = Column(Float, default=21.0)
    line_total = Column(Float, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    sale    = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")