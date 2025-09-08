import { SegmentedControl, Group, Text } from "@mantine/core";
import { IconMap, IconSatellite } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useMissionStore } from "@/stores/missionStore";

export function TileLayerControls() {
  const { tileLayer, setTileLayer } = useMissionStore();
  const { t } = useTranslation();

  return (
    <SegmentedControl
      size="xs"
      value={tileLayer}
      onChange={(value) => setTileLayer(value as "osm" | "satellite")}
      data={[
        {
          value: "osm",
          label: (
            <Group gap="xs">
              <IconMap size={14} />
              <Text size="xs">{t("controls.map")}</Text>
            </Group>
          ),
        },
        {
          value: "satellite",
          label: (
            <Group gap="xs">
              <IconSatellite size={14} />
              <Text size="xs">{t("controls.satellite")}</Text>
            </Group>
          ),
        },
      ]}
    />
  );
}