export const BROUTER_DIRECT_URL = import.meta.env.VITE_BROUTER_DIRECT_URL ?? 'https://brouter.de/brouter'

const getBrouterBaseUrl = () => {
  return BROUTER_DIRECT_URL.replace(/\/brouter\/?$/, '')
}

export const fetchBrouterRoute = async ({ profile, points, signal, engineMode, roundTripDistance, direction, roundTripPoints }) => {
  const isCustom = profile && (profile.includes('\n') || profile.includes('{'))

  const params = new URLSearchParams()
  params.set('lonlats', points)
  params.set('alternativeidx', '0')
  params.set('format', 'gpx')
  if (engineMode) params.set('engineMode', engineMode)
  if (roundTripDistance) params.set('roundTripDistance', roundTripDistance)
  if (direction !== undefined && direction !== null) params.set('direction', direction)
  if (roundTripPoints) params.set('roundTripPoints', roundTripPoints)

  if (isCustom) {
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

  params.set('profile', profile || 'trekking')

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

export const uploadProfile = async (profileContent) => {
  const res = await fetch(`${getBrouterBaseUrl()}/profiles`, {
    method: 'POST',
    body: profileContent,
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(errorText || `Profile upload failed (${res.status})`)
  }
  return res.json()
}

export const loadProfiles = async () => {
  try {
    const res = await fetch(`${getBrouterBaseUrl()}/profiles`)
    if (res.ok) {
      return await res.json()
    }
  } catch (e) {
    console.error('Failed to load profiles from server, using defaults', e)
  }
  return ROUTING_PROFILES
}
