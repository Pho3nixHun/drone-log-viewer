import { useEffect, useRef, useMemo } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useTranslation } from "react-i18next";
import { useMissionStore } from "@/stores/missionStore";
import { formatDate } from "@/utils/dateHelpers";
import { getSourceFileColor, getTooltipColor } from "@/utils/colorUtils";

// Import the polyline decorator
import "leaflet-polylinedecorator";

export function WaypointsLayer() {
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
  const polylineRef = useRef<L.Polyline | null>(null);
  const decoratorRef = useRef<L.Layer | null>(null);

  // Memoize valid points to avoid recalculating unless currentMission changes
  const validPoints = useMemo(() => {
    if (!currentMission) return [];
    return currentMission.flightLog.waypoints.filter(
      (point) => point.latitude !== 0 && point.longitude !== 0,
    );
  }, [currentMission]);

  // Create markers and polyline only once when points change
  useEffect(() => {
    if (validPoints.length === 0) return;

    // Clean up existing layers
    if (layerGroupRef.current) {
      map.removeLayer(layerGroupRef.current);
    }
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
    }
    if (decoratorRef.current) {
      map.removeLayer(decoratorRef.current);
    }
    markersRef.current = [];

    // Create layer group for markers
    const layerGroup = L.layerGroup();
    layerGroupRef.current = layerGroup;

    // Create all markers
    validPoints.forEach((point, index) => {
      const marker = L.circleMarker([point.latitude, point.longitude], {
        radius: 6,
        fillColor:
          point.sourceIndex !== undefined
            ? getSourceFileColor(point.sourceIndex, "waypoint")
            : "#ffd43b",
        color: "#ffffff",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.9,
      });

      // Create popup content
      const popupContent = `
        <div style="min-width: 200px; background-color: ${
          point.sourceIndex !== undefined
            ? getTooltipColor(point.sourceIndex)
            : "#ffffff"
        }; padding: 8px; border-radius: 4px;">
          <strong>${t("tooltip.waypoint")} #${index + 1}</strong>
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

    // Create polyline
    const pathCoordinates: [number, number][] = validPoints.map((point) => [
      point.latitude,
      point.longitude,
    ]);

    const polyline = L.polyline(pathCoordinates, {
      color: "#ffd43b",
      weight: 3,
      opacity: 0.8,
    });
    polylineRef.current = polyline;

    // Add layers to map
    layerGroup.addTo(map);
    polyline.addTo(map);

    // Cleanup function
    return () => {
      if (layerGroupRef.current) {
        map.removeLayer(layerGroupRef.current);
        layerGroupRef.current = null;
      }
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
        polylineRef.current = null;
      }
      if (decoratorRef.current) {
        map.removeLayer(decoratorRef.current);
        decoratorRef.current = null;
      }
      markersRef.current = [];
    };
  }, [validPoints, t, map]);

  // Update visibility of existing markers and polyline based on filters
  useEffect(() => {
    if (markersRef.current.length === 0 || !polylineRef.current) return;

    const visiblePoints: [number, number][] = [];

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
        fillOpacity: visible ? 0.9 : 0,
      });

      // Collect visible points for polyline
      if (visible) {
        visiblePoints.push([point.latitude, point.longitude]);
      }
    });

    // Update polyline with only visible points
    if (visiblePoints.length > 1) {
      polylineRef.current?.setLatLngs(visiblePoints);
      polylineRef.current?.setStyle({ opacity: 0.8 });

      // Update decorator with arrows
      if (decoratorRef.current) {
        map.removeLayer(decoratorRef.current);
      }

      // Create new decorator with arrows
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decorator = (L as any).polylineDecorator(visiblePoints, {
        patterns: [
          {
            offset: 25,
            repeat: 100,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            symbol: (L as any).Symbol.arrowHead({
              pixelSize: 12,
              pathOptions: {
                fillOpacity: 1,
                weight: 0,
                color: "#ffd43b",
              },
            }),
          },
        ],
      });

      decorator.addTo(map);
      decoratorRef.current = decorator;
    } else {
      // Hide polyline if no visible points
      polylineRef.current?.setStyle({ opacity: 0 });
      if (decoratorRef.current) {
        map.removeLayer(decoratorRef.current);
        decoratorRef.current = null;
      }
    }
  }, [
    validPoints,
    timeRange,
    isReplaying,
    replayCurrentTime,
    selectedSourceFiles,
    map,
  ]);

  // This component doesn't render JSX - it manages Leaflet layers directly
  return null;
}
