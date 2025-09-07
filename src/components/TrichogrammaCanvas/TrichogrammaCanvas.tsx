import { useEffect, useRef, useState, useCallback } from "react";
import {
  Text,
  Box,
  Button,
  Group,
  NumberInput,
  Grid,
  Paper,
  LoadingOverlay,
  Progress,
  Switch,
  Tooltip,
  Tabs,
  Card,
} from "@mantine/core";
import { IconChartDots, IconSettings } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useMissionStore } from "../../stores/missionStore";
import { applyThermalColors } from "../../utils/thermalColors";
import {
  calculateFieldBounds,
  calculateCanvasDimensions,
  setupCanvas as setupCanvasElement,
  clearCanvas,
} from "../../utils/canvasUtils";
import {
  filterValidDropPoints,
  calculateDensityMapAsync,
  calculateDensityMapGPU,
  calculateLocalDensityPerArea,
  type HeatmapParameters,
  type DensityMapData,
  type DistributionMethod,
} from "../../utils/heatmapUtils";

// Type guard function to check if a value is a valid DistributionMethod
function isDistributionMethod(
  value: string | null,
): value is DistributionMethod {
  return (
    value === "gaussian" || value === "levy-flight" || value === "exponential"
  );
}

export function TrichogrammaCanvas() {
  const { currentMission, addHeatmapLayer } = useMissionStore();
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const densityMapRef = useRef<DensityMapData | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    density: number;
    insectsPerSquareMeter: number;
    sampleAreaMeters: number;
    coverage: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    density: 0,
    insectsPerSquareMeter: 0,
    sampleAreaMeters: 1,
    coverage: "",
  });

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
  const [isHeatmapGenerated, setIsHeatmapGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [webgpuSupported, setWebGPUSupported] = useState<boolean | undefined>(
    undefined,
  );
  const [useGPU, setUseGPU] = useState(true); // User preference for GPU acceleration

  // Detect WebGPU support on component mount
  useEffect(() => {
    if (!("gpu" in navigator)) {
      setWebGPUSupported(false);
    }
    // Test async adapter request
    navigator.gpu
      .requestAdapter()
      .then((adapter) => setWebGPUSupported(!!adapter))
      .catch(() => setWebGPUSupported(false));
  }, []);

  const setupCanvas = useCallback(() => {
    if (!currentMission?.flightLog.dropPoints || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const dropPoints = currentMission.flightLog.dropPoints;

    // Filter out invalid coordinates
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

    // Setup canvas with proper scaling
    const ctx = setupCanvasElement(canvas, dimensions, parameters.resolution);
    if (!ctx) return;

    // Clear canvas
    clearCanvas(ctx, dimensions.displayWidth, dimensions.displayHeight);

    setIsHeatmapGenerated(false);
  }, [currentMission, parameters]);

  // Initialize canvas with basic setup
  useEffect(() => {
    if (!currentMission?.flightLog.dropPoints || !canvasRef.current) return;

    // Just set up canvas dimensions without generating heatmap
    setupCanvas();
  }, [currentMission, setupCanvas]);

  const generateHeatmap = useCallback(async () => {
    if (!currentMission?.flightLog.dropPoints || !canvasRef.current) {
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      const canvas = canvasRef.current;
      const dropPoints = currentMission.flightLog.dropPoints;

      // Filter out invalid coordinates
      const validDropPoints = filterValidDropPoints(dropPoints);
      if (validDropPoints.length === 0) {
        setIsGenerating(false);
        return;
      }

      // Calculate field bounds and canvas dimensions
      const bounds = calculateFieldBounds(validDropPoints);
      const dimensions = calculateCanvasDimensions(
        bounds.fieldAspectRatio,
        750,
        600,
        parameters.resolution,
      );

      // Setup canvas
      const ctx = setupCanvasElement(canvas, dimensions, parameters.resolution);
      if (!ctx) {
        setIsGenerating(false);
        return;
      }

      // Clear canvas
      clearCanvas(ctx, dimensions.displayWidth, dimensions.displayHeight);

      // Calculate density map - try GPU first if supported and enabled
      const shouldUseGPU =
        webgpuSupported && useGPU && validDropPoints.length > 50; // Use GPU for larger datasets

      const densityData = shouldUseGPU
        ? await calculateDensityMapGPU(
            validDropPoints,
            bounds,
            dimensions.canvasWidth,
            dimensions.canvasHeight,
            parameters,
            (current, total) => {
              setGenerationProgress(Math.round((current / total) * 100));
            },
          )
        : await calculateDensityMapAsync(
            validDropPoints,
            bounds,
            dimensions.canvasWidth,
            dimensions.canvasHeight,
            parameters,
            (current, total) => {
              setGenerationProgress(Math.round((current / total) * 100));
            },
          );

      // Create normalized density map for color mapping
      const normalizedDensityMap = new Float32Array(
        dimensions.canvasWidth * dimensions.canvasHeight,
      );
      for (let i = 0; i < densityData.densityData.length; i++) {
        normalizedDensityMap[i] =
          densityData.densityData[i] / densityData.maxDensity;
      }

      // Apply thermal colors to image data
      const imageData = ctx.createImageData(
        dimensions.canvasWidth,
        dimensions.canvasHeight,
      );
      applyThermalColors(
        imageData,
        normalizedDensityMap,
        dimensions.canvasWidth,
        dimensions.canvasHeight,
      );

      // Draw the heatmap
      ctx.putImageData(imageData, 0, 0);

      // Store density map data for tooltip
      densityMapRef.current = densityData;

      // Store heatmap data in global store for map overlay
      const layerName = `${parameters.distributionMethod.charAt(0).toUpperCase() + parameters.distributionMethod.slice(1)} σ=${parameters.sigma}m`;
      addHeatmapLayer(layerName, densityData, parameters);

      setIsHeatmapGenerated(true);
    } catch (error) {
      console.error("Error generating heatmap:", error);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  }, [currentMission, parameters, webgpuSupported, useGPU, addHeatmapLayer]);

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!densityMapRef.current || !canvasRef.current || !isHeatmapGenerated)
      return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert display coordinates to canvas coordinates
    const scaleX = densityMapRef.current.canvasWidth / rect.width;
    const scaleY = densityMapRef.current.canvasHeight / rect.height;
    const canvasX = Math.floor(x * scaleX);
    const canvasY = Math.floor(y * scaleY);

    // Get density value at this pixel
    const pixelIndex = canvasY * densityMapRef.current.canvasWidth + canvasX;
    const density = densityMapRef.current.densityData[pixelIndex] || 0;
    const normalizedDensity = density / densityMapRef.current.maxDensity;

    // Calculate average insect density per square meter in local area
    const areaAnalysis = calculateLocalDensityPerArea(
      canvasX,
      canvasY,
      densityMapRef.current,
      parameters.insectsPerDrop,
      1, // Sample 1 square meter area
    );

    // Calculate GPS coordinates
    const lngProgress = canvasX / densityMapRef.current.canvasWidth;
    const latProgress =
      (densityMapRef.current.canvasHeight - canvasY) /
      densityMapRef.current.canvasHeight;

    const gpsLng =
      densityMapRef.current.boundedMinLng +
      lngProgress * densityMapRef.current.boundedLngRange;
    const gpsLat =
      densityMapRef.current.boundedMinLat +
      latProgress * densityMapRef.current.boundedLatRange;

    // Update tooltip
    setTooltip({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      density: normalizedDensity,
      insectsPerSquareMeter: areaAnalysis.insectsPerSquareMeter,
      sampleAreaMeters: areaAnalysis.sampleAreaMeters,
      coverage: `${gpsLat.toFixed(6)}, ${gpsLng.toFixed(6)}`,
    });
  };

  const handleMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  if (!currentMission) return null;

  return (
    <Card withBorder p="lg" style={{ backgroundColor: "#fafbfc" }}>
      <Box>
        <Text size="lg" fw={600} mb="md">
          {t("heatmap.title")}
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          {t("heatmap.descriptionLong")}
        </Text>

        {/* Parameters Form */}
        <Paper
          p="md"
          mb="md"
          withBorder
          style={{ backgroundColor: "#f8f9fa", position: "relative" }}
        >
          <LoadingOverlay visible={isGenerating} />

          <Group align="center" mb="sm">
            <IconSettings size={16} />
            <Text size="sm" fw={600}>
              {t("heatmap.parameters")}
            </Text>
          </Group>

          <Text size="sm" fw={500} mb="xs">
            {t("heatmap.distributionMethod")}
          </Text>
          <Text size="xs" c="dimmed" mb="md">
            {t("heatmap.distributionMethodDescription")}
          </Text>

          <Tabs
            value={parameters.distributionMethod}
            onChange={(value) => {
              // Use type guard to ensure value is a valid DistributionMethod
              if (isDistributionMethod(value)) {
                setParameters((prev) => ({
                  ...prev,
                  distributionMethod: value,
                }));
              }
            }}
            keepMounted={false}
          >
            <Tabs.List grow>
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

            <Tabs.Panel value="gaussian" pt="md">
              <Box
                mb="md"
                p="xs"
                style={{ backgroundColor: "#f1f3f4", borderRadius: "4px" }}
              >
                <Text size="xs" c="dimmed">
                  <strong>{t("heatmap.distributionGaussian")}:</strong>{" "}
                  {t("heatmap.distributionGaussianDescription")}
                </Text>
              </Box>

              <Grid>
                <Grid.Col span={6}>
                  <Tooltip
                    label={t("heatmap.sigmaTooltip")}
                    multiline
                    withArrow
                  >
                    <NumberInput
                      label={t("heatmap.sigma")}
                      description={t("heatmap.sigmaDescription")}
                      value={parameters.sigma}
                      onChange={(value) =>
                        setParameters((prev) => ({
                          ...prev,
                          sigma: Number(value) || 5,
                        }))
                      }
                      disabled={isGenerating}
                      min={1}
                      max={50}
                      step={0.5}
                      size="sm"
                    />
                  </Tooltip>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Tooltip
                    label={t("heatmap.maxDistanceTooltip")}
                    multiline
                    withArrow
                  >
                    <NumberInput
                      label={t("heatmap.maxDistance")}
                      description={t("heatmap.maxDistanceDescription")}
                      value={parameters.maxDistance}
                      onChange={(value) =>
                        setParameters((prev) => ({
                          ...prev,
                          maxDistance: Number(value) || 15,
                        }))
                      }
                      disabled={isGenerating}
                      min={5}
                      max={100}
                      step={5}
                      size="sm"
                    />
                  </Tooltip>
                </Grid.Col>
              </Grid>
            </Tabs.Panel>

            <Tabs.Panel value="levy-flight" pt="md">
              <Box
                mb="md"
                p="xs"
                style={{ backgroundColor: "#f1f3f4", borderRadius: "4px" }}
              >
                <Text size="xs" c="dimmed">
                  <strong>{t("heatmap.distributionLevyFlight")}:</strong>{" "}
                  {t("heatmap.distributionLevyFlightDescription")}
                </Text>
              </Box>

              <Grid>
                <Grid.Col span={6}>
                  <Tooltip
                    label={t("heatmap.sigmaTooltip")}
                    multiline
                    withArrow
                  >
                    <NumberInput
                      label={t("heatmap.sigmaScale")}
                      description={t("heatmap.sigmaScaleDescription")}
                      value={parameters.sigma}
                      onChange={(value) =>
                        setParameters((prev) => ({
                          ...prev,
                          sigma: Number(value) || 5,
                        }))
                      }
                      disabled={isGenerating}
                      min={1}
                      max={50}
                      step={0.5}
                      size="sm"
                    />
                  </Tooltip>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Tooltip
                    label={t("heatmap.levyAlphaTooltip")}
                    multiline
                    withArrow
                  >
                    <NumberInput
                      label={t("heatmap.levyAlpha")}
                      description={t("heatmap.levyAlphaDescription")}
                      value={parameters.levyAlpha}
                      onChange={(value) =>
                        setParameters((prev) => ({
                          ...prev,
                          levyAlpha: Number(value) || 1.8,
                        }))
                      }
                      disabled={isGenerating}
                      min={1.0}
                      max={2.0}
                      step={0.1}
                      size="sm"
                      decimalScale={1}
                    />
                  </Tooltip>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Tooltip
                    label={t("heatmap.maxDistanceTooltip")}
                    multiline
                    withArrow
                  >
                    <NumberInput
                      label={t("heatmap.maxDistance")}
                      description={t("heatmap.maxDistanceDescription")}
                      value={parameters.maxDistance}
                      onChange={(value) =>
                        setParameters((prev) => ({
                          ...prev,
                          maxDistance: Number(value) || 15,
                        }))
                      }
                      disabled={isGenerating}
                      min={5}
                      max={100}
                      step={5}
                      size="sm"
                    />
                  </Tooltip>
                </Grid.Col>
              </Grid>
            </Tabs.Panel>

            <Tabs.Panel value="exponential" pt="md">
              <Box
                mb="md"
                p="xs"
                style={{ backgroundColor: "#f1f3f4", borderRadius: "4px" }}
              >
                <Text size="xs" c="dimmed">
                  <strong>{t("heatmap.distributionExponential")}:</strong>{" "}
                  {t("heatmap.distributionExponentialDescription")}
                </Text>
              </Box>

              <Grid>
                <Grid.Col span={6}>
                  <Tooltip
                    label={t("heatmap.exponentialLambdaTooltip")}
                    multiline
                    withArrow
                  >
                    <NumberInput
                      label={t("heatmap.exponentialLambda")}
                      description={t("heatmap.exponentialLambdaDescription")}
                      value={parameters.exponentialLambda}
                      onChange={(value) =>
                        setParameters((prev) => ({
                          ...prev,
                          exponentialLambda: Number(value) || 0.125,
                        }))
                      }
                      disabled={isGenerating}
                      min={0.05}
                      max={0.5}
                      step={0.05}
                      size="sm"
                      decimalScale={2}
                    />
                  </Tooltip>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Tooltip
                    label={t("heatmap.maxDistanceTooltip")}
                    multiline
                    withArrow
                  >
                    <NumberInput
                      label={t("heatmap.maxDistance")}
                      description={t("heatmap.maxDistanceDescription")}
                      value={parameters.maxDistance}
                      onChange={(value) =>
                        setParameters((prev) => ({
                          ...prev,
                          maxDistance: Number(value) || 15,
                        }))
                      }
                      disabled={isGenerating}
                      min={5}
                      max={100}
                      step={5}
                      size="sm"
                    />
                  </Tooltip>
                </Grid.Col>
              </Grid>
            </Tabs.Panel>
          </Tabs>

          <Box mt="md">
            <Text size="sm" fw={500} mb="xs">
              {t("heatmap.generalParameters")}
            </Text>
            <Grid>
              <Grid.Col span={6}>
                <Tooltip
                  label={t("heatmap.insectsPerDropTooltip")}
                  multiline
                  withArrow
                >
                  <NumberInput
                    label={t("heatmap.insectsPerDrop")}
                    description={t("heatmap.insectsPerDropDescription")}
                    value={parameters.insectsPerDrop}
                    onChange={(value) =>
                      setParameters((prev) => ({
                        ...prev,
                        insectsPerDrop: Number(value) || 1000,
                      }))
                    }
                    disabled={isGenerating}
                    min={500}
                    max={3000}
                    step={100}
                    size="sm"
                  />
                </Tooltip>
              </Grid.Col>
              <Grid.Col span={6}>
                <Tooltip
                  label={t("heatmap.resolutionTooltip")}
                  multiline
                  withArrow
                >
                  <NumberInput
                    label={t("heatmap.resolution")}
                    description={t("heatmap.resolutionDescription")}
                    value={parameters.resolution}
                    onChange={(value) =>
                      setParameters((prev) => ({
                        ...prev,
                        resolution: Number(value) || 2,
                      }))
                    }
                    disabled={isGenerating}
                    min={1}
                    max={4}
                    step={1}
                    size="sm"
                  />
                </Tooltip>
              </Grid.Col>
            </Grid>
          </Box>

          <Grid>
            <Grid.Col span={12}>
              <Switch
                label={t("heatmap.gpuAcceleration")}
                description={
                  (webgpuSupported ?? t("heatmap.gpuChecking")) ||
                  webgpuSupported
                    ? t("heatmap.gpuSupported")
                    : t("heatmap.gpuNotSupported")
                }
                checked={useGPU && Boolean(webgpuSupported)}
                onChange={(event) => setUseGPU(event.currentTarget.checked)}
                disabled={!webgpuSupported || isGenerating}
                size="sm"
              />
            </Grid.Col>
          </Grid>

          {/* WebGPU Status */}
          {webgpuSupported !== undefined && (
            <Box mt="xs">
              <Text size="xs" c={webgpuSupported ? "teal" : "orange"}>
                WebGPU:{" "}
                {webgpuSupported
                  ? `✓ ${t("heatmap.gpuEnabled")}`
                  : `✗ ${t("heatmap.gpuNotAvailable")}`}
                {webgpuSupported && useGPU && ` - ${t("heatmap.gpuEnabled")}`}
              </Text>
            </Box>
          )}

          {/* Progress Bar */}
          {isGenerating && (
            <Box mt="md">
              <Text size="xs" c="dimmed" mb={5}>
                {t("heatmap.generate")}... {generationProgress}%
              </Text>
              <Progress value={generationProgress} size="sm" />
            </Box>
          )}

          <Group justify="space-between" mt="md">
            <Text size="xs" c="dimmed">
              σ={parameters.sigma}m, max {parameters.maxDistance}m{" "}
              {t("heatmap.radius")}, {parameters.insectsPerDrop}{" "}
              {t("heatmap.insectsDropShort")}, {parameters.distributionMethod}
              {parameters.distributionMethod === "levy-flight" &&
                `, α=${parameters.levyAlpha}`}
              {parameters.distributionMethod === "exponential" &&
                `, λ=${parameters.exponentialLambda}`}
            </Text>
            <Button
              leftSection={<IconChartDots size={16} />}
              onClick={generateHeatmap}
              loading={isGenerating}
              disabled={!currentMission?.flightLog.dropPoints || isGenerating}
              size="sm"
            >
              {isHeatmapGenerated
                ? t("heatmap.regenerate")
                : t("heatmap.generate")}
            </Button>
          </Group>
        </Paper>

        {/* Canvas - always present but hidden when no heatmap */}
        <Box
          style={{
            width: "100%",
            position: "relative",
            display: isHeatmapGenerated || isGenerating ? "block" : "none",
          }}
        >
          <LoadingOverlay visible={isGenerating} />

          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              border: "1px solid #e9ecef",
              borderRadius: "8px",
              width: "100%",
              height: "auto",
              display: "block",
              cursor: isHeatmapGenerated ? "crosshair" : "default",
            }}
          />
        </Box>

        {/* Tooltip */}
        {tooltip.visible && isHeatmapGenerated && (
          <div
            style={{
              position: "fixed",
              left: tooltip.x + 10,
              top: tooltip.y - 10,
              backgroundColor: "rgba(0, 0, 0, 0.9)",
              color: "white",
              padding: "8px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontFamily: "monospace",
              zIndex: 1000,
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            <div>
              {t("heatmap.tooltipGPS")}: {tooltip.coverage}
            </div>
            <div>
              {t("heatmap.tooltipDensity")}:{" "}
              {(tooltip.density * 100).toFixed(1)}%
            </div>
            <div>
              {t("heatmap.tooltipArea")}:{" "}
              {tooltip.insectsPerSquareMeter.toFixed(1)}{" "}
              {t("heatmap.tooltipInsectsPerM2")}
            </div>
          </div>
        )}
      </Box>
    </Card>
  );
}
