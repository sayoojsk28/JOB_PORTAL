from sqlalchemy import text
from database import engine

with engine.begin() as connection:
    connection.execute(
        text("""
            ALTER TABLE employees
            ADD COLUMN IF NOT EXISTS profile_photo VARCHAR(255);
        """)
    )

print("profile_photo column added successfully!")