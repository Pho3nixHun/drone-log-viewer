import { Card, Text, Group, Stack, Badge, Divider, Grid } from "@mantine/core";
import {
  IconSettings,
  IconRuler,
  IconMountain,
  IconGauge,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useMissionStore } from "@/stores/missionStore";
import type { MissionSettings } from "@/types/mission";

export function MissionParameters() {
  const { currentMission } = useMissionStore();
  const { t } = useTranslation();

  if (
    !currentMission?.missionSettings ||
    currentMission.missionSettings.length === 0
  )
    return null;

  // Split mission settings into two columns
  const leftColumnSettings = currentMission.missionSettings.filter(
    (_, index) => index % 2 === 0,
  );
  const rightColumnSettings = currentMission.missionSettings.filter(
    (_, index) => index % 2 === 1,
  );

  const renderMissionCard = (
    settings: MissionSettings,
    originalIndex: number,
  ) => (
    <Stack
      key={settings.filename || `wdm-${originalIndex}`}
      gap="sm"
      p="sm"
      style={{
        backgroundColor: "var(--mantine-color-green-0)",
        borderRadius: "var(--mantine-radius-sm)",
        border: "1px solid var(--mantine-color-green-2)",
      }}
    >
      <Group gap="xs" mb="xs">
        <IconSettings size={16} color="var(--mantine-color-green-6)" />
        <Text size="sm" fw={600}>
          {settings.info.name}
        </Text>
        <Badge size="xs" variant="light" color="green">
          {settings.filename
            ? settings.filename.replace(".wdm", "")
            : `WDM ${originalIndex + 1}`}
        </Badge>
      </Group>

      <Group gap="sm">
        <IconRuler size={16} color="var(--mantine-color-green-5)" />
        <div style={{ flex: 1 }}>
          <Text size="sm" fw={500}>
            {t("mission.lineSpacing")}
          </Text>
          <Text size="sm" c="dimmed">
            {settings.missionParams.dBL}m
          </Text>
        </div>
        <div style={{ textAlign: "right" }}>
          <Text size="xs" c="dimmed">
            {t("mission.fieldArea")}
          </Text>
          <Text size="sm">{settings.info.areaCalc.toFixed(2)} ha</Text>
        </div>
      </Group>

      <Group gap="sm">
        <IconMountain size={16} color="var(--mantine-color-green-5)" />
        <div style={{ flex: 1 }}>
          <Text size="sm" fw={500}>
            {t("mission.altitude")}
          </Text>
          <Text size="sm" c="dimmed">
            {settings.missionParams.altitude}m
          </Text>
        </div>
        <div style={{ textAlign: "right" }}>
          <Text size="xs" c="dimmed">
            {t("mission.speed")}
          </Text>
          <Text size="sm">{settings.missionParams.speed} m/s</Text>
        </div>
      </Group>

      <Group gap="sm">
        <IconGauge size={16} color="var(--mantine-color-green-5)" />
        <div style={{ flex: 1 }}>
          <Text size="sm" fw={500}>
            {t("mission.angle")}
          </Text>
          <Text size="sm" c="dimmed">
            {settings.missionParams.angle.toFixed(1)}°
          </Text>
        </div>
        <div style={{ textAlign: "right" }}>
          <Text size="xs" c="dimmed">
            {t("mission.dropDistance")}
          </Text>
          <Text size="sm">{settings.missionParams.dTFB}</Text>
        </div>
      </Group>
    </Stack>
  );

  return (
    <Card withBorder p="lg" h="100%" style={{ backgroundColor: "#fafbfc" }}>
      <Stack gap="md">
        <div>
          <Text size="lg" fw={600}>
            {t("mission.parametersTitle")}
          </Text>
          <Text size="sm" c="dimmed">
            {t("mission.parametersSubtitle")}
          </Text>
        </div>

        <Divider />

        <Grid gutter="xl">
          <Grid.Col span={6}>
            <Stack gap="md">
              {leftColumnSettings.map((settings, index) =>
                renderMissionCard(settings, index * 2),
              )}
            </Stack>
          </Grid.Col>

          <Grid.Col span={6}>
            <Stack gap="md">
              {rightColumnSettings.map((settings, index) =>
                renderMissionCard(settings, index * 2 + 1),
              )}
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Card>
  );
}
