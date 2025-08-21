import { Group, Title, Text, Button } from '@mantine/core'
import { IconRefresh } from '@tabler/icons-react'
import { useMissionStore } from '../../stores/missionStore'

export function Header() {
  const { reset, currentMission } = useMissionStore()
  
  return (
    <Group 
      justify="space-between" 
      p="sm" 
      style={{ 
        borderBottom: currentMission ? 'none' : '1px solid var(--mantine-color-gray-3)',
        minHeight: currentMission ? '60px' : '80px'
      }}
    >
      <div>
        <Title order={currentMission ? 3 : 2}>
          {currentMission ? 'Drone Flight Report' : 'Drone Log Viewer'}
        </Title>
        {!currentMission && (
          <Text size="sm" c="dimmed">
            Upload and visualize agricultural drone flight data
          </Text>
        )}
      </div>
      
      {currentMission && (
        <Button
          leftSection={<IconRefresh size={16} />}
          variant="subtle"
          size="sm"
          onClick={reset}
        >
          New File
        </Button>
      )}
    </Group>
  )
}