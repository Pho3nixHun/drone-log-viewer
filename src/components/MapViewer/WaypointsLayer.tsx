import { useEffect, useRef } from 'react'
import { Polyline, CircleMarker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useTranslation } from 'react-i18next'
import { useMissionStore } from '../../stores/missionStore'
import { formatDate } from '../../utils/dateHelpers'
import { getSourceFileColor, getTooltipColor } from '../../utils/colorUtils'

// Import the polyline decorator
import 'leaflet-polylinedecorator'

export function WaypointsLayer() {
  const { currentMission, timeRange, isReplaying, replayCurrentTime, selectedSourceFiles } = useMissionStore()
  const { t } = useTranslation()
  const map = useMap()
  const decoratorRef = useRef<any>(null)
  
  if (!currentMission) return null
  
  const { waypoints } = currentMission.flightLog
  
  // Filter out invalid coordinates only once
  const validPoints = waypoints.filter(
    point => point.latitude !== 0 && point.longitude !== 0
  )
  
  if (validPoints.length === 0) return null
  
  // Determine if each point should be visible
  const isPointVisible = (point: any) => {
    // Check if source file is selected (for merged missions)
    if (point.sourceFile && !selectedSourceFiles.has(point.sourceFile)) {
      return false
    }
    
    const pointTime = new Date(point.date).getTime()
    
    if (isReplaying && replayCurrentTime) {
      return pointTime <= replayCurrentTime
    } else if (timeRange) {
      const [startTime, endTime] = timeRange
      return pointTime >= startTime && pointTime <= endTime
    }
    return true
  }
  
  // Filter visible points for polyline path
  const visiblePoints = validPoints.filter(isPointVisible)
  
  // Create the path coordinates for visible points
  const pathCoordinates: [number, number][] = visiblePoints.map(point => [
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
      {validPoints.map((point, index) => {
        const visible = isPointVisible(point)
        return (
          <CircleMarker
            key={`waypoint-${index}`}
            center={[point.latitude, point.longitude]}
            pathOptions={{
              fillColor: point.sourceIndex !== undefined 
                ? getSourceFileColor(point.sourceIndex, 'waypoint')
                : '#ffd43b',
              color: '#ffffff',
              weight: 1,
              opacity: visible ? 1 : 0,
              fillOpacity: visible ? 0.9 : 0
            }}
          >
            <Popup>
              <div style={{ 
                minWidth: 200, 
                backgroundColor: point.sourceIndex !== undefined ? getTooltipColor(point.sourceIndex) : '#ffffff',
                padding: '8px',
                borderRadius: '4px'
              }}>
                <strong>{t('tooltip.waypoint')} #{index + 1}</strong>
                {point.sourceFile && (
                  <>
                    <br />
                    <strong>{t('tooltip.source')}:</strong> {point.sourceFile}
                  </>
                )}
                <br />
                <strong>{t('tooltip.location')}:</strong> {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                <br />
                <strong>{t('tooltip.altitude')}:</strong> {point.altitude.toFixed(1)}m
                <br />
                <strong>{t('tooltip.speed')}:</strong> {point.speed.toFixed(1)} m/s
                <br />
                <strong>{t('tooltip.heading')}:</strong> {point.heading.toFixed(0)}°
                <br />
                <strong>{t('tooltip.time')}:</strong> {formatDate(point.date)}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </>
  )
}