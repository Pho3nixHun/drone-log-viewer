import {
  Stack,
  Switch,
  Text,
  Group,
  Badge,
} from "@mantine/core";
import {
  IconDroplet,
  IconRoute,
  IconPolygon,
  IconMapPin,
  IconTarget,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useMissionStore } from "@/stores/missionStore";

export function LayerToggleSection() {
  const {
    selectedLayers,
    toggleLayer,
    currentMission,
  } = useMissionStore();
  const { t } = useTranslation();

  if (!currentMission) return null;

  const { dropPoints, waypoints } = currentMission.flightLog;

  // Count total mission waypoints from all WDM files
  const totalMissionWaypoints =
    currentMission.missionSettings?.reduce((total, settings) => {
      return total + (settings.missionWaypoints?.length || 0);
    }, 0) || 0;

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Group gap="xs">
          <IconDroplet size={16} color="var(--mantine-color-blue-5)" />
          <Text size="xs">{t("map.dropPoints")}</Text>
          <Badge size="xs" variant="light" color="blue">
            {dropPoints.length}
          </Badge>
        </Group>
        <Switch
          size="sm"
          checked={selectedLayers.has("dropPoints")}
          onChange={() => toggleLayer("dropPoints")}
        />
      </Group>

      <Group justify="space-between">
        <Group gap="xs">
          <IconRoute size={16} color="var(--mantine-color-yellow-6)" />
          <Text size="xs">{t("map.waypoints")}</Text>
          <Badge size="xs" variant="light" color="yellow">
            {waypoints.length}
          </Badge>
        </Group>
        <Switch
          size="sm"
          checked={selectedLayers.has("waypoints")}
          onChange={() => toggleLayer("waypoints")}
        />
      </Group>

      <Group justify="space-between">
        <Group gap="xs">
          <IconPolygon size={16} color="var(--mantine-color-green-5)" />
          <Text size="xs">{t("layers.fieldPolygons")}</Text>
        </Group>
        <Switch
          size="sm"
          checked={selectedLayers.has("polygon")}
          onChange={() => toggleLayer("polygon")}
        />
      </Group>

      {totalMissionWaypoints > 0 && (
        <Group justify="space-between">
          <Group gap="xs">
            <IconMapPin size={16} color="var(--mantine-color-violet-5)" />
            <Text size="xs">{t("map.missionWaypoints")}</Text>
            <Badge size="xs" variant="light" color="violet">
              {totalMissionWaypoints}
            </Badge>
          </Group>
          <Switch
            size="sm"
            checked={selectedLayers.has("missionWaypoints")}
            onChange={() => toggleLayer("missionWaypoints")}
          />
        </Group>
      )}

      {currentMission.missionSettings &&
        currentMission.missionSettings.length >= 1 && (
          <Group justify="space-between">
            <Group gap="xs">
              <IconTarget size={16} color="var(--mantine-color-orange-6)" />
              <Text size="xs">{t("layers.combinedArea")}</Text>
              <Badge size="xs" variant="light" color="orange">
                UNION
              </Badge>
            </Group>
            <Switch
              size="sm"
              checked={selectedLayers.has("polygonUnion")}
              onChange={() => toggleLayer("polygonUnion")}
            />
          </Group>
        )}
    </Stack>
  );
}