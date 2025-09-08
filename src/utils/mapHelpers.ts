import type { DropPoint, Waypoint } from "@/types/mission";
import { convex, buffer, points } from "@turf/turf";

export function getBounds(
  points: (DropPoint | Waypoint)[],
): [[number, number], [number, number]] | null {
  if (points.length === 0) return null;

  const validPoints = points.filter(
    (p) => p.latitude !== 0 && p.longitude !== 0,
  );
  if (validPoints.length === 0) return null;

  let minLat = validPoints[0].latitude;
  let maxLat = validPoints[0].latitude;
  let minLng = validPoints[0].longitude;
  let maxLng = validPoints[0].longitude;

  validPoints.forEach((point) => {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  });

  // Create bounds using array format which should work
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}
export function getMapCenter(
  points: (DropPoint | Waypoint)[],
): [number, number] | null {
  const bounds = getBounds(points);
  if (!bounds) return null;

  const [[minLat, minLng], [maxLat, maxLng]] = bounds;
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  return [centerLat, centerLng];
}

export function parsePolygonString(polygonStr: string): [number, number][] {
  try {
    // Handle different polygon string formats
    if (polygonStr.startsWith("POLYGON")) {
      // WKT format: "POLYGON((lng lat, lng lat, ...))"
      const coordsStr = polygonStr
        .replace(/POLYGON\s*\(\s*\(/, "")
        .replace(/\)\s*\)/, "");
      return coordsStr.split(",").map((pair) => {
        const [lng, lat] = pair.trim().split(" ").map(Number);
        return [lat, lng] as [number, number];
      });
    } else if (polygonStr.startsWith("[") || polygonStr.startsWith("{")) {
      // JSON format
      const coords = JSON.parse(polygonStr);
      if (Array.isArray(coords) && Array.isArray(coords[0])) {
        return coords.map(([lat, lng]: [number, number]) => [lat, lng]);
      }
    } else {
      // Our generated format: "lat,lng;lat,lng;..."
      const coords = polygonStr
        .split(";")
        .map((pair) => {
          const [lat, lng] = pair.split(",").map(Number);
          return [lat, lng] as [number, number];
        })
        .filter((coord) => !isNaN(coord[0]) && !isNaN(coord[1]));

      return coords;
    }
  } catch (error) {
    console.warn("Failed to parse polygon string:", error, polygonStr);
    return [];
  }

  return [];
}

export function getColorForAltitude(
  altitude: number,
  minAlt: number,
  maxAlt: number,
): string {
  if (maxAlt === minAlt) return "#3388ff";

  const ratio = (altitude - minAlt) / (maxAlt - minAlt);

  // Color gradient from blue (low) to red (high)
  if (ratio < 0.5) {
    // Blue to green
    const r = Math.floor(ratio * 2 * 255);
    return `rgb(${r}, 255, ${255 - r})`;
  } else {
    // Green to red
    const g = Math.floor((1 - ratio) * 2 * 255);
    return `rgb(255, ${g}, 0)`;
  }
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  } else {
    return `${(meters / 1000).toFixed(1)}km`;
  }
}

export function generatePolygonFromPoints(
  dropPoints: (DropPoint | Waypoint)[],
): string {
  // Filter out invalid coordinates
  const validPoints = dropPoints.filter(
    (p) => p.latitude !== 0 && p.longitude !== 0,
  );
  if (validPoints.length < 3) return "";

  try {
    // Convert points to GeoJSON format for Turf.js
    const turfPoints = points(
      validPoints.map((p) => [p.longitude, p.latitude])
    );

    // Create a convex hull using Turf.js
    const hull = convex(turfPoints);
    if (!hull) return "";

    // Add 10m buffer using Turf.js
    const bufferedHull = buffer(hull, 10, { units: "meters" });
    if (!bufferedHull) return "";

    // Extract coordinates from the buffered polygon
    const coords = bufferedHull.geometry.coordinates[0];
    
    // Convert back to [lat, lng] format and create polygon string
    const polygonPoints = coords
      .slice(0, -1) // Remove the closing duplicate point
      .map(([lng, lat]) => `${lat},${lng}`)
      .join(";");

    return polygonPoints;
  } catch (error) {
    console.warn("Error generating polygon with Turf.js:", error);
    
    // Fallback: return a simple bounding box polygon
    const bounds = getBounds(validPoints);
    if (!bounds) return "";
    
    const [[minLat, minLng], [maxLat, maxLng]] = bounds;
    return `${minLat},${minLng};${maxLat},${minLng};${maxLat},${maxLng};${minLat},${maxLng}`;
  }
}

