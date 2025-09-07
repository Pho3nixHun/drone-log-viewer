import { useEffect, useRef, useMemo } from "react";
import { useMap } from "react-leaflet";
import { useTranslation } from "react-i18next";
import { useMissionStore } from "@/stores/missionStore";
import { getColorForAltitude } from "@/utils/mapHelpers";
import { formatDate } from "@/utils/dateHelpers";
import { getSourceFileColor, getTooltipColor } from "@/utils/colorUtils";
import L from "leaflet";

export function DropPointsLayer() {
  const {
    currentMission,
    timeRange,
    isReplaying,
    replayCurrentTime,
    selectedSourceFiles,
  } = useMissionStore();
  const { t } = useTranslation();
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);

  // Memoize valid points to avoid recalculating unless currentMission changes
  const validPoints = useMemo(() => {
    if (!currentMission) return [];
    return currentMission.flightLog.dropPoints.filter(
      (point) => point.latitude !== 0 && point.longitude !== 0,
    );
  }, [currentMission]);

  // Memoize altitude range calculation
  const { minAlt, maxAlt } = useMemo(() => {
    if (validPoints.length === 0) return { minAlt: 0, maxAlt: 0 };
    const altitudes = validPoints.map((p) => p.altitude);
    return {
      minAlt: Math.min(...altitudes),
      maxAlt: Math.max(...altitudes),
    };
  }, [validPoints]);

  // Create markers only once when points change
  useEffect(() => {
    if (validPoints.length === 0) return;

    // Clean up existing markers
    if (layerGroupRef.current) {
      map.removeLayer(layerGroupRef.current);
    }
    markersRef.current = [];

    // Create layer group
    const layerGroup = L.layerGroup();
    layerGroupRef.current = layerGroup;

    // Create all markers
    validPoints.forEach((point, index) => {
      const marker = L.circleMarker([point.latitude, point.longitude], {
        radius: 6,
        fillColor:
          point.sourceIndex !== undefined
            ? getSourceFileColor(point.sourceIndex, "drop")
            : getColorForAltitude(point.altitude, minAlt, maxAlt),
        color: "#ffffff",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8,
      });

      // Create popup content
      const popupContent = `
        <div style="min-width: 200px; background-color: ${
          point.sourceIndex !== undefined
            ? getTooltipColor(point.sourceIndex)
            : "#ffffff"
        }; padding: 8px; border-radius: 4px;">
          <strong>${t("tooltip.dropPoint")} #${index + 1}</strong>
          ${point.sourceFile ? `<br><strong>${t("tooltip.source")}:</strong> ${point.sourceFile}` : ""}
          <br><strong>${t("tooltip.location")}:</strong> ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}
          <br><strong>${t("tooltip.altitude")}:</strong> ${point.altitude.toFixed(1)}m
          <br><strong>${t("tooltip.speed")}:</strong> ${point.speed.toFixed(1)} m/s
          <br><strong>${t("tooltip.heading")}:</strong> ${point.heading.toFixed(0)}°
          <br><strong>${t("tooltip.time")}:</strong> ${formatDate(point.date)}
        </div>
      `;

      marker.bindPopup(popupContent);
      layerGroup.addLayer(marker);
      markersRef.current.push(marker);
    });

    // Add layer group to map
    layerGroup.addTo(map);

    // Cleanup function
    return () => {
      if (layerGroupRef.current) {
        map.removeLayer(layerGroupRef.current);
        layerGroupRef.current = null;
      }
      markersRef.current = [];
    };
  }, [validPoints, minAlt, maxAlt, t, map]);

  // Update visibility of existing markers based on filters
  useEffect(() => {
    if (markersRef.current.length === 0) return;

    markersRef.current.forEach((marker, index) => {
      const point = validPoints[index];
      if (!point) return;

      // Determine visibility
      let visible = true;

      // Check source file selection
      if (point.sourceFile && !selectedSourceFiles.has(point.sourceFile)) {
        visible = false;
      }

      // Check time range
      if (visible) {
        const pointTime = new Date(point.date).getTime();

        if (isReplaying && replayCurrentTime) {
          visible = pointTime <= replayCurrentTime;
        } else if (timeRange) {
          const [startTime, endTime] = timeRange;
          visible = pointTime >= startTime && pointTime <= endTime;
        }
      }

      // Update marker opacity
      marker.setStyle({
        opacity: visible ? 1 : 0,
        fillOpacity: visible ? 0.8 : 0,
      });
    });
  }, [
    validPoints,
    timeRange,
    isReplaying,
    replayCurrentTime,
    selectedSourceFiles,
  ]);

  // This component doesn't render JSX - it manages Leaflet layers directly
  return null;
}
