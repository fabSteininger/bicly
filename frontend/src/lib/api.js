import PocketBase from 'pocketbase'

const rawPbUrl = import.meta.env.VITE_POCKETBASE_URL ?? ''
const normalizedPbUrl = rawPbUrl.replace(/\/+$/, '').replace(/\/api$/, '')

// Keep PocketBase root as same-origin by default so SDK requests go to /api/*
export const pb = new PocketBase(normalizedPbUrl)
export const BROUTER_PROXY = import.meta.env.VITE_BROUTER_PROXY ?? '/api/brouter/route'
export const BROUTER_MODE = import.meta.env.VITE_BROUTER_MODE ?? 'proxy'
export const BROUTER_DIRECT_URL = import.meta.env.VITE_BROUTER_DIRECT_URL ?? 'https://brouter.de/brouter'

export const buildBrouterRouteUrl = ({ profile, points }) => {
  const params = new URLSearchParams()

  if (BROUTER_MODE === 'direct') {
    params.set('lonlats', points)
    params.set('profile', profile || 'trekking')
    params.set('alternativeidx', '0')
    params.set('format', 'gpx')
    return `${BROUTER_DIRECT_URL}?${params.toString()}`
  }

  params.set('profile', profile || 'trekking')
  params.set('points', points)
  return `${BROUTER_PROXY}?${params.toString()}`
}

export const authenticate = async (email, password) => {
  return pb.collection('users').authWithPassword(email, password)
}

export const register = async (payload) => {
  return pb.collection('users').create(payload)
}

export const loadProfiles = async () => {
  try {
    const rows = await pb.collection('routing_profiles').getFullList({ sort: 'name' })
    if (rows.length) return rows
  } catch (_) {
    // Fall back to defaults when unauthenticated or when collection is not seeded.
  }

  return [
    { slug: 'trekking', name: 'Trekking', brouter_profile_id: 'trekking' },
    { slug: 'fastbike', name: 'Fast Bike', brouter_profile_id: 'fastbike' },
    { slug: 'shortest', name: 'Shortest', brouter_profile_id: 'shortest' },
  ]
}
