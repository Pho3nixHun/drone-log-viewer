import { useEffect } from "react";
import {
  MantineProvider,
  Container,
  Stack,
  Grid,
  Paper,
  Box,
} from "@mantine/core";
import "@mantine/core/styles.css";
import { MainLayout } from "./components/Layout/MainLayout";
import { FileUploader } from "./components/FileUploader/FileUploader";
import { MapViewer } from "./components/MapViewer/MapViewer";
import { MapControlsSidebar } from "./components/MapViewer/MapControlsSidebar";
import { MissionParameters } from "./components/ReportPanel/MissionParameters";
import { MissionSummary } from "./components/ReportPanel/MissionSummary";
import { FlightStats } from "./components/ReportPanel/FlightStats";
import { useMissionStore } from "./stores/missionStore";
import "./i18n/i18n";

function App() {
  const { currentMission, initWebGPU } = useMissionStore();

  // Initialize WebGPU when app loads
  useEffect(() => {
    initWebGPU();
  }, [initWebGPU]);

  return (
    <MantineProvider>
      <Box>
        <MainLayout>
          {!currentMission ? (
            <Container size="lg" py="xl">
              <Stack align="center" justify="center" h="60vh">
                <div style={{ maxWidth: 600, width: "100%" }}>
                  <FileUploader />
                </div>
              </Stack>
            </Container>
          ) : (
            <Box
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "2rem 1rem",
              }}
            >
              <Paper
                p={0}
                style={{
                  width: "210mm", // A4 width (8.27 inches)
                  backgroundColor: "white",
                  minHeight: "297mm", // A4 height (11.69 inches)
                }}
              >
                <Stack gap={0}>
                  {/* Map Section with Controls Below */}
                  <Box p="lg">
                    <Stack gap="md">
                      <MapViewer height="200mm" />
                      <Paper p="md" withBorder>
                        <MapControlsSidebar />
                      </Paper>
                    </Stack>
                  </Box>

                  {/* Reports Section - Mission Parameters on Top, Summary and Stats Below */}
                  <Box p="lg">
                    <Grid gutter="xl">
                      <Grid.Col span={12}>
                        <MissionParameters />
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <MissionSummary />
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <FlightStats />
                      </Grid.Col>
                    </Grid>
                  </Box>
                </Stack>
              </Paper>
            </Box>
          )}
        </MainLayout>
      </Box>
    </MantineProvider>
  );
}

export default App;
