import { useEffect, useRef, useState } from 'react'
import { Card, Text, Box, Button, Group, NumberInput, Grid, Paper, LoadingOverlay, Progress } from '@mantine/core'
import { IconChartDots, IconSettings } from '@tabler/icons-react'
import { useMissionStore } from '../../stores/missionStore'
import { applyThermalColors } from '../../utils/thermalColors'
import { 
  calculateFieldBounds, 
  calculateCanvasDimensions, 
  setupCanvas as setupCanvasElement, 
  clearCanvas, 
  drawPlaceholderText,
  drawRulers,
} from '../../utils/canvasUtils'
import { 
  filterValidDropPoints,
  calculateDensityMapAsync,
  type HeatmapParameters,
  type DensityMapData 
} from '../../utils/heatmapUtils'

export function TrichogrammaCanvas() {
  const { currentMission } = useMissionStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const densityMapRef = useRef<DensityMapData | null>(null)
  const [tooltip, setTooltip] = useState<{
    visible: boolean
    x: number
    y: number
    density: number
    insects: number
    coverage: string
  }>({
    visible: false,
    x: 0,
    y: 0,
    density: 0,
    insects: 0,
    coverage: ''
  })

  // Heatmap parameters
  const [parameters, setParameters] = useState<HeatmapParameters>({
    sigma: 5, // Standard deviation in meters
    maxDistance: 15, // Maximum distance in meters
    insectsPerDrop: 1200, // Insects per drop point
    resolution: 2 // Canvas resolution multiplier
  })
  const [isHeatmapGenerated, setIsHeatmapGenerated] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  
  // Initialize canvas with basic setup
  useEffect(() => {
    if (!currentMission?.flightLog.dropPoints || !canvasRef.current) return
    
    // Just set up canvas dimensions without generating heatmap
    setupCanvas()
  }, [currentMission])

  const setupCanvas = () => {
    if (!currentMission?.flightLog.dropPoints || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const dropPoints = currentMission.flightLog.dropPoints
    console.log(`Total drop points: ${dropPoints.length}`)
    
    // Filter out invalid coordinates
    const validDropPoints = filterValidDropPoints(dropPoints)
    console.log(`Valid drop points: ${validDropPoints.length}`)
    
    if (validDropPoints.length === 0) {
      console.log('No valid drop points found')
      return
    }
    
    // Calculate field bounds
    const bounds = calculateFieldBounds(validDropPoints)
    
    // Calculate canvas dimensions
    const dimensions = calculateCanvasDimensions(bounds.fieldAspectRatio, 750, 600, parameters.resolution)
    
    // Setup canvas with proper scaling
    const ctx = setupCanvasElement(canvas, dimensions, parameters.resolution)
    if (!ctx) return
    
    // Clear canvas and draw placeholder
    clearCanvas(ctx, dimensions.displayWidth, dimensions.displayHeight)
    drawPlaceholderText(
      ctx,
      'Click "Generate Heatmap" to create visualization',
      dimensions.displayWidth,
      dimensions.displayHeight
    )
    
    setIsHeatmapGenerated(false)
  }

  const generateHeatmap = async () => {
    if (!currentMission?.flightLog.dropPoints || !canvasRef.current) return
    
    setIsGenerating(true)
    setGenerationProgress(0)
    
    try {
      const canvas = canvasRef.current
      const dropPoints = currentMission.flightLog.dropPoints
      
      // Filter out invalid coordinates
      const validDropPoints = filterValidDropPoints(dropPoints)
      if (validDropPoints.length === 0) {
        setIsGenerating(false)
        return
      }
      
      // Calculate field bounds and canvas dimensions
      const bounds = calculateFieldBounds(validDropPoints)
      const dimensions = calculateCanvasDimensions(bounds.fieldAspectRatio, 750, 600, parameters.resolution)
      
      // Setup canvas
      const ctx = setupCanvasElement(canvas, dimensions, parameters.resolution)
      if (!ctx) {
        setIsGenerating(false)
        return
      }
      
      // Clear canvas
      clearCanvas(ctx, dimensions.displayWidth, dimensions.displayHeight)
      
      // Calculate density map with progress tracking
      const densityData = await calculateDensityMapAsync(
        validDropPoints,
        bounds,
        dimensions.canvasWidth,
        dimensions.canvasHeight,
        parameters,
        (current, total) => {
          setGenerationProgress(Math.round((current / total) * 100))
        }
      )
      
      // Create normalized density map for color mapping
      const normalizedDensityMap = new Float32Array(dimensions.canvasWidth * dimensions.canvasHeight)
      for (let i = 0; i < densityData.densityData.length; i++) {
        normalizedDensityMap[i] = densityData.densityData[i] / densityData.maxDensity
      }
      
      // Apply thermal colors to image data
      const imageData = ctx.createImageData(dimensions.canvasWidth, dimensions.canvasHeight)
      applyThermalColors(imageData, normalizedDensityMap, dimensions.canvasWidth, dimensions.canvasHeight)
      
      // Draw the heatmap
      ctx.putImageData(imageData, 0, 0)
      
      // Draw rulers
      drawRulers(
        ctx,
        densityData.fieldWidthMeters,
        densityData.fieldHeightMeters,
        dimensions.displayWidth,
        dimensions.displayHeight
      )
      
      // Store density map data for tooltip
      densityMapRef.current = densityData
      
      setIsHeatmapGenerated(true)
    } catch (error) {
      console.error('Error generating heatmap:', error)
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!densityMapRef.current || !canvasRef.current || !isHeatmapGenerated) return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    // Convert display coordinates to canvas coordinates
    const scaleX = densityMapRef.current.canvasWidth / rect.width
    const scaleY = densityMapRef.current.canvasHeight / rect.height
    const canvasX = Math.floor(x * scaleX)
    const canvasY = Math.floor(y * scaleY)
    
    // Get density value at this pixel
    const pixelIndex = canvasY * densityMapRef.current.canvasWidth + canvasX
    const density = densityMapRef.current.densityData[pixelIndex] || 0
    const normalizedDensity = density / densityMapRef.current.maxDensity
    
    // Calculate approximate insect count using parameter
    const approximateInsects = Math.round(density * parameters.insectsPerDrop)
    
    // Calculate GPS coordinates
    const lngProgress = canvasX / densityMapRef.current.canvasWidth
    const latProgress = (densityMapRef.current.canvasHeight - canvasY) / densityMapRef.current.canvasHeight
    
    const gpsLng = densityMapRef.current.boundedMinLng + (lngProgress * densityMapRef.current.boundedLngRange)
    const gpsLat = densityMapRef.current.boundedMinLat + (latProgress * densityMapRef.current.boundedLatRange)
    
    // Update tooltip
    setTooltip({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      density: normalizedDensity,
      insects: approximateInsects,
      coverage: `${gpsLat.toFixed(6)}, ${gpsLng.toFixed(6)}`
    })
  }

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }))
  }
  
  if (!currentMission) return null
  
  return (
    <Card withBorder p="lg" style={{ backgroundColor: '#fafbfc' }}>
      <Box>
        <Text size="lg" fw={600} mb="md">Trichogramma Density Distribution</Text>
        <Text size="sm" c="dimmed" mb="md">
          Gaussian distribution showing insect spread - Configure parameters and generate visualization
        </Text>
        
        {/* Parameters Form */}
        <Paper p="md" mb="md" withBorder style={{ backgroundColor: '#f8f9fa', position: 'relative' }}>
          <LoadingOverlay visible={isGenerating} />
          
          <Group align="center" mb="sm">
            <IconSettings size={16} />
            <Text size="sm" fw={600}>Heatmap Parameters</Text>
          </Group>
          
          <Grid>
            <Grid.Col span={6}>
              <NumberInput
                label="Sigma (σ)"
                description="Standard deviation in meters"
                value={parameters.sigma}
                onChange={(value) => setParameters(prev => ({ ...prev, sigma: Number(value) || 5 }))}
                disabled={isGenerating}
                min={1}
                max={50}
                step={0.5}
                size="sm"
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <NumberInput
                label="Max Distance"
                description="Maximum spread in meters"
                value={parameters.maxDistance}
                onChange={(value) => setParameters(prev => ({ ...prev, maxDistance: Number(value) || 15 }))}
                disabled={isGenerating}
                min={5}
                max={100}
                step={5}
                size="sm"
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <NumberInput
                label="Insects/Drop"
                description="Insects per drop point"
                value={parameters.insectsPerDrop}
                onChange={(value) => setParameters(prev => ({ ...prev, insectsPerDrop: Number(value) || 1200 }))}
                disabled={isGenerating}
                min={100}
                max={5000}
                step={100}
                size="sm"
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <NumberInput
                label="Resolution"
                description="Canvas resolution multiplier"
                value={parameters.resolution}
                onChange={(value) => setParameters(prev => ({ ...prev, resolution: Number(value) || 2 }))}
                disabled={isGenerating}
                min={1}
                max={4}
                step={1}
                size="sm"
              />
            </Grid.Col>
          </Grid>
          
          {/* Progress Bar */}
          {isGenerating && (
            <Box mt="md">
              <Text size="xs" c="dimmed" mb={5}>
                Generating heatmap... {generationProgress}%
              </Text>
              <Progress value={generationProgress} size="sm" />
            </Box>
          )}
          
          <Group justify="space-between" mt="md">
            <Text size="xs" c="dimmed">
              σ={parameters.sigma}m, max {parameters.maxDistance}m radius, {parameters.insectsPerDrop} insects/drop
            </Text>
            <Button
              leftSection={<IconChartDots size={16} />}
              onClick={generateHeatmap}
              loading={isGenerating}
              disabled={!currentMission?.flightLog.dropPoints || isGenerating}
              size="sm"
            >
              {isHeatmapGenerated ? 'Regenerate Heatmap' : 'Generate Heatmap'}
            </Button>
          </Group>
        </Paper>
        
        <Box style={{ width: '100%', position: 'relative' }}>
          <LoadingOverlay visible={isGenerating} />
          
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              width: '100%',
              height: 'auto',
              display: 'block',
              cursor: isHeatmapGenerated ? 'crosshair' : 'default'
            }}
          />
          
          {/* Tooltip */}
          {tooltip.visible && isHeatmapGenerated && (
            <div
              style={{
                position: 'fixed',
                left: tooltip.x + 10,
                top: tooltip.y - 10,
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontFamily: 'monospace',
                zIndex: 1000,
                pointerEvents: 'none',
                whiteSpace: 'nowrap'
              }}
            >
              <div>GPS: {tooltip.coverage}</div>
              <div>Density: {(tooltip.density * 100).toFixed(1)}%</div>
              <div>Insects: ~{tooltip.insects}</div>
            </div>
          )}
        </Box>
        
        {isHeatmapGenerated && (
          <Box mt="md">
            <Text size="xs" fw={600} mb="xs">Legend</Text>
            <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: 12, 
                height: 12, 
                borderRadius: '50%', 
                background: 'radial-gradient(circle, rgba(255,0,0,0.8) 0%, rgba(255,165,0,0.6) 30%, rgba(255,255,0,0.4) 60%, rgba(0,255,0,0.2) 80%, rgba(0,255,255,0.1) 90%, rgba(0,0,255,0.05) 100%)'
              }} />
              <Text size="xs" c="dimmed">Trichogramma density (thermal: red=high, blue=low)</Text>
            </Box>
          </Box>
        )}
      </Box>
    </Card>
  )
}