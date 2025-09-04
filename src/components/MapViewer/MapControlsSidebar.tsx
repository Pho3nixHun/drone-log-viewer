import { Stack, Tabs, rem } from '@mantine/core'
import { IconStack2, IconClock, IconPlayerPlay } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useMissionStore } from '../../stores/missionStore'
import { LayerControls } from './LayerControls'
import { TimeSlider } from './TimeSlider'
import { ReplayControls } from './ReplayControls'
import { TimeChart } from './TimeChart'

export function MapControlsSidebar() {
  const { currentMission, isReplaying } = useMissionStore()
  const { t } = useTranslation()
  
  if (!currentMission) return null
  
  const iconStyle = { width: rem(12), height: rem(12) }
  
  return (
    <Tabs defaultValue="layers" variant="pills">
      <Tabs.List grow>
        <Tabs.Tab value="layers" leftSection={<IconStack2 style={iconStyle} />}>
          {t('map.layers')}
        </Tabs.Tab>
        <Tabs.Tab value="time" leftSection={<IconClock style={iconStyle} />} disabled={isReplaying}>
          {t('map.timeFilter')}
        </Tabs.Tab>
        <Tabs.Tab value="replay" leftSection={<IconPlayerPlay style={iconStyle} />}>
          {t('map.replay')}
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="layers" pt="md">
        <LayerControls embedded />
      </Tabs.Panel>

      <Tabs.Panel value="time" pt="md">
        <Stack gap="md">
          <TimeChart width="100%" height={60} />
          <TimeSlider embedded />
        </Stack>
      </Tabs.Panel>

      <Tabs.Panel value="replay" pt="md">
        <ReplayControls embedded />
      </Tabs.Panel>
    </Tabs>
  )
}