import { useState, useRef } from 'react'
import { FileButton, Button, Text, Paper, Group, Stack, Alert, Loader } from '@mantine/core'
import { IconUpload, IconFile, IconAlertCircle } from '@tabler/icons-react'
import { useMissionStore } from '../../stores/missionStore'

export function FileUploader() {
  const [dragOver, setDragOver] = useState(false)
  const resetRef = useRef<() => void>(null)
  
  const { loadMission, isLoading, error, clearError } = useMissionStore()

  const handleFileSelect = async (file: File | null) => {
    if (file) {
      clearError()
      await loadMission(file)
      resetRef.current?.()
    }
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
    const jsonFile = files.find(file => file.name.endsWith('.json'))
    
    if (jsonFile) {
      handleFileSelect(jsonFile)
    }
  }

  return (
    <Stack gap="md">
      {error && (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          color="red"
          title="Error loading file"
          onClose={clearError}
          withCloseButton
        >
          {error}
        </Alert>
      )}
      
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
          {isLoading ? (
            <>
              <Loader size="lg" />
              <Text size="lg" fw={500}>
                Processing drone log file...
              </Text>
              <Text size="sm" c="dimmed">
                This may take a moment for large files
              </Text>
            </>
          ) : (
            <>
              <IconUpload size={48} color="var(--mantine-color-blue-5)" />
              <Stack align="center" gap="xs">
                <Text size="lg" fw={500}>
                  Upload Drone Log File
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Drag and drop your JSON log file here or click to browse
                </Text>
              </Stack>
              
              <Group>
                <FileButton
                  resetRef={resetRef}
                  onChange={handleFileSelect}
                  accept=".json"
                  disabled={isLoading}
                >
                  {(props) => (
                    <Button
                      {...props}
                      leftSection={<IconFile size={16} />}
                      variant="filled"
                      size="md"
                    >
                      Select File
                    </Button>
                  )}
                </FileButton>
              </Group>
              
              <Text size="xs" c="dimmed">
                Supported: JSON files up to 10MB
              </Text>
            </>
          )}
        </Stack>
      </Paper>
    </Stack>
  )
}