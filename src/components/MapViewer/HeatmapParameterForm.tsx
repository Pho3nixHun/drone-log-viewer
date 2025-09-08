import { Text, Grid, NumberInput, Tooltip } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { HeatmapParameters } from "@/utils/heatmapUtils";

interface HeatmapParameterFormProps {
  parameters: HeatmapParameters;
  onChange: (updater: (prev: HeatmapParameters) => HeatmapParameters) => void;
}

export function HeatmapParameterForm({ parameters, onChange }: HeatmapParameterFormProps) {
  const { t } = useTranslation();

  return (
    <>
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
                  onChange((prev) => ({
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
                  onChange((prev) => ({
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
                    onChange((prev) => ({
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
                  onChange((prev) => ({
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
                onChange((prev) => ({
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
                onChange((prev) => ({
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
                onChange((prev) => ({
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
    </>
  );
}