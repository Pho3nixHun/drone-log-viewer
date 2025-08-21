import type { MissionLog, MissionStats } from '../types/mission'

export class FileParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FileParseError'
  }
}

export async function parseJSONFile(file: File): Promise<MissionLog> {
  if (!file.name.endsWith('.json')) {
    throw new FileParseError('Please select a JSON file')
  }

  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    throw new FileParseError('File size too large. Please select a file smaller than 10MB')
  }

  try {
    const text = await file.text()
    const data = JSON.parse(text)
    
    // Validate the structure
    validateMissionLog(data)
    
    return data as MissionLog
  } catch (error) {
    if (error instanceof FileParseError) {
      throw error
    }
    if (error instanceof SyntaxError) {
      throw new FileParseError('Invalid JSON format')
    }
    throw new FileParseError('Failed to parse file')
  }
}

function validateMissionLog(data: any): void {
  if (!data || typeof data !== 'object') {
    throw new FileParseError('Invalid file structure')
  }

  // Check required top-level fields
  const requiredFields = ['appVersion', 'droneName', 'fieldName', 'flightLog', 'pilotName']
  for (const field of requiredFields) {
    if (!(field in data)) {
      throw new FileParseError(`Missing required field: ${field}`)
    }
  }

  // Validate flightLog structure
  const flightLog = data.flightLog
  if (!flightLog || typeof flightLog !== 'object') {
    throw new FileParseError('Invalid flightLog structure')
  }

  const flightLogFields = ['dropPoints', 'endDate', 'startDate', 'waypoints']
  for (const field of flightLogFields) {
    if (!(field in flightLog)) {
      throw new FileParseError(`Missing required flightLog field: ${field}`)
    }
  }

  // Validate arrays
  if (!Array.isArray(flightLog.dropPoints)) {
    throw new FileParseError('dropPoints must be an array')
  }
  
  if (!Array.isArray(flightLog.waypoints)) {
    throw new FileParseError('waypoints must be an array')
  }

  // Validate point structures
  validatePoints(flightLog.dropPoints, 'dropPoints')
  validatePoints(flightLog.waypoints, 'waypoints')
}

function validatePoints(points: any[], type: string): void {
  const requiredFields = ['latitude', 'longitude', 'altitude', 'date']
  
  points.forEach((point, index) => {
    if (!point || typeof point !== 'object') {
      throw new FileParseError(`Invalid ${type} structure at index ${index}`)
    }
    
    for (const field of requiredFields) {
      if (!(field in point)) {
        throw new FileParseError(`Missing ${field} in ${type} at index ${index}`)
      }
    }
    
    // Validate coordinate ranges
    if (typeof point.latitude !== 'number' || point.latitude < -90 || point.latitude > 90) {
      throw new FileParseError(`Invalid latitude in ${type} at index ${index}`)
    }
    
    if (typeof point.longitude !== 'number' || point.longitude < -180 || point.longitude > 180) {
      throw new FileParseError(`Invalid longitude in ${type} at index ${index}`)
    }
  })
}

export function calculateMissionStats(mission: MissionLog): MissionStats {
  const { flightLog } = mission
  const { dropPoints, waypoints, startDate, endDate } = flightLog
  
  // Calculate flight duration
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  const flightDuration = end - start // milliseconds
  
  // Combine all points for altitude and speed calculations
  const allPoints = [...dropPoints, ...waypoints]
  
  if (allPoints.length === 0) {
    return {
      dropPointsCount: 0,
      waypointsCount: 0,
      flightDuration,
      totalDistance: 0,
      averageAltitude: 0,
      minAltitude: 0,
      maxAltitude: 0,
      averageSpeed: 0,
      coveredAreaAcres: 0,
      averageDropDistance: 0,
      averageDropLineDistance: 0
    }
  }
  
  // Calculate altitude statistics
  const altitudes = allPoints.map(p => p.altitude).filter(a => a > 0)
  const minAltitude = Math.min(...altitudes)
  const maxAltitude = Math.max(...altitudes)
  const averageAltitude = altitudes.reduce((sum, alt) => sum + alt, 0) / altitudes.length
  
  // Calculate speed statistics
  const speeds = allPoints.map(p => p.speed || 0)
  const averageSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length
  
  // Calculate total distance (approximate)
  const totalDistance = calculateTotalDistance(waypoints)
  
  // Calculate covered area and drop distances
  const coveredAreaAcres = calculateCoveredAreaAcres(dropPoints)
  const { averageDropDistance, averageDropLineDistance } = calculateDropDistances(dropPoints)
  
  return {
    dropPointsCount: dropPoints.length,
    waypointsCount: waypoints.length,
    flightDuration,
    totalDistance,
    averageAltitude: Math.round(averageAltitude * 100) / 100,
    minAltitude: Math.round(minAltitude * 100) / 100,
    maxAltitude: Math.round(maxAltitude * 100) / 100,
    averageSpeed: Math.round(averageSpeed * 100) / 100,
    coveredAreaAcres: Math.round(coveredAreaAcres * 100) / 100,
    averageDropDistance: Math.round(averageDropDistance * 100) / 100,
    averageDropLineDistance: Math.round(averageDropLineDistance * 100) / 100
  }
}

