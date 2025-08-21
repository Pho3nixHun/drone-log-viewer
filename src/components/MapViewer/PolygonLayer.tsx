import { Polygon, Popup } from 'react-leaflet'
import { useMissionStore } from '../../stores/missionStore'
import { parsePolygonString } from '../../utils/mapHelpers'

export function PolygonLayer() {
  const { currentMission } = useMissionStore()
  
  if (!currentMission?.flightLog.polygon || currentMission.flightLog.polygon === '-1') {
    return null
  }
  
  const polygonCoords = parsePolygonString(currentMission.flightLog.polygon)
  
  if (polygonCoords.length < 3) {
    return null
  }
  
  return (
    <Polygon
      positions={polygonCoords}
      pathOptions={{
        color: '#51cf66',
        weight: 2,
        opacity: 1,
        fillColor: '#51cf66',
        fillOpacity: 0.2
      }}
    >
      <Popup>
        <div style={{ minWidth: 200 }}>
          <strong>Field Boundary</strong>
          <br />
          <strong>Field:</strong> {currentMission.fieldName}
          <br />
          <strong>Points:</strong> {polygonCoords.length}
        </div>
      </Popup>
    </Polygon>
  )
}