/**
 * Canvas utilities for drawing operations
 */

export interface CanvasDimensions {
  displayWidth: number
  displayHeight: number
  canvasWidth: number
  canvasHeight: number
}

export interface FieldBounds {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
  boundedMinLat: number
  boundedMaxLat: number
  boundedMinLng: number
  boundedMaxLng: number
  boundedLatRange: number
  boundedLngRange: number
  fieldAspectRatio: number
}

/**
 * Calculate field bounds from GPS coordinates with padding
 * @param coordinates Array of {latitude, longitude} points
 * @param paddingPercent Padding percentage (default 0.1 = 10%)
 * @returns FieldBounds object
 */
export function calculateFieldBounds(
  coordinates: Array<{ latitude: number, longitude: number }>,
  paddingPercent: number = 0.1
): FieldBounds {
  const latitudes = coordinates.map(p => p.latitude)
  const longitudes = coordinates.map(p => p.longitude)
  
  const minLat = Math.min(...latitudes)
  const maxLat = Math.max(...latitudes)
  const minLng = Math.min(...longitudes)
  const maxLng = Math.max(...longitudes)
  
  const latRange = maxLat - minLat
  const lngRange = maxLng - minLng
  
  const latPadding = latRange * paddingPercent
  const lngPadding = lngRange * paddingPercent
  
  const boundedMinLat = minLat - latPadding
  const boundedMaxLat = maxLat + latPadding
  const boundedMinLng = minLng - lngPadding
  const boundedMaxLng = maxLng + lngPadding
  
  const boundedLatRange = boundedMaxLat - boundedMinLat
  const boundedLngRange = boundedMaxLng - boundedMinLng
  
  const fieldAspectRatio = boundedLngRange / boundedLatRange
  
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
    fieldAspectRatio
  }
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
  resolution: number = 2
): CanvasDimensions {
  let displayWidth, displayHeight
  
  if (fieldAspectRatio > maxWidth / maxHeight) {
    displayWidth = maxWidth
    displayHeight = maxWidth / fieldAspectRatio
  } else {
    displayHeight = maxHeight
    displayWidth = maxHeight * fieldAspectRatio
  }
  
  displayWidth = Math.round(displayWidth)
  displayHeight = Math.round(displayHeight)
  
  const canvasWidth = displayWidth * resolution
  const canvasHeight = displayHeight * resolution
  
  return {
    displayWidth,
    displayHeight,
    canvasWidth,
    canvasHeight
  }
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
  resolution: number = 2
): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  
  canvas.width = dimensions.canvasWidth
  canvas.height = dimensions.canvasHeight
  
  // Scale the drawing context for high resolution
  ctx.scale(resolution, resolution)
  
  return ctx
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
  backgroundColor: string = '#ffffff'
): void {
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, width, height)
}

/**
 * Draw placeholder text on canvas
 * @param ctx Canvas 2D context
 * @param text Text to display
 * @param width Canvas display width
 * @param height Canvas display height
 * @param color Text color (default gray)
 */
export function drawPlaceholderText(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  color: string = '#999999'
): void {
  ctx.fillStyle = color
  ctx.font = '12px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, width / 2, height / 2)
}

/**
 * Draw rulers/scale on canvas edges
 * @param ctx Canvas 2D context
 * @param fieldWidthMeters Field width in meters
 * @param fieldHeightMeters Field height in meters
 * @param displayWidth Canvas display width
 * @param displayHeight Canvas display height
 * @param color Ruler color (default gray)
 */
export function drawRulers(
  ctx: CanvasRenderingContext2D,
  fieldWidthMeters: number,
  fieldHeightMeters: number,
  displayWidth: number,
  displayHeight: number,
  color: string = '#666666'
): void {
  ctx.fillStyle = color
  ctx.font = '8px Arial' // Smaller font
  ctx.strokeStyle = color
  
  // Choose scale interval based on field size
  const maxDimension = Math.max(fieldWidthMeters, fieldHeightMeters)
  let scaleInterval
  if (maxDimension < 100) scaleInterval = 10
  else if (maxDimension < 250) scaleInterval = 25
  else if (maxDimension < 500) scaleInterval = 50
  else if (maxDimension < 1000) scaleInterval = 100
  else scaleInterval = 200
  
  // Padding to keep text within canvas bounds
  const textPadding = 20
  
  // Draw horizontal ruler (bottom edge)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  const startMetersX = Math.ceil(0 / scaleInterval) * scaleInterval
  for (let meters = startMetersX; meters <= fieldWidthMeters; meters += scaleInterval) {
    const x = (meters / fieldWidthMeters) * displayWidth
    // Only draw if text won't go outside canvas bounds
    if (x >= textPadding && x <= displayWidth - textPadding) {
      // Smaller tick mark
      ctx.fillRect(x - 0.5, displayHeight - 10, 1, 6)
      // Text positioned above the tick mark
      ctx.fillText(`${meters}m`, x, displayHeight - 12)
    }
  }
  
  // Draw vertical ruler (left edge) 
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  const startMetersY = Math.ceil(0 / scaleInterval) * scaleInterval
  for (let meters = startMetersY; meters <= fieldHeightMeters; meters += scaleInterval) {
    const y = displayHeight - (meters / fieldHeightMeters) * displayHeight
    // Only draw if text won't go outside canvas bounds
    if (y >= textPadding && y <= displayHeight - textPadding) {
      // Smaller tick mark
      ctx.fillRect(0, y - 0.5, 6, 1)
      // Text positioned safely within canvas, horizontally oriented
      ctx.fillText(`${meters}m`, 8, y)
    }
  }
}