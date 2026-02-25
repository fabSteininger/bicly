import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import WaypointList from './components/WaypointList'
import { buildBrouterRouteUrl, loadProfiles } from './lib/api'

const mapStyle = 'https://tiles.openfreemap.org/styles/liberty'
const ROUTE_SOURCE_ID = 'generated-route-source'
const ROUTE_LAYER_ID = 'generated-route-layer'
const ROUTE_HOVER_SOURCE_ID = 'generated-route-hover-source'
const ROUTE_HOVER_LAYER_ID = 'generated-route-hover-layer'
const STORAGE_KEY = 'bicly_saved_routes'
const PLANNER_DRAFT_KEY = 'bicly_planner_draft'

const emptyRouteGeoJson = { type: 'FeatureCollection', features: [] }

const emptyRouteStats = { distanceKm: 0, ascentM: 0, descentM: 0, rawSummary: '', elevationProfile: [] }

const HamburgerIcon = () => (
  <svg viewBox="0 0 122.88 95.95" aria-hidden="true" focusable="false">
    <path d="M8.94,0h105c4.92,0,8.94,4.02,8.94,8.94l0,0c0,4.92-4.02,8.94-8.94,8.94h-105C4.02,17.88,0,13.86,0,8.94l0,0 C0,4.02,4.02,0,8.94,0L8.94,0z M8.94,78.07h105c4.92,0,8.94,4.02,8.94,8.94l0,0c0,4.92-4.02,8.94-8.94,8.94h-105 C4.02,95.95,0,91.93,0,87.01l0,0C0,82.09,4.02,78.07,8.94,78.07L8.94,78.07z M8.94,39.03h105c4.92,0,8.94,4.02,8.94,8.94l0,0 c0,4.92-4.02,8.94-8.94,8.94h-105C4.02,56.91,0,52.89,0,47.97l0,0C0,43.06,4.02,39.03,8.94,39.03L8.94,39.03z" />
  </svg>
)

