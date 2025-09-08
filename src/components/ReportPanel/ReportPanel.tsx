import { Grid } from "@mantine/core";
import { MissionParameters } from "./MissionParameters";
import { MissionSummary } from "./MissionSummary";
import { FlightStats } from "./FlightStats";
import { useMissionStore } from "@/stores/missionStore";

export function ReportPanel() {
  const { currentMission } = useMissionStore();

  if (!currentMission) return null;

  return (
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
  );
}
