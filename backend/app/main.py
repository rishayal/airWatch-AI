
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc
import asyncio
import math
import httpx
import secrets

from .database import Base, engine, get_db
from .config import settings
from . import models, schemas
from .services.air_quality import fetch_air_quality
from .services.insights import build_insights


Base.metadata.create_all(bind=engine)

app = FastAPI(title="AirWatch AI API", version="1.2.0")


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Demo locations
DEMO_LOCATIONS = [
    {
        "id": "central",
        "name": "Lahore Central",
        "latitude": 31.5204,
        "longitude": 74.3587
    },
    {
        "id": "gulberg",
        "name": "Gulberg",
        "latitude": 31.5100,
        "longitude": 74.3440
    }
]

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"


# Calculate distance between two coordinates
def distance_km(lat1, lon1, lat2, lon2):
    R = 6371

    lat1 = math.radians(lat1)
    lat2 = math.radians(lat2)

    dlat = lat2 - lat1
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2)
        * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


# Generate nearby air-quality comparison points
def nearby_points(latitude: float, longitude: float, label: str):
    d_lat = 0.065
    d_lon = 0.065 / max(
        0.2,
        math.cos(math.radians(latitude))
    )

    offsets = [
        ("centre", label, 0, 0),
        ("north", "North of centre", d_lat, 0),
        ("south", "South of centre", -d_lat, 0),
        ("east", "East of centre", 0, d_lon),
        ("west", "West of centre", 0, -d_lon),
        ("northeast", "North-east of centre", d_lat, d_lon)
    ]

    pts = []

    for pid, name, dy, dx in offsets:
        lat = max(-90, min(90, latitude + dy))
        lon = ((longitude + dx + 180) % 360) - 180

        pts.append({
            "id": pid,
            "name": name,
            "latitude": round(lat, 4),
            "longitude": round(lon, 4)
        })

    return pts


# Worldwide city search
@app.get("/api/geocode")
async def geocode(
    q: str = Query(..., min_length=2, max_length=80)
):
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                GEOCODE_URL,
                params={
                    "name": q,
                    "count": 6,
                    "language": "en",
                    "format": "json"
                }
            )

            r.raise_for_status()
            results = r.json().get("results") or []

    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Geocoding provider unavailable: {exc}"
        )

    return [
        {
            "id": f"geo-{x.get('id')}",
            "name": ", ".join(
                p for p in [
                    x.get("name"),
                    x.get("admin1"),
                    x.get("country")
                ] if p
            ),
            "latitude": x["latitude"],
            "longitude": x["longitude"]
        }
        for x in results
    ]


# Health check
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "AirWatch AI"
    }


# Demo locations
@app.get("/api/locations")
def locations():
    return DEMO_LOCATIONS


# Air quality
@app.get("/api/air-quality")
async def air_quality(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    past_days: int = Query(2, ge=0, le=5)
):
    return await fetch_air_quality(
        latitude,
        longitude,
        past_days
    )


# Pollution hotspots
@app.get("/api/hotspots")
async def pollution_hotspots(
    latitude: float | None = Query(None, ge=-90, le=90),
    longitude: float | None = Query(None, ge=-180, le=180),
    name: str = Query("Selected area", max_length=80)
):
    places = (
        DEMO_LOCATIONS
        if latitude is None or longitude is None
        else nearby_points(latitude, longitude, name)
    )

    async def read_location(place):
        try:
            data = await fetch_air_quality(
                place["latitude"],
                place["longitude"],
                1
            )

            current = data.get("current") or {}

            return {
                **place,
                "aqi": current.get("us_aqi"),
                "pm2_5": current.get("pm2_5"),
                "pm10": current.get("pm10"),
                "status": (
                    "ok"
                    if current.get("us_aqi") is not None
                    else "no_data"
                )
            }

        except HTTPException as exc:
            return {
                **place,
                "aqi": None,
                "pm2_5": None,
                "pm10": None,
                "status": "unavailable",
                "error": exc.detail
            }

    results = await asyncio.gather(
        *(read_location(p) for p in places)
    )

    ranked = sorted(
        [
            r for r in results
            if isinstance(r.get("aqi"), (int, float))
        ],
        key=lambda r: r["aqi"],
        reverse=True
    )

    return {
        "locations": results,
        "highest": ranked[0] if ranked else None,
        "lowest": ranked[-1] if ranked else None,
        "area": name if latitude is not None else "Lahore (demo)",
        "note": (
            "Comparisons use Open-Meteo/CAMS modeled grid estimates, "
            "not physical sensor readings."
        )
    }


# Submit community report
@app.post(
    "/api/reports",
    response_model=schemas.ReportCreated,
    status_code=201
)
def create_report(
    payload: schemas.ReportCreate,
    db: Session = Depends(get_db)
):
    tracking_code = secrets.token_hex(12)

    report = models.CommunityReport(
        **payload.model_dump(),
        status="pending",
        tracking_code=tracking_code
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "id": report.id,
        "tracking_code": report.tracking_code,
        "status": report.status,
        "message": (
            "Your environmental complaint was submitted successfully."
        )
    }


