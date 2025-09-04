import { Box, RangeSlider, Text, Paper } from '@mantine/core'
import { IconClock } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useMissionStore } from '../../stores/missionStore'
import { formatTimeOnly } from '../../utils/dateHelpers'

interface TimeSliderProps {
  embedded?: boolean
}

export function TimeSlider({ embedded = false }: TimeSliderProps) {
  const { currentMission, timeRange, setTimeRange } = useMissionStore()
  const { t } = useTranslation()
  
  if (!currentMission) return null
  
  const { dropPoints, waypoints } = currentMission.flightLog
  
  // Get all timestamps and convert to numbers for slider
  const allPoints = [...dropPoints, ...waypoints]
  const timestamps = allPoints
    .map(point => new Date(point.date).getTime())
    .filter(time => !isNaN(time))
    .sort((a, b) => a - b)
  
  if (timestamps.length === 0) return null
  
  const minTime = timestamps[0]
  const maxTime = timestamps[timestamps.length - 1]
  
  // If there's only one timestamp or very short duration, don't show slider
  if (maxTime - minTime < 1000) return null
  
  const currentRange = timeRange || [minTime, maxTime]
  
  const handleRangeChange = (value: [number, number]) => {
    setTimeRange(value)
  }
  
  const content = (
    <Box>
        <Text size="sm" fw={500} mb="xs" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconClock size={16} />
          {t('controls.timeFilter')}
        </Text>
        
        <RangeSlider
          value={currentRange}
          onChange={handleRangeChange}
          min={minTime}
          max={maxTime}
          step={1000} // 1 second steps
          marks={[
            { value: minTime, label: formatTimeOnly(new Date(minTime).toISOString()) },
            { value: maxTime, label: formatTimeOnly(new Date(maxTime).toISOString()) }
          ]}
          mb="lg"
        />
      </Box>
  )

  if (embedded) {
    return content
  }

  return (
    <Paper
      p="lg"
      shadow="sm"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}
    >
      {content}
    </Paper>
  )
}