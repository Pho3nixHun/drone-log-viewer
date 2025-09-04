import { Card, Text, Group, Stack, SimpleGrid, ThemeIcon } from '@mantine/core'
import { IconRoute, IconGauge, IconRuler, IconClock, IconBug, IconMapPin, IconMap2 } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useMissionStore } from '../../stores/missionStore'
import { formatDistance } from '../../utils/mapHelpers'
import { formatDuration } from '../../utils/dateHelpers'
import { calculateTotalFieldArea } from '../../utils/polygonUtils'

export function FlightStats() {
  const { currentMission, missionStats } = useMissionStore()
  const { t } = useTranslation()
  
  if (!currentMission || !missionStats) return null
  
  // Calculate total field area from WDM files (handling overlaps)
  const totalFieldArea = currentMission.missionSettings 
    ? calculateTotalFieldArea(currentMission.missionSettings)
    : 0

  const primaryStats = [
    {
      icon: IconBug,
      label: t('stats.dropPoints'),
      value: missionStats.dropPointsCount.toLocaleString(),
      color: 'blue',
      subtitle: t('stats.dropPointsSubtitle')
    },
    {
      icon: IconMapPin,
      label: t('map.waypoints'),
      value: missionStats.waypointsCount.toLocaleString(),
      color: 'yellow',
      subtitle: 'GPS navigation points'
    },
    {
      icon: IconRuler,
      label: t('stats.flightDistance'),
      value: formatDistance(missionStats.totalDistance),
      color: 'cyan',
      subtitle: t('stats.flightDistanceSubtitle')
    },
    {
      icon: IconGauge,
      label: t('stats.averageSpeed'),
      value: `${missionStats.averageSpeed} ${t('units.metersPerSecond')}`,
      color: 'orange',
      subtitle: t('stats.averageSpeedSubtitle')
    },
    {
      icon: IconRoute,
      label: 'Max Drops/Minute',
      value: `${missionStats.maxDropPerMinute}/min`,
      color: 'red',
      subtitle: 'Peak application rate during mission'
    },
    {
      icon: IconClock,
      label: t('mission.duration'),
      value: formatDuration(missionStats.flightDuration),
      color: 'indigo',
      subtitle: 'Total flight time'
    }
  ]
  
  // Add total field area if WDM files are loaded
  const allStats = totalFieldArea > 0 
    ? [
        ...primaryStats,
        {
          icon: IconMap2,
          label: 'Total Field Area',
          value: `${totalFieldArea.toFixed(2)} ha`,
          color: 'teal',
          subtitle: 'Combined mission coverage (union of polygons)'
        }
      ]
    : primaryStats

  
  return (
    <Card withBorder p="lg" h="100%" style={{ backgroundColor: '#fafbfc' }}>
      <Stack gap="md">
        <div>
          <Text size="lg" fw={600}>{t('stats.title')}</Text>
          <Text size="sm" c="dimmed">Flight performance and log data analysis</Text>
        </div>
        
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {allStats.map((stat, index) => (
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
      </Stack>
    </Card>
  )
}