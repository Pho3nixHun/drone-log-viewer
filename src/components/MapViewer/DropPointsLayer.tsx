import { CircleMarker, Popup } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import { useMissionStore } from '../../stores/missionStore'
import { getColorForAltitude } from '../../utils/mapHelpers'
import { formatDate } from '../../utils/dateHelpers'
import { getSourceFileColor, getTooltipColor } from '../../utils/colorUtils'

export function DropPointsLayer() {
  const { currentMission, timeRange, isReplaying, replayCurrentTime, selectedSourceFiles } = useMissionStore()
  const { t } = useTranslation()
  
  if (!currentMission) return null
  
  const { dropPoints } = currentMission.flightLog
  
  // Filter out invalid coordinates only once
  const validPoints = dropPoints.filter(
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
  
  // Calculate altitude range for color coding
  const altitudes = validPoints.map(p => p.altitude)
  const minAlt = Math.min(...altitudes)
  const maxAlt = Math.max(...altitudes)
  
  return (
    <>
      {validPoints.map((point, index) => {
        const visible = isPointVisible(point)
        return (
          <CircleMarker
            key={`drop-${index}`}
            center={[point.latitude, point.longitude]}
            pathOptions={{
              fillColor: point.sourceIndex !== undefined 
                ? getSourceFileColor(point.sourceIndex, 'drop')
                : getColorForAltitude(point.altitude, minAlt, maxAlt),
              color: '#ffffff',
              weight: 1,
              opacity: visible ? 1 : 0,
              fillOpacity: visible ? 0.8 : 0
            }}
          >
            <Popup>
              <div style={{ 
                minWidth: 200, 
                backgroundColor: point.sourceIndex !== undefined ? getTooltipColor(point.sourceIndex) : '#ffffff',
                padding: '8px',
                borderRadius: '4px'
              }}>
                <strong>{t('tooltip.dropPoint')} #{index + 1}</strong>
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