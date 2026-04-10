import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
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
import { loadProfiles, fetchBrouterRoute } from './lib/api'

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
const WATER_LAYER_ID = 'poi-water-highlight'
const TOILET_LAYER_ID = 'poi-toilet-highlight'
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
  <svg viewBox="0 0 122.88 95.95" aria-hidden="true" focusable="false" fill="currentColor" className="w-full h-full block">
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

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
)

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
    <polyline points="16 6 12 2 8 6"></polyline>
    <line x1="12" y1="2" x2="12" y2="15"></line>
  </svg>
)

const TEXT = {
  en: {
    appTitle: 'Bicly', appSub: 'Ride-ready route planning with local GPX storage.', planner: 'Planner', library: 'Library',
    language: 'Language', profile: 'Routing profile', title: 'Route title', clearPins: 'delete Route',
    confirmClear: 'Are you sure you want to delete the current route?',
    moveUp: 'Move waypoint up', moveDown: 'Move waypoint down', removeWaypoint: 'Remove waypoint',
    saveGenerated: 'Save generated GPX', routeReady: 'Route generated and shown on map.',
    shareRoute: 'Share route', shareCopied: 'Link copied to clipboard!',
    addPinsHint: 'Click on the map to add pins. Drag and reorder on the left.',
    useLocationStart: 'Use my location as start', addMyLocation: 'my location',
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
    generalSettings: 'General settings',
    distance: 'Distance', ascent: 'Ascent', descent: 'Descent',
    elevationProfile: 'Elevation profile', steepLegend: 'Steepness (10°+ = red)',
    openRouteDetailsSheet: 'Open route details', closeRouteDetailsSheet: 'Close route details',
    routeDetailsUnavailable: 'Generate a route to see distance and elevation details.',
    elevationFocusHint: 'Hover (desktop) or drag (touch) to highlight the matching map position.',
    routingTimeout: 'Routing request timed out.',
    travelTime: 'Travel time',
    energy: 'Energy',
    bears: 'Gummy bears',
    totalMass: 'Total weight (bike + rider)',
    showDrinkingWater: 'Show drinking water',
    showToilets: 'Show toilets',
    profile_trekking: 'Bike',
    profile_trekking_noferries: 'Bike (no ferries)',
    profile_fastbike: 'Road bike',
    profile_liegerad: 'Recumbent',
  },
  de: {
    appTitle: 'Bicly', appSub: 'Fahrradfreundliche Routenplanung mit lokaler GPX-Bibliothek.', planner: 'Planer', library: 'Bibliothek',
    profile_trekking: 'Rad',
    profile_trekking_noferries: 'Rad ohne Fähren',
    profile_fastbike: 'Rennrad',
    profile_liegerad: 'Liegerad',
    language: 'Sprache', profile: 'Routing-Profil', title: 'Routentitel', clearPins: 'Route Löschen',
    confirmClear: 'Bist du sicher, dass du die aktuelle Route löschen möchtest?',
    moveUp: 'Wegpunkt nach oben verschieben', moveDown: 'Wegpunkt nach unten verschieben', removeWaypoint: 'Wegpunkt entfernen',
    saveGenerated: 'Generierte GPX speichern', routeReady: 'Route erzeugt und auf der Karte angezeigt.',
    addPinsHint: 'Klicke auf die Karte, um Pins hinzuzufügen. Links kannst du sie sortieren.',
    useLocationStart: 'Meinen Standort als Start nutzen', addMyLocation: 'Mein Standort',
    findPlace: 'Ort suchen', placeSearchPlaceholder: 'Stadt, Straße oder POI suchen', noPlacesFound: 'Keine Orte gefunden',
    searchingPlaces: 'Suche...', uploadSection: 'Route hochladen', uploadGpx: 'GPX hochladen',
    uploadRouteTitle: 'Routentitel (optional)', uploadRouteButton: 'Lokal speichern',
    noSaved: 'Noch keine gespeicherten Routen.', downloadGpx: 'GPX herunterladen', loadOnMap: 'Auf Karte laden', remove: 'Entfernen',
    shareRoute: 'Route teilen', shareCopied: 'Link in Zwischenablage kopiert!',
    plannerHeading: 'Routenplaner', libraryHeading: 'Lokale Routenbibliothek', statusSaved: 'Route lokal gespeichert',
    statusUploaded: 'Route lokal hochgeladen', locationUnavailable: 'Standort nicht verfügbar',
    openPlanner: 'Planer öffnen', closePlanner: 'Planer schließen', cyclingMode: 'Cycling-Modus',
    userMenu: 'Menü', routeDetails: 'Routendetails', showDetails: 'Details anzeigen', hideDetails: 'Details ausblenden',
    appMenu: 'App-Menü', openRouteTools: 'Routenwerkzeuge aufklappen',
    privacyPolicy: 'Datenschutz', impressum: 'Impressum', backToPlanner: 'Zurück zum Planer',
    privacyHeading: 'Datenschutzerklärung', impressumHeading: 'Impressum',
    settings: 'Einstellungen', settingsHeading: 'App-Einstellungen',
    generalSettings: 'Allgemeine Einstellungen',
    distance: 'Distanz', ascent: 'Anstieg', descent: 'Abstieg',
    elevationProfile: 'Höhenprofil', steepLegend: 'Steigung (ab 10° = rot)',
    openRouteDetailsSheet: 'Routendetails öffnen', closeRouteDetailsSheet: 'Routendetails schließen',
    routeDetailsUnavailable: 'Erzeuge eine Route, um Distanz- und Höhendetails zu sehen.',
    elevationFocusHint: 'Fahre mit der Maus darüber (Desktop) oder ziehe mit dem Finger, um die Kartenposition zu markieren.',
    routingTimeout: 'Die Routenberechnung hat zu lange gedauert.',
    travelTime: 'Fahrzeit',
    energy: 'Energie',
    bears: 'Gummibärchen',
    totalMass: 'Gesamtgewicht (Rad + Fahrer)',
    showDrinkingWater: 'Trinkwasser anzeigen',
    showToilets: 'Toiletten anzeigen',
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
          const point = displayProfile[ctx.p1DataIndex]
          if (!point) return '#1f6feb'
          return point.slopeDeg >= 10 ? '#e22b2b' : point.slopeDeg >= 6 ? '#ef8f2e' : '#1f6feb'
        },
        backgroundColor: (ctx) => {
          const point = displayProfile[ctx.p1DataIndex]
          const base = isDarkMode ? 'rgba(30, 111, 235, 0.2)' : 'rgba(168, 200, 255, 0.4)'
          if (!point) return base
          if (point.slopeDeg >= 10) return isDarkMode ? 'rgba(226, 43, 43, 0.2)' : 'rgba(226, 43, 43, 0.4)'
          if (point.slopeDeg >= 6) return isDarkMode ? 'rgba(239, 143, 46, 0.2)' : 'rgba(239, 143, 46, 0.4)'
          return base
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

const parseDuration = (str) => {
  if (!str) return 0
  let seconds = 0
  const cleanStr = str.replace(/[,;]/g, '').trim()

  if (cleanStr.includes(':') && !cleanStr.match(/[hms]/i)) {
    const parts = cleanStr.split(':').map(Number)
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if (parts.length === 2) return parts[0] * 60 + parts[1]
  }

  const hMatch = cleanStr.match(/([\d.]+)\s*h/i)
  const mMatch = cleanStr.match(/([\d.]+)\s*m/i)
  const sMatch = cleanStr.match(/([\d.]+)\s*s/i)

  if (hMatch) seconds += parseFloat(hMatch[1]) * 3600
  if (mMatch) seconds += parseFloat(mMatch[1]) * 60
  if (sMatch) seconds += parseFloat(sMatch[1])

  if (!hMatch && !mMatch && !sMatch) {
    const val = parseFloat(cleanStr)
    if (!isNaN(val)) seconds = val
  }
  return seconds
}

const escapeXml = (unsafe) => {
  if (typeof unsafe !== 'string') return ''
  return unsafe.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<': return '&lt;'; case '>': return '&gt;'; case '&': return '&amp;'; case '"': return '&quot;'; case "'": return '&apos;';
      default: return c
    }
  })
}

