import { useEffect, useRef, useState, useCallback } from 'react'
import { Card, Text, Box, Button, Group, NumberInput, Grid, Paper, LoadingOverlay, Progress, Switch, Tooltip } from '@mantine/core'
import { IconChartDots, IconSettings } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
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
  calculateDensityMapGPU,
  calculateLocalDensityPerArea,
  type HeatmapParameters,
  type DensityMapData 
} from '../../utils/heatmapUtils'
import { isWebGPUSupported } from '../../utils/webgpuUtils'

export function TrichogrammaCanvas() {
  const { currentMission } = useMissionStore()
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const densityMapRef = useRef<DensityMapData | null>(null)
  const [tooltip, setTooltip] = useState<{
    visible: boolean
    x: number
    y: number
    density: number
    insectsPerSquareMeter: number
    sampleAreaMeters: number
    coverage: string
  }>({
    visible: false,
    x: 0,
    y: 0,
    density: 0,
    insectsPerSquareMeter: 0,
    sampleAreaMeters: 1,
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
  const [webgpuSupported, setWebGPUSupported] = useState<boolean | undefined>(undefined)
  const [useGPU, setUseGPU] = useState(true) // User preference for GPU acceleration
  
  // Detect WebGPU support on component mount
  useEffect(() => {
    const supported = isWebGPUSupported()
    
    console.group('🔧 WebGPU Browser Support Check')
    console.log('User Agent:', navigator.userAgent)
    console.log('WebGPU support detected:', supported)
    console.log('Navigator GPU:', 'gpu' in navigator ? 'Available' : 'Not available')
    
    if ('gpu' in navigator) {
      console.log('Navigator GPU object:', navigator.gpu)
      
      // Test async adapter request
      navigator.gpu.requestAdapter().then(adapter => {
        if (adapter) {
          console.log('✅ WebGPU adapter obtained:', adapter)
          console.log('Adapter info:', adapter.info)
          console.log('Adapter features:', Array.from(adapter.features))
          console.log('Adapter limits:', adapter.limits)
          // Update the supported state to true only if we have a working adapter
          setWebGPUSupported(true)
        } else {
          console.log('❌ No WebGPU adapter available')
          console.log('💡 Possible solutions:')
          console.log('   1. Update GPU drivers')
          console.log('   2. Enable chrome://flags/#enable-unsafe-webgpu')
          console.log('   3. Check if running in VM/remote desktop')
          console.log('   4. Try chrome://flags/#enable-webgpu-developer-features')
          // Set to false since no adapter is available
          setWebGPUSupported(false)
        }
      }).catch(error => {
        console.error('❌ Error requesting WebGPU adapter:', error)
        setWebGPUSupported(false)
      })
    } else {
      // No WebGPU at all
      setWebGPUSupported(false)
    }
    console.groupEnd()
  }, [])

  const setupCanvas = useCallback(() => {
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
      t('heatmap.description'),
      dimensions.displayWidth,
      dimensions.displayHeight
    )
    
    setIsHeatmapGenerated(false)
  }, [currentMission, parameters, t])

  // Initialize canvas with basic setup
  useEffect(() => {
    if (!currentMission?.flightLog.dropPoints || !canvasRef.current) return
    
    // Just set up canvas dimensions without generating heatmap
    setupCanvas()
  }, [currentMission, setupCanvas])

  const generateHeatmap = async () => {
    console.log('🔥 Generate heatmap button clicked!')
    console.log('Current mission:', currentMission)
    console.log('Canvas ref:', canvasRef.current)
    
    if (!currentMission?.flightLog.dropPoints || !canvasRef.current) {
      console.log('❌ Missing requirements - currentMission or canvas ref')
      return
    }
    
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
      
      // Calculate density map - try GPU first if supported and enabled
      const shouldUseGPU = webgpuSupported && useGPU && validDropPoints.length > 50 // Use GPU for larger datasets
      
      // Performance timing
      const startTime = performance.now()
      
      console.log(`${shouldUseGPU ? '🚀 GPU' : '🐌 CPU'} computation for ${validDropPoints.length} points`)
      
      const densityData = shouldUseGPU 
        ? await calculateDensityMapGPU(
            validDropPoints,
            bounds,
            dimensions.canvasWidth,
            dimensions.canvasHeight,
            parameters,
            (current, total) => {
              setGenerationProgress(Math.round((current / total) * 100))
            }
          )
        : await calculateDensityMapAsync(
            validDropPoints,
            bounds,
            dimensions.canvasWidth,
            dimensions.canvasHeight,
            parameters,
            (current, total) => {
              setGenerationProgress(Math.round((current / total) * 100))
            }
          )
          
      const endTime = performance.now()
      const duration = endTime - startTime
      
      console.log(`⏱️ ${shouldUseGPU ? 'GPU' : 'CPU'} completed in ${duration.toFixed(2)}ms`)
      
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
    
    // Calculate average insect density per square meter in local area
    const areaAnalysis = calculateLocalDensityPerArea(
      canvasX,
      canvasY,
      densityMapRef.current,
      parameters.insectsPerDrop,
      1 // Sample 1 square meter area
    )
    
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
      insectsPerSquareMeter: areaAnalysis.insectsPerSquareMeter,
      sampleAreaMeters: areaAnalysis.sampleAreaMeters,
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
        <Text size="lg" fw={600} mb="md">{t('heatmap.title')}</Text>
        <Text size="sm" c="dimmed" mb="md">
          {t('heatmap.descriptionLong')}
        </Text>
        
        {/* Parameters Form */}
        <Paper p="md" mb="md" withBorder style={{ backgroundColor: '#f8f9fa', position: 'relative' }}>
          <LoadingOverlay visible={isGenerating} />
          
          <Group align="center" mb="sm">
            <IconSettings size={16} />
            <Text size="sm" fw={600}>{t('heatmap.parameters')}</Text>
          </Group>
          
          <Grid>
            <Grid.Col span={6}>
              <Tooltip
                label={t('heatmap.sigmaTooltip')}
                multiline
                withArrow
              >
                <NumberInput
                  label={t('heatmap.sigma')}
                  description={t('heatmap.sigmaDescription')}
                  value={parameters.sigma}
                  onChange={(value) => setParameters(prev => ({ ...prev, sigma: Number(value) || 5 }))}
                  disabled={isGenerating}
                  min={1}
                  max={50}
                  step={0.5}
                  size="sm"
                />
              </Tooltip>
            </Grid.Col>
            <Grid.Col span={6}>
              <Tooltip
                label={t('heatmap.maxDistanceTooltip')}
                multiline
                withArrow
              >
                <NumberInput
                  label={t('heatmap.maxDistance')}
                  description={t('heatmap.maxDistanceDescription')}
                  value={parameters.maxDistance}
                  onChange={(value) => setParameters(prev => ({ ...prev, maxDistance: Number(value) || 15 }))}
                  disabled={isGenerating}
                  min={5}
                  max={100}
                  step={5}
                  size="sm"
                />
              </Tooltip>
            </Grid.Col>
            <Grid.Col span={6}>
              <Tooltip
                label={t('heatmap.insectsPerDropTooltip')}
                multiline
                withArrow
              >
                <NumberInput
                  label={t('heatmap.insectsPerDrop')}
                  description={t('heatmap.insectsPerDropDescription')}
                  value={parameters.insectsPerDrop}
                  onChange={(value) => setParameters(prev => ({ ...prev, insectsPerDrop: Number(value) || 1200 }))}
                  disabled={isGenerating}
                  min={100}
                  max={5000}
                  step={100}
                  size="sm"
                />
              </Tooltip>
            </Grid.Col>
            <Grid.Col span={6}>
              <Tooltip
                label={t('heatmap.resolutionTooltip')}
                multiline
                withArrow
              >
                <NumberInput
                  label={t('heatmap.resolution')}
                  description={t('heatmap.resolutionDescription')}
                  value={parameters.resolution}
                  onChange={(value) => setParameters(prev => ({ ...prev, resolution: Number(value) || 2 }))}
                  disabled={isGenerating}
                  min={1}
                  max={4}
                  step={1}
                  size="sm"
                />
              </Tooltip>
            </Grid.Col>
            <Grid.Col span={12}>
              <Switch
                label={t('heatmap.gpuAcceleration')}
                description={
                  webgpuSupported === undefined
                    ? t('heatmap.gpuChecking') 
                    : webgpuSupported 
                      ? t('heatmap.gpuSupported')
                      : t('heatmap.gpuNotSupported')
                }
                checked={useGPU && Boolean(webgpuSupported)}
                onChange={(event) => setUseGPU(event.currentTarget.checked)}
                disabled={!webgpuSupported || isGenerating}
                size="sm"
              />
            </Grid.Col>
          </Grid>
          
          {/* WebGPU Status */}
          {webgpuSupported !== undefined && (
            <Box mt="xs">
              <Text size="xs" c={webgpuSupported ? "teal" : "orange"}>
                WebGPU: {webgpuSupported ? `✓ ${t('heatmap.gpuEnabled')}` : `✗ ${t('heatmap.gpuNotAvailable')}`}
                {webgpuSupported && useGPU && ` - ${t('heatmap.gpuEnabled')}`}
              </Text>
            </Box>
          )}
          
          {/* Progress Bar */}
          {isGenerating && (
            <Box mt="md">
              <Text size="xs" c="dimmed" mb={5}>
                {t('heatmap.generate')}... {generationProgress}%
              </Text>
              <Progress value={generationProgress} size="sm" />
            </Box>
          )}
          
          <Group justify="space-between" mt="md">
            <Text size="xs" c="dimmed">
              σ={parameters.sigma}m, max {parameters.maxDistance}m {t('heatmap.radius')}, {parameters.insectsPerDrop} {t('heatmap.insectsDropShort')}
            </Text>
            <Button
              leftSection={<IconChartDots size={16} />}
              onClick={() => {
                console.log('🔥 Button clicked - checking conditions')
                console.log('Has mission:', !!currentMission)
                console.log('Has dropPoints:', !!currentMission?.flightLog.dropPoints)
                console.log('Drop points length:', currentMission?.flightLog.dropPoints?.length)
                console.log('Is generating:', isGenerating)
                generateHeatmap()
              }}
              loading={isGenerating}
              disabled={!currentMission?.flightLog.dropPoints || isGenerating}
              size="sm"
            >
              {isHeatmapGenerated ? t('heatmap.regenerate') : t('heatmap.generate')}
            </Button>
          </Group>
        </Paper>
        
        {/* Canvas - always present but hidden when no heatmap */}
        <Box 
          style={{ 
            width: '100%', 
            position: 'relative',
            display: (isHeatmapGenerated || isGenerating) ? 'block' : 'none'
          }}
        >
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
        </Box>
        
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
            <div>{t('heatmap.tooltipGPS')}: {tooltip.coverage}</div>
            <div>{t('heatmap.tooltipDensity')}: {(tooltip.density * 100).toFixed(1)}%</div>
            <div>{t('heatmap.tooltipArea')}: {tooltip.insectsPerSquareMeter.toFixed(1)} {t('heatmap.tooltipInsectsPerM2')}</div>
          </div>
        )}
        
        {isHeatmapGenerated && (
          <Box mt="md">
            <Text size="xs" fw={600} mb="xs">{t('heatmap.legend')}</Text>
            <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: 12, 
                height: 12, 
                borderRadius: '50%', 
                background: 'radial-gradient(circle, rgba(255,0,0,0.8) 0%, rgba(255,165,0,0.6) 30%, rgba(255,255,0,0.4) 60%, rgba(0,255,0,0.2) 80%, rgba(0,255,255,0.1) 90%, rgba(0,0,255,0.05) 100%)'
              }} />
              <Text size="xs" c="dimmed">{t('heatmap.legendDescription')}</Text>
            </Box>
          </Box>
        )}
      </Box>
    </Card>
  )
}