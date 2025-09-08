import { useState, useCallback } from "react";
import {
  Text,
  Button,
  Group,
  LoadingOverlay,
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
} from "@/utils/heatmapUtils";
import {
  calculateFieldBounds,
  calculateCanvasDimensions,
} from "@/utils/canvasUtils";
import { DistributionSelector } from "./DistributionSelector";
import { HeatmapParameterForm } from "./HeatmapParameterForm";
import { GPUAccelerationToggle } from "./GPUAccelerationToggle";

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

      <DistributionSelector 
        value={parameters.distributionMethod} 
        onChange={(method) => setParameters(prev => ({ ...prev, distributionMethod: method }))}
      />

      <HeatmapParameterForm 
        parameters={parameters} 
        onChange={setParameters} 
      />

      <GPUAccelerationToggle
        webGPUSupported={webGPUSupported}
        useGPU={useGPU}
        onToggle={setUseGPU}
      />

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
