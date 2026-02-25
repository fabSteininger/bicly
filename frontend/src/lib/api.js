export const BROUTER_DIRECT_URL = import.meta.env.VITE_BROUTER_DIRECT_URL ?? 'https://brouter.de/brouter'

export const fetchBrouterRoute = async ({ profile, points, avoidFerries, signal }) => {
  const isCustom = profile && (profile.includes('\n') || profile.includes('{'))

  if (isCustom) {
    const params = new URLSearchParams()
    params.set('lonlats', points)
    params.set('alternativeidx', '0')
    params.set('format', 'gpx')
    if (avoidFerries) {
      params.set('avoid_ferries', '1')
      params.set('vo', 'avoid_ferries=1')
    }

    // For custom profiles, we POST the profile content
    const res = await fetch(`${BROUTER_DIRECT_URL}?${params.toString()}`, {
      method: 'POST',
      body: profile,
      signal,
    })
    if (!res.ok) throw new Error('BRouter custom profile request failed')
    return res.text()
  }

  const params = new URLSearchParams()
  params.set('lonlats', points)
  params.set('profile', profile || 'trekking')
  params.set('alternativeidx', '0')
  params.set('format', 'gpx')
  if (avoidFerries) {
    params.set('avoid_ferries', '1')
    params.set('vo', 'avoid_ferries=1')
  }

  const res = await fetch(`${BROUTER_DIRECT_URL}?${params.toString()}`, { signal })
  if (!res.ok) throw new Error('BRouter request failed')
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
  { id: 'mtb', name: 'MTB', value: 'mtb' },
  { id: 'shortest', name: 'Shortest', value: 'shortest' },
  { id: 'hiking-mountain', name: 'Hiking', value: 'hiking-mountain' },
  { id: 'vm-forum_liegerad_schnell', name: 'Liegerad (schnell)', value: 'vm-forum_liegerad_schnell' },
]

export const loadProfiles = async () => ROUTING_PROFILES
