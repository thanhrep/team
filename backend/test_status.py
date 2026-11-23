from app.core.database import SessionLocal
from app.models.database import User, Product, Order, Workbook, MediaImage

db = SessionLocal()
print('Users:', db.query(User).count())
print('Products:', db.query(Product).count())
print('Orders:', db.query(Order).count())
print('Workbooks:', db.query(Workbook).count())
print('Media Images:', db.query(MediaImage).count())