const TEXT = {
  en: {
    appTitle: 'Bicly', appSub: 'Ride-ready route planning with local GPX storage.', planner: 'Planner', library: 'Library',
    language: 'Language', profile: 'Routing profile', title: 'Route title', clearPins: 'Clear pins',
    saveGenerated: 'Save generated GPX', routeReady: 'Route generated and shown on map.',
    addPinsHint: 'Click on the map to add pins. Drag and reorder on the left.',
    useLocationStart: 'Use my location as start', addMyLocation: 'Add my location point',
    findPlace: 'Find place', placeSearchPlaceholder: 'Search city, street, or POI', noPlacesFound: 'No places found',
    searchingPlaces: 'Searching...', uploadSection: 'Upload route', uploadGpx: 'Upload GPX',
    uploadRouteTitle: 'Route title (optional)', uploadRouteButton: 'Save to local library',
    noSaved: 'No saved routes yet.', openGpx: 'Open GPX', loadOnMap: 'Load on map', remove: 'Remove',
    plannerHeading: 'Route planner', libraryHeading: 'Local route library', statusSaved: 'Route saved locally',
    statusUploaded: 'Route uploaded locally', locationUnavailable: 'Location unavailable',
    openPlanner: 'Open planner', closePlanner: 'Close planner', cyclingMode: 'Cycling mode',
    userMenu: 'Menu', routeDetails: 'Route details', showDetails: 'Show details', hideDetails: 'Hide details',
    appMenu: 'App menu', openRouteTools: 'Expand route tools',
    privacyPolicy: 'Privacy policy', impressum: 'Impressum', backToPlanner: 'Back to planner',
    privacyHeading: 'Privacy policy', impressumHeading: 'Impressum',
    distance: 'Distance', ascent: 'Ascent', descent: 'Descent',
    elevationProfile: 'Elevation profile', steepLegend: 'Steepness (10°+ = red)',
    openRouteDetailsSheet: 'Open route details', closeRouteDetailsSheet: 'Close route details',
    routeDetailsUnavailable: 'Generate a route to see distance and elevation details.',
    elevationFocusHint: 'Hover (desktop) or drag (touch) to highlight the matching map position.',
  },
  de: {
    appTitle: 'Bicly', appSub: 'Fahrradfreundliche Routenplanung mit lokaler GPX-Bibliothek.', planner: 'Planer', library: 'Bibliothek',
    language: 'Sprache', profile: 'Routing-Profil', title: 'Routentitel', clearPins: 'Pins löschen',
    saveGenerated: 'Generierte GPX speichern', routeReady: 'Route erzeugt und auf der Karte angezeigt.',
    addPinsHint: 'Klicke auf die Karte, um Pins hinzuzufügen. Links kannst du sie sortieren.',
    useLocationStart: 'Meinen Standort als Start nutzen', addMyLocation: 'Meinen Standort als Punkt hinzufügen',
    findPlace: 'Ort suchen', placeSearchPlaceholder: 'Stadt, Straße oder POI suchen', noPlacesFound: 'Keine Orte gefunden',
    searchingPlaces: 'Suche...', uploadSection: 'Route hochladen', uploadGpx: 'GPX hochladen',
    uploadRouteTitle: 'Routentitel (optional)', uploadRouteButton: 'Lokal speichern',
    noSaved: 'Noch keine gespeicherten Routen.', openGpx: 'GPX öffnen', loadOnMap: 'Auf Karte laden', remove: 'Entfernen',
    plannerHeading: 'Routenplaner', libraryHeading: 'Lokale Routenbibliothek', statusSaved: 'Route lokal gespeichert',
    statusUploaded: 'Route lokal hochgeladen', locationUnavailable: 'Standort nicht verfügbar',
    openPlanner: 'Planer öffnen', closePlanner: 'Planer schließen', cyclingMode: 'Cycling-Modus',
    userMenu: 'Menü', routeDetails: 'Routendetails', showDetails: 'Details anzeigen', hideDetails: 'Details ausblenden',
    appMenu: 'App-Menü', openRouteTools: 'Routenwerkzeuge aufklappen',
    privacyPolicy: 'Datenschutz', impressum: 'Impressum', backToPlanner: 'Zurück zum Planer',
    privacyHeading: 'Datenschutzerklärung', impressumHeading: 'Impressum',
    distance: 'Distanz', ascent: 'Anstieg', descent: 'Abstieg',
    elevationProfile: 'Höhenprofil', steepLegend: 'Steigung (ab 10° = rot)',
    openRouteDetailsSheet: 'Routendetails öffnen', closeRouteDetailsSheet: 'Routendetails schließen',
    routeDetailsUnavailable: 'Erzeuge eine Route, um Distanz- und Höhendetails zu sehen.',
    elevationFocusHint: 'Fahre mit der Maus darüber (Desktop) oder ziehe mit dem Finger, um die Kartenposition zu markieren.',
  },
}

