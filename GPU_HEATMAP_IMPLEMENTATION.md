# GPU-Accelerated Heatmap Calculation Using WebGPU

## Overview

Currently, the trichogramma density heatmap calculation is performed on the CPU using JavaScript, which processes each pixel sequentially. This approach becomes slow for high-resolution heatmaps or datasets with many drop points. By leveraging the GPU through WebGPU API, we can parallelize the computation and achieve significant performance improvements.

## Current Implementation Analysis

### CPU-based Calculation (`calculateDensityMapAsync`)

- **Sequential Processing**: Each pixel calculated one at a time
- **Nested Loops**: For each pixel (x,y), iterate through all drop points
- **Gaussian Computation**: `Math.exp(-(distance²) / (2 * sigma²))` per pixel per drop point
- **Complexity**: O(width × height × dropPoints) - can be millions of operations
- **Performance**: ~2-10 seconds for 1500×1200 canvas with 100+ drop points

### Limitations

- Main thread blocking (even with RAF chunking)
- CPU single-threaded execution
- Memory allocation overhead for intermediate calculations
- Scaling poorly with resolution and drop point count

## WebGPU Implementation Strategy

### 1. **GPU Shader Architecture**

#### Compute Shader Structure

```wgsl
// WGSL (WebGPU Shading Language) compute shader
@group(0) @binding(0) var<storage, read> dropPoints: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> densityMap: array<f32>;
@group(0) @binding(2) var<uniform> params: HeatmapParams;

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
}

@compute @workgroup_size(16, 16)
fn computeDensity(@builtin(global_invocation_id) global_id: vec3u) {
  let x = global_id.x;
  let y = global_id.y;

  if (x >= params.canvasWidth || y >= params.canvasHeight) { return; }

  let pixelIndex = y * params.canvasWidth + x;
  var totalDensity: f32 = 0.0;

  // Convert pixel coordinates to GPS coordinates
  let lngProgress = f32(x) / f32(params.canvasWidth);
  let latProgress = (f32(params.canvasHeight) - f32(y)) / f32(params.canvasHeight);
  let pixelLng = params.boundedMinLng + (lngProgress * params.boundedLngRange);
  let pixelLat = params.boundedMinLat + (latProgress * params.boundedLatRange);

  // Calculate density contribution from each drop point
  for (var i: u32 = 0; i < params.dropPointCount; i++) {
    let dropPoint = dropPoints[i];
    let distance = calculateGPSDistance(pixelLat, pixelLng, dropPoint.x, dropPoint.y);
    let meterDistance = distance * 111320.0; // Approximate conversion

    if (meterDistance <= params.maxDistance) {
      let gaussianValue = exp(-(meterDistance * meterDistance) / (2.0 * params.sigma * params.sigma));
      totalDensity += gaussianValue;
    }
  }

  densityMap[pixelIndex] = totalDensity;
}
```

### 2. **Implementation Steps**

#### Step 1: WebGPU Setup and Detection

```typescript
// src/utils/webgpuUtils.ts
export async function initializeWebGPU(): Promise<{
  device: GPUDevice;
  adapter: GPUAdapter;
} | null> {
  if (!navigator.gpu) {
    console.warn("WebGPU not supported");
    return null;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) return null;

  const device = await adapter.requestDevice();
  return { device, adapter };
}
```

#### Step 2: Shader Compilation and Pipeline Creation

```typescript
export function createComputePipeline(
  device: GPUDevice,
  shaderCode: string,
): GPUComputePipeline {
  const shaderModule = device.createShaderModule({
    code: shaderCode,
  });

  return device.createComputePipeline({
    layout: "auto",
    compute: {
      module: shaderModule,
      entryPoint: "computeDensity",
    },
  });
}
```

#### Step 3: Buffer Management

```typescript
export function createHeatmapBuffers(
  device: GPUDevice,
  dropPoints: DropPoint[],
  canvasWidth: number,
  canvasHeight: number,
  parameters: HeatmapParameters,
  bounds: FieldBounds,
) {
  // Drop points buffer
  const dropPointData = new Float32Array(dropPoints.length * 2);
  dropPoints.forEach((point, i) => {
    dropPointData[i * 2] = point.latitude;
    dropPointData[i * 2 + 1] = point.longitude;
  });

  const dropPointBuffer = device.createBuffer({
    size: dropPointData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });

  // Parameters uniform buffer
  const paramsData = new ArrayBuffer(64); // Aligned struct size
  const paramsView = new DataView(paramsData);
  paramsView.setUint32(0, canvasWidth, true);
  paramsView.setUint32(4, canvasHeight, true);
  paramsView.setFloat32(8, parameters.sigma, true);
  // ... set other parameters

  // Density map output buffer
  const densityMapBuffer = device.createBuffer({
    size: canvasWidth * canvasHeight * 4, // f32 = 4 bytes
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  return { dropPointBuffer, paramsBuffer, densityMapBuffer };
}
```

#### Step 4: Compute Dispatch and Result Retrieval

