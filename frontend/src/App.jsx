import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import WaypointList from './components/WaypointList'
import { buildBrouterRouteUrl, loadProfiles, fetchBrouterRoute } from './lib/api'

const verticalLinePlugin = {
  id: 'verticalLine',
  afterDraw: (chart) => {
    const { activeDistanceM, profile } = chart.options.plugins.verticalLine || {}
    if (activeDistanceM !== undefined && activeDistanceM !== null) {
      const { ctx, chartArea: { top, bottom }, scales: { x, y } } = chart
      const xPos = x.getPixelForValue(activeDistanceM)
      if (xPos >= chart.chartArea.left && xPos <= chart.chartArea.right) {
        ctx.save()
        ctx.beginPath()
        ctx.strokeStyle = '#0f172a'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.moveTo(xPos, top)
        ctx.lineTo(xPos, bottom)
        ctx.stroke()
        ctx.restore()

        if (profile) {
          const activePoint = profile.reduce((closest, point) => {
            if (!closest) return point
            return Math.abs(point.distanceM - activeDistanceM) < Math.abs(closest.distanceM - activeDistanceM) ? point : closest
          }, null)
          if (activePoint) {
            const yPos = y.getPixelForValue(activePoint.elevationM)
            ctx.save()
            ctx.beginPath()
            ctx.fillStyle = '#0f172a'
            ctx.arc(xPos, yPos, 4, 0, 2 * Math.PI)
            ctx.fill()
            ctx.strokeStyle = '#fff'
            ctx.lineWidth = 1.5
            ctx.stroke()
            ctx.restore()
          }
        }
      }
    }
  },
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  verticalLinePlugin,
)

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

const ArrowUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
)

const ArrowDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
)

const ExpandIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="15 3 21 3 21 9"></polyline>
    <polyline points="9 21 3 21 3 15"></polyline>
    <line x1="21" y1="3" x2="14" y2="10"></line>
    <line x1="3" y1="21" x2="10" y2="14"></line>
  </svg>
)

const MinimizeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="4 14 10 14 10 20"></polyline>
    <polyline points="20 10 14 10 14 4"></polyline>
    <line x1="14" y1="10" x2="21" y2="3"></line>
    <line x1="10" y1="14" x2="3" y2="21"></line>
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
    noSaved: 'No saved routes yet.', downloadGpx: 'Download GPX', loadOnMap: 'Load on map', remove: 'Remove',
    plannerHeading: 'Route planner', libraryHeading: 'Local route library', statusSaved: 'Route saved locally',
    statusUploaded: 'Route uploaded locally', locationUnavailable: 'Location unavailable',
    openPlanner: 'Open planner', closePlanner: 'Close planner', cyclingMode: 'Cycling mode',
    userMenu: 'Menu', routeDetails: 'Route details', showDetails: 'Show details', hideDetails: 'Hide details',
    appMenu: 'App menu', openRouteTools: 'Expand route tools',
    privacyPolicy: 'Privacy policy', impressum: 'Impressum', backToPlanner: 'Back to planner',
    privacyHeading: 'Privacy policy', impressumHeading: 'Impressum',
    settings: 'Settings', settingsHeading: 'App settings',
    generalSettings: 'General settings', routingSettings: 'Routing settings',
    customProfile: 'Custom profile', customProfilePlaceholder: 'Paste your .brf profile here...',
    routingProfiles: 'Routing profiles', addProfile: 'Add profile',
    profileName: 'Profile name', profileContent: 'Profile content (.brf)',
    saveProfile: 'Save profile', deleteProfile: 'Delete profile',
    expandChart: 'Expand chart', collapseChart: 'Collapse chart',
    distance: 'Distance', ascent: 'Ascent', descent: 'Descent',
    elevationProfile: 'Elevation profile', steepLegend: 'Steepness (10°+ = red)',
    avoidFerries: 'Avoid ferries',
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
    noSaved: 'Noch keine gespeicherten Routen.', downloadGpx: 'GPX herunterladen', loadOnMap: 'Auf Karte laden', remove: 'Entfernen',
    plannerHeading: 'Routenplaner', libraryHeading: 'Lokale Routenbibliothek', statusSaved: 'Route lokal gespeichert',
    statusUploaded: 'Route lokal hochgeladen', locationUnavailable: 'Standort nicht verfügbar',
    openPlanner: 'Planer öffnen', closePlanner: 'Planer schließen', cyclingMode: 'Cycling-Modus',
    userMenu: 'Menü', routeDetails: 'Routendetails', showDetails: 'Details anzeigen', hideDetails: 'Details ausblenden',
    appMenu: 'App-Menü', openRouteTools: 'Routenwerkzeuge aufklappen',
    privacyPolicy: 'Datenschutz', impressum: 'Impressum', backToPlanner: 'Zurück zum Planer',
    privacyHeading: 'Datenschutzerklärung', impressumHeading: 'Impressum',
    settings: 'Einstellungen', settingsHeading: 'App-Einstellungen',
    generalSettings: 'Allgemeine Einstellungen', routingSettings: 'Routing-Einstellungen',
    customProfile: 'Benutzerdefiniertes Profil', customProfilePlaceholder: 'Füge dein .brf Profil hier ein...',
    routingProfiles: 'Routing-Profile', addProfile: 'Profil hinzufügen',
    profileName: 'Profilname', profileContent: 'Profilinhalt (.brf)',
    saveProfile: 'Profil speichern', deleteProfile: 'Profil löschen',
    expandChart: 'Profil vergrößern', collapseChart: 'Profil verkleinern',
    distance: 'Distanz', ascent: 'Anstieg', descent: 'Abstieg',
    elevationProfile: 'Höhenprofil', steepLegend: 'Steigung (ab 10° = rot)',
    avoidFerries: 'Fähren vermeiden',
    openRouteDetailsSheet: 'Routendetails öffnen', closeRouteDetailsSheet: 'Routendetails schließen',
    routeDetailsUnavailable: 'Erzeuge eine Route, um Distanz- und Höhendetails zu sehen.',
    elevationFocusHint: 'Fahre mit der Maus darüber (Desktop) oder ziehe mit dem Finger, um die Kartenposition zu markieren.',
  },
}

