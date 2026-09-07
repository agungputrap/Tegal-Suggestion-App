import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import type { BusinessDto } from '../types/business'

interface BusinessMapProps {
  businesses: BusinessDto[]
}

export function BusinessMap({ businesses }: BusinessMapProps) {
  return (
    <MapContainer
      center={[-6.8682, 109.1355]}
      zoom={13}
      className="h-[480px] w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {businesses.map((business) => (
        <Marker key={business.id} position={[business.lat, business.lng]}>
          <Popup>
            <strong>{business.name}</strong>
            <br />
            {business.subcategory}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
