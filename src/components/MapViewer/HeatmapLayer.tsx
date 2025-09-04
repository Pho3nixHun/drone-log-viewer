import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { DensityMapData } from '../../utils/heatmapUtils'

interface HeatmapLayerProps {
  densityMapData: DensityMapData | null
  opacity?: number
}

export default function HeatmapLayer({ densityMapData, opacity = 0.6 }: HeatmapLayerProps) {
  const map = useMap()
  const imageOverlayRef = useRef<L.ImageOverlay | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!densityMapData) {
      // Remove existing overlay if no data
      if (imageOverlayRef.current) {
        map.removeLayer(imageOverlayRef.current)
        imageOverlayRef.current = null
      }
      return
    }

    // Create a canvas to render the heatmap
    const canvas = document.createElement('canvas')
    canvas.width = densityMapData.canvasWidth
    canvas.height = densityMapData.canvasHeight
    canvasRef.current = canvas

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Create ImageData from density data
    const imageData = ctx.createImageData(densityMapData.canvasWidth, densityMapData.canvasHeight)
    const data = imageData.data

    // Convert density data to RGBA
    for (let i = 0; i < densityMapData.densityData.length; i++) {
      const density = densityMapData.densityData[i] / densityMapData.maxDensity
      const pixelIndex = i * 4

      // Apply thermal color mapping (blue to red)
      if (density > 0) {
        const normalizedDensity = Math.min(density, 1)
        
        // Thermal color mapping: blue (cold) -> red (hot)
        if (normalizedDensity < 0.5) {
          // Blue to cyan to green
          const t = normalizedDensity * 2
          data[pixelIndex] = Math.round(0 * (1 - t) + 0 * t)     // R
          data[pixelIndex + 1] = Math.round(0 * (1 - t) + 255 * t)   // G
          data[pixelIndex + 2] = Math.round(255 * (1 - t) + 255 * t) // B
          data[pixelIndex + 3] = Math.round(255 * normalizedDensity * opacity * 4) // A
        } else {
          // Green to yellow to red
          const t = (normalizedDensity - 0.5) * 2
          data[pixelIndex] = Math.round(0 * (1 - t) + 255 * t)       // R
          data[pixelIndex + 1] = Math.round(255 * (1 - t) + 255 * t) // G
          data[pixelIndex + 2] = Math.round(255 * (1 - t) + 0 * t)   // B
          data[pixelIndex + 3] = Math.round(255 * normalizedDensity * opacity * 4) // A
        }
      } else {
        // Transparent for zero density
        data[pixelIndex] = 0
        data[pixelIndex + 1] = 0
        data[pixelIndex + 2] = 0
        data[pixelIndex + 3] = 0
      }
    }

    // Draw the image data to canvas
    ctx.putImageData(imageData, 0, 0)

    // Convert canvas to data URL
    const dataURL = canvas.toDataURL()

    // Define bounds based on the density map data
    const bounds: L.LatLngBoundsExpression = [
      [densityMapData.boundedMinLat, densityMapData.boundedMinLng],
      [densityMapData.boundedMaxLat, densityMapData.boundedMaxLng]
    ]

    // Remove existing overlay
    if (imageOverlayRef.current) {
      map.removeLayer(imageOverlayRef.current)
    }

    // Create new image overlay
    const imageOverlay = L.imageOverlay(dataURL, bounds, {
      opacity,
      interactive: false,
      pane: 'overlayPane'
    })

    // Add to map
    imageOverlay.addTo(map)
    imageOverlayRef.current = imageOverlay

    // Cleanup function
    return () => {
      if (imageOverlayRef.current) {
        map.removeLayer(imageOverlayRef.current)
        imageOverlayRef.current = null
      }
    }
  }, [densityMapData, opacity, map])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (imageOverlayRef.current) {
        map.removeLayer(imageOverlayRef.current)
      }
    }
  }, [map])

  return null // This component doesn't render anything directly
}