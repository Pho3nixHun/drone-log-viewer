import { Paper, Stack, Switch, Text, Group, Divider, Badge, SegmentedControl } from '@mantine/core'
import { IconDroplet, IconRoute, IconPolygon, IconMap, IconSatellite } from '@tabler/icons-react'
import { useMissionStore } from '../../stores/missionStore'

export function LayerControls() {
  const { selectedLayers, toggleLayer, currentMission, tileLayer, setTileLayer } = useMissionStore()

  if (!currentMission) return null

  const { dropPoints, waypoints } = currentMission.flightLog

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
      <Stack gap="sm">
        <Text size="sm" fw={600}>Map View</Text>
        
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
                  <Text size="xs">Map</Text>
                </Group>
              )
            },
            {
              value: 'satellite',
              label: (
                <Group gap="xs">
                  <IconSatellite size={14} />
                  <Text size="xs">Satellite</Text>
                </Group>
              )
            }
          ]}
        />
        
        <Divider />
        
        <Text size="sm" fw={600}>Data Layers</Text>
        
        <Stack gap="xs">
          <Group justify="space-between">
            <Group gap="xs">
              <IconDroplet size={16} color="var(--mantine-color-blue-5)" />
              <Text size="xs">Drop Points</Text>
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
              <Text size="xs">Flight Path</Text>
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
              <Text size="xs">Field Boundary</Text>
            </Group>
            <Switch
              size="sm"
              checked={selectedLayers.has('polygon')}
              onChange={() => toggleLayer('polygon')}
            />
          </Group>
        </Stack>
        
        <Divider />
        
        <Stack gap="xs">
          <Text size="xs" fw={500}>Legend</Text>
          <Group gap="xs">
            <div 
              style={{ 
                width: 12, 
                height: 12, 
                borderRadius: '50%', 
                backgroundColor: 'var(--mantine-color-blue-5)' 
              }} 
            />
            <Text size="xs" c="dimmed">Drop points</Text>
          </Group>
          <Group gap="xs">
            <div 
              style={{ 
                width: 12, 
                height: 3, 
                backgroundColor: 'var(--mantine-color-yellow-6)' 
              }} 
            />
            <Text size="xs" c="dimmed">Flight path</Text>
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
            <Text size="xs" c="dimmed">Field area</Text>
          </Group>
        </Stack>
      </Stack>
    </Paper>
  )
}