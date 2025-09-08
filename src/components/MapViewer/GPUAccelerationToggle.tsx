import { Text, Box, Group, Paper, Switch } from "@mantine/core";
import { useTranslation } from "react-i18next";

interface GPUAccelerationToggleProps {
  webGPUSupported?: boolean | null;
  useGPU: boolean;
  onToggle: (enabled: boolean) => void;
}

export function GPUAccelerationToggle({ 
  webGPUSupported, 
  useGPU, 
  onToggle 
}: GPUAccelerationToggleProps) {
  const { t } = useTranslation();

  return (
    <Paper
      p="sm"
      mt="md"
      style={{ backgroundColor: "var(--mantine-color-gray-0)" }}
    >
      <Group justify="space-between">
        <Box>
          <Text size="sm" fw={500}>
            {t("heatmap.gpuAcceleration")}
          </Text>
          <Text size="xs" c="dimmed">
            {webGPUSupported === undefined
              ? t("heatmap.gpuChecking")
              : webGPUSupported
                ? t("heatmap.gpuSupported")
                : t("heatmap.gpuNotSupported")}
          </Text>
        </Box>
        <Switch
          checked={webGPUSupported ? useGPU : false}
          onChange={(event) => onToggle(event.currentTarget.checked)}
          disabled={!webGPUSupported}
        />
      </Group>
    </Paper>
  );
}