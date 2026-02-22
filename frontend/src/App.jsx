import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import WaypointList from './components/WaypointList'
import { buildBrouterRouteUrl, loadProfiles, pb } from './lib/api'

const mapStyle = 'https://tiles.openfreemap.org/styles/liberty'
const ROUTE_SOURCE_ID = 'generated-route-source'
const ROUTE_LAYER_ID = 'generated-route-layer'

const gpxFromText = (text) => new Blob([text], { type: 'application/gpx+xml' })

const TEXT = {
  en: {
    appTitle: 'Bicly',
    appSub: 'Plan routes, save GPX, and share rides with friends.',
    planner: 'Planner',
    library: 'Library',
    account: 'Account',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    language: 'Language',
    email: 'Email',
    password: 'Password',
    name: 'Name',
    createAccount: 'Create account',
    loggedIn: 'Logged in',
    accountCreated: 'Account created',
    loggedOut: 'Logged out',
    profile: 'Routing profile',
    title: 'Route title',
    clearPins: 'Clear pins',
    saveGenerated: 'Save generated GPX',
    uploadGpx: 'Upload GPX',
    picturesForRoute: 'Pictures for this route',
    imagesSelected: 'image(s) selected',
    routeReady: 'Route generated and shown on map.',
    addPinsHint: 'Click on the map to add pins. Drag and reorder on the left.',
    useLocationStart: 'Use my location as start',
    addMyLocation: 'Add my location point',
    setHomeFromLocation: 'Set home from my location',
    addHomePoint: 'Add home point',
    homeSaved: 'Home saved',
    locationUnavailable: 'Location unavailable',
    uploadSection: 'Upload route',
    uploadRouteTitle: 'Route title (optional)',
    uploadPicturesLabel: 'Pictures for uploaded GPX',
    uploadRouteButton: 'Upload route to library',
    myRoutes: 'My saved routes',
    sharedRoutes: 'Shared with me',
    noSaved: 'No saved routes yet.',
    noShared: 'No shared routes yet.',
    openGpx: 'Open GPX',
    owner: 'Owner',
    addPictures: 'Add pictures',
    shareAll: 'Share with all friends',
    shareSelected: 'Share selected',
    shareWithFriends: 'Share with selected friends:',
    loginToView: 'Please login to see your saved and shared routes.',
    accountHeading: 'Your account',
    accountHint: 'Use this page for login or registration.',
    plannerHeading: 'Route planner',
    libraryHeading: 'Route library',
    statusSaved: 'Route saved',
    statusUploaded: 'File uploaded',
    statusPictures: 'Pictures added',
    statusShared: 'Shared with selected friends',
    menu: 'Menu',
    showPlanner: 'Show planner',
    hidePlanner: 'Hide planner',
    findPlace: 'Find place',
    placeSearchPlaceholder: 'Search city, street, or POI',
    noPlacesFound: 'No places found',
    searchingPlaces: 'Searching...',
  },
  de: {
    appTitle: 'Bicly',
    appSub: 'Plane Routen, speichere GPX und teile Fahrten mit Freunden.',
    planner: 'Planer',
    library: 'Bibliothek',
    account: 'Konto',
    login: 'Anmelden',
    register: 'Registrieren',
    logout: 'Abmelden',
    language: 'Sprache',
    email: 'E-Mail',
    password: 'Passwort',
    name: 'Name',
    createAccount: 'Konto erstellen',
    loggedIn: 'Angemeldet',
    accountCreated: 'Konto erstellt',
    loggedOut: 'Abgemeldet',
    profile: 'Routing-Profil',
    title: 'Routentitel',
    clearPins: 'Pins löschen',
    saveGenerated: 'Generierte GPX speichern',
    uploadGpx: 'GPX hochladen',
    picturesForRoute: 'Bilder für diese Route',
    imagesSelected: 'Bild(er) ausgewählt',
    routeReady: 'Route erzeugt und auf der Karte angezeigt.',
    addPinsHint: 'Klicke auf die Karte, um Pins hinzuzufügen. Links kannst du sie sortieren.',
    useLocationStart: 'Meinen Standort als Start nutzen',
    addMyLocation: 'Meinen Standort als Punkt hinzufügen',
    setHomeFromLocation: 'Zuhause aus Standort setzen',
    addHomePoint: 'Zuhause als Punkt hinzufügen',
    homeSaved: 'Zuhause gespeichert',
    locationUnavailable: 'Standort nicht verfügbar',
    uploadSection: 'Route hochladen',
    uploadRouteTitle: 'Routentitel (optional)',
    uploadPicturesLabel: 'Bilder für hochgeladene GPX',
    uploadRouteButton: 'Route in Bibliothek hochladen',
    myRoutes: 'Meine gespeicherten Routen',
    sharedRoutes: 'Mit mir geteilt',
    noSaved: 'Noch keine gespeicherten Routen.',
    noShared: 'Noch keine geteilten Routen.',
    openGpx: 'GPX öffnen',
    owner: 'Eigentümer',
    addPictures: 'Bilder hinzufügen',
    shareAll: 'Mit allen Freunden teilen',
    shareSelected: 'Ausgewählte teilen',
    shareWithFriends: 'Mit ausgewählten Freunden teilen:',
    loginToView: 'Bitte anmelden, um gespeicherte und geteilte Routen zu sehen.',
    accountHeading: 'Dein Konto',
    accountHint: 'Auf dieser Seite kannst du dich anmelden oder registrieren.',
    plannerHeading: 'Routenplaner',
    libraryHeading: 'Routenbibliothek',
    statusSaved: 'Route gespeichert',
    statusUploaded: 'Datei hochgeladen',
    statusPictures: 'Bilder hinzugefügt',
    statusShared: 'Mit ausgewählten Freunden geteilt',
    menu: 'Menü',
    showPlanner: 'Planer anzeigen',
    hidePlanner: 'Planer ausblenden',
    findPlace: 'Ort suchen',
    placeSearchPlaceholder: 'Stadt, Straße oder POI suchen',
    noPlacesFound: 'Keine Orte gefunden',
    searchingPlaces: 'Suche...',
  },
}

