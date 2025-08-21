import { useEffect, useRef } from 'react'
import { Polyline, CircleMarker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useMissionStore } from '../../stores/missionStore'
import { formatDate } from '../../utils/dateHelpers'

// Import the polyline decorator
import 'leaflet-polylinedecorator'

export function WaypointsLayer() {
  const { currentMission } = useMissionStore()
  const map = useMap()
  const decoratorRef = useRef<any>(null)
  
  if (!currentMission) return null
  
  const { waypoints } = currentMission.flightLog
  
  // Filter out invalid coordinates
  const validPoints = waypoints.filter(
    point => point.latitude !== 0 && point.longitude !== 0
  )
  
  if (validPoints.length === 0) return null
  
  // Create the path coordinates
  const pathCoordinates: [number, number][] = validPoints.map(point => [
    point.latitude,
    point.longitude
  ])
  
  // Add directional arrows to the polyline
  useEffect(() => {
    if (pathCoordinates.length > 1) {
      // Remove existing decorator
      if (decoratorRef.current) {
        map.removeLayer(decoratorRef.current)
      }
      
      // Create new decorator with arrows
      const decorator = (L as any).polylineDecorator(pathCoordinates, {
        patterns: [
          {
            offset: 25,
            repeat: 100,
            symbol: (L as any).Symbol.arrowHead({
              pixelSize: 12,
              pathOptions: {
                fillOpacity: 1,
                weight: 0,
                color: '#ffd43b'
              }
            })
          }
        ]
      })
      
      decorator.addTo(map)
      decoratorRef.current = decorator
    }
    
    return () => {
      if (decoratorRef.current) {
        map.removeLayer(decoratorRef.current)
        decoratorRef.current = null
      }
    }
  }, [pathCoordinates, map])
  
  return (
    <>
      {/* Flight path polyline */}
      <Polyline
        positions={pathCoordinates}
        pathOptions={{
          color: '#ffd43b',
          weight: 3,
          opacity: 0.8
        }}
      />
      
      {/* Waypoint markers */}
      {validPoints.map((point, index) => (
        <CircleMarker
          key={`waypoint-${index}`}
          center={[point.latitude, point.longitude]}
          pathOptions={{
            fillColor: '#ffd43b',
            color: '#ffffff',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.9
          }}
        >
          <Popup>
            <div style={{ minWidth: 200 }}>
              <strong>Waypoint #{index + 1}</strong>
              <br />
              <strong>Location:</strong> {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
              <br />
              <strong>Altitude:</strong> {point.altitude.toFixed(1)}m
              <br />
              <strong>Speed:</strong> {point.speed.toFixed(1)} m/s
              <br />
              <strong>Heading:</strong> {point.heading.toFixed(0)}°
              <br />
              <strong>Time:</strong> {formatDate(point.date)}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  )
}