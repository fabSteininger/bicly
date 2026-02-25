export const BROUTER_DIRECT_URL = import.meta.env.VITE_BROUTER_DIRECT_URL ?? 'https://brouter.de/brouter'

export const fetchBrouterRoute = async ({ profile, points, customProfileContent, signal }) => {
  const params = new URLSearchParams()
  params.set('lonlats', points)
  params.set('alternativeidx', '0')
  params.set('format', 'gpx')

  let profileToUse = profile || 'trekking'

  if (customProfileContent) {
    // 1. Upload custom profile to get a temporary profile ID
    const uploadUrl = `${BROUTER_DIRECT_URL}/profile`
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
      },
      body: customProfileContent,
      signal,
    })

    if (!uploadRes.ok) {
      throw new Error(`Profile upload failed: ${uploadRes.status}`)
    }

    const uploadData = await uploadRes.json()
    if (uploadData.profileid) {
      profileToUse = uploadData.profileid
    } else {
      throw new Error(`Failed to get profile ID: ${uploadData.error || 'Unknown error'}`)
    }
  }

  // 2. Request route using the profile ID
  params.set('profile', profileToUse)
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
  { id: 'moped', name: 'Moped', value: 'moped' },
  { id: 'car-test', name: 'Car (test)', value: 'car-test' },
  { id: 'vm-forum_liegerad_schnell', name: 'Liegerad (schnell)', value: 'vm-forum_liegerad_schnell' },
]

export const loadProfiles = async () => ROUTING_PROFILES