const ElevationChart = ({ profile, title, legend, hoverHint, activeDistanceM, onHoverPoint, onLeave }) => {
  if (!profile.length) return null
  const width = 320
  const height = 120
  const paddingX = 8
  const paddingY = 8
  const maxDistance = profile[profile.length - 1]?.distanceM || 1
  const elevations = profile.map((point) => point.elevationM)
  const minElevation = Math.min(...elevations)
  const maxElevation = Math.max(...elevations)
  const elevationRange = Math.max(maxElevation - minElevation, 1)
  const xFor = (distanceM) => paddingX + (distanceM / maxDistance) * (width - (paddingX * 2))
  const yFor = (elevationM) => height - paddingY - ((elevationM - minElevation) / elevationRange) * (height - (paddingY * 2))
  const nearestPointForX = (xPx) => {
    const relative = (xPx - paddingX) / (width - (paddingX * 2))
    const distanceAtCursor = Math.min(maxDistance, Math.max(0, relative * maxDistance))
    return profile.reduce((closest, point) => {
      if (!closest) return point
      return Math.abs(point.distanceM - distanceAtCursor) < Math.abs(closest.distanceM - distanceAtCursor) ? point : closest
    }, null)
  }
  const updateHover = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const xPx = ((event.clientX - bounds.left) / bounds.width) * width
    const hoveredPoint = nearestPointForX(xPx)
    onHoverPoint?.(hoveredPoint)
  }
  const activePoint = Number.isFinite(activeDistanceM)
    ? profile.reduce((closest, point) => {
      if (!closest) return point
      return Math.abs(point.distanceM - activeDistanceM) < Math.abs(closest.distanceM - activeDistanceM) ? point : closest
    }, null)
    : null

  return (
    <section className="elevation-chart" aria-label={title}>
      <h4>{title}</h4>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={title}
        onMouseMove={updateHover}
        onMouseLeave={onLeave}
        onTouchMove={(event) => {
          const touch = event.touches[0]
          if (!touch) return
          updateHover({ currentTarget: event.currentTarget, clientX: touch.clientX })
        }}
        onTouchEnd={onLeave}
      >
        <defs>
          <linearGradient id="elevation-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a8c8ff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#e9f2ff" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <path d={`M ${xFor(profile[0].distanceM)} ${height - paddingY} ${profile.map((point) => `L ${xFor(point.distanceM)} ${yFor(point.elevationM)}`).join(' ')} L ${xFor(profile[profile.length - 1].distanceM)} ${height - paddingY} Z`} fill="url(#elevation-fill)" />
        {profile.slice(1).map((point, index) => {
          const prev = profile[index]
          const angle = point.slopeDeg
          const color = angle >= 10 ? '#e22b2b' : angle >= 6 ? '#ef8f2e' : '#1f6feb'
          return <line key={`${point.distanceM}-${point.elevationM}`} x1={xFor(prev.distanceM)} y1={yFor(prev.elevationM)} x2={xFor(point.distanceM)} y2={yFor(point.elevationM)} stroke={color} strokeWidth="2.6" strokeLinecap="round" />
        })}
        {activePoint && <>
          <line x1={xFor(activePoint.distanceM)} y1={paddingY} x2={xFor(activePoint.distanceM)} y2={height - paddingY} stroke="#0f172a" strokeOpacity="0.32" strokeDasharray="3 3" />
          <circle cx={xFor(activePoint.distanceM)} cy={yFor(activePoint.elevationM)} r="4" fill="#0f172a" stroke="#fff" strokeWidth="1.5" />
        </>}
      </svg>
      <small>{legend}</small>
      <small>{hoverHint}</small>
    </section>
  )
}

