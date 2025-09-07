import { useMemo, useState } from "react";
import { Box, Text, SegmentedControl } from "@mantine/core";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useTranslation } from "react-i18next";
import { useMissionStore } from "@/stores/missionStore";

export function TimeChart() {
  const { currentMission } = useMissionStore();
  const { t } = useTranslation();
  const [resolution, setResolution] = useState("60"); // Default to 60 seconds (1 minute)

  const chartData = useMemo(() => {
    if (!currentMission) return [];

    const { dropPoints, waypoints } = currentMission.flightLog;

    // Get all timestamps
    const allTimestamps = [
      ...dropPoints.map((p) => new Date(p.date).getTime()),
      ...waypoints.map((p) => new Date(p.date).getTime()),
    ]
      .filter((t) => !isNaN(t))
      .sort((a, b) => a - b);

    if (allTimestamps.length === 0) return [];

    const minTime = allTimestamps[0];
    const maxTime = allTimestamps[allTimestamps.length - 1];
    const duration = maxTime - minTime;

    if (duration === 0) return [];

    // Create time buckets based on selected resolution
    const resolutionMs = parseInt(resolution) * 1000; // Convert seconds to milliseconds
    const bucketCount = Math.ceil(duration / resolutionMs);
    const bucketDuration = resolutionMs;

    const dropBuckets = new Array(bucketCount).fill(0);
    const waypointBuckets = new Array(bucketCount).fill(0);

    // Count points in each bucket
    dropPoints.forEach((point) => {
      const timestamp = new Date(point.date).getTime();
      if (!isNaN(timestamp)) {
        const bucketIndex = Math.min(
          Math.floor((timestamp - minTime) / bucketDuration),
          bucketCount - 1,
        );
        dropBuckets[bucketIndex]++;
      }
    });

    waypoints.forEach((point) => {
      const timestamp = new Date(point.date).getTime();
      if (!isNaN(timestamp)) {
        const bucketIndex = Math.min(
          Math.floor((timestamp - minTime) / bucketDuration),
          bucketCount - 1,
        );
        waypointBuckets[bucketIndex]++;
      }
    });

    // Convert to combined chart data format with rates per resolution
    return dropBuckets.map((dropCount, index) => ({
      index,
      time: new Date(minTime + index * bucketDuration).toLocaleTimeString(),
      dropPoints: dropCount, // Count per time bucket
      waypoints: waypointBuckets[index], // Count per time bucket
    }));
  }, [currentMission, resolution]);

  if (chartData.length === 0) return null;

  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      value: number;
      name: string;
      color: string;
      payload: {
        time: string;
      };
    }>;
    label?: string;
  }

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <Box
          style={{
            backgroundColor: "white",
            padding: "8px",
            border: "1px solid var(--mantine-color-gray-3)",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <Text size="xs" c="dimmed" mb={2}>
            {payload[0]?.payload?.time}
          </Text>
          {payload.map((entry, index) => (
            <Text key={index} size="xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}/{parseInt(resolution)}s
            </Text>
          ))}
        </Box>
      );
    }
    return null;
  };

  const resolutionOptions = [
    { label: "1s", value: "1" },
    { label: "5s", value: "5" },
    { label: "15s", value: "15" },
    { label: "30s", value: "30" },
    { label: "60s", value: "60" },
  ];

  const getResolutionLabel = () => {
    const seconds = parseInt(resolution);
    return seconds >= 60 ? `${seconds / 60}min` : `${seconds}s`;
  };

  return (
    <Box>
      <Box
        mb="xs"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text size="xs" c="dimmed">
          {t("chart.dropPointsWaypoints", { resolution: getResolutionLabel() })}
        </Text>
        <SegmentedControl
          size="xs"
          value={resolution}
          onChange={setResolution}
          data={resolutionOptions}
        />
      </Box>
      <ResponsiveContainer width="100%" height={32}>
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="dropPoints"
            stroke="#ff6b6b"
            strokeWidth={1.5}
            dot={false}
            name={t("map.dropPoints")}
          />
          <Line
            type="monotone"
            dataKey="waypoints"
            stroke="#ffd43b"
            strokeWidth={1.5}
            dot={false}
            name={t("map.waypoints")}
          />
          <XAxis hide />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
