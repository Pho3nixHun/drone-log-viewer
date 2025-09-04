import { useEffect, useRef, useMemo } from 'react'
import { Box, Button, SegmentedControl, Text, Paper, Slider } from '@mantine/core'
import { IconPlayerPlay, IconPlayerPause, IconRestore } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useMissionStore } from '../../stores/missionStore'
import { formatTimeOnly } from '../../utils/dateHelpers'

interface ReplayControlsProps {
  embedded?: boolean
}

export function ReplayControls({ embedded = false }: ReplayControlsProps) {
  const { 
    currentMission, 
    isReplaying, 
    replaySpeed, 
    replayCurrentTime, 
    replayStartTime, 
    replayEndTime,
    startReplay, 
    pauseReplay, 
    resetReplay, 
    setReplaySpeed,
    setReplayCurrentTime
  } = useMissionStore()
  const { t } = useTranslation()
  
  const intervalRef = useRef<number>(0)
  
  // Simple 1fps replay with speed-based time increments
  useEffect(() => {
    if (!currentMission || !replayStartTime || !replayEndTime) return
    if (!isReplaying || !replayCurrentTime) return
    
    // Clear any existing interval
    if (intervalRef.current) clearInterval(intervalRef.current)
    
    // Update every 1000ms (1fps)
    intervalRef.current = window.setInterval(() => {
      const currentTime = replayCurrentTime || replayStartTime
      // Advance by speed * 1 second worth of mission time
      const timeIncrement = replaySpeed * 500
      const newTime = currentTime + timeIncrement
      
      if (newTime >= replayEndTime) {
        setReplayCurrentTime(replayEndTime)
        pauseReplay()
      } else {
        setReplayCurrentTime(newTime)
      }
    }, 500)
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isReplaying, replaySpeed, replayStartTime, replayEndTime, replayCurrentTime, currentMission, setReplayCurrentTime, pauseReplay])
  
  if (!currentMission || !replayStartTime || !replayEndTime) return null
  
  const currentTimeValue = replayCurrentTime || replayStartTime
  const isComplete = replayCurrentTime === replayEndTime
  
  // Calculate visible points based on current replay time
  const visibleCounts = useMemo(() => {
    if (!currentMission || !replayCurrentTime) return { dropPoints: 0, waypoints: 0 }
    
    const { dropPoints, waypoints } = currentMission.flightLog
    
    const visibleDropPoints = dropPoints.filter(point => {
      const pointTime = new Date(point.date).getTime()
      return !isNaN(pointTime) && pointTime <= replayCurrentTime
    }).length
    
    const visibleWaypoints = waypoints.filter(point => {
      const pointTime = new Date(point.date).getTime()
      return !isNaN(pointTime) && pointTime <= replayCurrentTime
    }).length
    
    return { dropPoints: visibleDropPoints, waypoints: visibleWaypoints }
  }, [currentMission, replayCurrentTime])
  
  const handlePlayPause = () => {
    if (isComplete) {
      resetReplay()
      startReplay()
    } else if (isReplaying) {
      pauseReplay()
    } else {
      startReplay()
    }
  }
  
  const handleTimeChange = (value: number) => {
    requestAnimationFrame(() => setReplayCurrentTime(value))
  }
  
  const speedOptions = [
    { label: '0.5x', value: '0.5' },
    { label: '1x', value: '1' },
    { label: '2x', value: '2' },
    { label: '5x', value: '5' },
    { label: '10x', value: '10' }
  ]
  
  const content = (
    <Box>
        <Text size="sm" fw={500} mb="sm">
          {t('replay.title')}
        </Text>
        
        <Slider 
          value={currentTimeValue}
          onChange={handleTimeChange}
          min={replayStartTime}
          max={replayEndTime}
          step={1000}
          mb="sm"
          color={isReplaying ? 'blue' : 'gray'}
          marks={[
            { value: replayStartTime, label: formatTimeOnly(new Date(replayStartTime).toISOString()) },
            { value: replayEndTime, label: formatTimeOnly(new Date(replayEndTime).toISOString()) }
          ]}
        />
        
        <Box mb="sm" style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '12px' }}>
          <Text size="xs" c="dimmed">
            {t('replay.current')}: {formatTimeOnly(new Date(currentTimeValue).toISOString())}
          </Text>
          <Text size="xs" c="dimmed">
            🔴 {visibleCounts.dropPoints} | 🟡 {visibleCounts.waypoints}
          </Text>
        </Box>
        
        <Box mb="sm" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button
            size="sm"
            variant={isReplaying ? 'filled' : 'light'}
            leftSection={isReplaying ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
            onClick={handlePlayPause}
          >
            {isComplete ? t('replay.replay') : (isReplaying ? t('replay.pause') : t('replay.play'))}
          </Button>
          
          <Button
            size="sm"
            variant="light"
            leftSection={<IconRestore size={16} />}
            onClick={resetReplay}
          >
            {t('replay.reset')}
          </Button>
        </Box>
        
        <Box>
          <Text size="xs" mb="xs" c="dimmed">{t('replay.speed')}</Text>
          <SegmentedControl
            size="xs"
            value={replaySpeed.toString()}
            onChange={(value) => setReplaySpeed(parseFloat(value))}
            data={speedOptions}
          />
        </Box>
      </Box>
  )

  if (embedded) {
    return content
  }

  return (
    <Paper
      p="md"
      shadow="sm"
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1000,
        width: 300
      }}
    >
      {content}
    </Paper>
  )
}