import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import WaypointList from './components/WaypointList'
import { buildBrouterRouteUrl, loadProfiles } from './lib/api'

const mapStyle = 'https://tiles.openfreemap.org/styles/liberty'
const ROUTE_SOURCE_ID = 'generated-route-source'
const ROUTE_LAYER_ID = 'generated-route-layer'
const STORAGE_KEY = 'bicly_saved_routes'

const emptyRouteGeoJson = { type: 'FeatureCollection', features: [] }

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
  },
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

const ensureRouteLayer = (map) => {
  if (!map.getSource(ROUTE_SOURCE_ID)) map.addSource(ROUTE_SOURCE_ID, { type: 'geojson', data: emptyRouteGeoJson })
  if (!map.getLayer(ROUTE_LAYER_ID)) {
    map.addLayer({ id: ROUTE_LAYER_ID, type: 'line', source: ROUTE_SOURCE_ID, paint: { 'line-color': '#0c5ff4', 'line-width': 4, 'line-opacity': 0.9 } })
  }
}

export default function App() {
  const [lang, setLang] = useState('de')
  const t = TEXT[lang]
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const mapMarkers = useRef([])
  const [activePage, setActivePage] = useState('planner')
  const [waypoints, setWaypoints] = useState([])
  const [profiles, setProfiles] = useState([])
  const [activeProfile, setActiveProfile] = useState('trekking')
  const [latestGpx, setLatestGpx] = useState('')
  const [routeGeoJson, setRouteGeoJson] = useState(emptyRouteGeoJson)
  const [title, setTitle] = useState('New Route')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadGpxFile, setUploadGpxFile] = useState(null)
  const [savedRoutes, setSavedRoutes] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'))
  const [message, setMessage] = useState('')
  const [userLocation, setUserLocation] = useState(null)
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeResults, setPlaceResults] = useState([])
  const [searchingPlaces, setSearchingPlaces] = useState(false)
  const [plannerPanelOpen, setPlannerPanelOpen] = useState(false)

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(savedRoutes)) }, [savedRoutes])
  useEffect(() => { loadProfiles().then((rows) => { setProfiles(rows); if (rows[0]) setActiveProfile(rows[0].brouter_profile_id) }) }, [])

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
    if (waypoints.length < 2) { setLatestGpx(''); setRouteGeoJson(emptyRouteGeoJson); return }
    const controller = new AbortController()
    fetch(buildBrouterRouteUrl({ profile: activeProfile, points: brouterPoints }), { signal: controller.signal })
      .then((r) => r.ok ? r.text() : Promise.reject(new Error('BRouter request failed')))
      .then((text) => { setLatestGpx(text); setRouteGeoJson(parseGpxToGeoJson(text)) })
      .catch(() => {})
    return () => controller.abort()
  }, [activeProfile, brouterPoints, waypoints.length])

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

  const useMyLocationAsStart = async () => {
    if (!navigator.geolocation) return setMessage(t.locationUnavailable)
    navigator.geolocation.getCurrentPosition((pos) => {
      const start = { id: crypto.randomUUID(), label: 'Start', lon: Number(pos.coords.longitude.toFixed(6)), lat: Number(pos.coords.latitude.toFixed(6)) }
      setWaypoints((prev) => prev.length ? [start, ...prev.slice(1)] : [start])
    }, () => setMessage(t.locationUnavailable))
  }

  const addMyLocationPoint = async () => {
    if (!navigator.geolocation) return setMessage(t.locationUnavailable)
    navigator.geolocation.getCurrentPosition((pos) => addWaypoint('My location', pos.coords.longitude, pos.coords.latitude), () => setMessage(t.locationUnavailable))
  }

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
    const line = geo.features[0]?.geometry?.coordinates ?? []
    if (line.length) {
      setWaypoints(line.slice(0, Math.min(12, line.length)).map(([lon, lat], i) => ({ id: crypto.randomUUID(), label: `Pin ${i + 1}`, lon, lat })))
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div><h1>{t.appTitle}</h1><p>{t.appSub}</p><span className="cycling-pill">🚴 {t.cyclingMode}</span></div>
        <nav>
          <button className={activePage === 'planner' ? 'active' : ''} onClick={() => setActivePage('planner')}>{t.planner}</button>
          <button className={activePage === 'library' ? 'active' : ''} onClick={() => setActivePage('library')}>{t.library}</button>
          <label>{t.language}<select value={lang} onChange={(e) => setLang(e.target.value)}><option value="en">English</option><option value="de">Deutsch</option></select></label>
        </nav>
      </header>
      {message && <p className="status info">{message}</p>}

      {activePage === 'planner' && <section className={`planner-layout ${plannerPanelOpen ? '' : 'panel-collapsed'}`}>
        <button type="button" className="mobile-planner-toggle" onClick={() => setPlannerPanelOpen(true)}>{t.openPlanner}</button>
        <aside className="panel planner-panel">
        <div className="planner-panel-head"><h2>{t.plannerHeading}</h2><button type="button" className="planner-mobile-close" aria-label={t.closePlanner} onClick={() => setPlannerPanelOpen(false)}>✕</button></div><p>{t.addPinsHint}</p>
        <label>{t.profile}</label><select value={activeProfile} onChange={(e) => setActiveProfile(e.target.value)}>{profiles.map((profile) => <option key={profile.slug} value={profile.brouter_profile_id}>{profile.name}</option>)}</select>
        <label>{t.title}</label><input value={title} onChange={(e) => setTitle(e.target.value)} />
        <label>{t.findPlace}</label><input value={placeQuery} onChange={(e) => setPlaceQuery(e.target.value)} placeholder={t.placeSearchPlaceholder} />
        {(searchingPlaces || placeResults.length > 0 || (placeQuery.trim().length >= 3 && !placeResults.length)) && <div className="place-results">{searchingPlaces && <small>{t.searchingPlaces}</small>}{!searchingPlaces && !placeResults.length && <small>{t.noPlacesFound}</small>}{!searchingPlaces && placeResults.map((place) => <button key={place.id} type="button" className="place-result" onClick={() => addWaypoint(place.label, place.lon, place.lat)}>{place.label}</button>)}</div>}
        <div className="quick-actions"><button onClick={useMyLocationAsStart}>{t.useLocationStart}</button><button onClick={addMyLocationPoint}>{t.addMyLocation}</button></div>
        <WaypointList waypoints={waypoints} setWaypoints={setWaypoints} />
        <button onClick={() => setWaypoints([])}>{t.clearPins}</button>
        <button onClick={saveGeneratedRoute} disabled={!latestGpx}>{t.saveGenerated}</button>
        {latestGpx && <p className="status info inline">{t.routeReady}</p>}
      </aside><section ref={mapRef} className="map" onClick={() => setPlannerPanelOpen(false)} /></section>}

      {activePage === 'library' && <section className="library-page"><h2>{t.libraryHeading}</h2>
        <div className="panel upload-panel"><h3>{t.uploadSection}</h3><label>{t.uploadRouteTitle}</label><input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} />
          <label className="upload">{t.uploadGpx}<input type="file" accept=".gpx,application/gpx+xml" onChange={(e) => setUploadGpxFile(e.target.files?.[0] ?? null)} /></label>
          <button type="button" onClick={uploadGpx} disabled={!uploadGpxFile}>{t.uploadRouteButton}</button></div>
        <div className="panel">{!savedRoutes.length && <p>{t.noSaved}</p>}
          {savedRoutes.map((route) => <article className="route-card" key={route.id}><div className="route-card-head"><strong>{route.title}</strong></div><div className="quick-actions"><button onClick={() => openRoute(route)}>{t.openGpx}</button><button onClick={() => loadRouteToMap(route)}>{t.loadOnMap}</button><button onClick={() => setSavedRoutes((prev) => prev.filter((x) => x.id !== route.id))}>{t.remove}</button></div></article>)}
        </div>
      </section>}
    </main>
  )
}
