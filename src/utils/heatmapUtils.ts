/**
 * Heatmap calculation utilities for density visualization
 */

import type { FieldBounds } from './canvasUtils'

export interface HeatmapParameters {
  sigma: number // Standard deviation in meters
  maxDistance: number // Maximum distance in meters
  insectsPerDrop: number // Insects per drop point
  resolution: number // Canvas resolution multiplier
}

export interface DensityMapData {
  densityData: Float32Array
  maxDensity: number
  canvasWidth: number
  canvasHeight: number
  boundedMinLat: number
  boundedMaxLat: number
  boundedMinLng: number
  boundedMaxLng: number
  boundedLatRange: number
  boundedLngRange: number
  pixelsPerMeter: number
  fieldWidthMeters: number
  fieldHeightMeters: number
}

export interface DropPoint {
  latitude: number
  longitude: number
}

/**
 * Filter out invalid GPS coordinates
 * @param dropPoints Array of drop points to filter
 * @returns Array of valid drop points
 */
export function filterValidDropPoints(dropPoints: DropPoint[]): DropPoint[] {
  return dropPoints.filter(p => 
    p.latitude !== 0 && p.longitude !== 0 && 
    p.latitude > -90 && p.latitude < 90 && 
    p.longitude > -180 && p.longitude < 180
  )
}

/**
 * Calculate meters per pixel conversion factors
 * @param bounds Field bounds object
 * @param canvasWidth Canvas width in pixels
 * @param canvasHeight Canvas height in pixels
 * @returns Object with meter conversion factors
 */
export function calculateMetersToPixels(
  bounds: FieldBounds,
  canvasWidth: number,
  canvasHeight: number
): {
  fieldWidthMeters: number
  fieldHeightMeters: number
  pixelsPerMeterX: number
  pixelsPerMeterY: number
  pixelsPerMeter: number
} {
  const centerLat = (bounds.minLat + bounds.maxLat) / 2
  const metersPerDegreeLongitude = 111320 * Math.cos(centerLat * Math.PI / 180)
  
  const fieldWidthMeters = bounds.boundedLngRange * metersPerDegreeLongitude
  const fieldHeightMeters = bounds.boundedLatRange * 111320
  
  const pixelsPerMeterX = canvasWidth / fieldWidthMeters
  const pixelsPerMeterY = canvasHeight / fieldHeightMeters
  const pixelsPerMeter = (pixelsPerMeterX + pixelsPerMeterY) / 2
  
  return {
    fieldWidthMeters,
    fieldHeightMeters,
    pixelsPerMeterX,
    pixelsPerMeterY,
    pixelsPerMeter
  }
}

/**
 * Calculate cumulative density map using Gaussian distribution (async version with RAF)
 * @param dropPoints Array of valid drop points
 * @param bounds Field bounds
 * @param canvasWidth Canvas width in pixels
 * @param canvasHeight Canvas height in pixels
 * @param parameters Heatmap parameters
 * @param onProgress Optional progress callback (currentRow, totalRows)
 * @returns Promise<DensityMapData>
 */
export async function calculateDensityMapAsync(
  dropPoints: DropPoint[],
  bounds: FieldBounds,
  canvasWidth: number,
  canvasHeight: number,
  parameters: HeatmapParameters,
  onProgress?: (current: number, total: number) => void
): Promise<DensityMapData> {
  const { fieldWidthMeters, fieldHeightMeters, pixelsPerMeter } = calculateMetersToPixels(
    bounds, 
    canvasWidth, 
    canvasHeight
  )
  
  // Create density map
  const densityMap = new Float32Array(canvasWidth * canvasHeight)
  let maxDensity = 0
  
  // Process rows in chunks to allow UI updates
  const ROWS_PER_CHUNK = Math.max(1, Math.floor(canvasHeight / 100)) // Process ~1% of rows per chunk
  
  for (let startY = 0; startY < canvasHeight; startY += ROWS_PER_CHUNK) {
    const endY = Math.min(startY + ROWS_PER_CHUNK, canvasHeight)
    
    // Process chunk of rows
    for (let y = startY; y < endY; y++) {
      for (let x = 0; x < canvasWidth; x++) {
        let totalDensity = 0
        
        // Check contribution from each drop point
        dropPoints.forEach((dropPoint) => {
          const centerX = ((dropPoint.longitude - bounds.boundedMinLng) / bounds.boundedLngRange) * canvasWidth
          const centerY = ((bounds.boundedMaxLat - dropPoint.latitude) / bounds.boundedLatRange) * canvasHeight
          
          // Calculate distance from this pixel to drop point center
          const pixelDistance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
          const meterDistance = pixelDistance / pixelsPerMeter
          
          // Only calculate if within max distance range
          if (meterDistance <= parameters.maxDistance) {
            // Calculate Gaussian density contribution
            const gaussianValue = Math.exp(-(meterDistance * meterDistance) / (2 * parameters.sigma * parameters.sigma))
            totalDensity += gaussianValue
          }
        })
        
        densityMap[y * canvasWidth + x] = totalDensity
        maxDensity = Math.max(maxDensity, totalDensity)
      }
    }
    
    // Report progress and yield control to browser
    if (onProgress) {
      onProgress(endY, canvasHeight)
    }
    
    // Yield control back to the browser for UI updates
    await new Promise(resolve => requestAnimationFrame(resolve))
  }
  
  return {
    densityData: densityMap,
    maxDensity,
    canvasWidth,
    canvasHeight,
    boundedMinLat: bounds.boundedMinLat,
    boundedMaxLat: bounds.boundedMaxLat,
    boundedMinLng: bounds.boundedMinLng,
    boundedMaxLng: bounds.boundedMaxLng,
    boundedLatRange: bounds.boundedLatRange,
    boundedLngRange: bounds.boundedLngRange,
    pixelsPerMeter,
    fieldWidthMeters,
    fieldHeightMeters
  }
}