const fileNameOf = (record) => (Array.isArray(record.route_gpx) ? record.route_gpx[0] : record.route_gpx)
const photoNamesOf = (record) => (Array.isArray(record.photos) ? record.photos : [])

const emptyRouteGeoJson = {
  type: 'FeatureCollection',
  features: [],
}

const toErrorMessage = (err, fallback) => {
  const details = err?.response?.data
  if (details && typeof details === 'object') {
    const first = Object.values(details)[0]
    if (first?.message) return first.message
  }
  return err?.message || fallback
}

const usernameFrom = (name, email) => {
  const seed = (name || email?.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')
  const safe = seed.slice(0, 20) || 'user'
  return `${safe}${Date.now().toString(36)}`
}

const parseGpxToGeoJson = (gpxText) => {
  if (!gpxText) return emptyRouteGeoJson

  try {
    const xml = new DOMParser().parseFromString(gpxText, 'application/xml')
    const points = Array.from(xml.querySelectorAll('trkpt'))
      .map((node) => [Number(node.getAttribute('lon')), Number(node.getAttribute('lat'))])
      .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat))

    if (points.length < 2) return emptyRouteGeoJson

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: points },
          properties: {},
        },
      ],
    }
  } catch {
    return emptyRouteGeoJson
  }
}

const ensureRouteLayer = (map) => {
  if (!map.getSource(ROUTE_SOURCE_ID)) {
    map.addSource(ROUTE_SOURCE_ID, {
      type: 'geojson',
      data: emptyRouteGeoJson,
    })
  }

  if (!map.getLayer(ROUTE_LAYER_ID)) {
    map.addLayer({
      id: ROUTE_LAYER_ID,
      type: 'line',
      source: ROUTE_SOURCE_ID,
      paint: {
        'line-color': '#0c5ff4',
        'line-width': 4,
        'line-opacity': 0.9,
      },
    })
  }
}

