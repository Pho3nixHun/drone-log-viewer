import { create } from 'zustand'
import type { LayerType, MissionStats, MergedMission, MissionSettings } from '../types/mission'
import type { DensityMapData } from '../utils/heatmapUtils'
import { parseMultipleJSONFiles, calculateMissionStats, FileParseError } from '../utils/fileParser'
import { getMapCenter, getBounds, generatePolygonFromPoints } from '../utils/mapHelpers'

interface MissionStore {
  // Data
  currentMission: MergedMission | null
  missionStats: MissionStats | null
  heatmapData: DensityMapData | null
  
  // UI State
  selectedLayers: Set<LayerType>
  selectedSourceFiles: Set<string>
  mapCenter: [number, number] | null
  mapZoom: number
  tileLayer: 'osm' | 'satellite'
  timeRange: [number, number] | null
  
  // Replay State
  isReplaying: boolean
  replaySpeed: number // Multiplier: 1x, 2x, 5x, 10x
  replayCurrentTime: number | null
  replayStartTime: number | null
  replayEndTime: number | null
  
  // Loading and Error States
  isLoading: boolean
  error: string | null
  
  // Actions
  loadMission: (files: File | File[]) => Promise<void>
  loadMissionSettings: (files: File | File[]) => Promise<void>
  toggleLayer: (layer: LayerType) => void
  toggleSourceFile: (sourceFile: string) => void
  removeSourceFile: (sourceFile: string) => void
  setMapView: (center: [number, number], zoom: number) => void
  setTileLayer: (layer: 'osm' | 'satellite') => void
  setTimeRange: (range: [number, number] | null) => void
  startReplay: () => void
  pauseReplay: () => void
  resetReplay: () => void
  setReplaySpeed: (speed: number) => void
  setReplayCurrentTime: (time: number) => void
  setHeatmapData: (data: DensityMapData | null) => void
  clearError: () => void
  reset: () => void
}

