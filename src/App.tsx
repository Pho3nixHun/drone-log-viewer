import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import { Container, Stack, Grid, Paper, Box } from '@mantine/core'
import { MainLayout } from './components/Layout/MainLayout'
import { FileUploader } from './components/FileUploader/FileUploader'
import { MapViewer } from './components/MapViewer/MapViewer'
import { MissionSummary } from './components/ReportPanel/MissionSummary'
import { FlightStats } from './components/ReportPanel/FlightStats'
import { TrichogrammaCanvas } from './components/TrichogrammaCanvas/TrichogrammaCanvas'
import { useMissionStore } from './stores/missionStore'

function App() {
  const { currentMission } = useMissionStore()

  return (
    <MantineProvider>
      <Box>
        <MainLayout>
          {!currentMission ? (
            <Container size="lg" py="xl">
              <Stack align="center" justify="center" h="60vh">
                <div style={{ maxWidth: 600, width: '100%' }}>
                  <FileUploader />
                </div>
              </Stack>
            </Container>
          ) : (
            <Box style={{ display: 'flex', justifyContent: 'center', padding: '2rem 1rem' }}>
              <Paper 
                shadow="lg" 
                p={0}
                style={{ 
                  width: '210mm', // A4 width (8.27 inches)
                  backgroundColor: 'white',
                  minHeight: '297mm', // A4 height (11.69 inches)
                  border: '1px solid #e9ecef'
                }}
              >
              <Stack gap={0}>
                {/* Map Section - Full Width */}
                <Box 
                  p="lg"
                  style={{ 
                    borderBottom: '2px solid #f1f3f4',
                  }}
                >
                  <MapViewer height="260mm" />
                </Box>
                
                {/* Reports Section - Two Columns */}
                <Box p="lg" style={{ borderBottom: '2px solid #f1f3f4', pageBreakBefore: 'always' }}>
                  <Grid gutter="xl">
                    <Grid.Col span={6}>
                      <MissionSummary />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <FlightStats />
                    </Grid.Col>
                  </Grid>
                </Box>
                
                {/* Trichogramma Density Canvas - Full Width */}
                <Box p="lg">
                  <TrichogrammaCanvas />
                </Box>
              </Stack>
            </Paper>
            </Box>
          )}
        </MainLayout>
      </Box>
    </MantineProvider>
  )
}

export default App
