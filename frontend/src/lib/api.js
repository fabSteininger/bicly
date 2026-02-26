export const BROUTER_DIRECT_URL = import.meta.env.VITE_BROUTER_DIRECT_URL ?? 'https://brouter.de/brouter'

export const fetchBrouterRoute = async ({ profile, points, signal }) => {
  const isCustom = profile && (profile.includes('\n') || profile.includes('{'))

  if (isCustom) {
    const params = new URLSearchParams()
    params.set('lonlats', points)
    params.set('alternativeidx', '0')
    params.set('format', 'gpx')
    // For custom profiles, we POST the profile content
    const res = await fetch(`${BROUTER_DIRECT_URL}?${params.toString()}`, {
      method: 'POST',
      body: profile,
      signal,
    })
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(errorText || `BRouter custom profile request failed (${res.status})`)
    }
    return res.text()
  }

  const params = new URLSearchParams()
  params.set('lonlats', points)
  params.set('profile', profile || 'trekking')
  params.set('alternativeidx', '0')
  params.set('format', 'gpx')

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
  { id: 'trekking', name: 'Trekking', value: 'trekking' },
  { id: 'fastbike', name: 'Fastbike', value: 'fastbike' },
  { id: 'moped', name: 'Moped', value: 'moped' },
  { id: 'car-test', name: 'Car (test)', value: 'car-test' },
  { id: 'vm-forum-liegerad-schnell', name: 'Liegerad (schnell)', value: 'vm-forum-liegerad-schnell' },
]

export const loadProfiles = async () => ROUTING_PROFILES
