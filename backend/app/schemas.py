
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ReportCreate(BaseModel):
    category: str = Field(
        pattern=r"^(smoke|dust|burning|industrial|other)$"
    )
    description: str = Field(
        min_length=10,
        max_length=1200
    )
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    location_name: str | None = Field(
        default=None,
        max_length=180
    )
    is_anonymous: bool = True


class ReportOut(BaseModel):
    id: int
    category: str
    description: str
    latitude: float
    longitude: float
    location_name: str | None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportCreated(BaseModel):
    id: int
    tracking_code: str
    status: str
    message: str


class ReportTrack(BaseModel):
    id: int
    category: str
    location_name: str | None
    status: str
    review_note: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
