/**
 * Heatmap calculation utilities for density visualization
 */

import type { FieldBounds } from './canvasUtils'
import { 
  initializeWebGPU, 
  createHeatmapComputePipeline, 
  createHeatmapBuffers,
  type HeatmapParamsGPU 
} from './webgpuUtils'

export type DistributionMethod = 'gaussian' | 'levy-flight' | 'exponential'

export interface HeatmapParameters {
  sigma: number // Standard deviation in meters (for Gaussian)
  maxDistance: number // Maximum distance in meters
  insectsPerDrop: number // Insects per drop point
  resolution: number // Canvas resolution multiplier
  distributionMethod: DistributionMethod // Distribution method for density calculation
  
  // Distribution-specific parameters
  levyAlpha?: number // Lévy flight stability parameter (1.0-2.0, default 1.5)
  exponentialLambda?: number // Exponential decay rate (default 0.2)
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
 * Calculate distribution value based on distance and parameters
 * @param meterDistance Distance in meters from drop point
 * @param parameters Heatmap parameters including distribution method
 * @returns Distribution value between 0 and 1
 */
function calculateDistributionValue(meterDistance: number, parameters: HeatmapParameters): number {
  switch (parameters.distributionMethod) {
    case 'gaussian':
      // Standard Gaussian distribution
      return Math.exp(-(meterDistance * meterDistance) / (2 * parameters.sigma * parameters.sigma))
    
    case 'levy-flight': {
      // Lévy stable distribution - proper implementation
      const alpha = parameters.levyAlpha || 1.8
      if (meterDistance === 0) return 1.0
      
      const scale = parameters.sigma
      const normalizedDistance = meterDistance / scale
      
      // Standard Lévy distribution formula
      return Math.pow(1 + normalizedDistance * normalizedDistance, -alpha / 2)
    }
    
    case 'exponential': {
      // Standard exponential distribution
      const lambda = parameters.exponentialLambda || 0.125
      return Math.exp(-lambda * meterDistance)
    }
    
    default:
      return Math.exp(-(meterDistance * meterDistance) / (2 * parameters.sigma * parameters.sigma))
  }
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
            // Calculate density contribution using selected distribution method
            const distributionValue = calculateDistributionValue(meterDistance, parameters)
            totalDensity += distributionValue
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
          // Calculate density contribution using selected distribution method
          const distributionValue = calculateDistributionValue(meterDistance, parameters)
          totalDensity += distributionValue
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

/**
 * Calculate average insect density per square meter in a local area around a point
 * @param canvasX X coordinate on canvas
 * @param canvasY Y coordinate on canvas
 * @param densityData Density map data
 * @param insectsPerDrop Number of insects per drop point
 * @param sampleAreaMeters Sample area size in square meters (default 1m²)
 * @returns Object with area density information
 */
export function calculateLocalDensityPerArea(
  canvasX: number,
  canvasY: number,
  densityData: DensityMapData,
  insectsPerDrop: number,
  sampleAreaMeters: number = 1
): {
  insectsPerSquareMeter: number
  sampleAreaMeters: number
  sampledPixels: number
} {
  // Convert sample area to pixel radius
  // For circular area: area = π * r², so r = sqrt(area / π)
  const sampleRadiusMeters = Math.sqrt(sampleAreaMeters / Math.PI)
  const sampleRadiusPixels = Math.ceil(sampleRadiusMeters * densityData.pixelsPerMeter)
  
  let totalDensity = 0
  let sampledPixels = 0
  
  // Sample pixels within the circular area
  for (let dy = -sampleRadiusPixels; dy <= sampleRadiusPixels; dy++) {
    for (let dx = -sampleRadiusPixels; dx <= sampleRadiusPixels; dx++) {
      const pixelDistance = Math.sqrt(dx * dx + dy * dy)
      
      // Only sample pixels within the circular radius
      if (pixelDistance <= sampleRadiusPixels) {
        const sampleX = canvasX + dx
        const sampleY = canvasY + dy
        
        // Check bounds
        if (sampleX >= 0 && sampleX < densityData.canvasWidth && 
            sampleY >= 0 && sampleY < densityData.canvasHeight) {
          const pixelIndex = sampleY * densityData.canvasWidth + sampleX
          totalDensity += densityData.densityData[pixelIndex] || 0
          sampledPixels++
        }
      }
    }
  }
  
  if (sampledPixels === 0) {
    return {
      insectsPerSquareMeter: 0,
      sampleAreaMeters,
      sampledPixels: 0
    }
  }
  
  // Calculate average density in the sample area
  const averageDensity = totalDensity / sampledPixels
  
  // Convert to insects per square meter
  // averageDensity represents cumulative Gaussian contributions
  // Multiply by insectsPerDrop to get actual insect count, then divide by area
  const insectsPerSquareMeter = (averageDensity * insectsPerDrop) / sampleAreaMeters
  
  return {
    insectsPerSquareMeter,
    sampleAreaMeters,
    sampledPixels
  }
}

// WGSL Shader code for GPU computation
const HEATMAP_SHADER_CODE = `
// WGSL Compute Shader for Trichogramma Density Heatmap Calculation
struct HeatmapParams {
  canvasWidth: u32,
  canvasHeight: u32,
  sigma: f32,
  maxDistance: f32,
  insectsPerDrop: f32,
  pixelsPerMeter: f32,
  dropPointCount: u32,
  boundedMinLat: f32,
  boundedMaxLat: f32,
  boundedMinLng: f32,
  boundedMaxLng: f32,
  boundedLatRange: f32,
  boundedLngRange: f32,
  distributionMethod: u32, // 0=gaussian, 1=levy-flight, 2=exponential
  levyAlpha: f32,
  exponentialLambda: f32,
}

@group(0) @binding(0) var<storage, read> dropPoints: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> densityMap: array<f32>;
@group(0) @binding(2) var<uniform> params: HeatmapParams;

fn calculateGPSDistanceFast(lat1: f32, lng1: f32, lat2: f32, lng2: f32) -> f32 {
  let R: f32 = 6371000.0;
  let toRad = 0.017453292519943295;
  
  let avgLat = (lat1 + lat2) * 0.5 * toRad;
  let dLat = (lat2 - lat1) * toRad;
  let dLng = (lng2 - lng1) * toRad * cos(avgLat);
  
  return R * sqrt(dLat * dLat + dLng * dLng);
}

fn calculateDistributionValue(distance: f32, params: HeatmapParams) -> f32 {
  switch (params.distributionMethod) {
    case 0u: {
      // Gaussian distribution
      let sigmaSquared = params.sigma * params.sigma;
      let exponent = -(distance * distance) / (2.0 * sigmaSquared);
      return exp(exponent);
    }
    case 1u: {
      // Lévy flight distribution
      if (distance == 0.0) { return 1.0; }
      let scale = params.sigma;
      let normalizedDistance = distance / scale;
      return pow(1.0 + normalizedDistance * normalizedDistance, -params.levyAlpha / 2.0);
    }
    case 2u: {
      // Exponential distribution
      return exp(-params.exponentialLambda * distance);
    }
    default: {
      // Default to Gaussian
      let sigmaSquared = params.sigma * params.sigma;
      let exponent = -(distance * distance) / (2.0 * sigmaSquared);
      return exp(exponent);
    }
  }
}

@compute @workgroup_size(16, 16)
fn computeDensity(@builtin(global_invocation_id) global_id: vec3u) {
  let x = global_id.x;
  let y = global_id.y;
  
  if (x >= params.canvasWidth || y >= params.canvasHeight) { return; }
  
  let pixelIndex = y * params.canvasWidth + x;
  var totalDensity: f32 = 0.0;
  
  let lngProgress = f32(x) / f32(params.canvasWidth);
  let latProgress = (f32(params.canvasHeight) - f32(y)) / f32(params.canvasHeight);
  let pixelLng = params.boundedMinLng + (lngProgress * params.boundedLngRange);
  let pixelLat = params.boundedMinLat + (latProgress * params.boundedLatRange);
  
  for (var i: u32 = 0; i < params.dropPointCount; i++) {
    let dropPoint = dropPoints[i];
    let distance = calculateGPSDistanceFast(pixelLat, pixelLng, dropPoint.x, dropPoint.y);
    
    if (distance <= params.maxDistance) {
      totalDensity += calculateDistributionValue(distance, params);
    }
  }
  
  densityMap[pixelIndex] = totalDensity;
}
`

/**
 * Calculate cumulative density map using GPU acceleration (WebGPU)
 * Falls back to CPU calculation if WebGPU is not available
 * @param dropPoints Array of valid drop points
 * @param bounds Field bounds
 * @param canvasWidth Canvas width in pixels
 * @param canvasHeight Canvas height in pixels
 * @param parameters Heatmap parameters
 * @param onProgress Optional progress callback
 * @returns Promise<DensityMapData>
 */
export async function calculateDensityMapGPU(
  dropPoints: DropPoint[],
  bounds: FieldBounds,
  canvasWidth: number,
  canvasHeight: number,
  parameters: HeatmapParameters,
  onProgress?: (current: number, total: number) => void
): Promise<DensityMapData> {
  // Initialize WebGPU
  const webgpu = await initializeWebGPU()
  
  if (!webgpu) {
    console.log('WebGPU not available, falling back to CPU')
    return calculateDensityMapAsync(dropPoints, bounds, canvasWidth, canvasHeight, parameters, onProgress)
  }

  try {
    const { device } = webgpu
    
    // Calculate meters to pixels conversion
    const { fieldWidthMeters, fieldHeightMeters, pixelsPerMeter } = calculateMetersToPixels(
      bounds, 
      canvasWidth, 
      canvasHeight
    )

    // Prepare GPU parameters
    const distributionMethodMap = {
      'gaussian': 0,
      'levy-flight': 1,
      'exponential': 2
    } as const

    const gpuParams: HeatmapParamsGPU = {
      canvasWidth,
      canvasHeight,
      sigma: parameters.sigma,
      maxDistance: parameters.maxDistance,
      insectsPerDrop: parameters.insectsPerDrop,
      pixelsPerMeter,
      dropPointCount: dropPoints.length,
      boundedMinLat: bounds.boundedMinLat,
      boundedMaxLat: bounds.boundedMaxLat,
      boundedMinLng: bounds.boundedMinLng,
      boundedMaxLng: bounds.boundedMaxLng,
      boundedLatRange: bounds.boundedLatRange,
      boundedLngRange: bounds.boundedLngRange,
      distributionMethod: distributionMethodMap[parameters.distributionMethod],
      levyAlpha: parameters.levyAlpha || 1.8,
      exponentialLambda: parameters.exponentialLambda || 0.125
    }

    // Create compute pipeline
    const pipeline = createHeatmapComputePipeline(device, HEATMAP_SHADER_CODE)

    // Create buffers
    const buffers = createHeatmapBuffers(device, dropPoints, gpuParams)

    // Create bind group
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: buffers.dropPointBuffer } },
        { binding: 1, resource: { buffer: buffers.densityMapBuffer } },
        { binding: 2, resource: { buffer: buffers.paramsBuffer } }
      ]
    })

    // Dispatch compute shader
    const commandEncoder = device.createCommandEncoder({ label: 'Heatmap Compute' })
    const computePass = commandEncoder.beginComputePass({ label: 'Density Calculation' })
    
    computePass.setPipeline(pipeline)
    computePass.setBindGroup(0, bindGroup)
    
    // Calculate workgroup dispatches (16x16 workgroup size)
    const workgroupsX = Math.ceil(canvasWidth / 16)
    const workgroupsY = Math.ceil(canvasHeight / 16)
    computePass.dispatchWorkgroups(workgroupsX, workgroupsY)
    computePass.end()

    // Copy result to read buffer
    commandEncoder.copyBufferToBuffer(
      buffers.densityMapBuffer, 0,
      buffers.readBuffer, 0,
      buffers.densityMapBuffer.size
    )

    // Submit commands and wait for completion
    const commandBuffer = commandEncoder.finish()
    device.queue.submit([commandBuffer])

    // Read results back to CPU
    await buffers.readBuffer.mapAsync(GPUMapMode.READ)
    const resultArrayBuffer = buffers.readBuffer.getMappedRange()
    const resultData = new Float32Array(resultArrayBuffer.slice(0)) // Copy data
    buffers.readBuffer.unmap()

    // Find maximum density for normalization
    let maxDensity = 0
    for (const density of resultData) {
      maxDensity = Math.max(maxDensity, density)
    }

    // Cleanup GPU resources
    buffers.dropPointBuffer.destroy()
    buffers.paramsBuffer.destroy()
    buffers.densityMapBuffer.destroy()
    buffers.readBuffer.destroy()

    // Report completion
    if (onProgress) {
      onProgress(1, 1) // 100% complete
    }

    // GPU computation completed successfully

    return {
      densityData: resultData,
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

  } catch (error) {
    console.error('GPU calculation failed, falling back to CPU:', error)
    return calculateDensityMapAsync(dropPoints, bounds, canvasWidth, canvasHeight, parameters, onProgress)
  }
}