/**
 * Calculate cumulative density map using Gaussian distribution (synchronous version)
 * @param dropPoints Array of valid drop points
 * @param bounds Field bounds
 * @param canvasWidth Canvas width in pixels
 * @param canvasHeight Canvas height in pixels
 * @param parameters Heatmap parameters
 * @returns DensityMapData object
 */
export function calculateDensityMap(
  dropPoints: DropPoint[],
  bounds: FieldBounds,
  canvasWidth: number,
  canvasHeight: number,
  parameters: HeatmapParameters
): DensityMapData {
  const { fieldWidthMeters, fieldHeightMeters, pixelsPerMeter } = calculateMetersToPixels(
    bounds, 
    canvasWidth, 
    canvasHeight
  )
  
  // Create density map
  const densityMap = new Float32Array(canvasWidth * canvasHeight)
  let maxDensity = 0
  
  // For each pixel, calculate cumulative density from all drop points
  for (let y = 0; y < canvasHeight; y++) {
    for (let x = 0; x < canvasWidth; x++) {
      let totalDensity = 0
      
      // Check contribution from each drop point
      dropPoints.forEach((dropPoint) => {
        const centerX = ((dropPoint.longitude - bounds.boundedMinLng) / bounds.boundedLngRange) * canvasWidth
        const centerY = ((bounds.boundedMaxLat - dropPoint.latitude) / bounds.boundedLatRange) * canvasHeight
        
        // Calculate distance from this pixel to drop point center
        const pixelDistance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
        const meterDistance = pixelDistance / pixelsPerMeter
        
        // Only calculate if within max distance range
        if (meterDistance <= parameters.maxDistance) {
          // Calculate Gaussian density contribution
          const gaussianValue = Math.exp(-(meterDistance * meterDistance) / (2 * parameters.sigma * parameters.sigma))
          totalDensity += gaussianValue
        }
      })
      
      densityMap[y * canvasWidth + x] = totalDensity
      maxDensity = Math.max(maxDensity, totalDensity)
    }
  }
  
  return {
    densityData: densityMap,
    maxDensity,
    canvasWidth,
    canvasHeight,
    boundedMinLat: bounds.boundedMinLat,
    boundedMaxLat: bounds.boundedMaxLat,
    boundedMinLng: bounds.boundedMinLng,
    boundedMaxLng: bounds.boundedMaxLng,
    boundedLatRange: bounds.boundedLatRange,
    boundedLngRange: bounds.boundedLngRange,
    pixelsPerMeter,
    fieldWidthMeters,
    fieldHeightMeters
  }
}

/**
 * Convert canvas coordinates to GPS coordinates
 * @param canvasX X coordinate on canvas
 * @param canvasY Y coordinate on canvas
 * @param densityData Density map data
 * @returns GPS coordinates {lat, lng}
 */
export function canvasToGPS(
  canvasX: number,
  canvasY: number,
  densityData: DensityMapData
): { lat: number, lng: number } {
  const lngProgress = canvasX / densityData.canvasWidth
  const latProgress = (densityData.canvasHeight - canvasY) / densityData.canvasHeight
  
  const gpsLng = densityData.boundedMinLng + (lngProgress * densityData.boundedLngRange)
  const gpsLat = densityData.boundedMinLat + (latProgress * densityData.boundedLatRange)
  
  return { lat: gpsLat, lng: gpsLng }
}

/**
 * Get density and insect count at specific canvas coordinates
 * @param canvasX X coordinate on canvas
 * @param canvasY Y coordinate on canvas
 * @param densityData Density map data
 * @param insectsPerDrop Number of insects per drop point
 * @returns Object with density and insect information
 */
export function getDensityAtPoint(
  canvasX: number,
  canvasY: number,
  densityData: DensityMapData,
  insectsPerDrop: number
): {
  density: number
  normalizedDensity: number
  approximateInsects: number
} {
  const pixelIndex = canvasY * densityData.canvasWidth + canvasX
  const density = densityData.densityData[pixelIndex] || 0
  const normalizedDensity = density / densityData.maxDensity
  const approximateInsects = Math.round(density * insectsPerDrop)
  
  return {
    density,
    normalizedDensity,
    approximateInsects
  }
}