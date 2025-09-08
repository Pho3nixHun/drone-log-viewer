import { Stack, Text, Group } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useMissionStore } from "@/stores/missionStore";

export function MapLegend() {
  const { currentMission, selectedLayers } = useMissionStore();
  const { t } = useTranslation();

  if (!currentMission) return null;

  // Count total mission waypoints from all WDM files
  const totalMissionWaypoints =
    currentMission.missionSettings?.reduce((total, settings) => {
      return total + (settings.missionWaypoints?.length || 0);
    }, 0) || 0;

  return (
    <Stack gap="xs">
      <Text size="xs" fw={500}>
        {t("layers.legend")}
      </Text>
      
      <Group gap="xs">
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            backgroundColor: "var(--mantine-color-blue-5)",
          }}
        />
        <Text size="xs" c="dimmed">
          {t("layers.dropPointsLegend")}
        </Text>
      </Group>
      
      <Group gap="xs">
        <div
          style={{
            width: 12,
            height: 3,
            backgroundColor: "var(--mantine-color-yellow-6)",
          }}
        />
        <Text size="xs" c="dimmed">
          {t("layers.flightPathLegend")}
        </Text>
      </Group>
      
      <Group gap="xs">
        <div
          style={{
            width: 12,
            height: 12,
            border: "2px solid var(--mantine-color-green-5)",
            backgroundColor: "rgba(var(--mantine-color-green-5-rgb), 0.2)",
          }}
        />
        <Text size="xs" c="dimmed">
          {t("layers.individualFieldBoundaries")}
        </Text>
      </Group>

      {totalMissionWaypoints > 0 && (
        <Group gap="xs">
          <div
            style={{
              width: 12,
              height: 3,
              backgroundColor: "var(--mantine-color-violet-5)",
              border: "1px dashed var(--mantine-color-violet-7)",
            }}
          />
          <Text size="xs" c="dimmed">
            {t("layers.missionRouteLegend")}
          </Text>
        </Group>
      )}

      {currentMission.missionSettings &&
        currentMission.missionSettings.length >= 1 &&
        selectedLayers.has("polygonUnion") && (
          <Group gap="xs">
            <div
              style={{
                width: 12,
                height: 12,
                border: "3px dashed #ff6b35",
                backgroundColor: "rgba(255, 107, 53, 0.15)",
              }}
            />
            <Text size="xs" c="dimmed">
              {t("layers.totalCoverageArea")}
            </Text>
          </Group>
        )}
    </Stack>
  );
}