function RouteCard({ file, isOwner, friends, shareSelection, onToggleFriend, onShare, onToggleShareAll, onAddPictures, t }) {
  const filename = fileNameOf(file)
  const downloadUrl = filename ? pb.files.getURL(file, filename) : ''
  const photos = photoNamesOf(file)

  return (
    <article className="route-card" key={file.id}>
      <div className="route-card-head">
        <strong>{file.title}</strong>
        <small>{t.owner}: {file.expand?.owner?.name || file.expand?.owner?.email || 'Unknown'}</small>
      </div>

      {downloadUrl && (
        <a className="route-link" href={downloadUrl} target="_blank" rel="noreferrer">{t.openGpx}</a>
      )}

      {!!photos.length && (
        <div className="photo-grid">
          {photos.map((name) => (
            <a key={name} href={pb.files.getURL(file, name)} target="_blank" rel="noreferrer">
              <img src={pb.files.getURL(file, name, { thumb: '240x180' })} alt={file.title} loading="lazy" />
            </a>
          ))}
        </div>
      )}

      {isOwner && (
        <>
          <label className="upload compact-upload">
            {t.addPictures}
            <input type="file" accept="image/*" multiple onChange={(event) => onAddPictures(file.id, event)} />
          </label>

          <label className="check-row">
            <input
              type="checkbox"
              checked={!!file.is_shared_to_all_friends}
              onChange={() => onToggleShareAll(file)}
            />
            {t.shareAll}
          </label>

          {!!friends.length && (
            <div className="share-box">
              <p>{t.shareWithFriends}</p>
              {friends.map((friend) => (
                <label key={friend.id} className="check-row">
                  <input
                    type="checkbox"
                    checked={(shareSelection[file.id] ?? []).includes(friend.id)}
                    onChange={() => onToggleFriend(file.id, friend.id)}
                  />
                  {friend.name || friend.email}
                </label>
              ))}
              <button type="button" onClick={() => onShare(file.id)}>{t.shareSelected}</button>
            </div>
          )}
        </>
      )}
    </article>
  )
}

