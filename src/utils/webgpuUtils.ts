/**
 * WebGPU utilities for GPU-accelerated heatmap computation
 */

import type { DropPoint } from './heatmapUtils'

export interface WebGPUContext {
  device: GPUDevice
  adapter: GPUAdapter
  isSupported: boolean
}

export interface HeatmapParamsGPU {
  canvasWidth: number
  canvasHeight: number
  sigma: number
  maxDistance: number
  insectsPerDrop: number
  pixelsPerMeter: number
  dropPointCount: number
  boundedMinLat: number
  boundedMaxLat: number
  boundedMinLng: number
  boundedMaxLng: number
  boundedLatRange: number
  boundedLngRange: number
}

let webgpuContext: WebGPUContext | null = null

/**
 * Check if WebGPU is supported in the current browser
 */
export function isWebGPUSupported(): boolean {
  return 'gpu' in navigator && typeof navigator.gpu.requestAdapter === 'function'
}

/**
 * Initialize WebGPU device and adapter
 * Returns cached context if already initialized
 */
export async function initializeWebGPU(): Promise<WebGPUContext | null> {
  if (webgpuContext) {
    return webgpuContext
  }

  if (!isWebGPUSupported()) {
    console.warn('WebGPU not supported in this browser')
    return null
  }

  try {
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
      console.warn('No WebGPU adapter found')
      return null
    }

    // Request device with required features
    const device = await adapter.requestDevice({
      requiredFeatures: [],
      requiredLimits: {
        maxComputeWorkgroupStorageSize: 16384,
        maxComputeInvocationsPerWorkgroup: 256,
        maxComputeWorkgroupSizeX: 256,
        maxComputeWorkgroupSizeY: 256,
        maxStorageBufferBindingSize: 134217728, // 128MB
      }
    })

    // Handle device loss
    device.lost.then((info) => {
      console.warn('WebGPU device lost:', info.message)
      webgpuContext = null
    })

    webgpuContext = {
      device,
      adapter,
      isSupported: true
    }

    console.log('WebGPU initialized successfully')
    return webgpuContext

  } catch (error) {
    console.error('Failed to initialize WebGPU:', error)
    return null
  }
}

/**
 * Create compute pipeline for heatmap calculation
 */
export function createHeatmapComputePipeline(
  device: GPUDevice,
  shaderCode: string
): GPUComputePipeline {
  const shaderModule = device.createShaderModule({
    code: shaderCode,
    label: 'Heatmap Compute Shader'
  })

  return device.createComputePipeline({
    layout: 'auto',
    compute: {
      module: shaderModule,
      entryPoint: 'computeDensity'
    },
    label: 'Heatmap Compute Pipeline'
  })
}

/**
 * Create buffers for GPU computation
 */
export function createHeatmapBuffers(
  device: GPUDevice,
  dropPoints: DropPoint[],
  parameters: HeatmapParamsGPU
): {
  dropPointBuffer: GPUBuffer
  paramsBuffer: GPUBuffer
  densityMapBuffer: GPUBuffer
  readBuffer: GPUBuffer
} {
  // Prepare drop point data (lat, lng pairs)
  const dropPointData = new Float32Array(dropPoints.length * 2)
  dropPoints.forEach((point, i) => {
    dropPointData[i * 2] = point.latitude
    dropPointData[i * 2 + 1] = point.longitude
  })

  // Create drop points buffer
  const dropPointBuffer = device.createBuffer({
    size: dropPointData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    label: 'Drop Points Buffer'
  })
  device.queue.writeBuffer(dropPointBuffer, 0, dropPointData)

  // Prepare parameters data (aligned to 16 bytes for uniform buffer)
  const paramsData = new ArrayBuffer(64) // 13 floats + padding = 64 bytes
  const paramsView = new DataView(paramsData)
  let offset = 0
  
  paramsView.setUint32(offset, parameters.canvasWidth, true); offset += 4
  paramsView.setUint32(offset, parameters.canvasHeight, true); offset += 4
  paramsView.setFloat32(offset, parameters.sigma, true); offset += 4
  paramsView.setFloat32(offset, parameters.maxDistance, true); offset += 4
  paramsView.setFloat32(offset, parameters.insectsPerDrop, true); offset += 4
  paramsView.setFloat32(offset, parameters.pixelsPerMeter, true); offset += 4
  paramsView.setUint32(offset, parameters.dropPointCount, true); offset += 4
  paramsView.setFloat32(offset, parameters.boundedMinLat, true); offset += 4
  paramsView.setFloat32(offset, parameters.boundedMaxLat, true); offset += 4
  paramsView.setFloat32(offset, parameters.boundedMinLng, true); offset += 4
  paramsView.setFloat32(offset, parameters.boundedMaxLng, true); offset += 4
  paramsView.setFloat32(offset, parameters.boundedLatRange, true); offset += 4
  paramsView.setFloat32(offset, parameters.boundedLngRange, true)

  // Create parameters buffer
  const paramsBuffer = device.createBuffer({
    size: paramsData.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    label: 'Parameters Buffer'
  })
  device.queue.writeBuffer(paramsBuffer, 0, paramsData)

  // Create density map output buffer
  const densityMapSize = parameters.canvasWidth * parameters.canvasHeight * 4 // f32 = 4 bytes
  const densityMapBuffer = device.createBuffer({
    size: densityMapSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    label: 'Density Map Buffer'
  })

  // Create read buffer for CPU access
  const readBuffer = device.createBuffer({
    size: densityMapSize,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    label: 'Read Buffer'
  })

  return {
    dropPointBuffer,
    paramsBuffer,
    densityMapBuffer,
    readBuffer
  }
}

/**
 * Calculate GPS distance in meters (Haversine formula)
 * Used for validation and CPU fallback
 */
export function calculateGPSDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Cleanup WebGPU resources
 */
export function cleanupWebGPU(): void {
  if (webgpuContext?.device) {
    webgpuContext.device.destroy()
    webgpuContext = null
  }
}

/**
 * Get performance info about WebGPU adapter
 */
export function getWebGPUInfo(): string | null {
  if (!webgpuContext?.adapter) return null
  
  const info = webgpuContext.adapter.info
  return `WebGPU: ${info.vendor || 'Unknown'} ${info.device || 'GPU'} (${info.architecture || 'Unknown'})`
}