const unescapeXml = (safe) => {
  if (!safe) return ''
  return safe.replace(/&(lt|gt|amp|quot|apos);/g, (m, c) => {
    switch (c) {
      case 'lt': return '<'; case 'gt': return '>'; case 'amp': return '&'; case 'quot': return '"'; case 'apos': return "'";
      default: return m
    }
  })
}

const parseGpxStats = (gpxText, totalMass = 90) => {
  if (!gpxText) return emptyRouteStats
  try {
    const trkptRegex = /<trkpt\s+([^>]+)>(?:([\s\S]*?)<\/trkpt>)?/g
    const wptRegex = /<wpt\s+([^>]+)>(?:([\s\S]*?)<\/wpt>)?/g
    const latRegex = /lat=['"]([^'"]+)['"]/
    const lonRegex = /lon=['"]([^'"]+)['"]/
    const eleRegex = /<ele>([^<]+)<\/ele>/
    const nameRegex = /<name>([^<]+)<\/name>/

    const trkpts = []
    let match
    while ((match = trkptRegex.exec(gpxText)) !== null) {
      const attributes = match[1]
      const content = match[2] || ''
      const latM = latRegex.exec(attributes)
      const lonM = lonRegex.exec(attributes)
      if (latM && lonM) {
        const eleM = eleRegex.exec(content)
        trkpts.push({
          lat: parseFloat(latM[1]),
          lon: parseFloat(lonM[1]),
          ele: eleM ? parseFloat(eleM[1]) : Number.NaN,
        })
      }
    }
    if (trkpts.length < 2) return emptyRouteStats

    const waypoints = []
    while ((match = wptRegex.exec(gpxText)) !== null) {
      const attributes = match[1]
      const content = match[2] || ''
      const latM = latRegex.exec(attributes)
      const lonM = lonRegex.exec(attributes)
      if (latM && lonM) {
        const nameM = nameRegex.exec(content)
        waypoints.push({
          id: crypto.randomUUID(),
          label: nameM ? unescapeXml(nameM[1]) : 'Pin',
          lat: parseFloat(latM[1]),
          lon: parseFloat(lonM[1]),
        })
      }
    }

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

    const descMatch = /<metadata>[\s\S]*?<desc>([\s\S]*?)<\/desc>/.exec(gpxText)
    const rawSummary = descMatch ? unescapeXml(descMatch[1].trim()) : ''
    const combinedText = `${rawSummary} ${gpxText}`

    let travelTimeS = 0
    const timeMatch = combinedText.match(/(?:Time:|time=)\s*(.+?)(?=\s*(?:Energy:|energy=)|$|\n|\r|<!--|-->|<[^>]+>)/i)
    if (timeMatch) {
      travelTimeS = parseDuration(timeMatch[1].trim())
    }

    let energyJoules = 0
    const energyMatch = combinedText.match(/(?:Energy:|energy=)\s*([.\d]+)\s*(Joule|kWh|kJ)/i)
    if (energyMatch) {
      const val = parseFloat(energyMatch[1])
      const unit = energyMatch[2].toLowerCase()
      if (unit === 'joule') energyJoules = val
      else if (unit === 'kwh') energyJoules = val * 3600000
      else if (unit === 'kj') energyJoules = val * 1000
    } else {
      const compactEnergyMatch = combinedText.match(/energy=([.\d]+)(kwh|kj|joule)/i)
      if (compactEnergyMatch) {
        const val = parseFloat(compactEnergyMatch[1])
        const unit = compactEnergyMatch[2].toLowerCase()
        if (unit === 'joule') energyJoules = val
        else if (unit === 'kwh') energyJoules = val * 3600000
        else if (unit === 'kj') energyJoules = val * 1000
      }
    }

    const scaledEnergyJoules = energyJoules * (totalMass / 90)

    // BRouter provides filtered ascent which is much more accurate than raw summation
    const searchTarget = (gpxText.slice(0, 5000) + ' ' + rawSummary).replace(/[\r\n]+/g, ' ');
    const filteredAscendMatch = searchTarget.match(/filtered ascend\s*=\s*(-?\d+(?:\.\d+)?)/i)
    const filteredDescendMatch = searchTarget.match(/filtered descend\s*=\s*(-?\d+(?:\.\d+)?)/i)
    const plainAscendMatch = searchTarget.match(/plain-ascend\s*=\s*(-?\d+(?:\.\d+)?)/i)
    const plainDescendMatch = searchTarget.match(/plain-descend\s*=\s*(-?\d+(?:\.\d+)?)/i)

    let fAscentM = ascentM
    let fDescentM = descentM

    if (filteredAscendMatch) {
      fAscentM = Math.abs(parseFloat(filteredAscendMatch[1]))
      if (filteredDescendMatch) {
        fDescentM = Math.abs(parseFloat(filteredDescendMatch[1]))
      } else {
        const firstEle = trkpts[0].ele
        const lastEle = trkpts[trkpts.length - 1].ele
        if (Number.isFinite(firstEle) && Number.isFinite(lastEle)) {
          fDescentM = Math.max(0, fAscentM - (lastEle - firstEle))
        }
      }
    } else if (plainAscendMatch) {
      fAscentM = Math.max(0, parseFloat(plainAscendMatch[1]))
      if (plainDescendMatch) {
        fDescentM = Math.abs(parseFloat(plainDescendMatch[1]))
      } else {
        const firstEle = trkpts[0].ele
        const lastEle = trkpts[trkpts.length - 1].ele
        if (Number.isFinite(firstEle) && Number.isFinite(lastEle)) {
          fDescentM = Math.max(0, fAscentM - (lastEle - firstEle))
        }
      }
    }

    return {
      distanceKm: distanceMeters / 1000,
      ascentM: fAscentM,
      descentM: fDescentM,
      travelTimeS,
      energyJoules: scaledEnergyJoules,
      bears: Math.round(scaledEnergyJoules / 33500),
      rawSummary,
      waypoints,
      elevationProfile: (() => {
        const profile = []
        let currentDistanceM = 0
        for (let i = 0; i < trkpts.length; i++) {
          const point = trkpts[i]
          if (!Number.isFinite(point.ele)) continue
          if (i === 0) {
            profile.push({ distanceM: 0, elevationM: point.ele, slopeDeg: 0, lon: point.lon, lat: point.lat })
          } else {
            const previous = trkpts[i - 1]
            const segmentMeters = haversineMeters(previous, point)
            currentDistanceM += segmentMeters
            const slopeDeg = Number.isFinite(previous.ele) && segmentMeters > 0
              ? Math.abs((Math.atan((point.ele - previous.ele) / segmentMeters) * 180) / Math.PI)
              : 0
            profile.push({ distanceM: currentDistanceM, elevationM: point.ele, slopeDeg, lon: point.lon, lat: point.lat })
          }
        }
        return profile
      })(),
    }
  } catch {
    return emptyRouteStats
  }
}

