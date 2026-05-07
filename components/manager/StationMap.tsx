'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import type { ChargingStation } from '@/types'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
})

const MALAYSIA_CENTER: [number, number] = [3.139, 101.6869]

function parseCoords(coords: string): [number, number] | null {
  const parts = coords.split(',').map(Number)
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return [parts[0], parts[1]]
  }
  return null
}

export default function StationMap({ stations }: { stations: ChargingStation[] }) {
  return (
    <MapContainer
      center={MALAYSIA_CENTER}
      zoom={6}
      style={{ height: '400px', width: '100%', borderRadius: '12px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {stations.map(s => {
        const pos = parseCoords(s.coordinates)
        if (!pos) return null
        return (
          <Marker key={s.id} position={pos}>
            <Popup>
              <strong>{s.name}</strong>
              <br />
              {s.address}
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
