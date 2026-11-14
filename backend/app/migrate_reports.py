
from sqlalchemy import inspect, text
from app.database import engine

print("Starting database migration...")

inspector = inspect(engine)
columns = [col["name"] for col in inspector.get_columns("community_reports")]

with engine.begin() as conn:

    if "tracking_code" not in columns:
        conn.execute(text(
            "ALTER TABLE community_reports ADD COLUMN tracking_code VARCHAR(32)"
        ))
        print("Added tracking_code")

    if "is_anonymous" not in columns:
        conn.execute(text(
            "ALTER TABLE community_reports ADD COLUMN is_anonymous BOOLEAN NOT NULL DEFAULT 1"
        ))
        print("Added is_anonymous")

    if "review_note" not in columns:
        conn.execute(text(
            "ALTER TABLE community_reports ADD COLUMN review_note TEXT"
        ))
        print("Added review_note")

    conn.execute(text(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_community_reports_tracking_code "
        "ON community_reports (tracking_code)"
    ))