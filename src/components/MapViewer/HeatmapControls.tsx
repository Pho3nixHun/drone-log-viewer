import {
  Stack,
  Switch,
  Text,
  Group,
  Button,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChartDots,
  IconTrash,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useMissionStore } from "@/stores/missionStore";
import type { LayerType } from "@/types/mission";
import { HeatmapDialog } from "./HeatmapDialog";

export function HeatmapControls() {
  const {
    selectedLayers,
    heatmapLayers,
    removeHeatmapLayer,
    toggleHeatmapLayer,
  } = useMissionStore();
  const { t } = useTranslation();
  const [heatmapOpened, { open: openHeatmap, close: closeHeatmap }] =
    useDisclosure(false);

  return (
    <>
      <Stack gap="xs">
        {heatmapLayers.map((layer) => (
          <Group key={layer.id} justify="space-between">
            <Group gap="xs">
              <IconChartDots size={16} color="var(--mantine-color-red-5)" />
              <Text size="xs" style={{ flex: 1 }}>
                {layer.name}
              </Text>
              <Tooltip
                label={
                  <Stack gap={4}>
                    <Text size="xs" fw={500}>
                      {t("layers.heatmapParameters")}:
                    </Text>
                    <Text size="xs">
                      {t("layers.heatmapMethod")}: {layer.parameters.distributionMethod}
                    </Text>
                    <Text size="xs">{t("layers.heatmapSigma")}: {layer.parameters.sigma}m</Text>
                    <Text size="xs">
                      {t("layers.heatmapMaxDistance")}: {layer.parameters.maxDistance}m
                    </Text>
                    <Text size="xs">
                      {t("layers.heatmapInsectsPerDrop")}: {layer.parameters.insectsPerDrop}
                    </Text>
                    {layer.parameters.levyAlpha && (
                      <Text size="xs">{t("layers.heatmapAlpha")}: {layer.parameters.levyAlpha}</Text>
                    )}
                    {layer.parameters.exponentialLambda && (
                      <Text size="xs">
                        {t("layers.heatmapLambda")}: {layer.parameters.exponentialLambda}
                      </Text>
                    )}
                    <Text size="xs" c="dimmed">
                      {t("layers.heatmapCreated")}: {layer.createdAt.toLocaleTimeString()}
                    </Text>
                  </Stack>
                }
                multiline
                position="left"
              >
                <IconInfoCircle
                  size={14}
                  color="var(--mantine-color-gray-5)"
                  style={{ cursor: "help" }}
                />
              </Tooltip>
              <Button
                size="xs"
                variant="subtle"
                color="red"
                onClick={() => removeHeatmapLayer(layer.id)}
                p={2}
                title={`Remove ${layer.name}`}
              >
                <IconTrash size={10} />
              </Button>
            </Group>
            <Switch
              size="sm"
              checked={selectedLayers.has(`heatmap-${layer.id}` as LayerType)}
              onChange={() => toggleHeatmapLayer(layer.id)}
            />
          </Group>
        ))}

        <Button
          size="xs"
          variant="light"
          color="orange"
          leftSection={<IconChartDots size={14} />}
          onClick={openHeatmap}
          fullWidth
          mt="xs"
        >
          {t("heatmap.generate")}
        </Button>
      </Stack>

      <HeatmapDialog opened={heatmapOpened} onClose={closeHeatmap} />
    </>
  );
}