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
import { buildBrouterRouteUrl, loadProfiles, fetchBrouterRoute, uploadProfile } from './lib/api'

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

const btnBase = "px-4 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
const btnPrimary = `${btnBase} bg-blue-600 text-white hover:bg-blue-700 shadow-sm`
const btnSecondary = `${btnBase} bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700`
const btnDanger = `${btnBase} border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20`
const inputBase = "w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
const labelBase = "block text-sm font-bold mb-1 text-slate-500 dark:text-slate-400 uppercase tracking-wider"

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
    roundTrip: 'Round trip', roundTripDistance: 'Distance (m)', roundTripDirection: 'Direction (°)', roundTripPoints: 'Number of points',
    uploadBrf: 'Upload .brf',
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
    roundTrip: 'Rundtrip', roundTripDistance: 'Distanz (m)', roundTripDirection: 'Richtung (°)', roundTripPoints: 'Anzahl der Punkte',
    uploadBrf: '.brf hochladen',
    openRouteDetailsSheet: 'Routendetails öffnen', closeRouteDetailsSheet: 'Routendetails schließen',
    routeDetailsUnavailable: 'Erzeuge eine Route, um Distanz- und Höhendetails zu sehen.',
    elevationFocusHint: 'Fahre mit der Maus darüber (Desktop) oder ziehe mit dem Finger, um die Kartenposition zu markieren.',
  },
}