const haversineMeters = (a, b) => {
  const toRad = (deg) => deg * (Math.PI / 180)
  const R = 6371000
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

const parseGpxStats = (gpxText) => {
  if (!gpxText) return emptyRouteStats
  try {
    const xml = new DOMParser().parseFromString(gpxText, 'application/xml')
    const trkpts = Array.from(xml.querySelectorAll('trkpt'))
      .map((node) => ({
        lon: Number(node.getAttribute('lon')),
        lat: Number(node.getAttribute('lat')),
        ele: Number(node.querySelector('ele')?.textContent ?? Number.NaN),
      }))
      .filter((point) => Number.isFinite(point.lon) && Number.isFinite(point.lat))
    if (trkpts.length < 2) return emptyRouteStats

    let distanceMeters = 0
    let ascentM = 0
    let descentM = 0
    for (let i = 1; i < trkpts.length; i += 1) {
      distanceMeters += haversineMeters(trkpts[i - 1], trkpts[i])
      if (Number.isFinite(trkpts[i - 1].ele) && Number.isFinite(trkpts[i].ele)) {
        const delta = trkpts[i].ele - trkpts[i - 1].ele
        if (delta > 0) ascentM += delta
        if (delta < 0) descentM += Math.abs(delta)
      }
    }

    const rawSummary = xml.querySelector('metadata > desc')?.textContent?.trim() ?? ''
    return {
      distanceKm: distanceMeters / 1000,
      ascentM,
      descentM,
      rawSummary,
      elevationProfile: trkpts.reduce((acc, point, index) => {
        if (!Number.isFinite(point.ele)) return acc
        if (!index) return [{ distanceM: 0, elevationM: point.ele, slopeDeg: 0, lon: point.lon, lat: point.lat }]
        const previous = trkpts[index - 1]
        const previousDistance = acc[acc.length - 1]?.distanceM ?? 0
        const segmentMeters = haversineMeters(previous, point)
        const slopeDeg = Number.isFinite(previous.ele) && segmentMeters > 0
          ? Math.abs((Math.atan((point.ele - previous.ele) / segmentMeters) * 180) / Math.PI)
          : 0
        return [...acc, { distanceM: previousDistance + segmentMeters, elevationM: point.ele, slopeDeg, lon: point.lon, lat: point.lat }]
      }, []),
    }
  } catch {
    return emptyRouteStats
  }
}

const parseGpxToGeoJson = (gpxText) => {
  if (!gpxText) return emptyRouteGeoJson
  try {
    const xml = new DOMParser().parseFromString(gpxText, 'application/xml')
    const points = Array.from(xml.querySelectorAll('trkpt'))
      .map((node) => [Number(node.getAttribute('lon')), Number(node.getAttribute('lat'))])
      .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat))
    if (points.length < 2) return emptyRouteGeoJson
    return { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: points }, properties: {} }] }
  } catch {
    return emptyRouteGeoJson
  }
}


const readPlannerDraft = () => {
  try {
    const raw = localStorage.getItem(PLANNER_DRAFT_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw)
    if (!draft || typeof draft !== 'object') return null
    return draft
  } catch {
    return null
  }
}

