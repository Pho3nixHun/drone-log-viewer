import { Paper, Stack, Switch, Text, Group, Divider, Badge, SegmentedControl, Button } from '@mantine/core'
import { IconDroplet, IconRoute, IconPolygon, IconMap, IconSatellite, IconDownload, IconFile, IconMapPin, IconSettings, IconTarget, IconTrash, IconChartDots } from '@tabler/icons-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMissionStore } from '../../stores/missionStore'
import { exportToShapefile } from '../../utils/shapefileExport'

interface LayerControlsProps {
  embedded?: boolean
}

export function LayerControls({ embedded = false }: LayerControlsProps) {
  const { selectedLayers, toggleLayer, currentMission, tileLayer, setTileLayer, selectedSourceFiles, toggleSourceFile, removeSourceFile, heatmapData } = useMissionStore()
  const { t } = useTranslation()
  const [isExporting, setIsExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState<string | null>(null)

  if (!currentMission) return null

  const handleExport = async () => {
    try {
      setIsExporting(true)
      await exportToShapefile(currentMission, selectedLayers, selectedSourceFiles)
      setExportMessage(t('export.success'))
    } catch (error) {
      console.error('Export error:', error)
      setExportMessage(t('export.error'))
    } finally {
      setIsExporting(false)
      setTimeout(() => setExportMessage(null), 3000)
    }
  }

  const { dropPoints, waypoints } = currentMission.flightLog
  
  // Count total mission waypoints from all WDM files
  const totalMissionWaypoints = currentMission.missionSettings?.reduce((total, settings) => {
    return total + (settings.missionWaypoints?.length || 0)
  }, 0) || 0

  const content = (
    <Stack gap="sm">
        <Text size="sm" fw={600}>{t('map.layers')}</Text>
        
        <SegmentedControl
          size="xs"
          value={tileLayer}
          onChange={(value) => setTileLayer(value as 'osm' | 'satellite')}
          data={[
            {
              value: 'osm',
              label: (
                <Group gap="xs">
                  <IconMap size={14} />
                  <Text size="xs">{t('controls.map')}</Text>
                </Group>
              )
            },
            {
              value: 'satellite',
              label: (
                <Group gap="xs">
                  <IconSatellite size={14} />
                  <Text size="xs">{t('controls.satellite')}</Text>
                </Group>
              )
            }
          ]}
        />
        
        <Divider />
        
        <Text size="sm" fw={600}>{t('layers.dataLayers')}</Text>
        
        <Stack gap="xs">
          <Group justify="space-between">
            <Group gap="xs">
              <IconDroplet size={16} color="var(--mantine-color-blue-5)" />
              <Text size="xs">{t('map.dropPoints')}</Text>
              <Badge size="xs" variant="light" color="blue">
                {dropPoints.length}
              </Badge>
            </Group>
            <Switch
              size="sm"
              checked={selectedLayers.has('dropPoints')}
              onChange={() => toggleLayer('dropPoints')}
            />
          </Group>
          
          <Group justify="space-between">
            <Group gap="xs">
              <IconRoute size={16} color="var(--mantine-color-yellow-6)" />
              <Text size="xs">{t('map.waypoints')}</Text>
              <Badge size="xs" variant="light" color="yellow">
                {waypoints.length}
              </Badge>
            </Group>
            <Switch
              size="sm"
              checked={selectedLayers.has('waypoints')}
              onChange={() => toggleLayer('waypoints')}
            />
          </Group>
          
          <Group justify="space-between">
            <Group gap="xs">
              <IconPolygon size={16} color="var(--mantine-color-green-5)" />
              <Text size="xs">Field Polygons</Text>
            </Group>
            <Switch
              size="sm"
              checked={selectedLayers.has('polygon')}
              onChange={() => toggleLayer('polygon')}
            />
          </Group>
          
          {totalMissionWaypoints > 0 && (
            <Group justify="space-between">
              <Group gap="xs">
                <IconMapPin size={16} color="var(--mantine-color-violet-5)" />
                <Text size="xs">{t('map.missionWaypoints')}</Text>
                <Badge size="xs" variant="light" color="violet">
                  {totalMissionWaypoints}
                </Badge>
              </Group>
              <Switch
                size="sm"
                checked={selectedLayers.has('missionWaypoints')}
                onChange={() => toggleLayer('missionWaypoints')}
              />
            </Group>
          )}
          
          {currentMission.missionSettings && currentMission.missionSettings.length >= 1 && (
            <Group justify="space-between">
              <Group gap="xs">
                <IconTarget size={16} color="var(--mantine-color-orange-6)" />
                <Text size="xs">Combined Area</Text>
                <Badge size="xs" variant="light" color="orange">
                  UNION
                </Badge>
              </Group>
              <Switch
                size="sm"
                checked={selectedLayers.has('polygonUnion')}
                onChange={() => toggleLayer('polygonUnion')}
              />
            </Group>
          )}
          
          {heatmapData && (
            <Group justify="space-between">
              <Group gap="xs">
                <IconChartDots size={16} color="var(--mantine-color-red-5)" />
                <Text size="xs">{t('map.heatmap')}</Text>
                <Badge size="xs" variant="light" color="red">
                  OVERLAY
                </Badge>
              </Group>
              <Switch
                size="sm"
                checked={selectedLayers.has('heatmap')}
                onChange={() => toggleLayer('heatmap')}
              />
            </Group>
          )}
        </Stack>
        
{currentMission.sourceFiles && currentMission.sourceFiles.length >= 1 && (
          <>
            <Divider />
            
            <Text size="sm" fw={600}>{t('layers.sourceFiles')}</Text>
            
            <Stack gap="xs">
              {currentMission.sourceFiles.map((sourceFile, index) => {
                const dropCount = dropPoints.filter(p => p.sourceFile === sourceFile).length
                const waypointCount = waypoints.filter(p => p.sourceFile === sourceFile).length
                const totalCount = dropCount + waypointCount
                
                return (
                  <Group key={sourceFile} justify="space-between" wrap="nowrap">
                    <Group gap="xs" style={{ flex: 1 }} wrap="nowrap">
                      <IconFile size={16} color={`hsl(${(index * 45) % 360}, 70%, 50%)`} />
                      <Text size="xs" style={{ flex: 1, minWidth: 0 }}>
                        {sourceFile.replace('.json', '')}
                      </Text>
                      <Badge size="xs" variant="light" color="gray">
                        {totalCount}
                      </Badge>
                      <Button
                        size="xs"
                        variant="subtle"
                        color="red"
                        onClick={() => removeSourceFile(sourceFile)}
                        p={2}
                        title={`Remove ${sourceFile}`}
                      >
                        <IconTrash size={10} />
                      </Button>
                    </Group>
                    <Switch
                      size="sm"
                      checked={selectedSourceFiles.has(sourceFile)}
                      onChange={() => toggleSourceFile(sourceFile)}
                    />
                  </Group>
                )
              })}
              
              {/* Add WDM files if present */}
              {currentMission.missionSettings && currentMission.missionSettings.map((settings, index) => {
                const sourceFileKey = settings.filename || `wdm-${index}`
                return (
                  <Group key={sourceFileKey} justify="space-between" wrap="nowrap">
                    <Group gap="xs" style={{ flex: 1 }} wrap="nowrap">
                      <IconSettings size={16} color="var(--mantine-color-green-6)" />
                      <Text size="xs" style={{ flex: 1, minWidth: 0 }}>
                        {settings.filename ? settings.filename.replace('.wdm', '') : `Mission ${index + 1}`}
                      </Text>
                      <Badge size="xs" variant="light" color="green">
                        WDM
                      </Badge>
                      <Button
                        size="xs"
                        variant="subtle"
                        color="red"
                        onClick={() => removeSourceFile(sourceFileKey)}
                        p={2}
                        title={`Remove ${sourceFileKey}`}
                      >
                        <IconTrash size={10} />
                      </Button>
                    </Group>
                    <Switch
                      size="sm"
                      checked={selectedSourceFiles.has(sourceFileKey)}
                      onChange={() => toggleSourceFile(sourceFileKey)}
                    />
                  </Group>
                )
              })}
            </Stack>
          </>
        )}
        
        <Divider />
        
        <Button
          size="xs"
          variant="light"
          leftSection={<IconDownload size={14} />}
          onClick={handleExport}
          loading={isExporting}
          fullWidth
        >
          {isExporting ? t('export.exporting') : t('export.shapefile')}
        </Button>
        
        {exportMessage && (
          <Text size="xs" c={exportMessage.includes('success') ? 'green' : 'red'} ta="center">
            {exportMessage}
          </Text>
        )}
        
        <Divider />
        
        <Stack gap="xs">
          <Text size="xs" fw={500}>{t('layers.legend')}</Text>
          <Group gap="xs">
            <div 
              style={{ 
                width: 12, 
                height: 12, 
                borderRadius: '50%', 
                backgroundColor: 'var(--mantine-color-blue-5)' 
              }} 
            />
            <Text size="xs" c="dimmed">{t('layers.dropPointsLegend')}</Text>
          </Group>
          <Group gap="xs">
            <div 
              style={{ 
                width: 12, 
                height: 3, 
                backgroundColor: 'var(--mantine-color-yellow-6)' 
              }} 
            />
            <Text size="xs" c="dimmed">{t('layers.flightPathLegend')}</Text>
          </Group>
          <Group gap="xs">
            <div 
              style={{ 
                width: 12, 
                height: 12, 
                border: '2px solid var(--mantine-color-green-5)',
                backgroundColor: 'rgba(var(--mantine-color-green-5-rgb), 0.2)' 
              }} 
            />
            <Text size="xs" c="dimmed">Individual field boundaries</Text>
          </Group>
          
          {totalMissionWaypoints > 0 && (
            <Group gap="xs">
              <div 
                style={{ 
                  width: 12, 
                  height: 3, 
                  backgroundColor: 'var(--mantine-color-violet-5)',
                  border: '1px dashed var(--mantine-color-violet-7)'
                }} 
              />
              <Text size="xs" c="dimmed">{t('layers.missionRouteLegend')}</Text>
            </Group>
          )}
          
          {currentMission.missionSettings && currentMission.missionSettings.length >= 1 && selectedLayers.has('polygonUnion') && (
            <Group gap="xs">
              <div 
                style={{ 
                  width: 12, 
                  height: 12, 
                  border: '3px dashed #ff6b35',
                  backgroundColor: 'rgba(255, 107, 53, 0.15)' 
                }} 
              />
              <Text size="xs" c="dimmed">Total coverage area (overlaps merged)</Text>
            </Group>
          )}
        </Stack>
      </Stack>
  )

  if (embedded) {
    return content
  }

  return (
    <Paper 
      p="sm" 
      shadow="md" 
      style={{ 
        position: 'absolute', 
        top: 10, 
        right: 10, 
        zIndex: 1000,
        minWidth: 200
      }}
    >
      {content}
    </Paper>
  )
}