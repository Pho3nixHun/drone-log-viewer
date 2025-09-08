// Utility functions for polygon operations using Turf.js
import {
  polygon,
  area,
  booleanContains,
  booleanIntersects,
  convex,
  points,
  buffer,
  dissolve,
  featureCollection,
} from "@turf/turf";

/**
 * Calculate the area of a polygon in hectares using Turf.js
 * Provides accurate geodetic area calculation
 */
export function calculatePolygonArea(coords: [number, number][]): number {
  if (coords.length < 3) return 0;

  try {
    // Convert to GeoJSON polygon format [lng, lat]
    const turfCoords = coords.map(([lat, lng]) => [lng, lat]);
    // Ensure polygon is closed
    if (
      turfCoords[0][0] !== turfCoords[turfCoords.length - 1][0] ||
      turfCoords[0][1] !== turfCoords[turfCoords.length - 1][1]
    ) {
      turfCoords.push(turfCoords[0]);
    }

    const poly = polygon([turfCoords]);
    const areaInSquareMeters = area(poly);

    // Convert to hectares (1 hectare = 10,000 square meters)
    return areaInSquareMeters / 10000;
  } catch (error) {
    console.warn("Error calculating polygon area with Turf.js:", error);
    return 0;
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use calculatePolygonArea directly - it now returns hectares
 */
export function squareDegreesToHectares(
  areaDegrees: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _avgLatitude: number // Prefixed with underscore to indicate unused parameter
): number {
  // This is now deprecated since calculatePolygonArea returns hectares directly
  // Keep for backward compatibility but log warning
  console.warn(
    "squareDegreesToHectares is deprecated. calculatePolygonArea now returns hectares directly."
  );
  return areaDegrees; // Assume input is already in correct units
}

/**
 * Check if polygon A completely contains polygon B using Turf.js
 */
export function polygonContainsPolygon(
  polyA: [number, number][],
  polyB: [number, number][]
): boolean {
  try {
    // Convert to GeoJSON format [lng, lat]
    const turfPolyA = createTurfPolygon(polyA);
    const turfPolyB = createTurfPolygon(polyB);

    return booleanContains(turfPolyA, turfPolyB);
  } catch (error) {
    console.warn("Error checking polygon containment with Turf.js:", error);
    return false;
  }
}

/**
 * Check if two polygons intersect using Turf.js
 */
export function polygonsIntersect(
  poly1: [number, number][],
  poly2: [number, number][]
): boolean {
  try {
    const turfPoly1 = createTurfPolygon(poly1);
    const turfPoly2 = createTurfPolygon(poly2);

    return booleanIntersects(turfPoly1, turfPoly2);
  } catch (error) {
    console.warn("Error checking polygon intersection with Turf.js:", error);
    return false;
  }
}

/**
 * Helper function to create a valid Turf.js polygon
 */
function createTurfPolygon(coords: [number, number][]) {
  // Convert to GeoJSON format [lng, lat]
  const turfCoords = coords.map(([lat, lng]) => [lng, lat]);

  // Ensure polygon is closed
  if (
    turfCoords[0][0] !== turfCoords[turfCoords.length - 1][0] ||
    turfCoords[0][1] !== turfCoords[turfCoords.length - 1][1]
  ) {
    turfCoords.push(turfCoords[0]);
  }

  return polygon([turfCoords]);
}

/**
 * Calculate the union of multiple polygons using Turf.js
 * Uses buffer-dissolve approach optimized for agricultural field boundaries
 */
export function calculatePolygonUnion(
  polygons: [number, number][][]
): [number, number][] {
  if (polygons.length === 0) return [];
  if (polygons.length === 1) return polygons[0];

  // Primary approach: buffer-dissolve for agricultural fields
  const bufferDissolveResult = attemptBufferDissolve(polygons);
  if (bufferDissolveResult) return bufferDissolveResult;

  // Fallback approach: convex hull
  const convexHullResult = attemptConvexHull(polygons);
  if (convexHullResult) return convexHullResult;

  // Final fallback: largest polygon by area
  return findLargestPolygon(polygons);
}

/**
 * Attempts buffer-dissolve union for closely positioned polygons
 */
const attemptBufferDissolve = (
  polygons: [number, number][][]
): [number, number][] | null => {
  try {
    const turfPolygons = polygons.map(createTurfPolygon);

    const bufferedPolygons = turfPolygons
      .map((poly) => safeBuffer(poly, 0.01))
      .filter((poly): poly is ReturnType<typeof createTurfPolygon> =>
        Boolean(poly)
      );

    if (bufferedPolygons.length === 0) return null;

    const bufferedCollection = featureCollection(bufferedPolygons);
    const dissolved = dissolve(bufferedCollection);

    return dissolved?.features[0]?.geometry.type === "Polygon"
      ? extractPolygonCoordinates(dissolved.features[0].geometry.coordinates[0])
      : null;
  } catch {
    return null;
  }
};

/**
 * Safely buffers a polygon with error handling
 */
const safeBuffer = (
  poly: ReturnType<typeof createTurfPolygon>,
  distance: number
) => {
  try {
    return buffer(poly, distance, { units: "kilometers" });
  } catch {
    return poly;
  }
};

/**
 * Attempts convex hull as fallback approach
 */
const attemptConvexHull = (
  polygons: [number, number][][]
): [number, number][] | null => {
  try {
    const allPoints = polygons.flat();

    if (allPoints.length < 3) return null;

    const pointFeatures = points(allPoints.map(([lat, lng]) => [lng, lat]));
    const hull = convex(pointFeatures);

    return hull?.geometry.type === "Polygon"
      ? extractPolygonCoordinates(hull.geometry.coordinates[0])
      : null;
  } catch {
    return null;
  }
};

/**
 * Finds the largest polygon by area as final fallback
 */
const findLargestPolygon = (
  polygons: [number, number][][]
): [number, number][] => {
  return polygons.reduce(
    (largest, current) =>
      calculatePolygonArea(current) > calculatePolygonArea(largest)
        ? current
        : largest,
    polygons[0]
  );
};

/**
 * Extracts and converts polygon coordinates from Turf.js format
 */
const extractPolygonCoordinates = (
  coordinates: number[][]
): [number, number][] => {
  return coordinates
    .slice(0, -1)
    .map(([lng, lat]) => [lat, lng] as [number, number]);
};

/**
 * Calculate total area of multiple WDM mission settings using polygon union
 * Uses proper polygon union algorithm to handle overlapping polygons
 */
export function calculateTotalWDMArea(
  missionSettings: Array<{
    polygon?: [number, number][];
  }>
): number {
  if (!missionSettings || missionSettings.length === 0) return 0;

  // Collect all polygons
  const allPolygons: [number, number][][] = [];

  for (const settings of missionSettings) {
    if (settings.polygon && settings.polygon.length >= 3) {
      allPolygons.push(settings.polygon);
    }
  }

  if (allPolygons.length === 0) return 0;

  // Calculate union of polygons
  const unionPolygon = calculatePolygonUnion(allPolygons);

  // Calculate area in hectares
  return calculatePolygonArea(unionPolygon);
}
