import PocketBase from 'pocketbase'

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL ?? 'http://localhost:8090')
export const BROUTER_PROXY = import.meta.env.VITE_BROUTER_PROXY ?? 'http://localhost:8090/api/brouter/route'
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
  const rows = await pb.collection('routing_profiles').getFullList({ sort: 'name' })
  if (!rows.length) {
    return [{ slug: 'trekking', name: 'Trekking', brouter_profile_id: 'trekking' }]
  }
  return rows
}
