import { CircleMarker, Popup } from 'react-leaflet'
import { useMissionStore } from '../../stores/missionStore'
import { getColorForAltitude } from '../../utils/mapHelpers'
import { formatDate } from '../../utils/dateHelpers'

export function DropPointsLayer() {
  const { currentMission } = useMissionStore()
  
  if (!currentMission) return null
  
  const { dropPoints } = currentMission.flightLog
  
  // Filter out invalid coordinates
  const validPoints = dropPoints.filter(
    point => point.latitude !== 0 && point.longitude !== 0
  )
  
  if (validPoints.length === 0) return null
  
  // Calculate altitude range for color coding
  const altitudes = validPoints.map(p => p.altitude)
  const minAlt = Math.min(...altitudes)
  const maxAlt = Math.max(...altitudes)
  
  return (
    <>
      {validPoints.map((point, index) => (
        <CircleMarker
          key={`drop-${index}`}
          center={[point.latitude, point.longitude]}
          pathOptions={{
            fillColor: getColorForAltitude(point.altitude, minAlt, maxAlt),
            color: '#ffffff',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
          }}
          radius={6}
        >
          <Popup>
            <div style={{ minWidth: 200 }}>
              <strong>Drop Point #{index + 1}</strong>
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