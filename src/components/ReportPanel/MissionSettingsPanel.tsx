import { Card, Text, Group, Stack, Badge, Divider, Button, FileButton, Alert } from '@mantine/core'
import { IconUpload, IconSettings, IconInfoCircle } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useMissionStore } from '../../stores/missionStore'

export function MissionSettingsPanel() {
  const { currentMission, isLoading, loadMissionSettings, error } = useMissionStore()
  const { t } = useTranslation()
  
  if (!currentMission) return null
  
  const { missionSettings } = currentMission
  
  const handleFileSelect = (file: File | null) => {
    if (file) {
      loadMissionSettings(file)
    }
  }
  
  const formatCornerPosition = (pos: number) => {
    const corners = ['', 'Top-Left', 'Top-Right', 'Bottom-Right', 'Bottom-Left']
    return corners[pos] || `Corner ${pos}`
  }

  return (
    <Card withBorder p="lg" style={{ backgroundColor: '#fafbfc' }}>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text size="lg" fw={600}>{t('mission.settingsTitle')}</Text>
            <Text size="sm" c="dimmed">{t('mission.settingsSubtitle')}</Text>
          </div>
          
          <FileButton 
            onChange={handleFileSelect}
            accept=".wdm"
            loading={isLoading}
          >
            {(props) => (
              <Button
                {...props}
                size="sm"
                variant="light"
                leftSection={<IconUpload size={16} />}
              >
                {t('mission.uploadSettings')}
              </Button>
            )}
          </FileButton>
        </Group>
        
        {error && (
          <Alert variant="light" color="red" icon={<IconInfoCircle size={16} />}>
            {error}
          </Alert>
        )}
        
        <Divider />
        
        {missionSettings ? (
          <Stack gap="sm">
            {/* Field Area - Use accurate calculation from WDM */}
            <Group justify="space-between">
              <Group gap="xs">
                <IconSettings size={16} color="var(--mantine-color-green-5)" />
                <Text size="sm">{t('mission.fieldArea')}</Text>
              </Group>
              <Badge variant="light" color="green">
                {missionSettings.info.areaCalc.toFixed(2)} ha
              </Badge>
            </Group>
            
            {/* Line Spacing */}
            <Group justify="space-between">
              <Text size="sm">{t('mission.lineSpacing')}</Text>
              <Text size="sm" fw={500}>{missionSettings.missionParams.dDL}m</Text>
            </Group>
            
            {/* Drop Distance */}
            <Group justify="space-between">
              <Text size="sm">{t('mission.dropDistance')}</Text>
              <Text size="sm" fw={500}>{missionSettings.missionParams.dTFB} (format unknown)</Text>
            </Group>
            
            {/* Planned Altitude */}
            <Group justify="space-between">
              <Text size="sm">{t('mission.altitude')}</Text>
              <Text size="sm" fw={500}>{missionSettings.missionParams.altitude}m</Text>
            </Group>
            
            {/* Planned Speed */}
            <Group justify="space-between">
              <Text size="sm">{t('mission.speed')}</Text>
              <Text size="sm" fw={500}>{missionSettings.missionParams.speed} m/s</Text>
            </Group>
            
            {/* Flight Angle */}
            <Group justify="space-between">
              <Text size="sm">{t('mission.angle')}</Text>
              <Text size="sm" fw={500}>{missionSettings.missionParams.angle.toFixed(1)}°</Text>
            </Group>
            
            {/* Starting Corner */}
            <Group justify="space-between">
              <Text size="sm">{t('mission.startingCorner')}</Text>
              <Text size="sm" fw={500}>{formatCornerPosition(missionSettings.missionParams.startingPos)}</Text>
            </Group>
            
            <Divider />
            
            <Group gap="xs">
              <Text size="xs" c="dimmed">Mission: {missionSettings.info.name}</Text>
            </Group>
          </Stack>
        ) : (
          <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
            <Text size="sm">{t('mission.noSettingsNote')}</Text>
          </Alert>
        )}
      </Stack>
    </Card>
  )
}