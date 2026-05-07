'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
})

const MALAYSIA_CENTER: [number, number] = [3.139, 101.6869]

interface PickedPosition {
  lat: number
  lng: number
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function DraggableMarker({
  position,
  onPick,
}: {
  position: PickedPosition
  onPick: (lat: number, lng: number) => void
}) {
  const markerRef = useRef<L.Marker>(null)

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current
        if (marker) {
          const { lat, lng } = marker.getLatLng()
          onPick(lat, lng)
        }
      },
    }),
    [onPick],
  )

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={[position.lat, position.lng]}
      ref={markerRef}
    />
  )
}

export default function StationPickerMap({
  picked,
  onPick,
}: {
  picked: PickedPosition | null
  onPick: (lat: number, lng: number) => void
}) {
  return (
    <MapContainer
      center={MALAYSIA_CENTER}
      zoom={6}
      style={{ height: '280px', width: '100%', borderRadius: '8px', cursor: 'crosshair' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={onPick} />
      {picked && <DraggableMarker position={picked} onPick={onPick} />}
    </MapContainer>
  )
}