const ensureRouteLayer = (map) => {
  if (!map.getSource(ROUTE_SOURCE_ID)) map.addSource(ROUTE_SOURCE_ID, { type: 'geojson', data: emptyRouteGeoJson })
  if (!map.getLayer(ROUTE_LAYER_ID)) {
    map.addLayer({ id: ROUTE_LAYER_ID, type: 'line', source: ROUTE_SOURCE_ID, paint: { 'line-color': '#0c5ff4', 'line-width': 4, 'line-opacity': 0.9 } })
  }
  if (!map.getSource(ROUTE_HOVER_SOURCE_ID)) map.addSource(ROUTE_HOVER_SOURCE_ID, { type: 'geojson', data: emptyRouteGeoJson })
  if (!map.getLayer(ROUTE_HOVER_LAYER_ID)) {
    map.addLayer({
      id: ROUTE_HOVER_LAYER_ID,
      type: 'circle',
      source: ROUTE_HOVER_SOURCE_ID,
      paint: {
        'circle-radius': 7,
        'circle-color': '#0f172a',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    })
  }
}

export default function App() {
  const plannerDraft = useMemo(() => readPlannerDraft(), [])
  const [lang, setLang] = useState('de')
  const t = TEXT[lang]
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const mapMarkers = useRef([])
  const [activePage, setActivePage] = useState('planner')
  const [waypoints, setWaypoints] = useState(() => Array.isArray(plannerDraft?.waypoints) ? plannerDraft.waypoints : [])
  const [profiles, setProfiles] = useState([])
  const [activeProfile, setActiveProfile] = useState(() => typeof plannerDraft?.activeProfile === 'string' ? plannerDraft.activeProfile : 'trekking')
  const [latestGpx, setLatestGpx] = useState(() => typeof plannerDraft?.latestGpx === 'string' ? plannerDraft.latestGpx : '')
  const [routeGeoJson, setRouteGeoJson] = useState(() => plannerDraft?.routeGeoJson?.type === 'FeatureCollection' ? plannerDraft.routeGeoJson : emptyRouteGeoJson)
  const [title, setTitle] = useState(() => typeof plannerDraft?.title === 'string' ? plannerDraft.title : 'New Route')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadGpxFile, setUploadGpxFile] = useState(null)
  const [savedRoutes, setSavedRoutes] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'))
  const [message, setMessage] = useState('')
  const [userLocation, setUserLocation] = useState(null)
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeResults, setPlaceResults] = useState([])
  const [searchingPlaces, setSearchingPlaces] = useState(false)
  const [plannerPanelOpen, setPlannerPanelOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [showRouteDetails, setShowRouteDetails] = useState(() => Boolean(plannerDraft?.latestGpx))
  const [routeStats, setRouteStats] = useState(() => plannerDraft?.routeStats?.elevationProfile ? plannerDraft.routeStats : emptyRouteStats)
  const [activeElevationPoint, setActiveElevationPoint] = useState(null)

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(savedRoutes)) }, [savedRoutes])
  useEffect(() => {
    loadProfiles().then((rows) => {
      setProfiles(rows)
      if (!rows[0]) return
      setActiveProfile((prev) => rows.some((profile) => profile.brouter_profile_id === prev) ? prev : rows[0].brouter_profile_id)
    })
  }, [])

  useEffect(() => {
    localStorage.setItem(PLANNER_DRAFT_KEY, JSON.stringify({
      waypoints,
      activeProfile,
      latestGpx,
      routeGeoJson,
      title,
      routeStats,
      showRouteDetails,
    }))
  }, [waypoints, activeProfile, latestGpx, routeGeoJson, title, routeStats, showRouteDetails])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((position) => setUserLocation({ lon: position.coords.longitude, lat: position.coords.latitude }))
  }, [])

  const addWaypoint = (label, lon, lat) => setWaypoints((prev) => [...prev, { id: crypto.randomUUID(), label: label || `Pin ${prev.length + 1}`, lon: Number(lon.toFixed(6)), lat: Number(lat.toFixed(6)) }])
  const brouterPoints = useMemo(() => waypoints.map((p) => `${p.lon},${p.lat}`).join('|'), [waypoints])

  useEffect(() => {
    if (activePage !== 'planner' || mapInstance.current || !mapRef.current) return
    mapInstance.current = new maplibregl.Map({ container: mapRef.current, style: mapStyle, center: userLocation ? [userLocation.lon, userLocation.lat] : [8.68, 50.11], zoom: 10 })
    mapInstance.current.addControl(new maplibregl.NavigationControl(), 'top-right')
    mapInstance.current.on('load', () => ensureRouteLayer(mapInstance.current))
    mapInstance.current.on('click', (e) => addWaypoint('', e.lngLat.lng, e.lngLat.lat))
  }, [activePage, userLocation])

  useEffect(() => () => { mapMarkers.current.forEach((m) => m.remove()); mapInstance.current?.remove() }, [])
  useEffect(() => { if (activePage === 'planner') return; mapMarkers.current.forEach((m) => m.remove()); mapMarkers.current = []; mapInstance.current?.remove(); mapInstance.current = null }, [activePage])

  useEffect(() => {
    mapMarkers.current.forEach((m) => m.remove())
    mapMarkers.current = []
    if (!mapInstance.current) return
    waypoints.forEach((point, index) => {
      const element = document.createElement('div')
      element.className = 'waypoint-marker'
      element.textContent = String(index + 1)
      mapMarkers.current.push(new maplibregl.Marker({ element }).setLngLat([point.lon, point.lat]).addTo(mapInstance.current))
    })
  }, [waypoints])

  useEffect(() => {
    if (!mapInstance.current || !mapInstance.current.isStyleLoaded()) return
    ensureRouteLayer(mapInstance.current)
    mapInstance.current.getSource(ROUTE_SOURCE_ID)?.setData(routeGeoJson)
  }, [routeGeoJson])

  useEffect(() => {
    if (!mapInstance.current || !mapInstance.current.isStyleLoaded()) return
    ensureRouteLayer(mapInstance.current)
    const hoverFeature = activeElevationPoint && Number.isFinite(activeElevationPoint.lon) && Number.isFinite(activeElevationPoint.lat)
      ? {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [activeElevationPoint.lon, activeElevationPoint.lat] }, properties: {} }],
      }
      : emptyRouteGeoJson
    mapInstance.current.getSource(ROUTE_HOVER_SOURCE_ID)?.setData(hoverFeature)
  }, [activeElevationPoint])

  useEffect(() => {
    if (waypoints.length < 2) { setLatestGpx(''); setRouteGeoJson(emptyRouteGeoJson); setRouteStats(emptyRouteStats); setShowRouteDetails(false); return }
    const controller = new AbortController()
    fetch(buildBrouterRouteUrl({ profile: activeProfile, points: brouterPoints }), { signal: controller.signal })
      .then((r) => r.ok ? r.text() : Promise.reject(new Error('BRouter request failed')))
      .then((text) => { setLatestGpx(text); setRouteGeoJson(parseGpxToGeoJson(text)); setRouteStats(parseGpxStats(text)) })
      .catch(() => {})
    return () => controller.abort()
  }, [activeProfile, brouterPoints, waypoints.length])

  useEffect(() => {
    if (!latestGpx) return
    setShowRouteDetails(true)
  }, [latestGpx])

  useEffect(() => {
    if (activePage !== 'planner') setActiveElevationPoint(null)
  }, [activePage])

  useEffect(() => {
    const query = placeQuery.trim()
    if (query.length < 3) return setPlaceResults([])
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setSearchingPlaces(true)
      const params = new URLSearchParams({ q: query, format: 'jsonv2', addressdetails: '1', limit: '6' })
      fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { signal: controller.signal, headers: { 'Accept-Language': lang === 'de' ? 'de,en' : 'en,de' } })
        .then((res) => res.ok ? res.json() : Promise.reject(new Error('search failed')))
        .then((rows) => setPlaceResults((Array.isArray(rows) ? rows : []).map((r) => ({ id: `${r.place_id}`, label: r.display_name, lon: Number(r.lon), lat: Number(r.lat) })).filter((r) => Number.isFinite(r.lon) && Number.isFinite(r.lat))))
        .catch(() => setPlaceResults([]))
        .finally(() => setSearchingPlaces(false))
    }, 280)
    return () => { clearTimeout(timer); controller.abort() }
  }, [placeQuery, lang])

  const saveGeneratedRoute = () => {
    if (!latestGpx) return
    setSavedRoutes((prev) => [{ id: crypto.randomUUID(), title: title.trim() || 'Route', gpx: latestGpx }, ...prev])
    setMessage(t.statusSaved)
  }

  const uploadGpx = async () => {
    if (!uploadGpxFile) return
    const gpx = await uploadGpxFile.text()
    setSavedRoutes((prev) => [{ id: crypto.randomUUID(), title: (uploadTitle || uploadGpxFile.name.replace('.gpx', '')).trim(), gpx }, ...prev])
    setUploadGpxFile(null)
    setUploadTitle('')
    setMessage(t.statusUploaded)
  }

  const openRoute = (route) => window.open(URL.createObjectURL(new Blob([route.gpx], { type: 'application/gpx+xml' })), '_blank', 'noopener,noreferrer')

  const loadRouteToMap = (route) => {
    setActivePage('planner')
    setPlannerPanelOpen(false)
    setLatestGpx(route.gpx)
    const geo = parseGpxToGeoJson(route.gpx)
    setRouteGeoJson(geo)
    setRouteStats(parseGpxStats(route.gpx))
    const line = geo.features[0]?.geometry?.coordinates ?? []
    if (line.length) {
      setWaypoints(line.slice(0, Math.min(12, line.length)).map(([lon, lat], i) => ({ id: crypto.randomUUID(), label: `Pin ${i + 1}`, lon, lat })))
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="app-brand-block">
          <div className="app-brand">{t.appTitle}</div>
          <p>{t.appSub}</p>
        </div>
        <div className="topbar-controls">
          <button type="button" className="icon-button app-menu-button" aria-label={t.appMenu} onClick={() => setUserMenuOpen((prev) => !prev)}><span className="button-label">{t.appMenu}</span><span className="icon-only"><HamburgerIcon /></span></button>
          {activePage === 'planner' && <button type="button" className="icon-button sheet-expand-button" aria-expanded={plannerPanelOpen} aria-label={plannerPanelOpen ? t.closePlanner : t.openRouteTools} onClick={(e) => { e.stopPropagation(); setPlannerPanelOpen((prev) => !prev) }}><span aria-hidden="true">{plannerPanelOpen ? '–' : '+'}</span></button>}
          {userMenuOpen && <div className="account-menu"><button className={activePage === 'planner' ? 'active' : ''} onClick={() => { setActivePage('planner'); setUserMenuOpen(false) }}>{t.planner}</button><button className={activePage === 'library' ? 'active' : ''} onClick={() => { setActivePage('library'); setUserMenuOpen(false) }}>{t.library}</button><button className={activePage === 'privacy' ? 'active' : ''} onClick={() => { setActivePage('privacy'); setUserMenuOpen(false) }}>{t.privacyPolicy}</button><button className={activePage === 'impressum' ? 'active' : ''} onClick={() => { setActivePage('impressum'); setUserMenuOpen(false) }}>{t.impressum}</button><label>{t.language}<select value={lang} onChange={(e) => setLang(e.target.value)}><option value="en">English</option><option value="de">Deutsch</option></select></label></div>}
        </div>
      </header>
      {message && <p className="status info">{message}</p>}

      {activePage === 'planner' && <section className={`planner-layout ${plannerPanelOpen ? '' : 'panel-collapsed'}`}>
        <section className="map-stack">
          <section ref={mapRef} className="map" onClick={() => setPlannerPanelOpen(false)}>
            <button type="button" className="mobile-planner-toggle icon-button sheet-expand-button" aria-expanded={plannerPanelOpen} aria-label={plannerPanelOpen ? t.closePlanner : t.openRouteTools} onClick={(e) => { e.stopPropagation(); setPlannerPanelOpen((prev) => !prev) }}><span aria-hidden="true">{plannerPanelOpen ? '▾' : '▴'}</span></button>
          </section>
          <section className={`route-bottom-sheet ${showRouteDetails ? 'open' : 'closed'}`}>
            <button
              type="button"
              className="route-bottom-sheet-toggle"
              aria-expanded={showRouteDetails}
              aria-label={showRouteDetails ? t.closeRouteDetailsSheet : t.openRouteDetailsSheet}
              onClick={() => setShowRouteDetails((prev) => !prev)}
              disabled={!latestGpx}
            >
              <span>{t.routeDetails}</span>
              <span aria-hidden="true">{showRouteDetails ? '▾' : '▴'}</span>
            </button>
            {showRouteDetails && latestGpx && <section className="route-details"><h3>{t.routeDetails}</h3><p><strong>{t.distance}:</strong> {routeStats.distanceKm.toFixed(1)} km</p><p><strong>{t.ascent}:</strong> {Math.round(routeStats.ascentM)} m</p><p><strong>{t.descent}:</strong> {Math.round(routeStats.descentM)} m</p>{routeStats.rawSummary && <p>{routeStats.rawSummary}</p>}<ElevationChart profile={routeStats.elevationProfile} title={t.elevationProfile} legend={t.steepLegend} hoverHint={t.elevationFocusHint} activeDistanceM={activeElevationPoint?.distanceM} onHoverPoint={setActiveElevationPoint} onLeave={() => setActiveElevationPoint(null)} /></section>}
            {!latestGpx && <p className="route-bottom-sheet-empty">{t.routeDetailsUnavailable}</p>}
          </section>
        </section>
        <aside className="panel planner-panel">
        <div className="planner-panel-head"><h2>{t.plannerHeading}</h2><button type="button" className="planner-mobile-close" aria-label={t.closePlanner} onClick={() => setPlannerPanelOpen(false)}>✕</button></div><p>{t.addPinsHint}</p>
        <label>{t.profile}</label><select value={activeProfile} onChange={(e) => setActiveProfile(e.target.value)}>{profiles.map((profile) => <option key={profile.slug} value={profile.brouter_profile_id}>{profile.name}</option>)}</select>
        <label>{t.title}</label><input value={title} onChange={(e) => setTitle(e.target.value)} />
        <label>{t.findPlace}</label><input value={placeQuery} onChange={(e) => setPlaceQuery(e.target.value)} placeholder={t.placeSearchPlaceholder} />
        {(searchingPlaces || placeResults.length > 0 || (placeQuery.trim().length >= 3 && !placeResults.length)) && <div className="place-results">{searchingPlaces && <small>{t.searchingPlaces}</small>}{!searchingPlaces && !placeResults.length && <small>{t.noPlacesFound}</small>}{!searchingPlaces && placeResults.map((place) => <button key={place.id} type="button" className="place-result" onClick={() => addWaypoint(place.label, place.lon, place.lat)}>{place.label}</button>)}</div>}
        <WaypointList waypoints={waypoints} setWaypoints={setWaypoints} />
        <button onClick={() => setWaypoints([])}>{t.clearPins}</button>
        <button onClick={saveGeneratedRoute} disabled={!latestGpx}>{t.saveGenerated}</button>
        {latestGpx && <p className="status info inline">{t.routeReady}</p>}
      </aside></section>}

      {activePage === 'library' && <section className="library-page"><h2>{t.libraryHeading}</h2>
        <div className="panel upload-panel"><h3>{t.uploadSection}</h3><label>{t.uploadRouteTitle}</label><input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} />
          <label className="upload">{t.uploadGpx}<input type="file" accept=".gpx,application/gpx+xml" onChange={(e) => setUploadGpxFile(e.target.files?.[0] ?? null)} /></label>
          <button type="button" onClick={uploadGpx} disabled={!uploadGpxFile}>{t.uploadRouteButton}</button></div>
        <div className="panel">{!savedRoutes.length && <p>{t.noSaved}</p>}
          {savedRoutes.map((route) => <article className="route-card" key={route.id}><div className="route-card-head"><strong>{route.title}</strong></div><div className="quick-actions"><button onClick={() => openRoute(route)}>{t.openGpx}</button><button onClick={() => loadRouteToMap(route)}>{t.loadOnMap}</button><button onClick={() => setSavedRoutes((prev) => prev.filter((x) => x.id !== route.id))}>{t.remove}</button></div></article>)}
        </div>
      </section>}

      {activePage === 'privacy' && <section className="panel legal-page"><h2>{t.privacyHeading}</h2><p>We process route planning data only in your browser and keep your saved GPX files in local storage on this device.</p><p>When generating routes and searching places, requests are sent to external services (BRouter and Nominatim/OpenStreetMap) to return route and search results.</p><p>No account is required and no central profile storage is used in this demo.</p><button type="button" onClick={() => setActivePage('planner')}>{t.backToPlanner}</button></section>}

      {activePage === 'impressum' && <section className="panel legal-page"><h2>{t.impressumHeading}</h2><p>Bicly demo application.</p><p>Responsible for content: Bicly Project Team.</p><p>Contact: hello@bicly.local</p><p>Address: Example Street 1, 12345 Demo City</p><button type="button" onClick={() => setActivePage('planner')}>{t.backToPlanner}</button></section>}
    </main>
  )
}
