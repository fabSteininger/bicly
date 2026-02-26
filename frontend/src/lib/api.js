export const BROUTER_DIRECT_URL = import.meta.env.VITE_BROUTER_DIRECT_URL ?? 'https://brouter.de/brouter'

export const fetchBrouterRoute = async ({ profile, points, signal, totalMass }) => {
  const params = new URLSearchParams()
  params.set('lonlats', points)
  params.set('alternativeidx', '0')
  params.set('format', 'gpx')
  params.set('profile', profile || 'trekking')
  if (totalMass) {
    params.set('totalmass', totalMass.toString())
  }

  const res = await fetch(`${BROUTER_DIRECT_URL}?${params.toString()}`, { signal })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(errorText || `BRouter request failed (${res.status})`)
  }
  return res.text()
}

export const buildBrouterRouteUrl = ({ profile, points }) => {
  const params = new URLSearchParams()
  params.set('lonlats', points)
  params.set('profile', profile || 'trekking')
  params.set('alternativeidx', '0')
  params.set('format', 'gpx')
  return `${BROUTER_DIRECT_URL}?${params.toString()}`
}

export const ROUTING_PROFILES = [
  { id: 'trekking', name: 'trekking' },
  { id: 'trekking-noferries', name: 'trekking-noferries' },
  { id: 'fastbike', name: 'fastbike' },
  { id: 'vm-forum-liegerad-schnell', name: 'vm-forum-liegerad-schnell' },
]

export const loadProfiles = async () => {
  return ROUTING_PROFILES
}
