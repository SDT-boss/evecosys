export type UserRole = 'manager' | 'board' | 'driver' | 'platform_admin'

export type Theme = 'light' | 'dark'

export interface AppUser {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  force_password_reset_at?: string
  created_at: string
}

export interface Vehicle {
  id: string
  brand: string
  model: string
  plate_no: string
  soc: number
  soh: number
  status: 'Moving' | 'Parked' | 'Charging' | 'Maintenance'
  location_name: string
  location_detail: string
  coordinates: string
  odometer: number
  year: number
  color?: string
  created_at: string
}

export interface Driver {
  id: string
  user_id: string
  assigned_vehicle_id?: string
  license_no: string
  phone: string
  joined_at: string
  user?: AppUser
  vehicle?: Vehicle
}

export interface Trip {
  id: string
  vehicle_id: string
  driver_id: string
  origin: string
  destination: string
  distance_km: number
  energy_kwh: number
  duration_min: number
  avg_speed: number
  started_at: string
  ended_at: string
  vehicle?: Vehicle
  driver?: Driver
}

export interface Alert {
  id: string
  vehicle_id: string
  type: 'low_battery' | 'maintenance' | 'charge_complete' | 'geofence' | 'speeding'
  message: string
  resolved: boolean
  resolved_by?: string | null
  resolved_at?: string | null
  created_at: string
  vehicle?: Vehicle
}

export interface ChargingStation {
  id: string
  name: string
  address: string
  coordinates: string
  connector_type: string
  power_kw: number
  is_active: boolean
  installed_at: string
}

export interface UserPreference {
  id: string
  user_id: string
  theme: Theme
}
