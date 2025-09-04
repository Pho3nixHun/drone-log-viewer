import React from 'react'
import { Polyline, CircleMarker, Popup } from 'react-leaflet'
import { useMissionStore } from '../../stores/missionStore'

export function MissionWaypointsLayer() {
  const { currentMission, selectedSourceFiles } = useMissionStore()
  
  if (!currentMission?.missionSettings) return null
  
  // Collect waypoints from enabled WDM files
  const wdmRoutes: Array<{
    waypoints: Array<{ latitude: number; longitude: number; index: number }>
    pathCoordinates: [number, number][]
    filename: string
    fieldName: string
    color: string
  }> = []
  
  currentMission.missionSettings.forEach((settings, settingsIndex) => {
    const filename = settings.filename || `wdm-${settingsIndex}`
    
    // Only show if this WDM file is enabled and has waypoints
    if (selectedSourceFiles.has(filename) && settings.missionWaypoints && settings.missionWaypoints.length > 0) {
      // Use different colors for different WDM files
      const hue = (settingsIndex * 120) % 360
      const color = `hsl(${hue}, 70%, 50%)`
      
      // Convert coordinate format from [lat, lng] to the expected format
      const waypoints = settings.missionWaypoints.map((coord, index) => ({
        latitude: coord[0],
        longitude: coord[1],
        index: index + 1
      }))
      
      // Create the path coordinates for the polyline
      const pathCoordinates: [number, number][] = waypoints.map(point => [
        point.latitude,
        point.longitude
      ])
      
      wdmRoutes.push({
        waypoints,
        pathCoordinates,
        filename,
        fieldName: settings.info.name,
        color
      })
    }
  })
  
  if (wdmRoutes.length === 0) return null
  
  return (
    <>
      {wdmRoutes.map((route, routeIndex) => (
        <React.Fragment key={`route-${routeIndex}`}>
          {/* Planned flight path polyline */}
          <Polyline
            positions={route.pathCoordinates}
            pathOptions={{
              color: route.color,
              weight: 2,
              opacity: 0.7,
              dashArray: '10, 5' // Dashed line to distinguish from actual flight path
            }}
          />
          
          {/* Mission waypoint markers */}
          {route.waypoints.map((point) => (
            <CircleMarker
              key={`mission-waypoint-${routeIndex}-${point.index}`}
              center={[point.latitude, point.longitude]}
              pathOptions={{
                fillColor: route.color,
                color: '#ffffff',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
              }}
              radius={6}
            >
              <Popup>
                <div style={{ minWidth: 150 }}>
                  <strong>Mission Waypoint #{point.index}</strong>
                  <br />
                  <strong>Field:</strong> {route.fieldName}
                  <br />
                  <strong>Source:</strong> {route.filename}
                  <br />
                  <strong>Location:</strong> {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                  <br />
                  <em>Planned route from mission settings</em>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </React.Fragment>
      ))}
    </>
  )
}