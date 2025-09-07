import { Stack } from "@mantine/core";
import { MissionSummary } from "./MissionSummary";
import { FlightStats } from "./FlightStats";
import { useMissionStore } from "@/stores/missionStore";

export function ReportPanel() {
  const { currentMission } = useMissionStore();

  if (!currentMission) return null;

  return (
    <Stack gap="xl">
      <MissionSummary />
      <FlightStats />
    </Stack>
  );
}