const injectWaypointsToGpx = (gpx, waypoints) => {
  if (!waypoints || waypoints.length === 0) return gpx
  try {
    const wptStrings = waypoints.map((wp) => {
      const label = wp.label ? `<name>${escapeXml(wp.label)}</name>` : ''
      return `  <wpt lat="${wp.lat.toFixed(6)}" lon="${wp.lon.toFixed(6)}">${label}</wpt>`
    }).join('\n')

    const trkIndex = gpx.indexOf('<trk>')
    if (trkIndex !== -1) {
      return gpx.slice(0, trkIndex) + wptStrings + '\n' + gpx.slice(trkIndex)
    }
    const gpxEndIndex = gpx.indexOf('</gpx>')
    if (gpxEndIndex !== -1) {
      return gpx.slice(0, gpxEndIndex) + wptStrings + '\n' + gpx.slice(gpxEndIndex)
    }
    return gpx
  } catch {
    return gpx
  }
}

const parseGpxToGeoJson = (gpxText) => {
  if (!gpxText) return emptyRouteGeoJson
  try {
    const trkptRegex = /<trkpt\s+([^>]+)>/g
    const latRegex = /lat=['"]([^'"]+)['"]/
    const lonRegex = /lon=['"]([^'"]+)['"]/
    const points = []
    let match
    while ((match = trkptRegex.exec(gpxText)) !== null) {
      const latM = latRegex.exec(match[1])
      const lonM = lonRegex.exec(match[1])
      if (latM && lonM) {
        points.push([parseFloat(lonM[1]), parseFloat(latM[1])])
      }
    }
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

const ensurePoiLayers = (map, showWater, showToilets) => {
  if (!map.getSource('openmaptiles')) return

  if (map.getLayer(WATER_LAYER_ID)) map.removeLayer(WATER_LAYER_ID)
  if (map.getLayer(TOILET_LAYER_ID)) map.removeLayer(TOILET_LAYER_ID)

  if (showWater) {
    map.addLayer({
      id: WATER_LAYER_ID,
      type: 'circle',
      source: 'openmaptiles',
      'source-layer': 'poi',
      minzoom: 13,
      filter: ['any', ['==', ['get', 'class'], 'drinking_water'], ['==', ['get', 'subclass'], 'drinking_water']],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 2, 16, 8],
        'circle-color': '#3b82f6',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    })
  }

  if (showToilets) {
    map.addLayer({
      id: TOILET_LAYER_ID,
      type: 'circle',
      source: 'openmaptiles',
      'source-layer': 'poi',
      minzoom: 13,
      filter: ['any', ['==', ['get', 'class'], 'toilets'], ['==', ['get', 'subclass'], 'toilets']],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 2, 16, 8],
        'circle-color': '#78350f',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    })
  }
}

