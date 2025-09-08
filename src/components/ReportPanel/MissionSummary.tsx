import { Card, Text, Group, Stack, Badge, Divider } from "@mantine/core";
import {
  IconDrone,
  IconUser,
  IconCalendar,
  IconClock,
  IconMapPin,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useMissionStore } from "@/stores/missionStore";
import { formatDate, formatDateShort } from "@/utils/dateHelpers";

export function MissionSummary() {
  const { currentMission, missionStats } = useMissionStore();
  const { t } = useTranslation();

  if (!currentMission || !missionStats) return null;

  const { flightLog } = currentMission;

  return (
    <Card withBorder p="lg" h="100%" style={{ backgroundColor: "#fafbfc" }}>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text size="lg" fw={600}>
              {t("mission.title")}
            </Text>
            <Text size="sm" c="dimmed">
              {t("mission.subtitle")}
            </Text>
          </div>
          <Badge color="green" variant="light">
            {currentMission.uploaded
              ? t("mission.uploaded")
              : t("mission.local")}
          </Badge>
        </Group>

        <Divider />

        <Stack gap="sm">
          <Group gap="sm">
            <IconDrone size={16} color="var(--mantine-color-blue-5)" />
            <div style={{ flex: 1 }}>
              <Text size="sm" fw={500}>
                {t("mission.drone")}
              </Text>
              <Text size="sm" c="dimmed">
                Drone Biotech TrichoDrone v1.21
              </Text>
            </div>
            <div style={{ textAlign: "right" }}>
              <Text size="xs" c="dimmed">
                {t("mission.appVersion")}
              </Text>
              <Text size="sm">{currentMission.appVersion}</Text>
            </div>
          </Group>

          <Group gap="sm">
            <IconUser size={16} color="var(--mantine-color-green-5)" />
            <div style={{ flex: 1 }}>
              <Text size="sm" fw={500}>
                {t("mission.pilot")}
              </Text>
              <Text size="sm" c="dimmed">
                {flightLog.pilotName}
              </Text>
            </div>
          </Group>

          <Group gap="sm">
            <IconMapPin size={16} color="var(--mantine-color-red-5)" />
            <div style={{ flex: 1 }}>
              <Text size="sm" fw={500}>
                {t("mission.field")}
              </Text>
              <Text size="sm" c="dimmed">
                {currentMission.fieldName}
              </Text>
            </div>
          </Group>

          <Divider />

          <Group gap="sm">
            <IconCalendar size={16} color="var(--mantine-color-indigo-5)" />
            <div style={{ flex: 1 }}>
              <Text size="sm" fw={500}>
                {t("mission.date")}
              </Text>
              <Text size="sm" c="dimmed">
                {formatDateShort(flightLog.flightDate)}
              </Text>
            </div>
          </Group>

          <Group gap="sm">
            <IconClock size={16} color="var(--mantine-color-orange-5)" />
            <div style={{ flex: 1 }}>
              <Text size="sm" fw={500}>
                {t("mission.startTime")}
              </Text>
              <Text size="sm" c="dimmed">
                {formatDate(flightLog.startDate)}
              </Text>
            </div>
          </Group>

          <Group gap="sm">
            <IconClock size={16} color="var(--mantine-color-orange-5)" />
            <div style={{ flex: 1 }}>
              <Text size="sm" fw={500}>
                {t("mission.endTime")}
              </Text>
              <Text size="sm" c="dimmed">
                {formatDate(flightLog.endDate)}
              </Text>
            </div>
          </Group>
        </Stack>
      </Stack>
    </Card>
  );
}
