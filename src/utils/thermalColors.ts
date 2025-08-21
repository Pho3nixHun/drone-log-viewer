/**
 * Thermal color mapping utilities for heatmap visualization
 */

export interface RGBAColor {
  r: number
  g: number  
  b: number
  a: number
}

export interface HSLColor {
  h: number
  s: number
  l: number
}

/**
 * Convert HSL color values to RGB
 * @param h Hue (0-360)
 * @param s Saturation (0-100)
 * @param l Lightness (0-100)
 * @returns RGB color object
 */
export function hslToRgb(h: number, s: number, l: number): { r: number, g: number, b: number } {
  h = h / 360
  s = s / 100
  l = l / 100
  
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }
  
  if (s === 0) {
    const gray = Math.round(l * 255)
    return { r: gray, g: gray, b: gray }
  }
  
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  
  return {
    r: Math.round(hue2rgb(p, q, h + 1/3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1/3) * 255)
  }
}

/**
 * Generate thermal color mapping using HSL color space
 * Uses a 282-step system: 232 hue steps (blue to red) + 50 lightness steps (red to white)
 * @param intensity Normalized intensity value (0-1)
 * @returns RGBA color object
 */
export function getThermalColor(intensity: number): RGBAColor {
  // Clamp intensity to 0-1 range
  intensity = Math.max(0, Math.min(1, intensity))
  
  if (intensity === 0) {
    return { r: 0, g: 0, b: 0, a: 0 } // Transparent
  }
  
  // Total steps: 232 (hue) + 50 (lightness) = 282
  const totalSteps = 282
  const step = Math.floor(intensity * totalSteps)
  
  let h, s, l
  
  if (step <= 232) {
    // First 232 steps: hue from 232 (blue) to 0 (red) - reversed for thermal
    h = 232 - step
    s = 100 // Full saturation
    l = 50  // Base lightness
  } else {
    // Steps 233-282: red fading to white via increased lightness
    h = 0 // Stay at red
    s = 100
    const lightnessSteps = step - 232 // 0 to 50
    l = Math.round(50 + lightnessSteps) // 50% to 100% lightness
  }
  
  // Convert HSL to RGB
  const { r, g, b } = hslToRgb(h, s, l)
  
  // Alpha based on intensity (minimum visible alpha for low values)
  const alpha = Math.round(Math.max(25, intensity * 255))
  
  return { r, g, b, a: alpha }
}

/**
 * Apply thermal color mapping to an ImageData array
 * @param imageData ImageData object to modify
 * @param densityMap Float32Array containing normalized density values (0-1)
 * @param width Width of the density map
 * @param height Height of the density map
 */
export function applyThermalColors(
  imageData: ImageData, 
  densityMap: Float32Array, 
  width: number, 
  height: number
): void {
  const data = imageData.data
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4
      const density = densityMap[y * width + x]
      
      // Apply thermal color mapping
      const { r, g, b, a } = getThermalColor(density)
      
      data[pixelIndex] = r     // Red
      data[pixelIndex + 1] = g // Green
      data[pixelIndex + 2] = b // Blue
      data[pixelIndex + 3] = a // Alpha
    }
  }
}