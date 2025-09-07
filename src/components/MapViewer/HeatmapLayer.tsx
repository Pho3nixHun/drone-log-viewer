import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { DensityMapData } from "@/utils/heatmapUtils";
import { calculateLocalDensityPerArea } from "@/utils/heatmapUtils";
import "@/styles/heatmap.css";

interface HeatmapLayerProps {
  densityMapData: DensityMapData | null;
  opacity?: number;
  insectsPerDrop?: number;
}

export default function HeatmapLayer({
  densityMapData,
  opacity = 0.6,
  insectsPerDrop = 1000,
}: HeatmapLayerProps) {
  const map = useMap();
  const imageOverlayRef = useRef<L.ImageOverlay | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!densityMapData) {
      // Remove existing overlay if no data
      if (imageOverlayRef.current) {
        map.removeLayer(imageOverlayRef.current);
        imageOverlayRef.current = null;
      }
      return;
    }

    // Create a canvas to render the heatmap
    const canvas = document.createElement("canvas");
    canvas.width = densityMapData.canvasWidth;
    canvas.height = densityMapData.canvasHeight;
    canvasRef.current = canvas;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Create ImageData from density data
    const imageData = ctx.createImageData(
      densityMapData.canvasWidth,
      densityMapData.canvasHeight,
    );
    const data = imageData.data;

    // Convert density data to RGBA
    for (let i = 0; i < densityMapData.densityData.length; i++) {
      const density = densityMapData.densityData[i] / densityMapData.maxDensity;
      const pixelIndex = i * 4;

      // Apply thermal color mapping (blue to red)
      if (density > 0) {
        const normalizedDensity = Math.min(density, 1);

        // Thermal color mapping: blue (cold) -> red (hot)
        if (normalizedDensity < 0.5) {
          // Blue to cyan to green
          const t = normalizedDensity * 2;
          data[pixelIndex] = Math.round(0 * (1 - t) + 0 * t); // R
          data[pixelIndex + 1] = Math.round(0 * (1 - t) + 255 * t); // G
          data[pixelIndex + 2] = Math.round(255 * (1 - t) + 255 * t); // B
          data[pixelIndex + 3] = Math.round(
            255 * normalizedDensity * opacity * 4,
          ); // A
        } else {
          // Green to yellow to red
          const t = (normalizedDensity - 0.5) * 2;
          data[pixelIndex] = Math.round(0 * (1 - t) + 255 * t); // R
          data[pixelIndex + 1] = Math.round(255 * (1 - t) + 255 * t); // G
          data[pixelIndex + 2] = Math.round(255 * (1 - t) + 0 * t); // B
          data[pixelIndex + 3] = Math.round(
            255 * normalizedDensity * opacity * 4,
          ); // A
        }
      } else {
        // Transparent for zero density
        data[pixelIndex] = 0;
        data[pixelIndex + 1] = 0;
        data[pixelIndex + 2] = 0;
        data[pixelIndex + 3] = 0;
      }
    }

    // Draw the image data to canvas
    ctx.putImageData(imageData, 0, 0);

    // Convert canvas to data URL
    const dataURL = canvas.toDataURL();

    // Define bounds based on the density map data
    const bounds: L.LatLngBoundsExpression = [
      [densityMapData.boundedMinLat, densityMapData.boundedMinLng],
      [densityMapData.boundedMaxLat, densityMapData.boundedMaxLng],
    ];

    // Remove existing overlay
    if (imageOverlayRef.current) {
      map.removeLayer(imageOverlayRef.current);
    }

    // Create new image overlay with interactivity enabled
    const imageOverlay = L.imageOverlay(dataURL, bounds, {
      opacity,
      interactive: true,
      pane: "overlayPane",
    });

    // Create a persistent tooltip that will move with the mouse
    let currentTooltip: L.Tooltip | null = null;

    // Add mouse event handlers for tooltip functionality
    imageOverlay.on("mousemove", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      // Calculate canvas coordinates from lat/lng
      const canvasX = Math.floor(
        ((lng - densityMapData.boundedMinLng) /
          (densityMapData.boundedMaxLng - densityMapData.boundedMinLng)) *
          densityMapData.canvasWidth,
      );
      const canvasY = Math.floor(
        ((densityMapData.boundedMaxLat - lat) /
          (densityMapData.boundedMaxLat - densityMapData.boundedMinLat)) *
          densityMapData.canvasHeight,
      );

      // Check if coordinates are within bounds
      if (
        canvasX >= 0 &&
        canvasX < densityMapData.canvasWidth &&
        canvasY >= 0 &&
        canvasY < densityMapData.canvasHeight
      ) {
        // Get density value at this pixel
        const pixelIndex = canvasY * densityMapData.canvasWidth + canvasX;
        const densityValue = densityMapData.densityData[pixelIndex] || 0;

        // Calculate insects per square meter
        const densityResult = calculateLocalDensityPerArea(
          canvasX,
          canvasY,
          densityMapData,
          insectsPerDrop,
          1.0, // 1 square meter sample area
        );

        // Create tooltip content
        const tooltipContent = `
          <div style="font-size: 12px; line-height: 1.4;">
            <div><strong>GPS:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
            <div><strong>Density:</strong> ${densityValue.toFixed(2)}</div>
            <div><strong>Insects/m²:</strong> ${densityResult.insectsPerSquareMeter.toFixed(1)}</div>
          </div>
        `;

        // If tooltip doesn't exist, create it
        if (!currentTooltip) {
          currentTooltip = L.tooltip({
            permanent: false,
            direction: "top",
            offset: [0, -10],
            className: "heatmap-tooltip",
          })
            .setContent(tooltipContent)
            .setLatLng(e.latlng)
            .addTo(map);
        } else {
          // Update existing tooltip position and content
          currentTooltip.setContent(tooltipContent).setLatLng(e.latlng);
        }
      } else {
        // Close tooltip if outside bounds
        if (currentTooltip) {
          map.closeTooltip(currentTooltip);
          currentTooltip = null;
        }
      }
    });

    imageOverlay.on("mouseout", () => {
      if (currentTooltip) {
        map.closeTooltip(currentTooltip);
        currentTooltip = null;
      }
    });

    // Add to map
    imageOverlay.addTo(map);
    imageOverlayRef.current = imageOverlay;

    // Cleanup function
    return () => {
      if (currentTooltip) {
        map.closeTooltip(currentTooltip);
        currentTooltip = null;
      }
      if (imageOverlayRef.current) {
        map.removeLayer(imageOverlayRef.current);
        imageOverlayRef.current = null;
      }
    };
  }, [densityMapData, opacity, map, insectsPerDrop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (imageOverlayRef.current) {
        map.removeLayer(imageOverlayRef.current);
      }
    };
  }, [map]);

  return null; // This component doesn't render anything directly
}
