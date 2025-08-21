import { Card, Text, Group, Stack, SimpleGrid, ThemeIcon, Progress, Divider } from '@mantine/core'
import { IconDroplet, IconRoute, IconGauge, IconRuler, IconMountain, IconMap2, IconArrowsHorizontal } from '@tabler/icons-react'
import { useMissionStore } from '../../stores/missionStore'
import { formatDistance } from '../../utils/mapHelpers'

export function FlightStats() {
  const { currentMission, missionStats } = useMissionStore()
  
  if (!currentMission || !missionStats) return null
  
  const primaryStats = [
    {
      icon: IconDroplet,
      label: 'Drop Points',
      value: missionStats.dropPointsCount.toLocaleString(),
      color: 'blue',
      subtitle: 'Agricultural application points'
    },
    {
      icon: IconMap2,
      label: 'Covered Area',
      value: `${missionStats.coveredAreaAcres} acres`,
      color: 'green',
      subtitle: 'Including 10m buffer zone'
    },
    {
      icon: IconRuler,
      label: 'Flight Distance',
      value: formatDistance(missionStats.totalDistance),
      color: 'cyan',
      subtitle: 'Total waypoint distance'
    },
    {
      icon: IconGauge,
      label: 'Average Speed',
      value: `${missionStats.averageSpeed} m/s`,
      color: 'orange',
      subtitle: 'Mean flight velocity'
    }
  ]

  const spacingStats = [
    {
      icon: IconArrowsHorizontal,
      label: 'Drop Spacing',
      value: formatDistance(missionStats.averageDropDistance),
      color: 'violet',
      subtitle: 'Average between drops'
    },
    {
      icon: IconRoute,
      label: 'Line Spacing',
      value: formatDistance(missionStats.averageDropLineDistance),
      color: 'pink',
      subtitle: 'Within drop sequences'
    }
  ]
  
  // Calculate altitude range for progress bar
  const altitudeRange = missionStats.maxAltitude - missionStats.minAltitude
  const averageProgress = altitudeRange > 0 
    ? ((missionStats.averageAltitude - missionStats.minAltitude) / altitudeRange) * 100
    : 50
  
  return (
    <Card withBorder p="lg" h="100%" style={{ backgroundColor: '#fafbfc' }}>
      <Stack gap="md">
        <div>
          <Text size="lg" fw={600}>Flight Statistics</Text>
          <Text size="sm" c="dimmed">Mission performance and coverage data</Text>
        </div>
        
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {primaryStats.map((stat, index) => (
            <Group key={index} gap="md">
              <ThemeIcon size="lg" variant="light" color={stat.color}>
                <stat.icon size={20} />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Text size="xl" fw={700}>{stat.value}</Text>
                <Text size="sm" fw={500}>{stat.label}</Text>
                <Text size="xs" c="dimmed">{stat.subtitle}</Text>
              </div>
            </Group>
          ))}
        </SimpleGrid>
        
        <Divider />
        
        <div>
          <Text size="sm" fw={600} mb="sm">Application Spacing</Text>
          <SimpleGrid cols={2} spacing="md">
            {spacingStats.map((stat, index) => (
              <Group key={index} gap="sm">
                <ThemeIcon size="md" variant="light" color={stat.color}>
                  <stat.icon size={16} />
                </ThemeIcon>
                <div style={{ flex: 1 }}>
                  <Text size="lg" fw={600}>{stat.value}</Text>
                  <Text size="xs" fw={500}>{stat.label}</Text>
                  <Text size="xs" c="dimmed">{stat.subtitle}</Text>
                </div>
              </Group>
            ))}
          </SimpleGrid>
        </div>
        
        <Card withBorder p="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
          <Stack gap="sm">
            <Group justify="space-between">
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light" color="indigo">
                  <IconMountain size={14} />
                </ThemeIcon>
                <Text size="sm" fw={600}>Altitude Profile</Text>
              </Group>
            </Group>
            
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed">Min</Text>
                <Text size="sm" fw={500}>{missionStats.minAltitude}m</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text size="xs" c="dimmed">Average</Text>
                <Text size="sm" fw={500}>{missionStats.averageAltitude}m</Text>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Text size="xs" c="dimmed">Max</Text>
                <Text size="sm" fw={500}>{missionStats.maxAltitude}m</Text>
              </div>
            </Group>
            
            <Progress 
              value={averageProgress} 
              color="indigo" 
              size="md"
              style={{ marginTop: '8px' }}
            />
            
            <Text size="xs" c="dimmed" ta="center">
              Altitude range: {(missionStats.maxAltitude - missionStats.minAltitude).toFixed(1)}m
            </Text>
          </Stack>
        </Card>
      </Stack>
    </Card>
  )
}