import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.database import Base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bizwork.db")

# Detect SQLite vs PostgreSQL
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
