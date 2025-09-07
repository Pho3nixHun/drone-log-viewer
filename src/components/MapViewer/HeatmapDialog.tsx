import { useState, useCallback } from "react";
import {
  Text,
  Box,
  Button,
  Group,
  NumberInput,
  Grid,
  Paper,
  LoadingOverlay,
  Switch,
  Tooltip,
  Tabs,
  Modal,
} from "@mantine/core";
import { IconChartDots } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useMissionStore } from "@/stores/missionStore";
import {
  filterValidDropPoints,
  calculateDensityMapAsync,
  calculateDensityMapGPU,
  type HeatmapParameters,
  type DistributionMethod,
} from "@/utils/heatmapUtils";
import {
  calculateFieldBounds,
  calculateCanvasDimensions,
} from "@/utils/canvasUtils";

// Type guard function to check if a value is a valid DistributionMethod
function isDistributionMethod(
  value: string | null,
): value is DistributionMethod {
  return (
    value === "gaussian" || value === "levy-flight" || value === "exponential"
  );
}

interface HeatmapDialogProps {
  opened: boolean;
  onClose: () => void;
}

export function HeatmapDialog({ opened, onClose }: HeatmapDialogProps) {
  const { currentMission, addHeatmapLayer, webGPUSupported, webGPUAdapter } =
    useMissionStore();
  const { t } = useTranslation();

  // Heatmap parameters - Research-based defaults
  const [parameters, setParameters] = useState<HeatmapParameters>({
    sigma: 8, // Standard deviation in meters - Based on field studies showing 8.01m mean radius
    maxDistance: 30, // Maximum distance in meters - Based on 98% dispersal within 27.5m
    insectsPerDrop: 1000, // Insects per drop point - Standard commercial capsule format
    resolution: 2, // Canvas resolution multiplier
    distributionMethod: "gaussian", // Distribution method for insect dispersal
    levyAlpha: 1.8, // Lévy flight stability parameter - Optimal foraging balance
    exponentialLambda: 0.125, // Exponential decay rate - 1/8m for 8m effective range
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [useGPU, setUseGPU] = useState(true); // User preference for GPU acceleration

  const generateHeatmap = useCallback(async () => {
    if (!currentMission?.flightLog.dropPoints) {
      return;
    }

    setIsGenerating(true);

    try {
      const dropPoints = currentMission.flightLog.dropPoints;

      // Filter out invalid coordinates (0,0 and out-of-bounds values)
      const validDropPoints = filterValidDropPoints(dropPoints);

      if (validDropPoints.length === 0) {
        return;
      }

      // Calculate field bounds
      const bounds = calculateFieldBounds(validDropPoints);

      // Calculate canvas dimensions
      const dimensions = calculateCanvasDimensions(
        bounds.fieldAspectRatio,
        750,
        600,
        parameters.resolution,
      );

      // Calculate density map - try GPU first if supported and enabled
      const shouldUseGPU =
        webGPUSupported && useGPU && validDropPoints.length > 50; // Use GPU for larger datasets

      const densityData = shouldUseGPU
        ? await calculateDensityMapGPU(
            validDropPoints,
            bounds,
            dimensions.canvasWidth,
            dimensions.canvasHeight,
            parameters,
            undefined, // No progress callback needed
            webGPUAdapter,
          )
        : await calculateDensityMapAsync(
            validDropPoints,
            bounds,
            dimensions.canvasWidth,
            dimensions.canvasHeight,
            parameters,
            undefined, // No progress callback needed
          );

      // Store heatmap data in global store for map overlay
      const layerName = `${
        parameters.distributionMethod.charAt(0).toUpperCase() +
        parameters.distributionMethod.slice(1)
      } σ=${parameters.sigma}m`;
      addHeatmapLayer(layerName, densityData, parameters);

      // Auto-close dialog on successful generation
      onClose();
    } catch (error) {
      console.error("Error generating heatmap:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [
    currentMission,
    parameters,
    webGPUSupported,
    useGPU,
    webGPUAdapter,
    addHeatmapLayer,
    onClose,
  ]);

  if (!currentMission) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("heatmap.title")}
      overlayProps={{
        blur: 3,
        style: { display: "flex", placeItems: "center" },
      }}
      withinPortal={false}
      size="lg"
    >
      <LoadingOverlay visible={isGenerating} />
      <Text size="sm" mb="md" c="dimmed">
        {t("heatmap.descriptionLong")}
      </Text>

      {/* Distribution Method Selection */}
      <Text size="sm" fw={600} mb="xs">
        {t("heatmap.distributionMethod")}
      </Text>
      <Text size="xs" c="dimmed" mb="sm">
        {t("heatmap.distributionMethodDescription")}
      </Text>

      <Tabs
        value={parameters.distributionMethod}
        onChange={(value: string | null) => {
          if (isDistributionMethod(value)) {
            setParameters((prev) => ({
              ...prev,
              distributionMethod: value,
            }));
          }
        }}
        variant="pills"
        mb="lg"
      >
        <Tabs.List mb="sm">
          <Tabs.Tab value="gaussian">
            {t("heatmap.distributionGaussian")}
          </Tabs.Tab>
          <Tabs.Tab value="levy-flight">
            {t("heatmap.distributionLevyFlight")}
          </Tabs.Tab>
          <Tabs.Tab value="exponential">
            {t("heatmap.distributionExponential")}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="gaussian">
          <Text size="xs" c="dimmed" mb="md">
            {t("heatmap.distributionGaussianDescription")}
          </Text>
        </Tabs.Panel>

        <Tabs.Panel value="levy-flight">
          <Text size="xs" c="dimmed" mb="md">
            {t("heatmap.distributionLevyFlightDescription")}
          </Text>
        </Tabs.Panel>

        <Tabs.Panel value="exponential">
          <Text size="xs" c="dimmed" mb="md">
            {t("heatmap.distributionExponentialDescription")}
          </Text>
        </Tabs.Panel>
      </Tabs>

      {/* Parameters Grid */}
      <Text size="sm" fw={600} mb="sm">
        {t("heatmap.generalParameters")}
      </Text>

      <Grid>
        {parameters.distributionMethod === "gaussian" && (
          <Grid.Col span={6}>
            <Tooltip
              label={t("heatmap.sigmaTooltip")}
              multiline
              w={220}
              position="top"
            >
              <NumberInput
                label={t("heatmap.sigma")}
                description={t("heatmap.sigmaDescription")}
                value={parameters.sigma}
                onChange={(value) =>
                  setParameters((prev) => ({
                    ...prev,
                    sigma: typeof value === "number" ? value : prev.sigma,
                  }))
                }
                min={1}
                max={50}
                step={0.5}
                size="sm"
              />
            </Tooltip>
          </Grid.Col>
        )}

        {parameters.distributionMethod === "levy-flight" && (
          <>
            <Grid.Col span={6}>
              <NumberInput
                label={t("heatmap.sigmaScale")}
                description={t("heatmap.sigmaScaleDescription")}
                value={parameters.sigma}
                onChange={(value) =>
                  setParameters((prev) => ({
                    ...prev,
                    sigma: typeof value === "number" ? value : prev.sigma,
                  }))
                }
                min={1}
                max={50}
                step={0.5}
                size="sm"
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Tooltip
                label={t("heatmap.levyAlphaTooltip")}
                multiline
                w={220}
                position="top"
              >
                <NumberInput
                  label={t("heatmap.levyAlpha")}
                  description={t("heatmap.levyAlphaDescription")}
                  value={parameters.levyAlpha}
                  onChange={(value) =>
                    setParameters((prev) => ({
                      ...prev,
                      levyAlpha:
                        typeof value === "number" ? value : prev.levyAlpha,
                    }))
                  }
                  min={1.0}
                  max={2.0}
                  step={0.1}
                  size="sm"
                />
              </Tooltip>
            </Grid.Col>
          </>
        )}

        {parameters.distributionMethod === "exponential" && (
          <Grid.Col span={6}>
            <Tooltip
              label={t("heatmap.exponentialLambdaTooltip")}
              multiline
              w={220}
              position="top"
            >
              <NumberInput
                label={t("heatmap.exponentialLambda")}
                description={t("heatmap.exponentialLambdaDescription")}
                value={parameters.exponentialLambda}
                onChange={(value) =>
                  setParameters((prev) => ({
                    ...prev,
                    exponentialLambda:
                      typeof value === "number"
                        ? value
                        : prev.exponentialLambda,
                  }))
                }
                min={0.01}
                max={1.0}
                step={0.01}
                size="sm"
              />
            </Tooltip>
          </Grid.Col>
        )}

        <Grid.Col span={6}>
          <Tooltip
            label={t("heatmap.maxDistanceTooltip")}
            multiline
            w={220}
            position="top"
          >
            <NumberInput
              label={t("heatmap.maxDistance")}
              description={t("heatmap.maxDistanceDescription")}
              value={parameters.maxDistance}
              onChange={(value) =>
                setParameters((prev) => ({
                  ...prev,
                  maxDistance:
                    typeof value === "number" ? value : prev.maxDistance,
                }))
              }
              min={10}
              max={100}
              step={5}
              size="sm"
            />
          </Tooltip>
        </Grid.Col>

        <Grid.Col span={6}>
          <Tooltip
            label={t("heatmap.insectsPerDropTooltip")}
            multiline
            w={220}
            position="top"
          >
            <NumberInput
              label={t("heatmap.insectsPerDrop")}
              description={t("heatmap.insectsPerDropDescription")}
              value={parameters.insectsPerDrop}
              onChange={(value) =>
                setParameters((prev) => ({
                  ...prev,
                  insectsPerDrop:
                    typeof value === "number" ? value : prev.insectsPerDrop,
                }))
              }
              min={100}
              max={5000}
              step={100}
              size="sm"
            />
          </Tooltip>
        </Grid.Col>

        <Grid.Col span={6}>
          <Tooltip
            label={t("heatmap.resolutionTooltip")}
            multiline
            w={220}
            position="top"
          >
            <NumberInput
              label={t("heatmap.resolution")}
              description={t("heatmap.resolutionDescription")}
              value={parameters.resolution}
              onChange={(value) =>
                setParameters((prev) => ({
                  ...prev,
                  resolution:
                    typeof value === "number" ? value : prev.resolution,
                }))
              }
              min={1}
              max={4}
              step={1}
              size="sm"
            />
          </Tooltip>
        </Grid.Col>
      </Grid>

      {/* GPU Acceleration Toggle */}
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
            onChange={(event) => setUseGPU(event.currentTarget.checked)}
            disabled={!webGPUSupported}
          />
        </Group>
      </Paper>

      {/* Generate Heatmap Button */}
      <Group justify="center" mt="md">
        <Button
          leftSection={<IconChartDots size={16} />}
          onClick={generateHeatmap}
          loading={isGenerating}
          disabled={!currentMission?.flightLog.dropPoints || isGenerating}
          size="sm"
        >
          {t("heatmap.generate")}
        </Button>
      </Group>
    </Modal>
  );
}
