export const BROUTER_DIRECT_URL = import.meta.env.VITE_BROUTER_DIRECT_URL ?? 'https://brouter.de/brouter'

export const buildBrouterRouteUrl = ({ profile, points }) => {
  const params = new URLSearchParams()
  params.set('lonlats', points)
  params.set('profile', profile || 'trekking')
  params.set('alternativeidx', '0')
  params.set('format', 'gpx')
  return `${BROUTER_DIRECT_URL}?${params.toString()}`
}

export const loadProfiles = async () => [
  { slug: 'trekking', name: 'Trekking', brouter_profile_id: 'trekking' },
  { slug: 'fastbike', name: 'Fast Bike', brouter_profile_id: 'fastbike' },
  { slug: 'shortest', name: 'Shortest', brouter_profile_id: 'shortest' },
]