const ElevationChart = ({ profile, title, legend, hoverHint, activeDistanceM, onHoverPoint, onLeave, t, isDarkMode }) => {
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
      backgroundColor: isDarkMode ? 'rgba(30, 111, 235, 0.2)' : 'rgba(168, 200, 255, 0.4)',
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
            const lines = [`${Math.round(item.parsed.y)} m`]
            if (point && Number.isFinite(point.slopeDeg)) {
              lines.push(`Gradient: ${Math.round(point.slopeDeg)}°`)
            }
            return lines
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
          color: isDarkMode ? '#94a3b8' : '#64748b',
        },
        grid: { display: false },
      },
      y: {
        ticks: {
          callback: (val) => `${val}m`,
          color: isDarkMode ? '#94a3b8' : '#64748b',
        },
        grid: {
          color: isDarkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(100, 116, 139, 0.1)',
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
    <section className="p-2" aria-label={title}>
      <div className="flex justify-between items-center mb-1">
        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">{title}</h4>
      </div>
      <div className="h-40 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50 p-1">
        <Line data={data} options={options} />
      </div>
      <div className="flex justify-between mt-1 px-1">
        <small className="text-[10px] text-slate-400">{legend}</small>
        <small className="text-[10px] text-slate-400">{hoverHint}</small>
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

    const waypoints = Array.from(xml.querySelectorAll('wpt'))
      .map((node) => ({
        id: crypto.randomUUID(),
        label: node.querySelector('name')?.textContent || 'Pin',
        lon: Number(node.getAttribute('lon')),
        lat: Number(node.getAttribute('lat')),
      }))
      .filter((p) => Number.isFinite(p.lon) && Number.isFinite(p.lat))

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
      waypoints,
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

const injectWaypointsToGpx = (gpx, waypoints) => {
  if (!waypoints || waypoints.length === 0) return gpx
  try {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(gpx, 'application/xml')
    const gpxNode = xmlDoc.getElementsByTagName('gpx')[0]
    if (!gpxNode) return gpx

    const firstTrk = gpxNode.getElementsByTagName('trk')[0]

    waypoints.forEach((wp) => {
      const wpt = xmlDoc.createElement('wpt')
      wpt.setAttribute('lat', wp.lat.toFixed(6))
      wpt.setAttribute('lon', wp.lon.toFixed(6))
      if (wp.label) {
        const name = xmlDoc.createElement('name')
        name.textContent = wp.label
        wpt.appendChild(name)
      }
      if (firstTrk) {
        gpxNode.insertBefore(wpt, firstTrk)
      } else {
        gpxNode.appendChild(wpt)
      }
    })

    return new XMLSerializer().serializeToString(xmlDoc)
  } catch {
    return gpx
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
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('bicly_theme') === 'dark')
  const t = TEXT[lang]
  const mapRef = useRef(null)

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('bicly_theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('bicly_theme', 'light')
    }
  }, [isDarkMode])
  const [map, setMap] = useState(null)
  const mapMarkers = useRef([])
  const [activePage, setActivePage] = useState('planner')
  const [waypoints, setWaypoints] = useState(() => Array.isArray(plannerDraft?.waypoints) ? plannerDraft.waypoints : [])
  const [profiles, setProfiles] = useState([])
  const [customProfiles, setCustomProfiles] = useState(() => JSON.parse(localStorage.getItem('bicly_custom_profiles') || '[]'))
  const [activeProfile, setActiveProfile] = useState(() => typeof plannerDraft?.activeProfile === 'string' ? plannerDraft.activeProfile : 'trekking')
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
  const [routingError, setRoutingError] = useState('')
  const [userLocation, setUserLocation] = useState(null)
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeResults, setPlaceResults] = useState([])
  const [searchingPlaces, setSearchingPlaces] = useState(false)
  const [plannerPanelOpen, setPlannerPanelOpen] = useState(false)
  const [showSubtitle, setShowSubtitle] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [headerExpanded, setHeaderExpanded] = useState(false)
  const [showRouteDetails, setShowRouteDetails] = useState(true)
  const [isRoundTrip, setIsRoundTrip] = useState(() => Boolean(plannerDraft?.isRoundTrip))
  const [roundTripDistance, setRoundTripDistance] = useState(() => plannerDraft?.roundTripDistance ?? 1500)
  const [roundTripDirection, setRoundTripDirection] = useState(() => plannerDraft?.roundTripDirection ?? -1)
  const [roundTripPoints, setRoundTripPoints] = useState(() => plannerDraft?.roundTripPoints ?? 5)
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
      isRoundTrip,
      roundTripDistance,
      roundTripDirection,
      roundTripPoints,
    }))
    if (activeProfile === 'custom') {
      localStorage.setItem('bicly_custom_profile_tmp', customProfileContent)
    }
  }, [waypoints, activeProfile, customProfileContent, latestGpx, routeGeoJson, title, routeStats, showRouteDetails])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((position) => setUserLocation({ lon: position.coords.longitude, lat: position.coords.latitude }))
  }, [])

  const addWaypoint = (label, lon, lat) => {
    setIsExternalRoute(false)
    setWaypoints((prev) => [...prev, { id: crypto.randomUUID(), label: label || `Pin ${prev.length + 1}`, lon: Number(lon.toFixed(6)), lat: Number(lat.toFixed(6)) }])
  }

  const moveWaypoint = (index, direction) => {
    setWaypoints((prev) => {
      const newWaypoints = [...prev]
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= newWaypoints.length) return prev
      const temp = newWaypoints[index]
      newWaypoints[index] = newWaypoints[nextIndex]
      newWaypoints[nextIndex] = temp
      return newWaypoints
    })
    setIsExternalRoute(false)
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
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [message])

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
      element.className = 'waypoint-marker cursor-pointer'
      element.textContent = String(index + 1)
      element.addEventListener('click', (e) => {
        e.stopPropagation()
        setWaypoints((prev) => prev.filter((w) => w.id !== point.id))
        setIsExternalRoute(false)
      })
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
    const minPoints = isRoundTrip ? 1 : 2
    if (waypoints.length < minPoints) { setLatestGpx(''); setRouteGeoJson(emptyRouteGeoJson); setRouteStats(emptyRouteStats); return }
    if (isExternalRoute) return

    const controller = new AbortController()
    const profileToUse = activeProfile === 'custom' ? customProfileContent : activeProfile

    if (activeProfile === 'custom' && !customProfileContent) return

    const isCustomSaved = customProfiles.find((p) => p.id === activeProfile)
    const finalProfile = isCustomSaved
      ? (isCustomSaved.id.startsWith('custom_') ? isCustomSaved.id : isCustomSaved.content)
      : profileToUse

    setRoutingError('')
    fetchBrouterRoute({
      profile: finalProfile,
      points: brouterPoints,
      signal: controller.signal,
      engineMode: isRoundTrip ? '4' : undefined,
      roundTripDistance: isRoundTrip ? roundTripDistance : undefined,
      direction: isRoundTrip ? roundTripDirection : undefined,
      roundTripPoints: isRoundTrip ? roundTripPoints : undefined,
    })
      .then((text) => { setLatestGpx(text); setRouteGeoJson(parseGpxToGeoJson(text)); setRouteStats(parseGpxStats(text)) })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setRoutingError(err.message)
        }
      })
    return () => controller.abort()
  }, [activeProfile, customProfileContent, brouterPoints, waypoints.length, isExternalRoute, isRoundTrip, roundTripDistance, roundTripDirection, roundTripPoints])


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
    const fullGpx = injectWaypointsToGpx(latestGpx, waypoints)
    setSavedRoutes((prev) => [{ id: crypto.randomUUID(), title: title.trim() || 'Route', gpx: fullGpx }, ...prev])
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

  const downloadCurrentRoute = () => {
    if (!latestGpx) return
    const fullGpx = injectWaypointsToGpx(latestGpx, waypoints)
    const blob = new Blob([fullGpx], { type: 'application/gpx+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safeTitle = (title || 'route').replace(/[./\\]/g, '_')
    a.download = `${safeTitle}.gpx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
    const stats = parseGpxStats(route.gpx)
    setRouteStats(stats)

    const coords = geo.features[0]?.geometry?.coordinates ?? []
    if (stats.waypoints && stats.waypoints.length >= 2) {
      setWaypoints(stats.waypoints)
    } else if (coords.length >= 2) {
      const start = coords[0]
      const end = coords[coords.length - 1]
      setWaypoints([
        { id: crypto.randomUUID(), label: 'Start', lon: start[0], lat: start[1] },
        { id: crypto.randomUUID(), label: 'End', lon: end[0], lat: end[1] },
      ])
    }

    if (map && coords.length >= 2) {
      const bounds = new maplibregl.LngLatBounds()
      coords.forEach((c) => bounds.extend(c))
      map.fitBounds(bounds, { padding: 50, maxZoom: 15 })
    }
  }

  const addCustomProfile = async () => {
    if (!newProfileName || !newProfileContent) return
    let id
    try {
      const data = await uploadProfile(newProfileContent)
      id = data.profileid || crypto.randomUUID()
    } catch (err) {
      console.error('Failed to upload profile, saving locally:', err)
      id = crypto.randomUUID()
    }
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
    <div className={`flex h-screen w-screen overflow-hidden relative bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 ${userMenuOpen ? 'menu-open' : ''}`}>
      <aside className={`fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-[300] flex flex-col transition-transform duration-300 transform ${userMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 ${userMenuOpen ? '' : 'md:ml-[-288px]'}`}>
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold">{t.appMenu}</h3>
          <button type="button" className="text-2xl" onClick={() => setUserMenuOpen(false)}>✕</button>
        </div>
        <div className="flex flex-col gap-1 p-4">
          {[
            { id: 'planner', label: t.planner },
            { id: 'library', label: t.library },
            { id: 'settings', label: t.settings },
            { id: 'privacy', label: t.privacyPolicy },
            { id: 'impressum', label: t.impressum },
          ].map((item) => (
            <button
              key={item.id}
              className={`text-left px-4 py-3 rounded-xl transition-colors ${activePage === item.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              onClick={() => { setActivePage(item.id); setUserMenuOpen(false) }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="flex items-center justify-between gap-3 p-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-[100]">
          <button type="button" className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" aria-label={t.appMenu} onClick={() => setUserMenuOpen((prev) => !prev)}>
            <span className="w-6 h-6"><HamburgerIcon /></span>
          </button>
          <div className="flex-1 min-w-0" onClick={() => setShowSubtitle((prev) => !prev)} style={{ cursor: 'pointer' }}>
            <div className="text-xl font-extrabold truncate">{t.appTitle}</div>
            <p className={`text-xs text-slate-500 dark:text-slate-400 truncate transition-all duration-300 ${showSubtitle ? 'max-h-10 opacity-100' : 'max-h-0 opacity-0 md:max-h-10 md:opacity-100'}`}>{t.appSub}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-xl" onClick={() => setIsDarkMode(!isDarkMode)} aria-label="Toggle dark mode">
              {isDarkMode ? '🌞' : '🌙'}
            </button>
            {activePage === 'planner' && (
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                aria-expanded={plannerPanelOpen}
                aria-label={plannerPanelOpen ? t.closePlanner : t.openRouteTools}
                onClick={(e) => { e.stopPropagation(); setPlannerPanelOpen((prev) => !prev) }}
              >
                <span className="w-4 h-4">{plannerPanelOpen ? <ArrowUpIcon /> : <ArrowDownIcon />}</span>
                <span className="hidden md:inline">{plannerPanelOpen ? t.closePlanner : t.openPlanner}</span>
              </button>
            )}
          </div>
        </header>
        {message && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 bg-blue-600 text-white rounded-full shadow-2xl animate-bounce">
            {message}
          </div>
        )}

        {activePage === 'planner' && <section className="flex-1 flex min-h-0 relative">
        <section className="flex-1 flex flex-col min-w-0 relative">
          <section ref={mapRef} className="flex-1 min-h-0 relative" onClick={() => setPlannerPanelOpen(false)}>
          </section>
          <section className={`flex-none flex flex-col overflow-hidden bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 transition-all duration-300 z-[200] min-h-[3rem] ${showRouteDetails ? 'h-[60%]' : 'h-12'}`}>
            <button
              type="button"
              className="flex-none flex justify-between items-center px-4 h-12 w-full font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              aria-expanded={showRouteDetails}
              aria-label={showRouteDetails ? t.closeRouteDetailsSheet : t.openRouteDetailsSheet}
              onClick={() => setShowRouteDetails((prev) => !prev)}
            >
              <span>{t.routeDetails}</span>
              <span className="w-5 h-5" aria-hidden="true">{showRouteDetails ? <ArrowDownIcon /> : <ArrowUpIcon />}</span>
            </button>
          {showRouteDetails && latestGpx && (
            <section className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              <div className="flex flex-wrap gap-4 text-sm font-medium">
                <span className="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full"><strong>{t.distance}:</strong> {routeStats.distanceKm.toFixed(1)} km</span>
                <span className="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full"><strong>{t.ascent}:</strong> {Math.round(routeStats.ascentM)} m</span>
                <span className="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full"><strong>{t.descent}:</strong> {Math.round(routeStats.descentM)} m</span>
              </div>
              {routeStats.rawSummary && <p className="text-sm text-slate-600 dark:text-slate-400 italic">{routeStats.rawSummary}</p>}
              <ElevationChart profile={routeStats.elevationProfile} title={t.elevationProfile} legend={t.steepLegend} hoverHint={t.elevationFocusHint} activeDistanceM={activeElevationPoint?.distanceM} onHoverPoint={setActiveElevationPoint} onLeave={() => setActiveElevationPoint(null)} t={t} isDarkMode={isDarkMode} />
            </section>
          )}
            {showRouteDetails && !latestGpx && <p className="p-4 text-sm text-slate-500 italic">{t.routeDetailsUnavailable}</p>}
          </section>
        </section>
        <aside className={`fixed inset-0 z-[400] bg-white dark:bg-slate-800 flex flex-col p-4 overflow-y-auto transition-transform duration-300 ${plannerPanelOpen ? 'translate-y-0' : 'translate-y-full'} md:static md:translate-y-0 md:w-96 md:border-l md:border-slate-200 md:dark:border-slate-700 ${plannerPanelOpen ? '' : 'md:mr-[-384px]'}`}>
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold">{t.plannerHeading}</h2>
          <button type="button" className="md:hidden text-2xl" aria-label={t.closePlanner} onClick={() => setPlannerPanelOpen(false)}>✕</button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t.addPinsHint}</p>
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelBase}>{t.profile}</label>
            <select className={inputBase} value={activeProfile} onChange={(e) => { setActiveProfile(e.target.value); setIsExternalRoute(false); }}>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              <option value="custom">{t.customProfile}</option>
            </select>
            {activeProfile === 'custom' && (
              <div className="flex flex-col gap-2 mt-2">
                <textarea
                  className={`${inputBase} font-mono text-xs`}
                  value={customProfileContent}
                  onChange={(e) => setCustomProfileContent(e.target.value)}
                  placeholder={t.customProfilePlaceholder}
                  rows={5}
                />
                <div className="flex items-center gap-2">
                  <label className={`${btnSecondary} text-[10px] py-1 px-2 cursor-pointer flex-1 text-center`}>
                    {t.uploadBrf}
                    <input type="file" accept=".brf" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) setCustomProfileContent(await file.text())
                    }} />
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={isRoundTrip} onChange={(e) => setIsRoundTrip(e.target.checked)} />
              <span className="font-bold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300">{t.roundTrip}</span>
            </label>
            {isRoundTrip && (
              <div className="grid grid-cols-1 gap-3 mt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t.roundTripDistance}</label>
                  <input type="number" className={inputBase} value={roundTripDistance} onChange={(e) => setRoundTripDistance(Number(e.target.value))} step="500" min="500" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t.roundTripDirection}</label>
                    <input type="number" className={inputBase} value={roundTripDirection} onChange={(e) => setRoundTripDirection(Number(e.target.value))} min="-1" max="360" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t.roundTripPoints}</label>
                    <input type="number" className={inputBase} value={roundTripPoints} onChange={(e) => setRoundTripPoints(Number(e.target.value))} min="2" max="10" />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className={labelBase}>{t.title}</label>
            <input className={inputBase} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="relative">
            <label className={labelBase}>{t.findPlace}</label>
            <input className={inputBase} value={placeQuery} onChange={(e) => setPlaceQuery(e.target.value)} placeholder={t.placeSearchPlaceholder} />
            {(searchingPlaces || placeResults.length > 0 || (placeQuery.trim().length >= 3 && !placeResults.length)) && (
              <div className="absolute top-full left-0 right-0 z-[500] mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {searchingPlaces && <div className="p-3 text-sm text-slate-500 animate-pulse">{t.searchingPlaces}</div>}
                {!searchingPlaces && !placeResults.length && <div className="p-3 text-sm text-slate-500">{t.noPlacesFound}</div>}
                {!searchingPlaces && placeResults.map((place) => (
                  <button key={place.id} type="button" className="w-full text-left p-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0" onClick={() => addWaypoint(place.label, place.lon, place.lat)}>
                    {place.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <WaypointList waypoints={waypoints} setWaypoints={(val) => { setWaypoints(val); setIsExternalRoute(false); }} onMove={moveWaypoint} />
        {routingError && <div className="p-3 mb-4 text-xs font-mono bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-xl overflow-x-auto whitespace-pre-wrap">{routingError}</div>}
        <div className="flex flex-col gap-2 mt-auto">
          <button className={btnSecondary} onClick={() => { setWaypoints([]); setIsExternalRoute(false); }}>{t.clearPins}</button>
          <button className={btnPrimary} onClick={saveGeneratedRoute} disabled={!latestGpx}>{t.saveGenerated}</button>
          <button className={btnSecondary} onClick={downloadCurrentRoute} disabled={!latestGpx}>{t.downloadGpx}</button>
        </div>
        {latestGpx && <p className="status info inline">{t.routeReady}</p>}
      </aside></section>}

      {activePage === 'library' && <section className="flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full flex flex-col gap-6">
        <h2 className="text-3xl font-bold">{t.libraryHeading}</h2>
        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm flex flex-col gap-4">
          <h3 className="text-xl font-bold">{t.uploadSection}</h3>
          <div>
            <label className={labelBase}>{t.uploadRouteTitle}</label>
            <input className={inputBase} value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} />
          </div>
          <div>
            <label className={labelBase}>{t.uploadGpx}</label>
            <input className={inputBase} type="file" accept=".gpx,application/gpx+xml" onChange={(e) => setUploadGpxFile(e.target.files?.[0] ?? null)} />
          </div>
          <button className={btnPrimary} type="button" onClick={uploadGpx} disabled={!uploadGpxFile}>{t.uploadRouteButton}</button>
        </div>
        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm flex flex-col gap-4">
          {!savedRoutes.length && <p className="text-slate-500 italic">{t.noSaved}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedRoutes.map((route) => (
              <article className="p-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-4" key={route.id}>
                <div className="font-bold text-lg">{route.title}</div>
                <div className="flex flex-wrap gap-2">
                  <button className={`${btnSecondary} text-sm py-1.5`} onClick={() => openRoute(route)}>{t.downloadGpx}</button>
                  <button className={`${btnSecondary} text-sm py-1.5`} onClick={() => loadRouteToMap(route)}>{t.loadOnMap}</button>
                  <button className={`${btnDanger} text-sm py-1.5`} onClick={() => setSavedRoutes((prev) => prev.filter((x) => x.id !== route.id))}>{t.remove}</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>}

      {activePage === 'privacy' && <section className="flex-1 overflow-y-auto p-4 md:p-8 max-w-3xl mx-auto w-full flex flex-col gap-6">
        <div className="p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm flex flex-col gap-4">
          <h2 className="text-3xl font-bold mb-4">{t.privacyHeading}</h2>
          <p>We process route planning data only in your browser and keep your saved GPX files in local storage on this device.</p>
          <p>When generating routes and searching places, requests are sent to external services (BRouter and Nominatim/OpenStreetMap) to return route and search results.</p>
          <p>No account is required and no central profile storage is used in this demo.</p>
        </div>
      </section>}

      {activePage === 'settings' && <section className="flex-1 overflow-y-auto p-4 md:p-8 max-w-3xl mx-auto w-full flex flex-col gap-6">
        <h2 className="text-3xl font-bold">{t.settingsHeading}</h2>
        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm flex flex-col gap-4">
          <h3 className="text-xl font-bold">{t.generalSettings}</h3>
          <div>
            <label className={labelBase}>{t.language}</label>
            <select className={inputBase} value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm flex flex-col gap-4">
          <h3 className="text-xl font-bold">{t.routingProfiles}</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelBase}>{t.profileName}</label>
              <input className={inputBase} value={newProfileName} onChange={(e) => setNewProfileName(e.target.value)} placeholder="e.g. My Custom MTB" />
            </div>
            <div>
              <label className={labelBase}>{t.profileContent}</label>
              <textarea
                className={`${inputBase} font-mono text-xs`}
                value={newProfileContent}
                onChange={(e) => setNewProfileContent(e.target.value)}
                placeholder={t.customProfilePlaceholder}
                rows={5}
              />
            </div>
            <input type="file" accept=".brf" onChange={handleProfileUpload} />
            <button className={btnPrimary} onClick={addCustomProfile} disabled={!newProfileName || !newProfileContent}>{t.addProfile}</button>
          </div>

          <div className="mt-4 border-t border-slate-100 dark:border-slate-700 pt-4 flex flex-col gap-2">
            {customProfiles.map((p) => (
              <div key={p.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                <span className="font-medium">{p.name}</span>
                <button className={btnDanger} onClick={() => deleteCustomProfile(p.id)}>{t.deleteProfile}</button>
              </div>
            ))}
          </div>
        </div>

        <button className={`${btnSecondary} self-start`} type="button" onClick={() => setActivePage('planner')}>{t.backToPlanner}</button>
      </section>}

      {activePage === 'impressum' && <section className="flex-1 overflow-y-auto p-4 md:p-8 max-w-3xl mx-auto w-full flex flex-col gap-6">
        <div className="p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm flex flex-col gap-4">
          <h2 className="text-3xl font-bold mb-4">{t.impressumHeading}</h2>
          <p>Bicly demo application.</p>
          <p>Responsible for content: Bicly Project Team.</p>
          <p>Contact: hello@bicly.local</p>
          <p>Address: Example Street 1, 12345 Demo City</p>
        </div>
      </section>}
      </main>
    </div>
  )
}
