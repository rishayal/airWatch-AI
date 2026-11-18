import { useEffect, useState } from 'react'
import { getJSON } from './api'

const PROFILES = [
  { value: 'general', label: 'General public' },
  { value: 'asthma', label: 'Asthma or lung condition' },
  { value: 'child', label: 'Child (or caring for one)' },
  { value: 'elderly', label: 'Older adult' },
  { value: 'runner', label: 'Runner / outdoor exercise' },
]

const STORAGE_KEY = 'airwatch-health-profile'

function loadProfile() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return PROFILES.some(p => p.value === saved) ? saved : 'general'
  } catch {
    return 'general'
  }
}

export default function HealthAdvice({ aqi }) {
  const [profile, setProfile] = useState(loadProfile)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  function changeProfile(value) {
    setProfile(value)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      /* storage unavailable; the choice just won't persist */
    }
  }

  useEffect(() => {
    if (aqi == null) {
      setResult(null)
      return
    }
    let cancelled = false
    setError('')
    getJSON(`/api/health-advice?aqi=${encodeURIComponent(aqi)}&profile=${profile}`)
      .then(data => { if (!cancelled) setResult(data) })
      .catch(err => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [aqi, profile])

  return (
    <section className="section health-advice" id="health-advice">
      <div className="health-advice__head">
        <h2>Advice for you</h2>
        <label className="health-advice__select">
          <span>I am:</span>
          <select value={profile} onChange={e => changeProfile(e.target.value)}>
            {PROFILES.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </label>
      </div>

      {aqi == null && <p className="health-advice__muted">Waiting for air-quality data…</p>}
      {error && <p className="health-advice__error">{error}</p>}

      {result && (
        <div className="health-advice__card" style={{ borderLeftColor: result.color }}>
          <div className="health-advice__level" style={{ color: result.color }}>
            AQI {result.aqi} · {result.band_label}
          </div>
          <p className="health-advice__text">{result.advice}</p>
          <p className="health-advice__disclaimer">{result.disclaimer}</p>
        </div>
      )}
    </section>
  )
}