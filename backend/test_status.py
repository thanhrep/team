"""Manual database status report; intentionally has no import-time side effects."""
from app.core.database import SessionLocal, init_db
from app.models.database import User, Product, Order, Workbook, MediaImage


def main():
    init_db()
    db = SessionLocal()
    try:
        print("Users:", db.query(User).count())
        print("Products:", db.query(Product).count())
        print("Orders:", db.query(Order).count())
        print("Workbooks:", db.query(Workbook).count())
        print("Media Images:", db.query(MediaImage).count())
    finally:
        db.close()


if __name__ == "__main__":
    main()
