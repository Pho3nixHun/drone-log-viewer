/**
 * Canvas utilities for drawing operations
 */

export interface CanvasDimensions {
  displayWidth: number;
  displayHeight: number;
  canvasWidth: number;
  canvasHeight: number;
}

export interface FieldBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  boundedMinLat: number;
  boundedMaxLat: number;
  boundedMinLng: number;
  boundedMaxLng: number;
  boundedLatRange: number;
  boundedLngRange: number;
  fieldAspectRatio: number;
}

/**
 * Calculate field bounds from GPS coordinates with padding
 * @param coordinates Array of {latitude, longitude} points
 * @param paddingPercent Padding percentage (default 0.1 = 10%)
 * @returns FieldBounds object
 */
export function calculateFieldBounds(
  coordinates: Array<{ latitude: number; longitude: number }>,
  paddingPercent: number = 0.1,
): FieldBounds {
  const latitudes = coordinates.map((p) => p.latitude);
  const longitudes = coordinates.map((p) => p.longitude);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  const latRange = maxLat - minLat;
  const lngRange = maxLng - minLng;

  const latPadding = latRange * paddingPercent;
  const lngPadding = lngRange * paddingPercent;

  const boundedMinLat = minLat - latPadding;
  const boundedMaxLat = maxLat + latPadding;
  const boundedMinLng = minLng - lngPadding;
  const boundedMaxLng = maxLng + lngPadding;

  const boundedLatRange = boundedMaxLat - boundedMinLat;
  const boundedLngRange = boundedMaxLng - boundedMinLng;

  const fieldAspectRatio = boundedLngRange / boundedLatRange;

  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
    boundedMinLat,
    boundedMaxLat,
    boundedMinLng,
    boundedMaxLng,
    boundedLatRange,
    boundedLngRange,
    fieldAspectRatio,
  };
}

/**
 * Calculate optimal canvas dimensions based on field aspect ratio
 * @param fieldAspectRatio Aspect ratio of the field (width/height)
 * @param maxWidth Maximum display width
 * @param maxHeight Maximum display height
 * @param resolution Canvas resolution multiplier
 * @returns CanvasDimensions object
 */
export function calculateCanvasDimensions(
  fieldAspectRatio: number,
  maxWidth: number = 750,
  maxHeight: number = 600,
  resolution: number = 2,
): CanvasDimensions {
  let displayWidth, displayHeight;

  if (fieldAspectRatio > maxWidth / maxHeight) {
    displayWidth = maxWidth;
    displayHeight = maxWidth / fieldAspectRatio;
  } else {
    displayHeight = maxHeight;
    displayWidth = maxHeight * fieldAspectRatio;
  }

  displayWidth = Math.round(displayWidth);
  displayHeight = Math.round(displayHeight);

  const canvasWidth = displayWidth * resolution;
  const canvasHeight = displayHeight * resolution;

  return {
    displayWidth,
    displayHeight,
    canvasWidth,
    canvasHeight,
  };
}

/**
 * Setup canvas with proper dimensions and scaling
 * @param canvas HTMLCanvasElement to setup
 * @param dimensions Canvas dimensions
 * @param resolution Resolution multiplier
 * @returns Canvas 2D context or null
 */
export function setupCanvas(
  canvas: HTMLCanvasElement,
  dimensions: CanvasDimensions,
  resolution: number = 2,
): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  canvas.width = dimensions.canvasWidth;
  canvas.height = dimensions.canvasHeight;

  // Scale the drawing context for high resolution
  ctx.scale(resolution, resolution);

  return ctx;
}

/**
 * Clear canvas with background color
 * @param ctx Canvas 2D context
 * @param width Display width
 * @param height Display height
 * @param backgroundColor Background color (default white)
 */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  backgroundColor: string = "#ffffff",
): void {
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
}
