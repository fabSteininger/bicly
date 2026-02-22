import PocketBase from 'pocketbase'

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL ?? 'http://localhost:8090')
export const BROUTER_PROXY = import.meta.env.VITE_BROUTER_PROXY ?? 'http://localhost:8090/api/brouter/route'

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
