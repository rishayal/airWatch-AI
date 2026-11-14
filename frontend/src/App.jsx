
import { useEffect, useMemo, useState } from 'react'

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap
} from 'react-leaflet'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts'

import {
  Activity,
  MapPin,
  Wind,
  Users,
  BrainCircuit,
  Plus,
  RefreshCw,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react'

import { getJSON, postJSON } from './api'


// Default location
const CENTER = {
  latitude: 31.5204,
  longitude: 74.3587
}


// Available cities
const PRESETS = [
  { name: 'Lahore', latitude: 31.5204, longitude: 74.3587 },
  { name: 'Karachi', latitude: 24.8607, longitude: 67.0011 },
  { name: 'Delhi', latitude: 28.6139, longitude: 77.209 },
  { name: 'Mumbai', latitude: 19.076, longitude: 72.8777 },
  { name: 'London', latitude: 51.5072, longitude: -0.1276 },
  { name: 'New York', latitude: 40.7128, longitude: -74.006 }
]


// AQI colors
const color = v =>
  v <= 50 ? '#22c55e' :
  v <= 100 ? '#eab308' :
  v <= 150 ? '#f97316' :
  v <= 200 ? '#ef4444' :
  '#a855f7'


// AQI labels
const label = v =>
  v <= 50 ? 'Good' :
  v <= 100 ? 'Moderate' :
  v <= 150 ? 'Unhealthy for sensitive groups' :
  v <= 200 ? 'Unhealthy' :
  'Very unhealthy'


// Map resize helper
function ResizeMap() {
  const map = useMap()

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 120)

    return () => clearTimeout(timer)
  }, [map])

  return null
}


// Move map when selected location changes
function PanToSelected({ point }) {
  const map = useMap()

  useEffect(() => {
    if (
      point?.latitude != null &&
      point?.longitude != null
    ) {
      map.flyTo(
        [point.latitude, point.longitude],
        12,
        { duration: 0.7 }
      )
    }
  }, [map, point?.latitude, point?.longitude])

  return null
}


// Dashboard metric component
function Metric({ icon: Icon, title, value, detail, tint }) {
  return (
    <article className="metric">
      <div className="metric-head">
        {title}
        <Icon size={17} />
      </div>

      <strong style={tint ? { color: tint } : {}}>
        {value}
      </strong>

      <small>{detail}</small>
    </article>
  )
}


