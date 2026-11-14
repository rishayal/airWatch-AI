
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.sql import func
from .database import Base


class CommunityReport(Base):
    __tablename__ = "community_reports"

    id = Column(Integer, primary_key=True, index=True)

    category = Column(String(40), nullable=False)
    description = Column(Text, nullable=False)

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_name = Column(String(180), nullable=True)

    status = Column(String(20), nullable=False, default="pending")

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # Complaint tracking and privacy
    tracking_code = Column(
        String(32),
        unique=True,
        index=True,
        nullable=True
    )

    is_anonymous = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1"
    )

    review_note = Column(Text, nullable=True)