const ElevationChart = ({ profile, title, activeDistanceM, onHoverPoint, onLeave, t }) => {
  if (!profile.length) return null

  const totalDistM = profile[profile.length - 1].distanceM

  const displayProfile = useMemo(() => {
    if (profile.length < 2 || totalDistM < 100000) return profile
    // For tracks > 100km, downsample to ~1 point per km
    const stepM = 1000
    const filtered = [profile[0]]
    let lastM = 0
    for (let i = 1; i < profile.length - 1; i += 1) {
      if (profile[i].distanceM >= lastM + stepM) {
        filtered.push(profile[i])
        lastM = profile[i].distanceM
      }
    }
    filtered.push(profile[profile.length - 1])
    return filtered
  }, [profile, totalDistM])

  const data = {
    datasets: [{
      data: displayProfile.map((p) => ({ x: p.distanceM, y: p.elevationM })),
      fill: true,
      backgroundColor: 'rgba(168, 200, 255, 0.4)',
      borderColor: '#1f6feb',
      borderWidth: 2,
      pointRadius: 0,
      pointHitRadius: 10,
      tension: 0.1,
      segment: {
        borderColor: (ctx) => {
          const point = profile[ctx.p1DataIndex]
          if (!point) return '#1f6feb'
          return point.slopeDeg >= 10 ? '#e22b2b' : point.slopeDeg >= 6 ? '#ef8f2e' : '#1f6feb'
        },
      },
    }],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        callbacks: {
          title: (items) => `${(items[0].parsed.x / 1000).toFixed(1)} km`,
          label: (item) => {
            const point = displayProfile[item.dataIndex]
            const elevation = `${Math.round(item.parsed.y)} m`
            if (point && typeof point.slopeDeg === 'number') {
              return `${elevation} (${point.slopeDeg.toFixed(1)}°)`
            }
            return elevation
          },
        },
      },
      verticalLine: {
        activeDistanceM,
        profile: displayProfile,
      },
    },
    scales: {
      x: {
        type: 'linear',
        min: 0,
        max: totalDistM,
        ticks: {
          callback: (val) => `${(val / 1000).toFixed(1)} km`,
          maxTicksLimit: 6,
          includeBounds: true,
        },
        grid: { display: false },
      },
      y: {
        ticks: {
          callback: (val) => `${val}m`,
        },
      },
    },
    onHover: (event, elements, chart) => {
      if (chart.scales.x) {
        const xMeters = chart.scales.x.getValueForPixel(event.x)
        if (xMeters === undefined || xMeters < 0 || xMeters > totalDistM) {
          onLeave?.()
          return
        }

        let low = 0
        let high = displayProfile.length - 1
        while (low < high) {
          const mid = Math.floor((low + high) / 2)
          if (displayProfile[mid].distanceM < xMeters) {
            low = mid + 1
          } else {
            high = mid
          }
        }
        let bestIndex = low
        if (low > 0 && Math.abs(displayProfile[low - 1].distanceM - xMeters) < Math.abs(displayProfile[low].distanceM - xMeters)) {
          bestIndex = low - 1
        }
        onHoverPoint?.(displayProfile[bestIndex])
      } else {
        onLeave?.()
      }
    },
  }

  return (
    <section className="elevation-chart" aria-label={title}>
      <div className="elevation-chart-header">
        <h4>{title}</h4>
      </div>
      <div className="elevation-chart-container">
        <Line data={data} options={options} />
      </div>
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
  const [map, setMap] = useState(null)
  const mapMarkers = useRef([])
  const [activePage, setActivePage] = useState('planner')
  const [waypoints, setWaypoints] = useState(() => Array.isArray(plannerDraft?.waypoints) ? plannerDraft.waypoints : [])
  const [profiles, setProfiles] = useState([])
  const [customProfiles, setCustomProfiles] = useState(() => JSON.parse(localStorage.getItem('bicly_custom_profiles') || '[]'))
  const [activeProfile, setActiveProfile] = useState(() => typeof plannerDraft?.activeProfile === 'string' ? plannerDraft.activeProfile : 'trekking')
  const [avoidFerries, setAvoidFerries] = useState(() => plannerDraft?.avoidFerries === true)
  const [customProfileContent, setCustomProfileContent] = useState(() => localStorage.getItem('bicly_custom_profile_tmp') || '')
  const [latestGpx, setLatestGpx] = useState(() => typeof plannerDraft?.latestGpx === 'string' ? plannerDraft.latestGpx : '')
  const [routeGeoJson, setRouteGeoJson] = useState(() => plannerDraft?.routeGeoJson?.type === 'FeatureCollection' ? plannerDraft.routeGeoJson : emptyRouteGeoJson)
  const [title, setTitle] = useState(() => typeof plannerDraft?.title === 'string' ? plannerDraft.title : 'New Route')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadGpxFile, setUploadGpxFile] = useState(null)
  const [newProfileName, setNewProfileName] = useState('')
  const [newProfileContent, setNewProfileContent] = useState('')
  const [savedRoutes, setSavedRoutes] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'))
  const [message, setMessage] = useState('')
  const [userLocation, setUserLocation] = useState(null)
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeResults, setPlaceResults] = useState([])
  const [searchingPlaces, setSearchingPlaces] = useState(false)
  const [plannerPanelOpen, setPlannerPanelOpen] = useState(false)
  const [showSubtitle, setShowSubtitle] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [headerExpanded, setHeaderExpanded] = useState(false)
  const [showRouteDetails, setShowRouteDetails] = useState(() => Boolean(plannerDraft?.latestGpx))
  const [routeStats, setRouteStats] = useState(() => plannerDraft?.routeStats?.elevationProfile ? plannerDraft.routeStats : emptyRouteStats)
  const [activeElevationPoint, setActiveElevationPoint] = useState(null)
  const [isExternalRoute, setIsExternalRoute] = useState(false)
  const hasInitialFit = useRef(false)

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(savedRoutes)) }, [savedRoutes])
  useEffect(() => {
    loadProfiles().then((rows) => {
      const all = [...rows, ...customProfiles]
      setProfiles(all)
      if (!all[0]) return
      setActiveProfile((prev) => {
        return all.some((p) => p.id === prev) ? prev : all[0].id
      })
    })
  }, [customProfiles])

  useEffect(() => {
    localStorage.setItem('bicly_custom_profiles', JSON.stringify(customProfiles))
  }, [customProfiles])

  useEffect(() => {
    localStorage.setItem(PLANNER_DRAFT_KEY, JSON.stringify({
      waypoints,
      activeProfile,
      latestGpx,
      routeGeoJson,
      title,
      routeStats,
      showRouteDetails,
      avoidFerries,
    }))
    if (activeProfile === 'custom') {
      localStorage.setItem('bicly_custom_profile_tmp', customProfileContent)
    }
  }, [waypoints, activeProfile, customProfileContent, latestGpx, routeGeoJson, title, routeStats, showRouteDetails, avoidFerries])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((position) => setUserLocation({ lon: position.coords.longitude, lat: position.coords.latitude }))
  }, [])

  const addWaypoint = (label, lon, lat) => {
    setIsExternalRoute(false)
    setWaypoints((prev) => [...prev, { id: crypto.randomUUID(), label: label || `Pin ${prev.length + 1}`, lon: Number(lon.toFixed(6)), lat: Number(lat.toFixed(6)) }])
  }
  const brouterPoints = useMemo(() => waypoints.map((p) => `${p.lon},${p.lat}`).join('|'), [waypoints])

  useEffect(() => {
    if (activePage !== 'planner' || !mapRef.current) return
    const m = new maplibregl.Map({
      container: mapRef.current,
      style: mapStyle,
      center: userLocation ? [userLocation.lon, userLocation.lat] : [8.68, 50.11],
      zoom: 10,
    })
    m.addControl(new maplibregl.NavigationControl(), 'top-right')
    m.on('load', () => {
      ensureRouteLayer(m)
      if (waypoints.length > 0) {
        const bounds = new maplibregl.LngLatBounds()
        waypoints.forEach((p) => bounds.extend([p.lon, p.lat]))
        m.fitBounds(bounds, { padding: 50, maxZoom: 15, animate: false })
      }
      setMap(m)
    })
    m.on('style.load', () => {
      ensureRouteLayer(m)
      m.getSource(ROUTE_SOURCE_ID)?.setData(routeGeoJson)
    })
    m.on('click', (e) => addWaypoint('', e.lngLat.lng, e.lngLat.lat))

    return () => {
      mapMarkers.current.forEach((marker) => marker.remove())
      mapMarkers.current = []
      m.remove()
      setMap(null)
      hasInitialFit.current = false
    }
  }, [activePage])

  useEffect(() => {
    if (!map || hasInitialFit.current) return
    if (waypoints.length > 0) {
      const bounds = new maplibregl.LngLatBounds()
      waypoints.forEach((p) => bounds.extend([p.lon, p.lat]))
      map.fitBounds(bounds, { padding: 50, maxZoom: 15, animate: false })
      hasInitialFit.current = true
    } else if (userLocation) {
      map.flyTo({ center: [userLocation.lon, userLocation.lat], zoom: 12 })
      hasInitialFit.current = true
    }
  }, [map, userLocation, waypoints.length])

  useEffect(() => {
    if (!map) return
    mapMarkers.current.forEach((m) => m.remove())
    mapMarkers.current = []
    waypoints.forEach((point, index) => {
      const element = document.createElement('div')
      element.className = 'waypoint-marker'
      element.textContent = String(index + 1)
      mapMarkers.current.push(new maplibregl.Marker({ element }).setLngLat([point.lon, point.lat]).addTo(map))
    })
  }, [map, waypoints])

  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return
    ensureRouteLayer(map)
    // Small timeout to ensure source is ready if just added
    const timeout = setTimeout(() => {
      map.getSource(ROUTE_SOURCE_ID)?.setData(routeGeoJson)
    }, 0)
    return () => clearTimeout(timeout)
  }, [map, routeGeoJson])

  useEffect(() => {
    if (!map || !userLocation || waypoints.length > 0) return
    map.flyTo({ center: [userLocation.lon, userLocation.lat], zoom: 12 })
  }, [map, userLocation, waypoints.length === 0])

  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return
    ensureRouteLayer(map)
    const hoverFeature = activeElevationPoint && Number.isFinite(activeElevationPoint.lon) && Number.isFinite(activeElevationPoint.lat)
      ? {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [activeElevationPoint.lon, activeElevationPoint.lat] }, properties: {} }],
      }
      : emptyRouteGeoJson
    map.getSource(ROUTE_HOVER_SOURCE_ID)?.setData(hoverFeature)
  }, [map, activeElevationPoint])

  useEffect(() => {
    if (waypoints.length < 2) { setLatestGpx(''); setRouteGeoJson(emptyRouteGeoJson); setRouteStats(emptyRouteStats); setShowRouteDetails(false); return }
    if (isExternalRoute) return

    const controller = new AbortController()
    const profileToUse = activeProfile === 'custom' ? customProfileContent : activeProfile

    if (activeProfile === 'custom' && !customProfileContent) return

    const isCustomSaved = customProfiles.find((p) => p.id === activeProfile)
    const finalProfile = isCustomSaved ? isCustomSaved.content : profileToUse

    fetchBrouterRoute({ profile: finalProfile, points: brouterPoints, signal: controller.signal, avoidFerries })
      .then((text) => { setLatestGpx(text); setRouteGeoJson(parseGpxToGeoJson(text)); setRouteStats(parseGpxStats(text)) })
      .catch(() => {})
    return () => controller.abort()
  }, [activeProfile, customProfileContent, brouterPoints, waypoints.length, isExternalRoute, avoidFerries])

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

  const openRoute = (route) => {
    const blob = new Blob([route.gpx], { type: 'application/gpx+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safeTitle = (route.title || 'route').replace(/[./\\]/g, '_')
    a.download = `${safeTitle}.gpx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const loadRouteToMap = (route) => {
    setActivePage('planner')
    setPlannerPanelOpen(false)
    setIsExternalRoute(true)
    setLatestGpx(route.gpx)
    const geo = parseGpxToGeoJson(route.gpx)
    setRouteGeoJson(geo)
    setRouteStats(parseGpxStats(route.gpx))

    const coords = geo.features[0]?.geometry?.coordinates ?? []
    if (coords.length >= 2) {
      const start = coords[0]
      const end = coords[coords.length - 1]
      setWaypoints([
        { id: crypto.randomUUID(), label: 'Start', lon: start[0], lat: start[1] },
        { id: crypto.randomUUID(), label: 'End', lon: end[0], lat: end[1] },
      ])

      if (map) {
        const bounds = new maplibregl.LngLatBounds()
        coords.forEach((c) => bounds.extend(c))
        map.fitBounds(bounds, { padding: 50, maxZoom: 15 })
      }
    }
  }

  const addCustomProfile = () => {
    if (!newProfileName || !newProfileContent) return
    const id = crypto.randomUUID()
    setCustomProfiles((prev) => [...prev, { id, name: newProfileName, content: newProfileContent }])
    setNewProfileName('')
    setNewProfileContent('')
  }

  const deleteCustomProfile = (id) => {
    setCustomProfiles((prev) => prev.filter((p) => p.id !== id))
    if (activeProfile === id) setActiveProfile('trekking')
  }

  const handleProfileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const content = await file.text()
    setNewProfileContent(content)
    if (!newProfileName) setNewProfileName(file.name.replace('.brf', ''))
  }

  return (
    <div className={`app-shell ${userMenuOpen ? 'menu-open' : ''}`}>
      <aside className={`account-menu ${userMenuOpen ? 'open' : ''}`}>
        <div className="menu-header">
          <h3>{t.appMenu}</h3>
          <button type="button" className="menu-close" onClick={() => setUserMenuOpen(false)}>✕</button>
        </div>
        <div className="menu-content">
          <button className={activePage === 'planner' ? 'active' : ''} onClick={() => { setActivePage('planner'); setUserMenuOpen(false) }}>{t.planner}</button>
          <button className={activePage === 'library' ? 'active' : ''} onClick={() => { setActivePage('library'); setUserMenuOpen(false) }}>{t.library}</button>
          <button className={activePage === 'settings' ? 'active' : ''} onClick={() => { setActivePage('settings'); setUserMenuOpen(false) }}>{t.settings}</button>
          <button className={activePage === 'privacy' ? 'active' : ''} onClick={() => { setActivePage('privacy'); setUserMenuOpen(false) }}>{t.privacyPolicy}</button>
          <button className={activePage === 'impressum' ? 'active' : ''} onClick={() => { setActivePage('impressum'); setUserMenuOpen(false) }}>{t.impressum}</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="app-header">
          <button type="button" className="icon-button sheet-expand-button app-menu-button" aria-label={t.appMenu} onClick={() => setUserMenuOpen((prev) => !prev)}>
            <span className="icon-only"><HamburgerIcon /></span>
            <span className="button-label">{t.appMenu}</span>
          </button>
          <div className="app-brand-block" onClick={() => setShowSubtitle((prev) => !prev)} style={{ cursor: 'pointer' }}>
            <div className="app-brand">{t.appTitle}</div>
            <p className={showSubtitle ? 'force-show' : ''}>{t.appSub}</p>
          </div>
          <div className="topbar-controls">
            {activePage === 'planner' && <button type="button" className="icon-button sheet-expand-button" aria-expanded={plannerPanelOpen} aria-label={plannerPanelOpen ? t.closePlanner : t.openRouteTools} onClick={(e) => { e.stopPropagation(); setPlannerPanelOpen((prev) => !prev) }}><span className="icon-only">{plannerPanelOpen ? <ArrowUpIcon /> : <ArrowDownIcon />}</span><span className="button-label">{plannerPanelOpen ? t.closePlanner : t.openPlanner}</span></button>}
          </div>
        </header>
        {message && <p className="status info">{message}</p>}

        {activePage === 'planner' && <section className={`planner-layout ${plannerPanelOpen ? '' : 'panel-collapsed'}`}>
        <section className="map-stack">
          <section ref={mapRef} className="map" onClick={() => setPlannerPanelOpen(false)} />
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
              <span className="icon-small" aria-hidden="true">{showRouteDetails ? <ArrowDownIcon /> : <ArrowUpIcon />}</span>
            </button>
          {showRouteDetails && latestGpx && (
            <section className="route-details">
              <div className="route-stats-summary">
                <span><strong>{t.distance}:</strong> {routeStats.distanceKm.toFixed(1)} km</span>
                <span><strong>{t.ascent}:</strong> {Math.round(routeStats.ascentM)} m</span>
                <span><strong>{t.descent}:</strong> {Math.round(routeStats.descentM)} m</span>
              </div>
              {routeStats.rawSummary && <p>{routeStats.rawSummary}</p>}
              <ElevationChart profile={routeStats.elevationProfile} title={t.elevationProfile} activeDistanceM={activeElevationPoint?.distanceM} onHoverPoint={setActiveElevationPoint} onLeave={() => setActiveElevationPoint(null)} t={t} />
            </section>
          )}
            {!latestGpx && <p className="route-bottom-sheet-empty">{t.routeDetailsUnavailable}</p>}
          </section>
        </section>
        <aside className="panel planner-panel">
        <div className="planner-panel-head"><h2>{t.plannerHeading}</h2><button type="button" className="planner-mobile-close" aria-label={t.closePlanner} onClick={() => setPlannerPanelOpen(false)}>✕</button></div><p>{t.addPinsHint}</p>
        <label>{t.profile}</label>
        <select value={activeProfile} onChange={(e) => { setActiveProfile(e.target.value); setIsExternalRoute(false); }}>
          {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          <option value="custom">{t.customProfile}</option>
        </select>
        <label className="checkbox-label">
          <input type="checkbox" checked={avoidFerries} onChange={(e) => { setAvoidFerries(e.target.checked); setIsExternalRoute(false); }} />
          <span>{t.avoidFerries}</span>
        </label>
        {activeProfile === 'custom' && (
          <textarea
            className="custom-profile-area"
            value={customProfileContent}
            onChange={(e) => setCustomProfileContent(e.target.value)}
            placeholder={t.customProfilePlaceholder}
            rows={5}
          />
        )}
        <label>{t.title}</label><input value={title} onChange={(e) => setTitle(e.target.value)} />
        <label>{t.findPlace}</label>
        <div style={{ position: 'relative' }}>
          <input value={placeQuery} style={{ width: '100%' }} onChange={(e) => setPlaceQuery(e.target.value)} placeholder={t.placeSearchPlaceholder} />
          {(searchingPlaces || placeResults.length > 0 || (placeQuery.trim().length >= 3 && !placeResults.length)) && (
            <div className="place-results">
              {searchingPlaces && <small style={{ padding: '0.5rem', display: 'block' }}>{t.searchingPlaces}</small>}
              {!searchingPlaces && !placeResults.length && <small style={{ padding: '0.5rem', display: 'block' }}>{t.noPlacesFound}</small>}
              {!searchingPlaces && placeResults.map((place) => (
                <button key={place.id} type="button" className="place-result" onClick={() => { addWaypoint(place.label, place.lon, place.lat); setPlaceQuery(''); setPlaceResults([]); }}>
                  {place.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <WaypointList waypoints={waypoints} setWaypoints={(val) => { setWaypoints(val); setIsExternalRoute(false); }} />
        <button onClick={() => { setWaypoints([]); setIsExternalRoute(false); }}>{t.clearPins}</button>
        <button onClick={saveGeneratedRoute} disabled={!latestGpx}>{t.saveGenerated}</button>
        {latestGpx && <p className="status info inline">{t.routeReady}</p>}
      </aside></section>}

      {activePage === 'library' && <section className="library-page"><h2>{t.libraryHeading}</h2>
        <div className="panel upload-panel"><h3>{t.uploadSection}</h3><label>{t.uploadRouteTitle}</label><input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} />
          <label className="upload">{t.uploadGpx}<input type="file" accept=".gpx,application/gpx+xml" onChange={(e) => setUploadGpxFile(e.target.files?.[0] ?? null)} /></label>
          <button type="button" onClick={uploadGpx} disabled={!uploadGpxFile}>{t.uploadRouteButton}</button></div>
        <div className="panel">{!savedRoutes.length && <p>{t.noSaved}</p>}
          {savedRoutes.map((route) => <article className="route-card" key={route.id}><div className="route-card-head"><strong>{route.title}</strong></div><div className="quick-actions"><button onClick={() => openRoute(route)}>{t.downloadGpx}</button><button onClick={() => loadRouteToMap(route)}>{t.loadOnMap}</button><button onClick={() => setSavedRoutes((prev) => prev.filter((x) => x.id !== route.id))}>{t.remove}</button></div></article>)}
        </div>
      </section>}

      {activePage === 'privacy' && <section className="panel legal-page"><h2>{t.privacyHeading}</h2><p>We process route planning data only in your browser and keep your saved GPX files in local storage on this device.</p><p>When generating routes and searching places, requests are sent to external services (BRouter and Nominatim/OpenStreetMap) to return route and search results.</p><p>No account is required and no central profile storage is used in this demo.</p><button type="button" onClick={() => setActivePage('planner')}>{t.backToPlanner}</button></section>}

      {activePage === 'settings' && <section className="settings-page">
        <h2>{t.settingsHeading}</h2>
        <div className="panel">
          <h3>{t.generalSettings}</h3>
          <label>{t.language}</label>
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
        </div>

        <div className="panel">
          <h3>{t.routingProfiles}</h3>
          <div className="add-profile-form">
            <label>{t.profileName}</label>
            <input value={newProfileName} onChange={(e) => setNewProfileName(e.target.value)} placeholder="e.g. My Custom MTB" />
            <label>{t.profileContent}</label>
            <textarea
              className="custom-profile-area"
              value={newProfileContent}
              onChange={(e) => setNewProfileContent(e.target.value)}
              placeholder={t.customProfilePlaceholder}
              rows={5}
            />
            <input type="file" accept=".brf" onChange={handleProfileUpload} />
            <button onClick={addCustomProfile} disabled={!newProfileName || !newProfileContent}>{t.addProfile}</button>
          </div>

          <div className="saved-profiles-list">
            {customProfiles.map((p) => (
              <div key={p.id} className="saved-profile-item">
                <span>{p.name}</span>
                <button className="danger" onClick={() => deleteCustomProfile(p.id)}>{t.deleteProfile}</button>
              </div>
            ))}
          </div>
        </div>

        <button type="button" onClick={() => setActivePage('planner')}>{t.backToPlanner}</button>
      </section>}

        {activePage === 'impressum' && <section className="panel legal-page"><h2>{t.impressumHeading}</h2><p>Bicly demo application.</p><p>Responsible for content: Bicly Project Team.</p><p>Contact: hello@bicly.local</p><p>Address: Example Street 1, 12345 Demo City</p><button type="button" onClick={() => setActivePage('planner')}>{t.backToPlanner}</button></section>}
      </main>
    </div>
  )
}