export default function App() {
  const { urlWaypoints, urlProfile } = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    const lonlats = params.get('lonlats')
    const profile = params.get('profile')
    let parsedWaypoints = null
    if (lonlats) {
      try {
        parsedWaypoints = lonlats.split('|').map((pair, idx) => {
          const [lon, lat] = pair.split(',').map(Number)
          return { id: crypto.randomUUID(), label: `Pin ${idx + 1}`, lon, lat }
        }).filter(wp => !isNaN(wp.lon) && !isNaN(wp.lat))
      } catch (e) { console.error('Failed to parse lonlats from URL', e) }
    }
    return { urlWaypoints: parsedWaypoints, urlProfile: profile }
  }, [])

  const plannerDraft = useMemo(() => readPlannerDraft(), [])
  const [lang, setLang] = useState('de')
  const [totalMass, setTotalMass] = useState(() => Number(localStorage.getItem('bicly_total_mass') ?? 90))
  const [showDrinkingWater, setShowDrinkingWater] = useState(() => (localStorage.getItem('bicly_show_drinking_water') ?? 'true') === 'true')
  const [showToilets, setShowToilets] = useState(() => (localStorage.getItem('bicly_show_toilets') ?? 'true') === 'true')
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('bicly_theme') === 'dark')
  const [map, setMap] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [activePage, setActivePage] = useState('planner')
  const [waypoints, setWaypoints] = useState(() => urlWaypoints || (Array.isArray(plannerDraft?.waypoints) ? plannerDraft.waypoints : []))
  const [profiles, setProfiles] = useState([])
  const [activeProfile, setActiveProfile] = useState(() => urlProfile || (typeof plannerDraft?.activeProfile === 'string' ? plannerDraft.activeProfile : 'trekking'))
  const [latestGpx, setLatestGpx] = useState(() => typeof plannerDraft?.latestGpx === 'string' ? plannerDraft.latestGpx : '')
  const [routeGeoJson, setRouteGeoJson] = useState(() => plannerDraft?.routeGeoJson?.type === 'FeatureCollection' ? plannerDraft.routeGeoJson : emptyRouteGeoJson)
  const [title, setTitle] = useState(() => typeof plannerDraft?.title === 'string' ? plannerDraft.title : 'New Route')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadGpxFile, setUploadGpxFile] = useState(null)
  const [savedRoutes, setSavedRoutes] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'))
  const [message, setMessage] = useState('')
  const [routingError, setRoutingError] = useState('')
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeResults, setPlaceResults] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchingPlaces, setSearchingPlaces] = useState(false)
  const [plannerPanelOpen, setPlannerPanelOpen] = useState(false)
  const [showSubtitle, setShowSubtitle] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [showRouteDetails, setShowRouteDetails] = useState(true)
  const [routeStats, setRouteStats] = useState(() => plannerDraft?.routeStats?.elevationProfile ? plannerDraft.routeStats : emptyRouteStats)
  const [activeElevationPoint, setActiveElevationPoint] = useState(null)
  const [isExternalRoute, setIsExternalRoute] = useState(false)
  const [privacyMd, setPrivacyMd] = useState('')
  const [impressumMd, setImpressumMd] = useState('')
  const hasInitialFit = useRef(false)

  const showDrinkingWaterRef = useRef(showDrinkingWater)
  const showToiletsRef = useRef(showToilets)
  const mapRef = useRef(null)
  const mapMarkers = useRef([])

  const t = TEXT[lang]

  useEffect(() => {
    showDrinkingWaterRef.current = showDrinkingWater
  }, [showDrinkingWater])

  useEffect(() => {
    showToiletsRef.current = showToilets
  }, [showToilets])

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('bicly_theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('bicly_theme', 'light')
    }
  }, [isDarkMode])

  useEffect(() => {
    localStorage.setItem('bicly_total_mass', totalMass.toString())
  }, [totalMass])

  useEffect(() => {
    localStorage.setItem('bicly_show_drinking_water', showDrinkingWater.toString())
  }, [showDrinkingWater])

  useEffect(() => {
    localStorage.setItem('bicly_show_toilets', showToilets.toString())
  }, [showToilets])

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(savedRoutes)) }, [savedRoutes])
  useEffect(() => {
    loadProfiles().then((rows) => {
      setProfiles(rows)
      if (!rows[0]) return
      setActiveProfile((prev) => {
        return rows.some((p) => p.id === prev) ? prev : rows[0].id
      })
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
    if (urlWaypoints || urlProfile) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [urlWaypoints, urlProfile])

  useEffect(() => {
    fetch('/privacy.md').then(r => r.text()).then(setPrivacyMd).catch(console.error)
    fetch('/impressum.md').then(r => r.text()).then(setImpressumMd).catch(console.error)
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
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: true,
    })
    m.addControl(geolocate, 'top-right')
    geolocate.on('geolocate', (e) => {
      setUserLocation({ lon: e.coords.longitude, lat: e.coords.latitude })
    })

    m.on('load', () => {
      ensureRouteLayer(m)
      ensurePoiLayers(m, showDrinkingWaterRef.current, showToiletsRef.current)
      if (waypoints.length > 0) {
        const bounds = new maplibregl.LngLatBounds()
        waypoints.forEach((p) => bounds.extend([p.lon, p.lat]))
        m.fitBounds(bounds, { padding: 50, maxZoom: 15, animate: false })
      }
      setMap(m)
    })
    m.on('style.load', () => {
      ensureRouteLayer(m)
      ensurePoiLayers(m, showDrinkingWaterRef.current, showToiletsRef.current)
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
    ensurePoiLayers(map, showDrinkingWater, showToilets)
  }, [map, showDrinkingWater, showToilets])

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
    if (waypoints.length < 2) { setLatestGpx(''); setRouteGeoJson(emptyRouteGeoJson); setRouteStats(emptyRouteStats); return }
    if (isExternalRoute) return

    const controller = new AbortController()
    let timedOut = false
    const timeoutId = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 15000)

    setRoutingError('')
    fetchBrouterRoute({
      profile: activeProfile,
      points: brouterPoints,
      signal: controller.signal,
      totalMass,
    })
      .then((text) => {
        setLatestGpx(text)
        setRouteGeoJson(parseGpxToGeoJson(text))
        setRouteStats(parseGpxStats(text, totalMass))
        setMessage(t.routeReady)
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          if (timedOut) setMessage(t.routingTimeout)
        } else {
          setRoutingError(err.message)
        }
      })
      .finally(() => clearTimeout(timeoutId))
    return () => {
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [activeProfile, brouterPoints, waypoints.length, isExternalRoute, totalMass])


  useEffect(() => {
    if (activePage !== 'planner') setActiveElevationPoint(null)
  }, [activePage])

  useEffect(() => {
    if (latestGpx) {
      setRouteStats(parseGpxStats(latestGpx, totalMass))
    }
  }, [totalMass, latestGpx])

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

  const shareRoute = () => {
    if (waypoints.length < 2) return
    const params = new URLSearchParams()
    params.set('lonlats', brouterPoints)
    params.set('profile', activeProfile)
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`
    navigator.clipboard.writeText(shareUrl)
      .then(() => setMessage(t.shareCopied))
      .catch((err) => console.error('Failed to copy URL', err))
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
    const stats = parseGpxStats(route.gpx, totalMass)
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

  return (
    <div className={`flex h-[100dvh] w-screen overflow-hidden relative bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 ${userMenuOpen ? 'menu-open' : ''}`}>
      <aside className={`fixed top-14 left-0 right-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-[290] flex flex-col transition-all duration-300 transform ${userMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}>
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
        <header className="flex items-center justify-between h-14 gap-3 p-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-[300]">
          <button type="button" className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group" aria-label={t.appMenu} onClick={() => setUserMenuOpen((prev) => !prev)}>
            <div className="w-6 h-6 flex items-center justify-center"><HamburgerIcon /></div>
          </button>
          <div className="flex-1 min-w-0" onClick={() => setShowSubtitle((prev) => !prev)} style={{ cursor: 'pointer' }}>
            <div className="text-xl font-extrabold truncate">{t.appTitle}</div>
            <p className={`text-xs text-slate-500 dark:text-slate-400 truncate transition-all duration-300 ${showSubtitle ? 'max-h-10 opacity-100' : 'max-h-0 opacity-0 md:max-h-10 md:opacity-100'}`}>{t.appSub}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-xl" onClick={() => setIsDarkMode(!isDarkMode)} aria-label="Toggle dark mode">
              {isDarkMode ? '🌞' : '🌙'}
            </button>
            <button
              type="button"
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              onClick={downloadCurrentRoute}
              disabled={!latestGpx}
              title={t.downloadGpx}
              aria-label={t.downloadGpx}
            >
              <span className="w-5 h-5"><DownloadIcon /></span>
            </button>
            {activePage === 'planner' && (
              <button
                type="button"
                className="flex items-center gap-2 px-3 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
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
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 bg-slate-800/90 text-white text-sm font-medium rounded-full shadow-lg backdrop-blur-sm transition-all">
            {message}
          </div>
        )}

        {activePage === 'planner' && <section className="flex-1 flex min-h-0 relative">
        <section className="flex-1 flex flex-col min-w-0 relative">
          <section ref={mapRef} className="flex-1 min-h-0 relative" onClick={() => setPlannerPanelOpen(false)}>
          </section>
          <section className={`flex-none flex flex-col overflow-hidden bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 transition-all duration-300 z-[200] min-h-[3.5rem] ${showRouteDetails ? 'h-auto max-h-[60%]' : 'h-14'}`}>
            <button
              type="button"
              className="flex-none flex justify-between items-center px-4 h-14 w-full font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
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
                {routeStats.travelTimeS > 0 && (
                  <span className="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                    <strong>{t.travelTime}:</strong> {Math.floor(routeStats.travelTimeS / 3600)}h {Math.floor((routeStats.travelTimeS % 3600) / 60)}m
                  </span>
                )}
                {routeStats.distanceKm > 0 && (
                  <>
                    <span className="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                      <strong>{t.energy}:</strong> {(routeStats.energyJoules / 1000).toFixed(0)} kJ
                    </span>
                    <span className="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                      <strong>{t.bears}:</strong> {routeStats.bears} 🧸
                    </span>
                  </>
                )}
              </div>
              {routeStats.rawSummary && <p className="text-sm text-slate-600 dark:text-slate-400 italic">{routeStats.rawSummary}</p>}
              <ElevationChart profile={routeStats.elevationProfile} title={t.elevationProfile} legend={t.steepLegend} hoverHint={t.elevationFocusHint} activeDistanceM={activeElevationPoint?.distanceM} onHoverPoint={setActiveElevationPoint} onLeave={() => setActiveElevationPoint(null)} t={t} isDarkMode={isDarkMode} />
            </section>
          )}
            {showRouteDetails && !latestGpx && <p className="p-4 text-sm text-slate-500 italic">{t.routeDetailsUnavailable}</p>}
          </section>
        </section>
        <aside className={`fixed top-14 left-0 right-0 bottom-0 z-[280] bg-white dark:bg-slate-800 flex flex-col p-4 overflow-y-auto transition-all duration-300 ${plannerPanelOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'} md:static md:translate-y-0 md:opacity-100 md:pointer-events-auto md:w-96 md:border-l md:border-slate-200 md:dark:border-slate-700 ${plannerPanelOpen ? '' : 'md:mr-[-384px]'}`}>
        <div className="hidden md:flex justify-between items-center mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold">{t.plannerHeading}</h2>
        </div>
        <p className="hidden md:block text-sm text-slate-500 dark:text-slate-400 mb-4">{t.addPinsHint}</p>
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelBase}>{t.profile}</label>
            <select className={inputBase} value={activeProfile} onChange={(e) => { setActiveProfile(e.target.value); setIsExternalRoute(false); }}>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id === 'trekking' ? t.profile_trekking :
                   p.id === 'trekking-noferries' ? t.profile_trekking_noferries :
                   p.id === 'fastbike' ? t.profile_fastbike :
                   p.id === 'vm-forum-liegerad-schnell' ? t.profile_liegerad :
                   p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelBase}>{t.title}</label>
            <input className={inputBase} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="relative">
            <label className={labelBase}>{t.findPlace}</label>
            <input className={inputBase} value={placeQuery} onChange={(e) => { setPlaceQuery(e.target.value); setShowSuggestions(true); }} placeholder={t.placeSearchPlaceholder} />
            {showSuggestions && (searchingPlaces || placeResults.length > 0 || (placeQuery.trim().length >= 3 && !placeResults.length)) && (
              <div className="absolute top-full left-0 right-0 z-[500] mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {searchingPlaces && <div className="p-3 text-sm text-slate-500 animate-pulse">{t.searchingPlaces}</div>}
                {!searchingPlaces && !placeResults.length && <div className="p-3 text-sm text-slate-500">{t.noPlacesFound}</div>}
                {!searchingPlaces && placeResults.map((place) => (
                  <button key={place.id} type="button" className="w-full text-left p-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0" onClick={() => { addWaypoint(place.label, place.lon, place.lat); setShowSuggestions(false); }}>
                    {place.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <WaypointList waypoints={waypoints} setWaypoints={(val) => { setWaypoints(val); setIsExternalRoute(false); }} onMove={moveWaypoint} t={t} />
        {routingError && <div className="p-3 mb-4 text-xs font-mono bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-xl overflow-x-auto whitespace-pre-wrap">{routingError}</div>}
        <div className="flex flex-col gap-2 mt-auto">
          <button className={btnSecondary} onClick={() => { if (userLocation) addWaypoint(t.addMyLocation, userLocation.lon, userLocation.lat); }} disabled={!userLocation}>{t.addMyLocation}</button>
          <button className={btnDanger} onClick={() => { if (window.confirm(t.confirmClear)) { setWaypoints([]); setIsExternalRoute(false); } }} disabled={waypoints.length === 0}>{t.clearPins}</button>
          <button className={btnSecondary} onClick={saveGeneratedRoute} disabled={!latestGpx}>{t.saveGenerated}</button>
          <div className="grid grid-cols-2 gap-2">
            <button className={`${btnSecondary} flex items-center justify-center gap-2`} onClick={shareRoute} disabled={waypoints.length < 2}>
              <span className="w-4 h-4"><ShareIcon /></span>
              {t.shareRoute}
            </button>
            <button className={btnPrimary} onClick={downloadCurrentRoute} disabled={!latestGpx}>{t.downloadGpx}</button>
          </div>
        </div>
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
          <article className="prose dark:prose-invert max-w-none">
            <ReactMarkdown>{privacyMd}</ReactMarkdown>
          </article>
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
          <div>
            <label className={labelBase}>{t.totalMass} (kg)</label>
            <input type="number" className={inputBase} value={totalMass} onChange={(e) => setTotalMass(Number(e.target.value))} />
          </div>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5 rounded border-slate-200 dark:border-slate-700" checked={showDrinkingWater} onChange={(e) => setShowDrinkingWater(e.target.checked)} />
              <span className="font-bold">{t.showDrinkingWater}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5 rounded border-slate-200 dark:border-slate-700" checked={showToilets} onChange={(e) => setShowToilets(e.target.checked)} />
              <span className="font-bold">{t.showToilets}</span>
            </label>
          </div>
        </div>
      </section>}

      {activePage === 'impressum' && <section className="flex-1 overflow-y-auto p-4 md:p-8 max-w-3xl mx-auto w-full flex flex-col gap-6">
        <div className="p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm flex flex-col gap-4">
          <h2 className="text-3xl font-bold mb-4">{t.impressumHeading}</h2>
          <article className="prose dark:prose-invert max-w-none">
            <ReactMarkdown>{impressumMd}</ReactMarkdown>
          </article>
        </div>
      </section>}
      </main>
    </div>
  )
}