function calculateTotalDistance(waypoints: any[]): number {
  if (waypoints.length < 2) return 0
  
  let totalDistance = 0
  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1]
    const curr = waypoints[i]
    totalDistance += calculateDistance(
      prev.latitude, prev.longitude,
      curr.latitude, curr.longitude
    )
  }
  return Math.round(totalDistance)
}

// Haversine formula for calculating distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  
  return R * c
}

function calculateCoveredAreaAcres(dropPoints: any[]): number {
  if (dropPoints.length < 3) return 0
  
  // Filter out invalid coordinates
  const validPoints = dropPoints.filter(p => p.latitude !== 0 && p.longitude !== 0)
  if (validPoints.length < 3) return 0
  
  // Find the bounding box of drop points
  const latitudes = validPoints.map(p => p.latitude)
  const longitudes = validPoints.map(p => p.longitude)
  
  const minLat = Math.min(...latitudes)
  const maxLat = Math.max(...latitudes)
  const minLng = Math.min(...longitudes)
  const maxLng = Math.max(...longitudes)
  
  // Calculate dimensions in meters
  const width = calculateDistance(minLat, minLng, minLat, maxLng)
  const height = calculateDistance(minLat, minLng, maxLat, minLng)
  
  // Add 10m buffer on each side (20m total to width and height)
  const bufferedWidth = width + 20
  const bufferedHeight = height + 20
  
  // Calculate area in square meters, then convert to acres
  const areaSquareMeters = bufferedWidth * bufferedHeight
  const areaAcres = areaSquareMeters * 0.000247105 // 1 square meter = 0.000247105 acres
  
  return areaAcres
}

function calculateDropDistances(dropPoints: any[]): { averageDropDistance: number, averageDropLineDistance: number } {
  if (dropPoints.length < 2) {
    return { averageDropDistance: 0, averageDropLineDistance: 0 }
  }
  
  // Filter out invalid coordinates
  const validPoints = dropPoints.filter(p => p.latitude !== 0 && p.longitude !== 0)
  if (validPoints.length < 2) {
    return { averageDropDistance: 0, averageDropLineDistance: 0 }
  }
  
  // Sort points by timestamp to get proper sequence
  const sortedPoints = validPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  // Calculate distances between consecutive drops
  const dropDistances: number[] = []
  for (let i = 1; i < sortedPoints.length; i++) {
    const prev = sortedPoints[i - 1]
    const curr = sortedPoints[i]
    const distance = calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude)
    dropDistances.push(distance)
  }
  
  // Calculate average drop distance
  const averageDropDistance = dropDistances.length > 0 
    ? dropDistances.reduce((sum, dist) => sum + dist, 0) / dropDistances.length
    : 0
  
  // Group points into lines based on proximity and time gaps
  // A drop-line is a sequence of consecutive drops along the same flight path
  const dropLines: any[][] = []
  const maxTimeGapMinutes = 2 // If gap > 2 minutes, start new drop-line
  const maxDistanceMeters = 50 // If distance > 50m, start new drop-line
  
  let currentLine: any[] = [sortedPoints[0]]
  
  for (let i = 1; i < sortedPoints.length; i++) {
    const prevPoint = sortedPoints[i - 1]
    const currPoint = sortedPoints[i]
    
    // Calculate time gap
    const timeGap = (new Date(currPoint.date).getTime() - new Date(prevPoint.date).getTime()) / (1000 * 60) // minutes
    
    // Calculate distance
    const distance = calculateDistance(
      prevPoint.latitude, prevPoint.longitude,
      currPoint.latitude, currPoint.longitude
    )
    
    // If time gap or distance is too large, start a new drop-line
    if (timeGap > maxTimeGapMinutes || distance > maxDistanceMeters) {
      dropLines.push(currentLine)
      currentLine = [currPoint]
    } else {
      currentLine.push(currPoint)
    }
  }
  
  // Add the last line
  if (currentLine.length > 0) {
    dropLines.push(currentLine)
  }
  
  // Calculate average distance within each drop-line (between consecutive drops in the same line)
  const allDropLineDistances: number[] = []
  
  for (const line of dropLines) {
    if (line.length > 1) {
      for (let i = 1; i < line.length; i++) {
        const prev = line[i - 1]
        const curr = line[i]
        const distance = calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude)
        allDropLineDistances.push(distance)
      }
    }
  }
  
  const averageDropLineDistance = allDropLineDistances.length > 0
    ? allDropLineDistances.reduce((sum, dist) => sum + dist, 0) / allDropLineDistances.length
    : 0
  
  return {
    averageDropDistance,
    averageDropLineDistance
  }
}