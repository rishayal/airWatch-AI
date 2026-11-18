"""Profile-specific health guidance tied to US AQI bands.

Wording is adapted from the general public-health messages in the US EPA
AirNow AQI guidance. It is general information, not medical advice.
"""

PROFILES = ("general", "asthma", "child", "elderly", "runner")

# (upper_bound_inclusive, key, label, color)
BANDS = [
    (50, "good", "Good", "#00a651"),
    (100, "moderate", "Moderate", "#d4a900"),
    (150, "usg", "Unhealthy for Sensitive Groups", "#f57c00"),
    (200, "unhealthy", "Unhealthy", "#d32f2f"),
    (300, "very_unhealthy", "Very Unhealthy", "#8e24aa"),
    (10_000, "hazardous", "Hazardous", "#7e0023"),
]

ADVICE = {
    "general": {
        "good": "Air quality is good. Enjoy normal outdoor activities.",
        "moderate": "Air quality is acceptable. Unusually sensitive people may want to take it easier during long outdoor exertion.",
        "usg": "Sensitive groups should reduce prolonged outdoor exertion. Most healthy adults can continue normal activities.",
        "unhealthy": "Everyone should reduce prolonged or heavy outdoor exertion. Take more breaks and choose lighter activities.",
        "very_unhealthy": "Avoid prolonged outdoor exertion. Move activities indoors or reschedule them.",
        "hazardous": "Stay indoors with windows closed if possible, and avoid all outdoor exertion. Follow local public-health guidance.",
    },
    "asthma": {
        "good": "Air quality is good. Carry your quick-relief inhaler as usual and follow your asthma action plan.",
        "moderate": "Watch for symptoms during long outdoor activity. Keep your quick-relief inhaler with you.",
        "usg": "Limit prolonged outdoor activity and keep your quick-relief inhaler close. Follow your asthma action plan, and consider a well-fitted N95 mask if you must be outside.",
        "unhealthy": "Stay indoors where possible and avoid outdoor exertion. Follow your asthma action plan, and contact your doctor if symptoms worsen.",
        "very_unhealthy": "Stay indoors with the air as clean as you can keep it. Avoid all outdoor activity and seek medical advice promptly if you have symptoms.",
        "hazardous": "Stay indoors and avoid any outdoor exposure. Have your medicines ready, and seek medical help if you have trouble breathing.",
    },
    "child": {
        "good": "Air quality is good. Outdoor play and sports are fine.",
        "moderate": "Outdoor play is fine for most children. Watch children with asthma for coughing or wheezing.",
        "usg": "Children, especially those with asthma, should take more breaks and do less intense outdoor activity. Consider shortening outdoor playtime.",
        "unhealthy": "Move play and sports indoors where possible. Keep outdoor time short and light, and watch for coughing or breathing trouble.",
        "very_unhealthy": "Keep children indoors and avoid outdoor play and sport. Contact a doctor if a child has breathing difficulty.",
        "hazardous": "Keep children indoors with no outdoor activity. Seek medical help right away if a child has trouble breathing.",
    },
    "elderly": {
        "good": "Air quality is good. Normal outdoor activity is fine.",
        "moderate": "Normal activity is fine for most older adults. Slow down if you notice unusual tiredness or breathing discomfort.",
        "usg": "Older adults, especially with heart or lung conditions, should reduce prolonged or heavy outdoor exertion and take breaks.",
        "unhealthy": "Limit time outdoors and avoid heavy exertion. Stop and rest if you feel chest discomfort, shortness of breath, or unusual fatigue.",
        "very_unhealthy": "Stay indoors and avoid outdoor exertion. Contact your doctor if you have chest pain, palpitations, or trouble breathing.",
        "hazardous": "Stay indoors and avoid all outdoor activity. Seek medical help for chest pain, shortness of breath, or dizziness.",
    },
    "runner": {
        "good": "Great conditions for outdoor exercise.",
        "moderate": "Fine for most workouts. If you are unusually sensitive, consider easing off long, hard sessions.",
        "usg": "Reduce the intensity and length of outdoor workouts, or move them indoors. Choose lower-traffic routes and take breaks.",
        "unhealthy": "Move hard workouts indoors or reschedule for a cleaner time. If you go out, keep it light and short.",
        "very_unhealthy": "Skip outdoor exercise. Use an indoor alternative or rest.",
        "hazardous": "No outdoor exercise. Stay indoors until air quality improves.",
    },
}

DISCLAIMER = (
    "General guidance based on public-health AQI messages, not medical advice. "
    "Talk to a doctor about your own situation."
)


def band_for(aqi: float):
    for upper, key, label, color in BANDS:
        if aqi <= upper:
            return key, label, color
    return BANDS[-1][1:]


def build_advice(aqi: float, profile: str) -> dict:
    key, label, color = band_for(aqi)
    return {
        "aqi": round(aqi),
        "profile": profile,
        "band": key,
        "band_label": label,
        "color": color,
        "advice": ADVICE[profile][key],
        "disclaimer": DISCLAIMER,
    }