import { Text, Tabs } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { DistributionMethod } from "@/utils/heatmapUtils";

// Type guard function to check if a value is a valid DistributionMethod
function isDistributionMethod(
  value: string | null,
): value is DistributionMethod {
  return (
    value === "gaussian" || value === "levy-flight" || value === "exponential"
  );
}

interface DistributionSelectorProps {
  value: DistributionMethod;
  onChange: (method: DistributionMethod) => void;
}

export function DistributionSelector({ value, onChange }: DistributionSelectorProps) {
  const { t } = useTranslation();

  return (
    <>
      <Text size="sm" fw={600} mb="xs">
        {t("heatmap.distributionMethod")}
      </Text>
      <Text size="xs" c="dimmed" mb="sm">
        {t("heatmap.distributionMethodDescription")}
      </Text>

      <Tabs
        value={value}
        onChange={(tabValue: string | null) => {
          if (isDistributionMethod(tabValue)) {
            onChange(tabValue);
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
    </>
  );
}