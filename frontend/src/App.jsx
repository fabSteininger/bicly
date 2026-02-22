import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import WaypointList from './components/WaypointList'
import { BROUTER_PROXY, loadProfiles, pb } from './lib/api'

const mapStyle = 'https://tiles.openfreemap.org/styles/liberty'

const gpxFromText = (text) => new Blob([text], { type: 'application/gpx+xml' })

export default function App() {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const [waypoints, setWaypoints] = useState([])
  const [profiles, setProfiles] = useState([])
  const [activeProfile, setActiveProfile] = useState('trekking')
  const [latestGpx, setLatestGpx] = useState('')
  const [title, setTitle] = useState('New Route')

  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return

    mapInstance.current = new maplibregl.Map({
      container: mapRef.current,
      style: mapStyle,
      center: [8.68, 50.11],
      zoom: 10,
    })

    mapInstance.current.on('click', (e) => {
      setWaypoints((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          label: `Pin ${prev.length + 1}`,
          lon: Number(e.lngLat.lng.toFixed(6)),
          lat: Number(e.lngLat.lat.toFixed(6)),
        },
      ])
    })
  }, [])

  useEffect(() => {
    loadProfiles().then((value) => {
      setProfiles(value)
      if (value[0]) setActiveProfile(value[0].brouter_profile_id)
    })
  }, [])

  const brouterPoints = useMemo(() => waypoints.map((p) => `${p.lon},${p.lat}`).join('|'), [waypoints])

  useEffect(() => {
    if (waypoints.length < 2) return

    const controller = new AbortController()
    fetch(`${BROUTER_PROXY}?profile=${activeProfile}&points=${encodeURIComponent(brouterPoints)}`, { signal: controller.signal })
      .then((r) => r.text())
      .then((text) => setLatestGpx(text))
      .catch(() => {})

    return () => controller.abort()
  }, [brouterPoints, activeProfile, waypoints.length])

  const saveGeneratedRoute = async () => {
    if (!latestGpx) return
    const formData = new FormData()
    formData.append('title', title)
    formData.append('owner', pb.authStore.model?.id)
    formData.append('is_shared_to_all_friends', 'false')
    formData.append('route_gpx', gpxFromText(latestGpx), `${title}.gpx`)
    await pb.collection('route_files').create(formData)
  }

  const uploadGpx = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('title', file.name.replace('.gpx', ''))
    formData.append('owner', pb.authStore.model?.id)
    formData.append('route_gpx', file)
    formData.append('is_shared_to_all_friends', 'false')
    await pb.collection('route_files').create(formData)
  }

  return (
    <main className="layout">
      <section className="panel">
        <h1>Bicly Planner</h1>
        <p>Click on the map to add pins, drag to reorder, and GPX is regenerated automatically.</p>

        <label>Profile</label>
        <select value={activeProfile} onChange={(e) => setActiveProfile(e.target.value)}>
          {profiles.map((profile) => (
            <option key={profile.slug} value={profile.brouter_profile_id}>{profile.name}</option>
          ))}
        </select>

        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />

        <WaypointList waypoints={waypoints} setWaypoints={setWaypoints} />

        <button onClick={saveGeneratedRoute} disabled={!latestGpx}>Save generated GPX</button>
        <label className="upload">
          Upload GPX
          <input type="file" accept=".gpx,application/gpx+xml" onChange={uploadGpx} />
        </label>
      </section>
      <section ref={mapRef} className="map" />
    </main>
  )
}