```typescript
export async function calculateDensityMapGPU(
  dropPoints: DropPoint[],
  bounds: FieldBounds,
  canvasWidth: number,
  canvasHeight: number,
  parameters: HeatmapParameters,
): Promise<DensityMapData> {
  const gpu = await initializeWebGPU();
  if (!gpu) {
    // Fallback to CPU implementation
    return calculateDensityMapAsync(/* ... */);
  }

  const { device } = gpu;
  const pipeline = createComputePipeline(device, shaderCode);
  const buffers = createHeatmapBuffers(/* ... */);

  // Create bind group
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: buffers.dropPointBuffer } },
      { binding: 1, resource: { buffer: buffers.densityMapBuffer } },
      { binding: 2, resource: { buffer: buffers.paramsBuffer } },
    ],
  });

  // Dispatch compute shader
  const commandEncoder = device.createCommandEncoder();
  const computePass = commandEncoder.beginComputePass();
  computePass.setPipeline(pipeline);
  computePass.setBindGroup(0, bindGroup);

  const workgroupsX = Math.ceil(canvasWidth / 16);
  const workgroupsY = Math.ceil(canvasHeight / 16);
  computePass.dispatchWorkgroups(workgroupsX, workgroupsY);
  computePass.end();

  // Read back results
  const readBuffer = device.createBuffer({
    size: buffers.densityMapBuffer.size,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  commandEncoder.copyBufferToBuffer(
    buffers.densityMapBuffer,
    0,
    readBuffer,
    0,
    buffers.densityMapBuffer.size,
  );

  device.queue.submit([commandEncoder.finish()]);

  await readBuffer.mapAsync(GPUMapMode.READ);
  const resultData = new Float32Array(readBuffer.getMappedRange());

  return processGPUResults(resultData, bounds, canvasWidth, canvasHeight);
}
```

### 3. **Integration Strategy**

#### Progressive Enhancement Approach

1. **Feature Detection**: Check WebGPU support
2. **Graceful Fallback**: Use CPU implementation if GPU unavailable
3. **User Preference**: Allow users to choose GPU vs CPU
4. **Performance Monitoring**: Compare execution times

#### Component Integration

```typescript
// In TrichogrammaCanvas.tsx
const generateHeatmap = async () => {
  setIsGenerating(true);

  try {
    // Try GPU first, fallback to CPU
    const useGPU = await detectWebGPUSupport();

    const densityData = useGPU
      ? await calculateDensityMapGPU(/* ... */)
      : await calculateDensityMapAsync(/* ... */);

    // Apply thermal colors and render...
  } catch (error) {
    console.warn("GPU computation failed, falling back to CPU:", error);
    const densityData = await calculateDensityMapAsync(/* ... */);
  }
};
```

### 4. **Expected Performance Improvements**

#### Theoretical Speedup

- **Parallelization**: 1000+ cores vs 1 CPU core
- **Memory Bandwidth**: GPU memory much faster than system RAM
- **Specialized Hardware**: Optimized for floating-point operations

#### Realistic Expectations

- **Small datasets** (< 1000×1000, < 50 drop points): Minimal improvement due to GPU setup overhead
- **Medium datasets** (1500×1200, 50-200 drop points): 5-10x speedup
- **Large datasets** (3000×2400, 200+ drop points): 10-50x speedup

### 5. **Browser Compatibility & Fallbacks**

#### WebGPU Support (as of 2024)

- **Chrome 113+**: Full support
- **Firefox**: Behind flag, experimental
- **Safari**: Partial support in newer versions
- **Mobile**: Limited support

#### Fallback Strategy

```typescript
const COMPUTATION_METHODS = {
  GPU: "webgpu",
  CPU_ASYNC: "cpu-async",
  CPU_SYNC: "cpu-sync",
} as const;

async function selectComputationMethod(): Promise<
  keyof typeof COMPUTATION_METHODS
> {
  if (await detectWebGPUSupport()) return "GPU";
  if ("requestAnimationFrame" in window) return "CPU_ASYNC";
  return "CPU_SYNC";
}
```

### 6. **Additional Considerations**

#### Memory Management

- GPU buffer lifecycle management
- Automatic cleanup on component unmount
- Memory usage monitoring

#### Error Handling

- GPU device lost scenarios
- Shader compilation errors
- Buffer allocation failures

#### Performance Monitoring

- Execution time comparison
- Memory usage tracking
- User experience metrics

#### Security & Privacy

- No additional data exposure (computation is local)
- Same origin policy compliance
- No external resource dependencies

## Implementation Priority

1. **Phase 1**: Basic WebGPU detection and simple compute shader
2. **Phase 2**: Full heatmap computation with fallback
3. **Phase 3**: Performance optimization and memory management
4. **Phase 4**: User preferences and advanced features

## Success Metrics

- **Performance**: > 5x speedup for medium datasets
- **Reliability**: < 1% fallback rate on supported browsers
- **User Experience**: No visual differences, faster generation
- **Compatibility**: Graceful degradation on unsupported browsers