# Get reports belonging to selected area
@app.get(
    "/api/reports",
    response_model=list[schemas.ReportOut]
)
def list_reports(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(15, ge=1, le=100),
    status: str | None = None,
    db: Session = Depends(get_db)
):
    allowed_statuses = {
        "pending",
        "under_review",
        "verified",
        "rejected",
        "resolved"
    }

    query = db.query(models.CommunityReport)

    if status:
        if status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail="Invalid status"
            )

        query = query.filter(
            models.CommunityReport.status == status
        )

    all_reports = query.order_by(
        desc(models.CommunityReport.created_at)
    ).limit(500).all()

    nearby_reports = []

    for report in all_reports:
        distance = distance_km(
            latitude,
            longitude,
            report.latitude,
            report.longitude
        )

        if distance <= radius_km:
            nearby_reports.append(report)

    return nearby_reports


# Track a complaint using its tracking code
@app.get(
    "/api/reports/track/{tracking_code}",
    response_model=schemas.ReportTrack
)
def track_report(
    tracking_code: str,
    db: Session = Depends(get_db)
):
    report = db.query(
        models.CommunityReport
    ).filter(
        models.CommunityReport.tracking_code == tracking_code
    ).first()

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found. Check your tracking code."
        )

    return report


# Community insights for selected area
@app.get("/api/community-insights")
def community_insights(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(15, ge=1, le=100),
    db: Session = Depends(get_db)
):
    all_reports = db.query(
        models.CommunityReport
    ).all()

    nearby_reports = []

    for report in all_reports:
        distance = distance_km(
            latitude,
            longitude,
            report.latitude,
            report.longitude
        )

        if distance <= radius_km:
            nearby_reports.append(report)

    reports = [
        r for r in nearby_reports
        if r.status != "rejected"
    ]

    counts = {}

    for report in reports:
        counts[report.category] = (
            counts.get(report.category, 0) + 1
        )

    suggestions = {
        "smoke": (
            "Record the time and general area; report persistent "
            "smoke to the relevant local environmental authority."
        ),
        "dust": (
            "Note nearby construction or road activity and encourage "
            "dust-control measures such as covering materials."
        ),
        "burning": (
            "Avoid approaching the source; report suspected open "
            "burning to the relevant local authority."
        ),
        "industrial": (
            "Document the general location and time from a safe "
            "public place; request an environmental inspection."
        ),
        "other": (
            "Collect clear, non-identifying observations so "
            "moderators can classify the issue."
        )
    }

    most_common = (
        max(counts, key=counts.get)
        if counts else None
    )

    return {
        "total_reports": len(reports),
        "category_counts": counts,
        "most_reported": most_common,
        "suggested_action": suggestions.get(
            most_common,
            "Encourage residents to submit specific, factual observations."
        ),
        "pending_reports": sum(
            r.status == "pending" for r in reports
        ),
        "under_review_reports": sum(
            r.status == "under_review" for r in reports
        ),
        "verified_reports": sum(
            r.status == "verified" for r in reports
        ),
        "resolved_reports": sum(
            r.status == "resolved" for r in reports
        ),
        "radius_km": radius_km,
        "note": (
            "Community submissions are observations, "
            "not verified pollution measurements."
        )
    }


# Verify or reject report
@app.patch(
    "/api/reports/{report_id}/verify",
    response_model=schemas.ReportOut
)
def verify_report(
    report_id: int,
    decision: str = Query(..., pattern="^(verified|rejected)$"),
    db: Session = Depends(get_db)
):
    # DEMO ONLY: add moderator authentication before public deployment.
    report = db.query(
        models.CommunityReport
    ).filter(
        models.CommunityReport.id == report_id
    ).first()

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Report not found"
        )

    report.status = decision

    db.commit()
    db.refresh(report)

    return report


# Update complaint status and moderator review note
@app.patch("/api/reports/{report_id}/status")
def update_report_status(
    report_id: int,
    status: str = Query(...),
    review_note: str | None = Query(None, max_length=1200),
    db: Session = Depends(get_db)
):
    # DEMO ONLY: add moderator authentication before public deployment.
    allowed_statuses = {
        "pending",
        "under_review",
        "verified",
        "rejected",
        "resolved"
    }

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid complaint status"
        )

    report = db.query(
        models.CommunityReport
    ).filter(
        models.CommunityReport.id == report_id
    ).first()

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    report.status = status

    if review_note is not None:
        report.review_note = review_note

    db.commit()
    db.refresh(report)

    return {
        "message": "Complaint status updated successfully",
        "id": report.id,
        "status": report.status,
        "review_note": report.review_note
    }


# Air quality insights
@app.get("/api/insights")
async def insights(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180)
):
    data = await fetch_air_quality(
        latitude,
        longitude,
        2
    )

    return build_insights(
        data.get("hourly", {})
    )