export default function App() {

  // Location states
  const [places, setPlaces] = useState([])

  const [selected, setSelected] = useState({
    id: 'central',
    name: 'Lahore Central',
    ...CENTER
  })

  const [area, setArea] = useState({
    name: 'Lahore',
    ...CENTER
  })

  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState([])
  const [locationMessage, setLocationMessage] = useState('')


  // Air quality states
  const [air, setAir] = useState(null)
  const [insight, setInsight] = useState(null)
  const [hotspots, setHotspots] = useState(null)


  // Community report states
  const [reports, setReports] = useState([])
  const [community, setCommunity] = useState(null)


  // General states
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState(false)


  // Complaint tracking states
  const [trackingCode, setTrackingCode] = useState('')
  const [trackInput, setTrackInput] = useState('')
  const [trackedReport, setTrackedReport] = useState(null)
  const [trackError, setTrackError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [trackingBusy, setTrackingBusy] = useState(false)


  // Report form
  const [form, setForm] = useState({
    category: 'smoke',
    description: '',
    location_name: 'Lahore',
    latitude: CENTER.latitude,
    longitude: CENTER.longitude,
    is_anonymous: true
  })


  // Clear previous tracking information when location changes
  function clearTracking() {
    setTrackingCode('')
    setTrackInput('')
    setTrackedReport(null)
    setTrackError('')
  }


  // Fetch nearby reports and community insights
  async function refreshReports(a = area) {
    try {
      const q =
        `latitude=${a.latitude}` +
        `&longitude=${a.longitude}` +
        `&radius_km=15`

      const [r, c] = await Promise.all([
        getJSON(`/api/reports?${q}`),
        getJSON(`/api/community-insights?${q}`)
      ])

      setReports(r)
      setCommunity(c)

    } catch (e) {
      setError(e.message)
    }
  }


  // Fetch nearby hotspot locations
  async function refreshHotspots(a = area) {
    try {
      const h = await getJSON(
        `/api/hotspots?latitude=${a.latitude}&longitude=${a.longitude}&name=${encodeURIComponent(a.name)}`
      )

      setHotspots(h)

      setPlaces(
        h.locations.map(({ id, name, latitude, longitude }) => ({
          id,
          name,
          latitude,
          longitude
        }))
      )

    } catch (e) {
      setError(e.message)
    }
  }


  // Change selected city or area
  function chooseArea(a) {

    const next = {
      name: a.name,
      latitude: a.latitude,
      longitude: a.longitude
    }

    setArea(next)

    setSelected({
      id: 'centre',
      ...next
    })

    // Clear previous city's data
    setReports([])
    setCommunity(null)
    setHotspots(null)

    // Clear previous tracking information
    clearTracking()

    // Update report form location
    setForm(f => ({
      ...f,
      latitude: next.latitude,
      longitude: next.longitude,
      location_name: next.name
    }))

    setMatches([])
    setQuery('')
    setLocationMessage('')
    setError('')

    refreshHotspots(next)
    refreshReports(next)
  }


  // Search for a city
  async function search(e) {
    e.preventDefault()

    if (query.trim().length < 2) return

    try {
      const r = await getJSON(
        `/api/geocode?q=${encodeURIComponent(query.trim())}`
      )

      setMatches(r)

      setLocationMessage(
        r.length
          ? 'Choose a match below.'
          : 'No place found. Try another spelling.'
      )

    } catch (err) {
      setError(err.message)
    }
  }


  // Use browser location
  
function useMyLocation() {
  setLocationMessage('Getting your location...')

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const latitude = pos.coords.latitude
      const longitude = pos.coords.longitude

      const a = {
        name: 'Your current area',
        latitude,
        longitude
      }

      setArea(a)

      setSelected({
        id: 'your-location',
        name: 'Your current area',
        latitude,
        longitude
      })

      setPlaces([])
      setReports([])
      setCommunity(null)
      setHotspots(null)

      clearTracking()

      setForm(f => ({
        ...f,
        latitude,
        longitude,
        location_name: 'Your current area'
      }))

      refreshHotspots(a)
      refreshReports(a)

      setLocationMessage('Location detected successfully!')
    },
    (err) => {
      console.error('GEOLOCATION:', err)

      setLocationMessage(
        `Location failed (${err.code}): ${err.message}`
      )
    },
   {
  enableHighAccuracy: false,
  timeout: 60000,
  maximumAge: 60000
}
  )
}
  // Refresh air quality and statistical insights
  async function refreshAir(place = selected) {

    setBusy(true)
    setError('')

    try {

      const q =
        `latitude=${place.latitude}` +
        `&longitude=${place.longitude}` +
        `&past_days=2`

      const [a, i] = await Promise.all([
        getJSON(`/api/air-quality?${q}`),
        getJSON(
          `/api/insights?latitude=${place.latitude}&longitude=${place.longitude}`
        )
      ])

      setAir(a)
      setInsight(i)

    } catch (e) {

      setError(e.message)
      setAir(null)
      setInsight(null)

    } finally {
      setBusy(false)
    }
  }


  // Submit community report
  async function submit(e) {

    e.preventDefault()

    setSubmitting(true)

    try {

      const result = await postJSON('/api/reports', form)

      // Save generated tracking code for this submission
      setTrackingCode(result.tracking_code)

      // Clear old tracking result
      setTrackedReport(null)
      setTrackInput('')
      setTrackError('')

      setModal(false)

      // Clear description after successful submission
      setForm(f => ({
        ...f,
        description: ''
      }))

      // Refresh nearby reports
      await refreshReports(area)

    } catch (err) {

      alert(err.message)

    } finally {
      setSubmitting(false)
    }
  }


  // Track complaint using tracking code
  async function trackComplaint(e) {

    e.preventDefault()

    if (!trackInput.trim()) {
      setTrackError('Please enter your tracking code.')
      return
    }

    setTrackingBusy(true)
    setTrackError('')
    setTrackedReport(null)

    try {

      const result = await getJSON(
        `/api/reports/track/${encodeURIComponent(trackInput.trim())}`
      )

      setTrackedReport(result)

    } catch (err) {

      setTrackError(
        'Complaint not found. Please check your tracking code.'
      )

    } finally {
      setTrackingBusy(false)
    }
  }


  // Initial loading
  useEffect(() => {
    refreshReports(area)
    refreshHotspots(area)
  }, [])


  // Refresh air data when selected point changes
  useEffect(() => {
    refreshAir(selected)
  }, [selected.latitude, selected.longitude])


  // Current air quality
  const current = air?.current || {}
  const aqi = current.us_aqi


  // Prepare chart data
  const chart = useMemo(() => {

    const h = air?.hourly

    if (!h?.time) return []

    return h.time
      .map((t, i) => ({
        time: new Date(t).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: 'numeric'
        }),
        aqi: h.us_aqi?.[i]
      }))
      .filter(x => x.aqi != null)

  }, [air])


  return (
    <div className="shell">

      {/* HEADER */}
      <header>

        <a className="brand" href="#top">
          <span className="brand-icon">
            <Wind />
          </span>

          <span>
            AirWatch <b>AI</b>
            <small>COMMUNITY AIR INTELLIGENCE</small>
          </span>
        </a>

        <nav>
          <a href="#map">Explore map</a>
          <a href="#trends">Analytics</a>
          <a href="#reports">Reports</a>
          <a href="#track">Track complaint</a>
        </nav>

        <button
          className="button"
          onClick={() => setModal(true)}
        >
          <Plus size={16} /> Report pollution
        </button>

      </header>


      <main id="top">

        {/* HERO */}
        <section className="hero">

          <div>
            <div className="eyebrow">
              ● LIVE AIR QUALITY INTELLIGENCE
            </div>

            <h1>
              Know the air.
              <br />
              <em>Protect your community.</em>
            </h1>

            <p>
              Explore modeled air-quality conditions, spot emerging
              patterns, and share what you see on the ground.
            </p>

            <a className="link" href="#map">
              Explore your area ↗
            </a>
          </div>

          <div className="hero-score">
            <Wind size={28} />

            <small>LOCAL AIR SNAPSHOT</small>

            <strong style={{ color: color(aqi ?? 0) }}>
              {aqi ?? '—'}
            </strong>

            <b>
              {aqi != null ? label(aqi) : 'Loading readings'}
            </b>

            <small>{selected.name} · US AQI</small>
          </div>

        </section>


        {/* ERROR MESSAGE */}
        {error && (
          <div className="error">
            <AlertTriangle size={16} />

            {error}

            <button onClick={() => refreshAir()}>
              Retry
            </button>
          </div>
        )}


        {/* METRICS */}
        <section className="metrics">

          <Metric
            icon={Activity}
            title="US AIR QUALITY INDEX"
            value={aqi ?? '—'}
            detail={aqi != null ? label(aqi) : 'Waiting for data'}
            tint={color(aqi ?? 0)}
          />

          <Metric
            icon={Wind}
            title="PM2.5"
            value={
              current.pm2_5 != null
                ? current.pm2_5.toFixed(1)
                : '—'
            }
            detail="µg/m³ · fine particles"
          />

          <Metric
            icon={Activity}
            title="PM10"
            value={
              current.pm10 != null
                ? current.pm10.toFixed(1)
                : '—'
            }
            detail="µg/m³ · coarse particles"
          />

          <Metric
            icon={Users}
            title="COMMUNITY REPORTS"
            value={reports.length}
            detail={`${reports.filter(r => r.status === 'pending').length} awaiting review`}
          />

        </section>


        {/* MAP SECTION */}
        <section className="section" id="map">

          <div className="section-head">

            <div>

              <div className="eyebrow">01 / EXPLORE</div>

              <h2>Pollution across your area</h2>

              <p>
                Search a city, pick a preset, or share your browser
                location to inspect nearby model estimates.
              </p>


              {/* CITY SEARCH */}
              <form className="geo-search" onSubmit={search}>

                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search any city or town worldwide…"
                  aria-label="Search city"
                />

                <button className="secondary" type="submit">
                  Search
                </button>

              </form>


              {/* SEARCH RESULTS */}
              {matches.length > 0 && (
                <div className="geo-matches">

                  {matches.map(m => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => chooseArea(m)}
                    >
                      {m.name}
                    </button>
                  ))}

                </div>
              )}


              {/* CITY PRESETS */}
              <div className="geo-matches">

                {PRESETS.map(p => (
                  <button
                    type="button"
                    key={p.name}
                    onClick={() => chooseArea(p)}
                  >
                    {p.name}
                  </button>
                ))}

              </div>


              {locationMessage && (
                <small className="location-message">
                  {locationMessage}
                </small>
              )}

            </div>


            <div className="section-actions">

              <button
                className="secondary"
                onClick={useMyLocation}
              >
                <MapPin size={15} /> Use my location
              </button>

              <button
                className="secondary"
                onClick={() => {
                  refreshAir()
                  refreshReports(area)
                  refreshHotspots(area)
                }}
              >
                <RefreshCw size={15} /> Refresh
              </button>

            </div>

          </div>


          {/* MAP AND SIDEBAR */}
          <div className="map-layout">

            <div className="map-card">

              <MapContainer
                center={[area.latitude, area.longitude]}
                zoom={11}
                scrollWheelZoom
              >

                <ResizeMap />

                <PanToSelected point={selected} />


                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />


                {/* MONITORING POINTS */}
                {places.map(p => (
                  <CircleMarker
                    key={p.id}
                    center={[p.latitude, p.longitude]}
                    radius={selected.id === p.id ? 12 : 8}
                    pathOptions={{
                      color: '#fff',
                      weight: 2,
                      fillColor:
                        selected.id === p.id
                          ? color(aqi ?? 0)
                          : '#2dd4bf',
                      fillOpacity: 0.9
                    }}
                    eventHandlers={{
                      click: () => setSelected(p)
                    }}
                  >
                    <Popup>
                      <b>{p.name}</b>
                      <br />
                      Choose this area in the location list.
                    </Popup>
                  </CircleMarker>
                ))}


                {/* USER LOCATION */}
                {selected.id === 'your-location' && (
                  <CircleMarker
                    center={[
                      selected.latitude,
                      selected.longitude
                    ]}
                    radius={12}
                    pathOptions={{
                      color: '#fff',
                      weight: 3,
                      fillColor: '#3b82f6',
                      fillOpacity: 1
                    }}
                  >
                    <Popup>
                      Your shared location · modeled estimate
                    </Popup>
                  </CircleMarker>
                )}


                {/* COMMUNITY REPORT MARKERS */}
                {reports.map(r => (
                  <CircleMarker
                    key={`r${r.id}`}
                    center={[r.latitude, r.longitude]}
                    radius={7}
                    pathOptions={{
                      color: '#fff',
                      weight: 1,
                      fillColor:
                        r.status === 'verified'
                          ? '#f97316'
                          : '#94a3b8'
                    }}
                  >
                    <Popup>
                      <b>{r.category} report</b>
                      <br />
                      {r.description}
                      <br />
                      Status: {r.status}
                    </Popup>
                  </CircleMarker>
                ))}

              </MapContainer>


              <div className="legend">
                <span>🟢 Model query point</span>
                <span>🟠 Verified report</span>
                <span>⚪ Pending report</span>
              </div>

            </div>


            {/* MAP SIDEBAR */}
            <aside className="side">

              <h3>Monitoring locations</h3>

              <p>Select a point to load its data.</p>


              <div className="places">

                {places.map(p => (
                  <button
                    key={p.id}
                    className={
                      selected.id === p.id
                        ? 'place active'
                        : 'place'
                    }
                    onClick={() => setSelected(p)}
                  >
                    <MapPin size={15} />

                    <span>
                      {p.name}

                      <small>
                        {p.latitude.toFixed(3)}, {p.longitude.toFixed(3)}
                      </small>
                    </span>

                    ›
                  </button>
                ))}

              </div>


              <div className="selected">

                <small>SELECTED AREA</small>

                <h3>{selected.name}</h3>

                <strong style={{ color: color(aqi ?? 0) }}>
                  {aqi ?? '—'} <small>US AQI</small>
                </strong>

                <b>
                  {aqi != null
                    ? label(aqi)
                    : busy
                      ? 'Loading…'
                      : 'No reading'}
                </b>

                <p>
                  {air?.note ||
                    'Readings are supplied by the air-quality model.'}
                </p>

              </div>

            </aside>

          </div>


          <p className="attribution">
            Map © OpenStreetMap contributors. Air-quality data:
            Open-Meteo / CAMS. Model grid estimates are not
            street-level sensor measurements.
          </p>

        </section>


        {/* HOTSPOTS */}
        <section className="section" id="hotspots">

          <div className="section-head">

            <div>
              <div className="eyebrow">02 / COMPARE</div>

              <h2>Pollution hotspot watch</h2>

              <p>
                Compare modeled AQI across query points around {area.name}.
              </p>
            </div>

            <button
              className="secondary"
              onClick={() => refreshHotspots(area)}
            >
              <RefreshCw size={15} /> Update comparison
            </button>

          </div>


          <div className="hotspot-grid">

            {(hotspots?.locations || []).map(p => (
              <button
                key={p.id}
                className={`hotspot-card ${selected.id === p.id ? 'chosen' : ''}`}
                onClick={() => setSelected(p)}
              >

                <span>{p.name}</span>

                <strong
                  style={{
                    color: p.aqi != null
                      ? color(p.aqi)
                      : '#81999f'
                  }}
                >
                  {p.aqi ?? '—'}
                </strong>

                <small>
                  {p.aqi != null
                    ? label(p.aqi)
                    : 'No current reading'} · US AQI
                </small>

                <small>
                  PM2.5: {
                    p.pm2_5 != null
                      ? `${Number(p.pm2_5).toFixed(1)} µg/m³`
                      : '—'
                  }
                </small>

              </button>
            ))}

          </div>


          <p className="attribution">
            {hotspots?.highest
              ? `Highest estimate: ${hotspots.highest.name} (${hotspots.highest.aqi} AQI). `
              : ''}

            {hotspots?.lowest
              ? `Lowest: ${hotspots.lowest.name} (${hotspots.lowest.aqi} AQI). `
              : ''}

            {hotspots?.note || 'Loading comparison…'}
          </p>

        </section>


        {/* COMMUNITY PATTERNS */}
        <section className="section" id="community-patterns">

          <div className="section-head">

            <div>
              <div className="eyebrow">03 / COMMUNITY SIGNALS</div>

              <h2>Community pattern analysis</h2>

              <p>
                Summarizes resident observations, excluding
                rejected submissions.
              </p>
            </div>

          </div>


          <div className="pattern-panel">

            <div className="pattern-stats">

              <div>
                <strong>{community?.total_reports ?? 0}</strong>
                <small>Reports analyzed</small>
              </div>

              <div>
                <strong>{community?.pending_reports ?? 0}</strong>
                <small>Pending review</small>
              </div>

              <div>
                <strong>{community?.verified_reports ?? 0}</strong>
                <small>Verified reports</small>
              </div>

            </div>


            <div>

              <h3>Frequently reported pollution types</h3>


              <div className="category-bars">

                {Object.entries(
                  community?.category_counts || {}
                )
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, count]) => (

                    <div className="category-row" key={name}>

                      <span>{name}</span>

                      <div>
                        <i
                          style={{
                            width: `${
                              Math.max(
                                5,
                                count /
                                Math.max(
                                  1,
                                  ...Object.values(
                                    community?.category_counts || {}
                                  )
                                ) * 100
                              )
                            }%`
                          }}
                        />
                      </div>

                      <b>{count}</b>

                    </div>

                  ))}

              </div>


              <p className="action-tip">
                <b>Suggested community action:</b>{' '}
                {community?.suggested_action ||
                  'As reports arrive, AirWatch will identify common observation types and suggest practical next steps.'}
              </p>

            </div>

          </div>


          <p className="attribution">
            {community?.note ||
              'Community observations are not verified measurements.'}
          </p>

        </section>


        {/* ANALYTICS */}
        <section className="section" id="trends">

          <div className="section-head">

            <div>
              <div className="eyebrow">04 / UNDERSTAND</div>

              <h2>Air quality over time</h2>

              <p>
                Recent and forecast hourly model values for {selected.name}.
              </p>
            </div>

            <span className="pill">HOURLY SERIES</span>

          </div>


          <div className="analytics">

            <div className="chart-card">

              <h3>US AQI trend</h3>

              <p>Historical context + forecast series</p>


              <div className="chart">

                <ResponsiveContainer width="100%" height="100%">

                  <AreaChart data={chart}>

                    <defs>
                      <linearGradient
                        id="aqiFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#2dd4bf"
                          stopOpacity={0.3}
                        />

                        <stop
                          offset="95%"
                          stopColor="#2dd4bf"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>


                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#20323b"
                    />

                    <XAxis
                      dataKey="time"
                      tick={{ fill: '#8da1a9', fontSize: 10 }}
                      minTickGap={35}
                    />

                    <YAxis
                      tick={{ fill: '#8da1a9', fontSize: 11 }}
                    />

                    <Tooltip
                      contentStyle={{
                        background: '#10232c',
                        border: '1px solid #29414b',
                        borderRadius: 10,
                        color: '#fff'
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="aqi"
                      stroke="#2dd4bf"
                      fill="url(#aqiFill)"
                      strokeWidth={2}
                      connectNulls
                    />

                  </AreaChart>

                </ResponsiveContainer>

              </div>

            </div>


            {/* INSIGHTS */}
            <div className="insight">

              <BrainCircuit size={28} />

              <div className="eyebrow">
                AIRWATCH INTELLIGENCE
              </div>

              <h3>What the data suggests</h3>

              <p>
                {insight?.summary ||
                  'Loading the available air-quality series…'}
              </p>

              <b>
                {insight
                  ? insight.anomaly
                    ? '⚠ Unusual increase detected'
                    : '✓ No unusual increase detected'
                  : 'Analyzing'}
              </b>

              <small>
                {insight?.prediction != null
                  ? `Baseline estimate: ${insight.prediction} AQI · ${insight.confidence}`
                  : 'Prediction unavailable'}
              </small>

              <div className="disclaimer">
                Experimental statistical insight, not an official
                alert or validated ML forecast.
              </div>

            </div>

          </div>

        </section>


        {/* COMMUNITY REPORTS AND TRACKING */}
        <section className="section" id="reports">

          <div className="section-head">

            <div>
              <div className="eyebrow">05 / TAKE ACTION</div>

              <h2>Community observations</h2>

              <p>
                Local knowledge helps flag events a regional
                model may not capture.
              </p>
            </div>

            <button
              className="button"
              onClick={() => setModal(true)}
            >
              <Plus size={16} /> Submit a report
            </button>

          </div>


          {/* TRACKING CODE AFTER SUBMISSION */}
          {trackingCode && (

            <div className="tracking-success">

              <h3>Complaint submitted successfully!</h3>

              <p>
                Your tracking code is below. Save it somewhere
                safe so you can check your complaint later.
              </p>

              <strong>{trackingCode}</strong>

              <button
                className="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(trackingCode)
                }}
              >
                Copy tracking code
              </button>

            </div>

          )}


          {/* TRACK EXISTING COMPLAINT */}
          <div className="track-panel" id="track">

            <div className="eyebrow">
              COMPLAINT TRACKING
            </div>

            <h3>Track My Complaint</h3>

            <p>
              Enter the tracking code you received after
              submitting your report.
            </p>


            <form
              className="geo-search"
              onSubmit={trackComplaint}
            >

              <input
                value={trackInput}
                onChange={e => setTrackInput(e.target.value)}
                placeholder="Enter your complaint tracking code"
                required
              />

              <button
                className="secondary"
                type="submit"
                disabled={trackingBusy}
              >
                {trackingBusy ? 'Checking...' : 'Track complaint'}
              </button>

            </form>


            {trackError && (
              <p className="error">{trackError}</p>
            )}


            {trackedReport && (

              <div className="tracked-result">

                <h4>Complaint #{trackedReport.id}</h4>

                <p>
                  <b>Category:</b> {trackedReport.category}
                </p>

                <p>
                  <b>Location:</b>{' '}
                  {trackedReport.location_name || 'Not provided'}
                </p>

                <p>
                  <b>Status:</b>{' '}
                  <span className={`status ${trackedReport.status}`}>
                    {trackedReport.status.replace('_', ' ')}
                  </span>
                </p>

                <p>
                  <b>Submitted:</b>{' '}
                  {new Date(trackedReport.created_at).toLocaleString()}
                </p>

                {trackedReport.review_note && (
                  <p>
                    <b>Moderator note:</b>{' '}
                    {trackedReport.review_note}
                  </p>
                )}

              </div>

            )}

          </div>


          {/* REPORT LIST */}
          <div className="reports">

            {reports.length === 0 ? (

              <div className="empty">

                <Users />

                <h3>No community reports yet</h3>

                <p>Be the first to share an observation.</p>

              </div>

            ) : (

              reports.slice(0, 9).map(r => (

                <article className="report" key={r.id}>

                  <div className="report-head">

                    <b>{r.category}</b>

                    <span className={`status ${r.status}`}>
                      {r.status.replace('_', ' ')}
                    </span>

                  </div>

                  <p>{r.description}</p>

                  <small>
                    <MapPin size={12} />{' '}

                    {r.location_name ||
                      `${r.latitude.toFixed(3)}, ${r.longitude.toFixed(3)}`}

                    {' · '}

                    {new Date(r.created_at).toLocaleDateString()}
                  </small>

                </article>

              ))

            )}

          </div>

        </section>


        {/* CTA */}
        <section className="cta">

          <div>

            <div className="eyebrow">
              A CLEARER PICTURE STARTS LOCALLY
            </div>

            <h2>Your observation matters.</h2>

            <p>
              Help your community build a richer picture
              of the air around them.
            </p>

          </div>

          <button
            className="button"
            onClick={() => setModal(true)}
          >
            <Plus size={16} /> Report pollution
          </button>

        </section>

      </main>


      {/* FOOTER */}
      <footer>

        <b>
          AirWatch <em>AI</em>
        </b>

        <span>
          Community-powered environmental intelligence
        </span>

        <span>
          Open-Meteo / CAMS · OpenStreetMap
        </span>

      </footer>


      {/* REPORT MODAL */}
      {modal && (

        <div
          className="backdrop"
          onClick={() => setModal(false)}
        >

          <form
            className="modal"
            onSubmit={submit}
            onClick={e => e.stopPropagation()}
          >

            <button
              type="button"
              className="close"
              onClick={() => setModal(false)}
            >
              ×
            </button>


            <div className="eyebrow">
              COMMUNITY REPORT
            </div>

            <h2>What are you noticing?</h2>

            <p>
              Reports remain pending until reviewed by a human moderator.
            </p>


            {/* CATEGORY */}
            <label>

              Observation type

              <select
                value={form.category}
                onChange={e => setForm({
                  ...form,
                  category: e.target.value
                })}
              >
                <option value="smoke">Smoke</option>
                <option value="dust">Dust</option>
                <option value="burning">Open burning</option>
                <option value="industrial">Industrial emissions</option>
                <option value="other">Other</option>
              </select>

            </label>


            {/* LOCATION NAME */}
            <label>

              Location name

              <input
                value={form.location_name}
                onChange={e => setForm({
                  ...form,
                  location_name: e.target.value
                })}
                placeholder="Neighborhood or nearby landmark"
              />

            </label>


            {/* COORDINATES */}
            <div className="form-row">

              <label>

                Latitude

                <input
                  type="number"
                  step="any"
                  required
                  value={form.latitude}
                  onChange={e => setForm({
                    ...form,
                    latitude: Number(e.target.value)
                  })}
                />

              </label>


              <label>

                Longitude

                <input
                  type="number"
                  step="any"
                  required
                  value={form.longitude}
                  onChange={e => setForm({
                    ...form,
                    longitude: Number(e.target.value)
                  })}
                />

              </label>

            </div>


            {/* ANONYMOUS REPORTING */}
            <label className="anonymous-option">

              <input
                type="checkbox"
                checked={form.is_anonymous}
                onChange={e => setForm({
                  ...form,
                  is_anonymous: e.target.checked
                })}
              />

              Submit anonymously

            </label>


            <small className="form-note">
              <ShieldCheck size={13} />

              Do not include private or identifying information.
              Anonymous reporting does not guarantee that server
              logs contain no technical information.
            </small>


            {/* DESCRIPTION */}
            <label>

              Description

              <textarea
                minLength="10"
                maxLength="1200"
                required
                value={form.description}
                onChange={e => setForm({
                  ...form,
                  description: e.target.value
                })}
                placeholder="Describe what you observed, when, and for how long…"
              />

            </label>


            <button
              className="button submit"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? 'Submitting...'
                : 'Submit for human review →'}
            </button>

          </form>

        </div>

      )}

    </div>
  )
}