export default function App() {
  const [lang, setLang] = useState('en')
  const t = TEXT[lang]

  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const mapMarkers = useRef([])

  const [activePage, setActivePage] = useState('planner')
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [plannerPanelOpen, setPlannerPanelOpen] = useState(true)

  const [waypoints, setWaypoints] = useState([])
  const [profiles, setProfiles] = useState([])
  const [activeProfile, setActiveProfile] = useState('trekking')
  const [latestGpx, setLatestGpx] = useState('')
  const [routeGeoJson, setRouteGeoJson] = useState(emptyRouteGeoJson)
  const [title, setTitle] = useState('New Route')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadGpxFile, setUploadGpxFile] = useState(null)
  const [uploadPictures, setUploadPictures] = useState([])
  const [userLocation, setUserLocation] = useState(null)
  const [homeLocation, setHomeLocation] = useState(() => {
    try {
      const raw = localStorage.getItem('bicly_home_location')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const [authUser, setAuthUser] = useState(pb.authStore.model)
  const [authMode, setAuthMode] = useState('login')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authInfo, setAuthInfo] = useState('')

  const [savedRoutes, setSavedRoutes] = useState([])
  const [sharedRoutes, setSharedRoutes] = useState([])
  const [friends, setFriends] = useState([])
  const [shareSelection, setShareSelection] = useState({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeResults, setPlaceResults] = useState([])
  const [searchingPlaces, setSearchingPlaces] = useState(false)

  useEffect(() => {
    const unsub = pb.authStore.onChange((_token, model) => setAuthUser(model), true)
    return unsub
  }, [])

  useEffect(() => {
    if (window.innerWidth <= 1080) {
      setPlannerPanelOpen(false)
    }
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lon: position.coords.longitude,
          lat: position.coords.latitude,
        })
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    )
  }, [])

  useEffect(() => {
    if (!homeLocation) {
      localStorage.removeItem('bicly_home_location')
      return
    }
    localStorage.setItem('bicly_home_location', JSON.stringify(homeLocation))
  }, [homeLocation])

  const addWaypoint = (label, lon, lat) => {
    setWaypoints((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: label || `Pin ${prev.length + 1}`,
        lon: Number(lon.toFixed(6)),
        lat: Number(lat.toFixed(6)),
      },
    ])
  }

  const resolveUserLocation = async () => {
    if (userLocation) return userLocation
    if (!navigator.geolocation) throw new Error(t.locationUnavailable)

    const location = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lon: position.coords.longitude, lat: position.coords.latitude }),
        () => reject(new Error(t.locationUnavailable)),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      )
    })

    setUserLocation(location)
    return location
  }

  const useMyLocationAsStart = async () => {
    try {
      const loc = await resolveUserLocation()
      setWaypoints((prev) => {
        const startPoint = {
          id: prev[0]?.id ?? crypto.randomUUID(),
          label: 'Start',
          lon: Number(loc.lon.toFixed(6)),
          lat: Number(loc.lat.toFixed(6)),
        }
        if (!prev.length) return [startPoint]
        return [startPoint, ...prev.slice(1)]
      })
    } catch (err) {
      setMessage(toErrorMessage(err, t.locationUnavailable))
    }
  }

  const addMyLocationPoint = async () => {
    try {
      const loc = await resolveUserLocation()
      addWaypoint('My location', loc.lon, loc.lat)
    } catch (err) {
      setMessage(toErrorMessage(err, t.locationUnavailable))
    }
  }

  const setHomeFromLocation = async () => {
    try {
      const loc = await resolveUserLocation()
      setHomeLocation({ lon: Number(loc.lon.toFixed(6)), lat: Number(loc.lat.toFixed(6)) })
      setMessage(t.homeSaved)
    } catch (err) {
      setMessage(toErrorMessage(err, t.locationUnavailable))
    }
  }

  const addHomeAsPoint = () => {
    if (!homeLocation) return
    addWaypoint('Home', homeLocation.lon, homeLocation.lat)
  }

  useEffect(() => {
    if (activePage !== 'planner' || mapInstance.current || !mapRef.current) return

    mapInstance.current = new maplibregl.Map({
      container: mapRef.current,
      style: mapStyle,
      center: userLocation ? [userLocation.lon, userLocation.lat] : [8.68, 50.11],
      zoom: 10,
    })

    mapInstance.current.addControl(new maplibregl.NavigationControl(), 'top-right')

    mapInstance.current.on('load', () => {
      ensureRouteLayer(mapInstance.current)
    })

    mapInstance.current.on('click', (e) => {
      addWaypoint('', e.lngLat.lng, e.lngLat.lat)
    })

  }, [activePage, userLocation])

  useEffect(() => {
    return () => {
      for (const marker of mapMarkers.current) marker.remove()
      mapMarkers.current = []
      mapInstance.current?.remove()
      mapInstance.current = null
    }
  }, [])

  useEffect(() => {
    if (activePage === 'planner') return
    for (const marker of mapMarkers.current) marker.remove()
    mapMarkers.current = []
    mapInstance.current?.remove()
    mapInstance.current = null
  }, [activePage])

  useEffect(() => {
    if (activePage !== 'planner' || !mapInstance.current) return
    requestAnimationFrame(() => {
      if (!mapInstance.current) return
      mapInstance.current.resize()
      if (!mapInstance.current.isStyleLoaded()) return
      ensureRouteLayer(mapInstance.current)
      const source = mapInstance.current.getSource(ROUTE_SOURCE_ID)
      if (source) source.setData(routeGeoJson)
    })
  }, [activePage, routeGeoJson])

  useEffect(() => {
    if (!userLocation || !mapInstance.current || waypoints.length) return
    mapInstance.current.flyTo({
      center: [userLocation.lon, userLocation.lat],
      zoom: Math.max(mapInstance.current.getZoom(), 12),
      essential: true,
    })
  }, [userLocation, waypoints.length])

  useEffect(() => {
    for (const marker of mapMarkers.current) marker.remove()
    mapMarkers.current = []

    if (!mapInstance.current) return

    waypoints.forEach((point, index) => {
      const element = document.createElement('div')
      element.className = 'waypoint-marker'
      element.textContent = String(index + 1)
      const marker = new maplibregl.Marker({ element }).setLngLat([point.lon, point.lat]).addTo(mapInstance.current)
      mapMarkers.current.push(marker)
    })
  }, [waypoints])

  useEffect(() => {
    if (!mapInstance.current) return

    const map = mapInstance.current
    if (!map.isStyleLoaded()) return

    ensureRouteLayer(map)
    const source = map.getSource(ROUTE_SOURCE_ID)
    if (source) {
      source.setData(routeGeoJson)
    }
  }, [routeGeoJson])

  useEffect(() => {
    let cancelled = false
    loadProfiles().then((value) => {
      if (cancelled) return
      setProfiles(value)
      if (value[0]) setActiveProfile(value[0].brouter_profile_id)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const loadUserData = async () => {
    if (!pb.authStore.model?.id) {
      setSavedRoutes([])
      setSharedRoutes([])
      setFriends([])
      return
    }

    try {
      const myId = pb.authStore.model.id
      const me = await pb.collection('users').getOne(myId, { expand: 'friends' })
      setFriends(me.expand?.friends ?? [])

      const own = await pb.collection('route_files').getFullList({
        filter: `owner = "${myId}"`,
        expand: 'owner',
      })

      const shares = await pb.collection('file_shares').getFullList({
        filter: `shared_with = "${myId}"`,
        expand: 'route_file,route_file.owner',
      })

      const sharedMap = new Map()
      for (const row of shares) {
        const route = row.expand?.route_file
        if (!route || route.owner === myId || sharedMap.has(route.id)) continue
        sharedMap.set(route.id, {
          ...route,
          expand: {
            ...(route.expand ?? {}),
            owner: row.expand?.['route_file.owner'] ?? route.expand?.owner,
          },
        })
      }

      setSavedRoutes(own)
      setSharedRoutes(Array.from(sharedMap.values()))
    } catch (err) {
      if (err?.status === 404 || err?.response?.code === 404 || err?.status === 401) {
        pb.authStore.clear()
        setSavedRoutes([])
        setSharedRoutes([])
        setFriends([])
        return
      }
      setMessage(toErrorMessage(err, 'Failed to load user data'))
    }
  }

  useEffect(() => {
    loadUserData()
  }, [authUser])

  const brouterPoints = useMemo(() => waypoints.map((p) => `${p.lon},${p.lat}`).join('|'), [waypoints])

  useEffect(() => {
    if (waypoints.length < 2) {
      setLatestGpx('')
      setRouteGeoJson(emptyRouteGeoJson)
      return
    }

    const controller = new AbortController()
    fetch(buildBrouterRouteUrl({ profile: activeProfile, points: brouterPoints }), { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('BRouter request failed')
        return r.text()
      })
      .then((text) => {
        setLatestGpx(text)
        setRouteGeoJson(parseGpxToGeoJson(text))
      })
      .catch(() => {})

    return () => controller.abort()
  }, [brouterPoints, activeProfile, waypoints.length])

  useEffect(() => {
    const query = placeQuery.trim()
    if (query.length < 3) {
      setPlaceResults([])
      setSearchingPlaces(false)
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(() => {
      setSearchingPlaces(true)
      const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        addressdetails: '1',
        limit: '6',
      })

      fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        signal: controller.signal,
        headers: {
          'Accept-Language': lang === 'de' ? 'de,en' : 'en,de',
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error('place search failed')
          return res.json()
        })
        .then((rows) => {
          const normalized = Array.isArray(rows)
            ? rows
              .filter((row) => Number.isFinite(Number(row.lon)) && Number.isFinite(Number(row.lat)))
              .map((row) => ({
                id: `${row.place_id}`,
                label: row.display_name,
                lon: Number(row.lon),
                lat: Number(row.lat),
              }))
            : []
          setPlaceResults(normalized)
        })
        .catch(() => {
          setPlaceResults([])
        })
        .finally(() => setSearchingPlaces(false))
    }, 280)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [placeQuery, lang])

  const addPlaceToMap = (place) => {
    addWaypoint(place.label, place.lon, place.lat)
    setPlaceQuery('')
    setPlaceResults([])
    if (mapInstance.current) {
      mapInstance.current.flyTo({
        center: [place.lon, place.lat],
        zoom: Math.max(mapInstance.current.getZoom(), 13),
        essential: true,
      })
    }
  }

  const login = async (event) => {
    event.preventDefault()
    setAuthError('')
    setAuthInfo('')
    try {
      await pb.collection('users').authWithPassword(authEmail.trim(), authPassword)
      setAuthInfo(t.loggedIn)
      setAuthPassword('')
      setAuthEmail('')
    } catch (err) {
      setAuthError(toErrorMessage(err, 'Login failed'))
    }
  }

  const signup = async (event) => {
    event.preventDefault()
    setAuthError('')
    setAuthInfo('')

    try {
      const email = authEmail.trim().toLowerCase()
      await pb.collection('users').create({
        username: usernameFrom(authName, email),
        name: authName.trim(),
        email,
        emailVisibility: true,
        password: authPassword,
        passwordConfirm: authPassword,
      })
      await pb.collection('users').authWithPassword(email, authPassword)
      setAuthInfo(t.accountCreated)
      setAuthPassword('')
      setAuthEmail('')
      setAuthName('')
    } catch (err) {
      setAuthError(toErrorMessage(err, 'Registration failed'))
    }
  }

  const logout = () => {
    pb.authStore.clear()
    setAuthInfo(t.loggedOut)
    setAccountMenuOpen(false)
  }

  const appendPicturesToFormData = (formData, pictures, fieldName = 'photos') => {
    for (const image of pictures) formData.append(fieldName, image)
  }

  const saveGeneratedRoute = async () => {
    if (!latestGpx || !pb.authStore.model?.id) return
    setBusy(true)
    setMessage('')

    try {
      const normalizedTitle = title.trim()
      const formData = new FormData()
      formData.append('title', normalizedTitle)
      formData.append('owner', pb.authStore.model.id)
      formData.append('is_shared_to_all_friends', 'false')
      formData.append('route_gpx', gpxFromText(latestGpx), `${normalizedTitle}.gpx`)

      await pb.collection('route_files').create(formData)
      await loadUserData()
      setMessage(t.statusSaved)
    } catch (err) {
      setMessage(toErrorMessage(err, 'Failed to save route'))
    } finally {
      setBusy(false)
    }
  }

  const uploadGpx = async () => {
    const file = uploadGpxFile
    if (!file || !pb.authStore.model?.id) return
    setBusy(true)
    setMessage('')
    try {
      const normalizedTitle = (uploadTitle || file.name.replace('.gpx', '')).trim()
      const formData = new FormData()
      formData.append('title', normalizedTitle)
      formData.append('owner', pb.authStore.model.id)
      formData.append('route_gpx', file)
      formData.append('is_shared_to_all_friends', 'false')
      appendPicturesToFormData(formData, uploadPictures)

      await pb.collection('route_files').create(formData)
      setUploadGpxFile(null)
      setUploadPictures([])
      setUploadTitle('')
      await loadUserData()
      setMessage(t.statusUploaded)
    } catch (err) {
      setMessage(toErrorMessage(err, 'Upload failed'))
    } finally {
      setBusy(false)
    }
  }

  const addPicturesToRoute = async (routeId, event) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    try {
      const formData = new FormData()
      for (const file of files) formData.append('photos+', file)
      await pb.collection('route_files').update(routeId, formData)
      await loadUserData()
      setMessage(t.statusPictures)
    } catch (err) {
      setMessage(toErrorMessage(err, 'Failed to add pictures'))
    } finally {
      event.target.value = ''
    }
  }

  const toggleShareToAll = async (record) => {
    if (record.owner !== pb.authStore.model?.id) return
    try {
      await pb.collection('route_files').update(record.id, {
        is_shared_to_all_friends: !record.is_shared_to_all_friends,
      })
      await loadUserData()
    } catch (err) {
      setMessage(toErrorMessage(err, 'Failed to update sharing'))
    }
  }

  const toggleFriendSelection = (routeId, friendId) => {
    setShareSelection((prev) => {
      const current = new Set(prev[routeId] ?? [])
      if (current.has(friendId)) current.delete(friendId)
      else current.add(friendId)
      return { ...prev, [routeId]: Array.from(current) }
    })
  }

  const shareWithSelectedFriends = async (routeId) => {
    const friendIds = shareSelection[routeId] ?? []
    if (!friendIds.length) return

    try {
      await pb.send(`/api/route-files/${routeId}/share-friends`, {
        method: 'POST',
        body: { friendIds: friendIds.join(',') },
      })
      setMessage(t.statusShared)
    } catch (err) {
      setMessage(toErrorMessage(err, 'Failed to share route'))
    }
  }

  const gotoPage = (page) => {
    setActivePage(page)
    setAccountMenuOpen(false)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>{t.appTitle}</h1>
          <p>{t.appSub}</p>
        </div>

        <div className="topbar-controls">
          <button type="button" onClick={() => setAccountMenuOpen((value) => !value)}>{t.menu}</button>
          {accountMenuOpen && (
            <div className="account-menu">
              <button type="button" onClick={() => gotoPage('planner')}>{t.planner}</button>
              <button type="button" onClick={() => gotoPage('library')}>{t.library}</button>
              <button type="button" onClick={() => gotoPage('account')}>{t.account}</button>
              <label>
                {t.language}
                <select value={lang} onChange={(e) => setLang(e.target.value)}>
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                </select>
              </label>
              {authUser && <button type="button" onClick={logout}>{t.logout}</button>}
            </div>
          )}
        </div>
      </header>

      {authError && <p className="status error">{authError}</p>}
      {authInfo && <p className="status info">{authInfo}</p>}
      {message && <p className="status info">{message}</p>}

      {activePage === 'planner' && (
        <section className={`planner-layout ${plannerPanelOpen ? '' : 'panel-collapsed'}`}>
          <button className="mobile-planner-toggle" type="button" onClick={() => setPlannerPanelOpen((value) => !value)}>
            {plannerPanelOpen ? t.hidePlanner : t.showPlanner}
          </button>

          <aside className="panel planner-panel">
            <div className="planner-panel-head">
              <h2>{t.plannerHeading}</h2>
              <button className="planner-mobile-close" type="button" onClick={() => setPlannerPanelOpen(false)}>X</button>
            </div>
            <p>{t.addPinsHint}</p>

            <label>{t.profile}</label>
            <select value={activeProfile} onChange={(e) => setActiveProfile(e.target.value)}>
              {profiles.map((profile) => (
                <option key={profile.slug} value={profile.brouter_profile_id}>{profile.name}</option>
              ))}
            </select>

            <label>{t.title}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />

            <label>{t.findPlace}</label>
            <input
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              placeholder={t.placeSearchPlaceholder}
            />
            {(searchingPlaces || placeResults.length > 0 || (placeQuery.trim().length >= 3 && !placeResults.length)) && (
              <div className="place-results">
                {searchingPlaces && <small>{t.searchingPlaces}</small>}
                {!searchingPlaces && !placeResults.length && <small>{t.noPlacesFound}</small>}
                {!searchingPlaces && placeResults.map((place) => (
                  <button key={place.id} type="button" className="place-result" onClick={() => addPlaceToMap(place)}>
                    {place.label}
                  </button>
                ))}
              </div>
            )}

            <div className="quick-actions">
              <button type="button" onClick={useMyLocationAsStart}>{t.useLocationStart}</button>
              <button type="button" onClick={addMyLocationPoint}>{t.addMyLocation}</button>
              <button type="button" onClick={setHomeFromLocation}>{t.setHomeFromLocation}</button>
              <button type="button" onClick={addHomeAsPoint} disabled={!homeLocation}>{t.addHomePoint}</button>
            </div>

            <WaypointList waypoints={waypoints} setWaypoints={setWaypoints} />
            <button type="button" onClick={() => setWaypoints([])}>{t.clearPins}</button>

            <button onClick={saveGeneratedRoute} disabled={!latestGpx || !authUser || busy}>{t.saveGenerated}</button>

            {latestGpx && <p className="status info inline">{t.routeReady}</p>}
          </aside>

          <section ref={mapRef} className="map" />
        </section>
      )}

      {activePage === 'library' && (
        <section className="library-page">
          <h2>{t.libraryHeading}</h2>
          {!authUser && <p>{t.loginToView}</p>}
          {authUser && (
            <>
              <div className="panel upload-panel">
                <h3>{t.uploadSection}</h3>
                <label>{t.uploadRouteTitle}</label>
                <input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} />
                <label className="upload">
                  {t.uploadGpx}
                  <input
                    type="file"
                    accept=".gpx,application/gpx+xml"
                    onChange={(event) => setUploadGpxFile(event.target.files?.[0] ?? null)}
                    disabled={busy}
                  />
                </label>
                <label className="upload">
                  {t.uploadPicturesLabel}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => setUploadPictures(Array.from(event.target.files ?? []))}
                    disabled={busy}
                  />
                </label>
                {!!uploadPictures.length && <small>{uploadPictures.length} {t.imagesSelected}</small>}
                <button type="button" onClick={uploadGpx} disabled={!uploadGpxFile || busy}>{t.uploadRouteButton}</button>
              </div>

              <div className="library-grid">
                <div className="panel">
                  <h3>{t.myRoutes}</h3>
                  {!savedRoutes.length && <p>{t.noSaved}</p>}
                  {savedRoutes.map((file) => (
                    <RouteCard
                      key={file.id}
                      file={file}
                      isOwner
                      friends={friends}
                      shareSelection={shareSelection}
                      onToggleFriend={toggleFriendSelection}
                      onShare={shareWithSelectedFriends}
                      onToggleShareAll={toggleShareToAll}
                      onAddPictures={addPicturesToRoute}
                      t={t}
                    />
                  ))}
                </div>

                <div className="panel">
                  <h3>{t.sharedRoutes}</h3>
                  {!sharedRoutes.length && <p>{t.noShared}</p>}
                  {sharedRoutes.map((file) => (
                    <RouteCard
                      key={file.id}
                      file={file}
                      isOwner={false}
                      friends={friends}
                      shareSelection={shareSelection}
                      onToggleFriend={toggleFriendSelection}
                      onShare={shareWithSelectedFriends}
                      onToggleShareAll={toggleShareToAll}
                      onAddPictures={addPicturesToRoute}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {activePage === 'account' && (
        <section className="auth-page">
          <div className="auth-panel">
            <h2>{t.accountHeading}</h2>
            <p>{t.accountHint}</p>

            {!authUser && (
              <>
                <div className="auth-tabs">
                  <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>{t.login}</button>
                  <button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>{t.register}</button>
                </div>

                <form className="auth-form" onSubmit={authMode === 'login' ? login : signup}>
                  {authMode === 'register' && (
                    <>
                      <label>{t.name}</label>
                      <input value={authName} onChange={(e) => setAuthName(e.target.value)} required />
                    </>
                  )}

                  <label>{t.email}</label>
                  <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required />
                  <label>{t.password}</label>
                  <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required />

                  <button type="submit">{authMode === 'login' ? t.login : t.createAccount}</button>
                </form>
              </>
            )}

            {authUser && (
              <div className="user-card">
                <strong>{authUser.name || authUser.email}</strong>
                <small>{authUser.email}</small>
                <button type="button" onClick={logout}>{t.logout}</button>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  )
}
