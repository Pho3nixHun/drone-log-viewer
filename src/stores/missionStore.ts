import { create } from 'zustand'
import type { MissionLog, LayerType, MissionStats } from '../types/mission'
import { parseJSONFile, calculateMissionStats, FileParseError } from '../utils/fileParser'
import { getMapCenter, getBounds, generatePolygonFromPoints } from '../utils/mapHelpers'

interface MissionStore {
  // Data
  currentMission: MissionLog | null
  missionStats: MissionStats | null
  
  // UI State
  selectedLayers: Set<LayerType>
  mapCenter: [number, number] | null
  mapZoom: number
  tileLayer: 'osm' | 'satellite'
  
  // Loading and Error States
  isLoading: boolean
  error: string | null
  
  // Actions
  loadMission: (file: File) => Promise<void>
  toggleLayer: (layer: LayerType) => void
  setMapView: (center: [number, number], zoom: number) => void
  setTileLayer: (layer: 'osm' | 'satellite') => void
  clearError: () => void
  reset: () => void
}

export const useMissionStore = create<MissionStore>((set, get) => ({
  // Initial state
  currentMission: null,
  missionStats: null,
  selectedLayers: new Set(['dropPoints']),
  mapCenter: null,
  mapZoom: 13,
  tileLayer: 'osm',
  isLoading: false,
  error: null,
  
  // Actions
  loadMission: async (file: File) => {
    set({ isLoading: true, error: null })
    
    try {
      const mission = await parseJSONFile(file)
      const stats = calculateMissionStats(mission)
      
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
      
      set({
        currentMission: mission,
        missionStats: stats,
        mapCenter: center,
        mapZoom: bounds ? 15 : 13,
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
  
  setMapView: (center: [number, number], zoom: number) => {
    set({ mapCenter: center, mapZoom: zoom })
  },
  
  setTileLayer: (layer: 'osm' | 'satellite') => {
    set({ tileLayer: layer })
  },
  
  clearError: () => {
    set({ error: null })
  },
  
  reset: () => {
    set({
      currentMission: null,
      missionStats: null,
      selectedLayers: new Set(['dropPoints']),
      mapCenter: null,
      mapZoom: 13,
      tileLayer: 'osm',
      isLoading: false,
      error: null
    })
  }
}))