export const useMissionStore = create<MissionStore>((set, get) => ({
  // Initial state
  currentMission: null,
  missionStats: null,
  heatmapData: null,
  selectedLayers: new Set(['dropPoints']),
  selectedSourceFiles: new Set(),
  mapCenter: null,
  mapZoom: 13,
  tileLayer: 'osm',
  timeRange: null,
  isReplaying: false,
  replaySpeed: 1,
  replayCurrentTime: null,
  replayStartTime: null,
  replayEndTime: null,
  isLoading: false,
  error: null,
  
  // Actions
  loadMission: async (files: File | File[]) => {
    set({ isLoading: true, error: null })
    
    try {
      const fileArray = Array.isArray(files) ? files : [files]
      console.log('Loading files:', fileArray.map(f => f.name))
      const mission = await parseMultipleJSONFiles(fileArray)
      console.log('Mission parsed successfully:', mission.fieldName, 'Drop points:', mission.flightLog.dropPoints.length, 'Waypoints:', mission.flightLog.waypoints.length)
      const stats = calculateMissionStats(mission)
      console.log('Stats calculated successfully:', stats)
      
      // Generate polygon from drop points if no polygon exists
      if (!mission.flightLog.polygon || mission.flightLog.polygon.trim() === '' || mission.flightLog.polygon === '-1') {
        const generatedPolygon = generatePolygonFromPoints(mission.flightLog.dropPoints)
        mission.flightLog.polygon = generatedPolygon
      }
      
      // Calculate map center from all points
      const allPoints = [
        ...mission.flightLog.dropPoints,
        ...mission.flightLog.waypoints
      ]
      
      const center = getMapCenter(allPoints)
      const bounds = getBounds(allPoints)
      
      // Calculate replay time bounds
      const timestamps = allPoints
        .map(p => new Date(p.date).getTime())
        .filter(t => !isNaN(t) && t > 946684800000) // Filter out dates before year 2000
        .sort((a, b) => a - b)
      
      const startTime = timestamps.length > 0 ? timestamps[0] : null
      const endTime = timestamps.length > 0 ? timestamps[timestamps.length - 1] : null
      
      set({
        currentMission: mission,
        missionStats: stats,
        selectedSourceFiles: new Set(mission.sourceFiles), // Enable all source files by default
        mapCenter: center,
        mapZoom: bounds ? 15 : 13,
        replayStartTime: startTime,
        replayEndTime: endTime,
        replayCurrentTime: startTime,
        isLoading: false,
        error: null
      })
    } catch (error) {
      console.error('Failed to load mission:', error)
      set({
        isLoading: false,
        error: error instanceof FileParseError 
          ? error.message 
          : 'Failed to load mission file'
      })
    }
  },

  loadMissionSettings: async (files: File | File[]) => {
    const { currentMission } = get()
    if (!currentMission) {
      set({ error: 'Please load mission log files first before uploading mission settings.' })
      return
    }

    set({ isLoading: true, error: null })
    
    try {
      const fileArray = Array.isArray(files) ? files : [files]
      const missionSettings: MissionSettings[] = []
      
      for (const file of fileArray) {
        if (!file.name.endsWith('.wdm')) {
          throw new Error(`Please select WDM mission files. Invalid file: ${file.name}`)
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          throw new Error(`File size too large for ${file.name}. Please select a file smaller than 5MB`)
        }

        const text = await file.text()
        const settings: MissionSettings = JSON.parse(text)
        
        // Validate the structure
        if (!settings.info || !settings.polygon || !settings.missionParams) {
          throw new Error(`Invalid WDM file structure in ${file.name}`)
        }

        // Add filename to track which file this came from
        settings.filename = file.name

        console.log('Mission settings loaded successfully:', settings.info.name, 'from', file.name)
        missionSettings.push(settings)
      }
      
      // Update the current mission with the settings
      const updatedMission = {
        ...currentMission,
        missionSettings
      }

      // Use the first WDM file's polygon if available (for backward compatibility)
      if (missionSettings.length > 0 && missionSettings[0].info.areaCalc > 0) {
        const polygonString = missionSettings[0].polygon.map(coord => `${coord[0]},${coord[1]}`).join(' ')
        updatedMission.flightLog.polygon = polygonString
      }

      // Add mission settings to selectedSourceFiles
      const { selectedSourceFiles } = get()
      const newSelectedSourceFiles = new Set(selectedSourceFiles)
      
      // Add each WDM file as a source file
      missionSettings.forEach(settings => {
        if (settings.filename) {
          newSelectedSourceFiles.add(settings.filename)
        }
      })

      set({
        currentMission: updatedMission,
        selectedSourceFiles: newSelectedSourceFiles,
        isLoading: false,
        error: null
      })
      
    } catch (error) {
      console.error('Failed to load mission settings:', error)
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load mission settings files'
      })
    }
  },
  
  toggleLayer: (layer: LayerType) => {
    const { selectedLayers } = get()
    const newLayers = new Set(selectedLayers)
    
    if (newLayers.has(layer)) {
      newLayers.delete(layer)
    } else {
      newLayers.add(layer)
    }
    
    set({ selectedLayers: newLayers })
  },
  
  toggleSourceFile: (sourceFile: string) => {
    const { selectedSourceFiles } = get()
    const newSourceFiles = new Set(selectedSourceFiles)
    
    if (newSourceFiles.has(sourceFile)) {
      newSourceFiles.delete(sourceFile)
    } else {
      newSourceFiles.add(sourceFile)
    }
    
    set({ selectedSourceFiles: newSourceFiles })
  },

  removeSourceFile: (sourceFile: string) => {
    const { currentMission, selectedSourceFiles } = get()
    if (!currentMission) return

    // Remove from selectedSourceFiles
    const newSelectedSourceFiles = new Set(selectedSourceFiles)
    newSelectedSourceFiles.delete(sourceFile)

    // Check if it's a WDM file (mission settings)
    const isWDMFile = sourceFile.endsWith('.wdm') || 
      (currentMission.missionSettings?.some(settings => 
        (settings.filename || `wdm-${currentMission.missionSettings?.indexOf(settings)}`) === sourceFile
      ) ?? false)

    if (isWDMFile && currentMission.missionSettings) {
      // Remove WDM file from mission settings
      const updatedMissionSettings = currentMission.missionSettings.filter(settings => 
        (settings.filename || `wdm-${currentMission.missionSettings?.indexOf(settings)}`) !== sourceFile
      )

      const updatedMission = {
        ...currentMission,
        missionSettings: updatedMissionSettings.length > 0 ? updatedMissionSettings : undefined
      }

      set({ 
        currentMission: updatedMission,
        selectedSourceFiles: newSelectedSourceFiles 
      })
    } else {
      // It's a JSON log file - filter out data from this source file
      const filteredDropPoints = currentMission.flightLog.dropPoints.filter(
        point => point.sourceFile !== sourceFile
      )
      const filteredWaypoints = currentMission.flightLog.waypoints.filter(
        point => point.sourceFile !== sourceFile
      )

      // Remove from sourceFiles array
      const updatedSourceFiles = currentMission.sourceFiles.filter(sf => sf !== sourceFile)

      // Update isMerged flag
      const isMerged = updatedSourceFiles.length > 1

      const updatedMission = {
        ...currentMission,
        sourceFiles: updatedSourceFiles,
        isMerged,
        flightLog: {
          ...currentMission.flightLog,
          dropPoints: filteredDropPoints,
          waypoints: filteredWaypoints
        }
      }

      // Recalculate stats with the filtered data
      const updatedStats = calculateMissionStats(updatedMission)

      set({ 
        currentMission: updatedMission,
        missionStats: updatedStats,
        selectedSourceFiles: newSelectedSourceFiles 
      })
    }
  },
  
  setMapView: (center: [number, number], zoom: number) => {
    set({ mapCenter: center, mapZoom: zoom })
  },
  
  setTileLayer: (layer: 'osm' | 'satellite') => {
    set({ tileLayer: layer })
  },
  
  setTimeRange: (range: [number, number] | null) => {
    set({ timeRange: range })
  },
  
  startReplay: () => {
    const { replayStartTime } = get()
    set({ 
      isReplaying: true,
      replayCurrentTime: replayStartTime
    })
  },
  
  pauseReplay: () => {
    set({ isReplaying: false })
  },
  
  resetReplay: () => {
    const { replayStartTime } = get()
    set({ 
      isReplaying: false,
      replayCurrentTime: replayStartTime
    })
  },
  
  setReplaySpeed: (speed: number) => {
    set({ replaySpeed: speed })
  },
  
  setReplayCurrentTime: (time: number) => {
    set({ replayCurrentTime: time })
  },
  
  setHeatmapData: (data: DensityMapData | null) => {
    set({ heatmapData: data })
  },
  
  clearError: () => {
    set({ error: null })
  },
  
  reset: () => {
    set({
      currentMission: null,
      missionStats: null,
      heatmapData: null,
      selectedLayers: new Set(['dropPoints']),
      selectedSourceFiles: new Set(),
      mapCenter: null,
      mapZoom: 13,
      tileLayer: 'osm',
      timeRange: null,
      isReplaying: false,
      replaySpeed: 1,
      replayCurrentTime: null,
      replayStartTime: null,
      replayEndTime: null,
      isLoading: false,
      error: null
    })
  }
}))