import { useState, useRef } from 'react'
import { FileButton, Button, Text, Paper, Group, Stack, Alert, Loader, Divider, Badge } from '@mantine/core'
import { IconUpload, IconFile, IconAlertCircle, IconSettings, IconX, IconCheck } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useMissionStore } from '../../stores/missionStore'

export function FileUploader() {
  const [dragOver, setDragOver] = useState(false)
  const [selectedLogFiles, setSelectedLogFiles] = useState<File[]>([])
  const [selectedMissionFiles, setSelectedMissionFiles] = useState<File[]>([])
  const resetRef = useRef<() => void>(null)
  const missionResetRef = useRef<() => void>(null)
  const { t } = useTranslation()
  
  const { loadMission, loadMissionSettings, isLoading, error, clearError } = useMissionStore()

  const handleLogFilesSelect = (files: File | File[] | null) => {
    const fileArray = files ? (Array.isArray(files) ? files : [files]) : []
    
    // Separate JSON and WDM files
    const jsonFiles = fileArray.filter(file => file.name.endsWith('.json'))
    const wdmFiles = fileArray.filter(file => file.name.endsWith('.wdm'))
    
    setSelectedLogFiles(jsonFiles)
    
    // If WDM files are selected, set them as mission files
    if (wdmFiles.length > 0) {
      setSelectedMissionFiles(wdmFiles)
    }
  }

  const handleMissionFileSelect = (files: File | File[] | null) => {
    const fileArray = files ? (Array.isArray(files) ? files : [files]) : []
    const wdmFiles = fileArray.filter(file => file.name.endsWith('.wdm'))
    setSelectedMissionFiles(wdmFiles)
  }

  const handleLoadFiles = async () => {
    if (selectedLogFiles.length === 0) return
    
    clearError()
    
    // Load mission data first
    await loadMission(selectedLogFiles)
    
    // If mission files are selected, load them after the mission data
    if (selectedMissionFiles.length > 0) {
      await loadMissionSettings(selectedMissionFiles)
    }
    
    // Reset form
    setSelectedLogFiles([])
    setSelectedMissionFiles([])
    resetRef.current?.()
    missionResetRef.current?.()
  }

  const handleClearSelection = () => {
    setSelectedLogFiles([])
    setSelectedMissionFiles([])
    resetRef.current?.()
    missionResetRef.current?.()
    clearError()
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)
    
    const files = Array.from(event.dataTransfer.files)
    const jsonFiles = files.filter(file => file.name.endsWith('.json'))
    const wdmFiles = files.filter(file => file.name.endsWith('.wdm'))
    
    if (jsonFiles.length > 0) {
      setSelectedLogFiles(jsonFiles)
    }
    if (wdmFiles.length > 0) {
      setSelectedMissionFiles(wdmFiles)
    }
  }

  return (
    <Stack gap="md">
      {error && (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          color="red"
          title={t('upload.error')}
          onClose={clearError}
          withCloseButton
        >
          {error}
        </Alert>
      )}
      
{isLoading ? (
        <Paper p="xl" withBorder>
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text size="lg" fw={500}>
              {t('upload.processing')}
            </Text>
            <Text size="sm" c="dimmed">
              This may take a moment for large files
            </Text>
          </Stack>
        </Paper>
      ) : selectedLogFiles.length > 0 ? (
        <Paper p="lg" withBorder>
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Text size="lg" fw={600}>{t('upload.title')}</Text>
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconX size={14} />}
                onClick={handleClearSelection}
              >
                Clear
              </Button>
            </Group>

            {/* Selected Log Files */}
            <Stack gap="xs">
              <Text size="sm" fw={500}>Drone Log Files:</Text>
              {selectedLogFiles.map((file, index) => (
                <Group key={index} gap="xs">
                  <IconFile size={16} color="var(--mantine-color-blue-5)" />
                  <Text size="sm" truncate style={{ flex: 1 }}>
                    {file.name}
                  </Text>
                  <Badge size="sm" variant="light" color="blue">
                    {(file.size / 1024).toFixed(1)}KB
                  </Badge>
                </Group>
              ))}
            </Stack>

            <Divider />

            {/* Mission File Section */}
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Text size="sm" fw={500}>Mission Settings (Optional):</Text>
                <FileButton
                  resetRef={missionResetRef}
                  onChange={handleMissionFileSelect}
                  accept=".wdm"
                  multiple
                >
                  {(props) => (
                    <Button
                      {...props}
                      size="xs"
                      variant="light"
                      leftSection={<IconSettings size={14} />}
                    >
                      Browse .wdm
                    </Button>
                  )}
                </FileButton>
              </Group>

{selectedMissionFiles.length > 0 ? (
                <Stack gap="xs">
                  {selectedMissionFiles.map((file, index) => (
                    <Group key={index} gap="xs">
                      <IconSettings size={16} color="var(--mantine-color-green-5)" />
                      <Text size="sm" truncate style={{ flex: 1 }}>
                        {file.name}
                      </Text>
                      <Badge size="sm" variant="light" color="green">
                        {(file.size / 1024).toFixed(1)}KB
                      </Badge>
                    </Group>
                  ))}
                </Stack>
              ) : (
                <Text size="xs" c="dimmed">
                  Upload .wdm mission files for detailed mission parameters
                </Text>
              )}
            </Stack>

            <Divider />

            {/* Load Button */}
            <Group justify="center">
              <Button
                leftSection={<IconCheck size={16} />}
                onClick={handleLoadFiles}
                size="md"
                variant="filled"
              >
                Load Mission Data
              </Button>
            </Group>
          </Stack>
        </Paper>
      ) : (
        <Paper
          p="xl"
          withBorder
          style={{
            borderStyle: 'dashed',
            borderWidth: 2,
            borderColor: dragOver ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-gray-4)',
            backgroundColor: dragOver ? 'var(--mantine-color-blue-0)' : 'transparent',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Stack align="center" gap="md">
            <IconUpload size={48} color="var(--mantine-color-blue-5)" />
            <Stack align="center" gap="xs">
              <Text size="lg" fw={500}>
                {t('upload.title')}
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                {t('upload.dragDrop')}
              </Text>
            </Stack>
            
            <Group>
              <FileButton
                resetRef={resetRef}
                onChange={handleLogFilesSelect}
                accept=".json,.wdm"
                multiple
              >
                {(props) => (
                  <Button
                    {...props}
                    leftSection={<IconFile size={16} />}
                    variant="filled"
                    size="md"
                  >
                    {t('upload.button')}
                  </Button>
                )}
              </FileButton>
            </Group>
            
            <Text size="xs" c="dimmed">
              {t('upload.description')} Also supports .wdm mission files.
            </Text>
          </Stack>
        </Paper>
      )}
    </Stack>
  )
}