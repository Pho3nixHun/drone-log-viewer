import { Stack, Text, Divider } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useMissionStore } from "@/stores/missionStore";
import { TileLayerControls } from "./TileLayerControls";
import { LayerToggleSection } from "./LayerToggleSection";
import { HeatmapControls } from "./HeatmapControls";
import { SourceFileControls } from "./SourceFileControls";
import { ExportControls } from "./ExportControls";
import { MapLegend } from "./MapLegend";

export function LayerControls() {
  const { currentMission } = useMissionStore();
  const { t } = useTranslation();

  if (!currentMission) return null;

  return (
    <Stack gap="sm">
      <Text size="sm" fw={600}>
        {t("map.layers")}
      </Text>

      <TileLayerControls />

      <Divider />

      <Text size="sm" fw={600}>
        {t("layers.dataLayers")}
      </Text>

      <LayerToggleSection />

      <HeatmapControls />

      {currentMission.sourceFiles && currentMission.sourceFiles.length >= 1 && (
        <>
          <Divider />
          <Text size="sm" fw={600}>
            {t("layers.sourceFiles")}
          </Text>
          <SourceFileControls />
        </>
      )}

      <Divider />

      <ExportControls />

      <Divider />

      <MapLegend />
    </Stack>
  );
}
