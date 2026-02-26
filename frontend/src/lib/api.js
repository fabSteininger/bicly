export const BROUTER_DIRECT_URL = '/api/brouter'

export const getBrouterBaseUrl = () => {
  if (BROUTER_DIRECT_URL.endsWith('/brouter')) {
    return BROUTER_DIRECT_URL.slice(0, -'/brouter'.length)
  }
  return BROUTER_DIRECT_URL
}

export const loadProfiles = async () => {
  try {
    const res = await fetch(`${getBrouterBaseUrl()}/profiles`)
    if (!res.ok) return []
    const data = await res.json()
    // data is an object where keys are profile IDs and values are profile names/metadata
    return Object.keys(data).map((id) => ({ id, name: data[id] }))
  } catch {
    return []
  }
}

export const fetchBrouterRoute = async ({ profile, points, signal, mass = 90 }) => {
  const params = new URLSearchParams({
    profile,
    points,
    format: 'gpx',
    trackname: 'Bicly Route',
    export_waypoints: '1',
    totalmass: mass.toString(),
  })

  const res = await fetch(`${BROUTER_DIRECT_URL}?${params.toString()}`, { signal })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(text || `Routing failed with status ${res.status}`)
  }
  return text
}
