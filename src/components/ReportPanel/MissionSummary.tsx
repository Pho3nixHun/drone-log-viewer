import { Card, Text, Group, Stack, Badge, Divider } from '@mantine/core'
import { IconDrone, IconUser, IconCalendar, IconClock, IconMapPin } from '@tabler/icons-react'
import { useMissionStore } from '../../stores/missionStore'
import { formatDuration, formatDate, formatDateShort } from '../../utils/dateHelpers'

export function MissionSummary() {
  const { currentMission, missionStats } = useMissionStore()
  
  if (!currentMission || !missionStats) return null
  
  const { flightLog } = currentMission
  
  return (
    <Card withBorder p="lg" h="100%" style={{ backgroundColor: '#fafbfc' }}>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text size="lg" fw={600}>Mission Summary</Text>
            <Text size="sm" c="dimmed">Flight overview and metadata</Text>
          </div>
          <Badge color="green" variant="light">
            {currentMission.uploaded ? 'Uploaded' : 'Local'}
          </Badge>
        </Group>
        
        <Divider />
        
        <Stack gap="sm">
          <Group gap="sm">
            <IconDrone size={16} color="var(--mantine-color-blue-5)" />
            <div style={{ flex: 1 }}>
              <Text size="sm" fw={500}>Drone</Text>
              <Text size="sm" c="dimmed">{currentMission.droneName}</Text>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text size="xs" c="dimmed">App Version</Text>
              <Text size="sm">{currentMission.appVersion}</Text>
            </div>
          </Group>
          
          <Group gap="sm">
            <IconUser size={16} color="var(--mantine-color-green-5)" />
            <div style={{ flex: 1 }}>
              <Text size="sm" fw={500}>Pilot</Text>
              <Text size="sm" c="dimmed">{flightLog.pilotName}</Text>
            </div>
          </Group>
          
          <Group gap="sm">
            <IconMapPin size={16} color="var(--mantine-color-red-5)" />
            <div style={{ flex: 1 }}>
              <Text size="sm" fw={500}>Field</Text>
              <Text size="sm" c="dimmed">{currentMission.fieldName}</Text>
            </div>
          </Group>
          
          <Divider />
          
          <Group gap="sm">
            <IconCalendar size={16} color="var(--mantine-color-indigo-5)" />
            <div style={{ flex: 1 }}>
              <Text size="sm" fw={500}>Flight Date</Text>
              <Text size="sm" c="dimmed">{formatDateShort(flightLog.flightDate)}</Text>
            </div>
          </Group>
          
          <Group gap="sm">
            <IconClock size={16} color="var(--mantine-color-orange-5)" />
            <div style={{ flex: 1 }}>
              <Text size="sm" fw={500}>Start Time</Text>
              <Text size="sm" c="dimmed">{formatDate(flightLog.startDate)}</Text>
            </div>
          </Group>
          
          <Group gap="sm">
            <IconClock size={16} color="var(--mantine-color-orange-5)" />
            <div style={{ flex: 1 }}>
              <Text size="sm" fw={500}>End Time</Text>
              <Text size="sm" c="dimmed">{formatDate(flightLog.endDate)}</Text>
            </div>
          </Group>
          
          <Group gap="sm" p="sm" style={{ backgroundColor: 'var(--mantine-color-blue-0)', borderRadius: 'var(--mantine-radius-sm)' }}>
            <div style={{ flex: 1 }}>
              <Text size="sm" fw={600}>Flight Duration</Text>
              <Text size="lg" fw={700} c="blue">{formatDuration(missionStats.flightDuration)}</Text>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text size="sm" fw={600}>Bullets Used</Text>
              <Text size="lg" fw={700} c="blue">{flightLog.trichogrammaBullets.toLocaleString()}</Text>
            </div>
          </Group>
        </Stack>
      </Stack>
    </Card>
  )
}