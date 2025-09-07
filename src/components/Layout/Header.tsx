import { Group, Title, Text, Button, SegmentedControl } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useMissionStore } from "@/stores/missionStore";

export function Header() {
  const { reset, currentMission } = useMissionStore();
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value);
  };

  return (
    <Group
      justify="space-between"
      p="sm"
      style={{
        borderBottom: currentMission
          ? "none"
          : "1px solid var(--mantine-color-gray-3)",
        minHeight: currentMission ? "60px" : "80px",
      }}
    >
      <div>
        <Title order={currentMission ? 3 : 2}>{t("nav.title")}</Title>
        {!currentMission && (
          <Text size="sm" c="dimmed">
            {t("upload.description")}
          </Text>
        )}
      </div>

      <Group gap="sm">
        <SegmentedControl
          size="xs"
          value={i18n.language}
          onChange={handleLanguageChange}
          data={[
            { label: "EN", value: "en" },
            { label: "HU", value: "hu" },
          ]}
        />

        {currentMission && (
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="subtle"
            size="sm"
            onClick={reset}
          >
            {t("upload.button")}
          </Button>
        )}
      </Group>
    </Group>
  );
}
