import { MapContainer, TileLayer } from 'react-leaflet'
import { Box, LoadingOverlay } from '@mantine/core'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default markers in react-leaflet
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png'

const DefaultIcon = L.icon({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// @ts-ignore
L.Marker.prototype.options.icon = DefaultIcon

import { useMissionStore } from '../../stores/missionStore'
import { LayerControls } from './LayerControls'
import { DropPointsLayer } from './DropPointsLayer'
import { WaypointsLayer } from './WaypointsLayer'
import { PolygonLayer } from './PolygonLayer'

interface MapViewerProps {
  height?: number | string
}

export function MapViewer({ height = 500 }: MapViewerProps) {
  const { currentMission, mapCenter, mapZoom, selectedLayers, tileLayer, isLoading } = useMissionStore()

  // Default center (Budapest, Hungary - close to the sample data)
  const defaultCenter: [number, number] = [46.3314, 21.0679]
  const center = mapCenter || defaultCenter
  const zoom = mapCenter ? mapZoom : 6

  if (!currentMission) {
    return (
      <Box 
        h={height} 
        style={{ 
          border: '1px solid var(--mantine-color-gray-3)',
          borderRadius: 'var(--mantine-radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--mantine-color-gray-0)'
        }}
      >
        <div style={{ textAlign: 'center', color: 'var(--mantine-color-gray-6)' }}>
          Upload a drone log file to view the flight data on the map
        </div>
      </Box>
    )
  }

  return (
    <Box pos="relative" h={height}>
      <LoadingOverlay visible={isLoading} />
      
      <LayerControls />
      
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
      >
        {tileLayer === 'osm' ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}
        
        {selectedLayers.has('dropPoints') && <DropPointsLayer />}
        {selectedLayers.has('waypoints') && <WaypointsLayer />}
        {selectedLayers.has('polygon') && <PolygonLayer />}
      </MapContainer>
    </Box>
  )
}