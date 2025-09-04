import type { MissionLog, MissionStats, MergedMission, DropPoint, Waypoint } from '../types/mission'

export class FileParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FileParseError'
  }
}

function interpolateTimestamps<T extends { date: string }>(points: T[]): { points: T[], fixedCount: number } {
  if (points.length === 0) return { points, fixedCount: 0 }
  
  let fixedCount = 0
  const result = [...points]
  
  // Helper to check if a timestamp is invalid (before year 2000)
  const isInvalidTimestamp = (dateStr: string) => {
    const time = new Date(dateStr).getTime()
    return isNaN(time) || time < 946684800000
  }
  
  for (let i = 0; i < result.length; i++) {
    if (isInvalidTimestamp(result[i].date)) {
      // Find previous valid timestamp
      let prevValidIndex = -1
      for (let j = i - 1; j >= 0; j--) {
        if (!isInvalidTimestamp(result[j].date)) {
          prevValidIndex = j
          break
        }
      }
      
      // Find next valid timestamp
      let nextValidIndex = -1
      for (let j = i + 1; j < result.length; j++) {
        if (!isInvalidTimestamp(result[j].date)) {
          nextValidIndex = j
          break
        }
      }
      
      let interpolatedTime: number
      
      if (prevValidIndex !== -1 && nextValidIndex !== -1) {
        // Interpolate between previous and next valid timestamps
        const prevTime = new Date(result[prevValidIndex].date).getTime()
        const nextTime = new Date(result[nextValidIndex].date).getTime()
        const distanceFromPrev = i - prevValidIndex
        const totalDistance = nextValidIndex - prevValidIndex
        const interpolationFactor = distanceFromPrev / totalDistance
        
        interpolatedTime = prevTime + (nextTime - prevTime) * interpolationFactor
      } else if (prevValidIndex !== -1) {
        // Only previous valid timestamp available - add 1 second per step
        const prevTime = new Date(result[prevValidIndex].date).getTime()
        const stepsFromPrev = i - prevValidIndex
        interpolatedTime = prevTime + (stepsFromPrev * 1000) // 1 second per step
      } else if (nextValidIndex !== -1) {
        // Only next valid timestamp available - subtract 1 second per step  
        const nextTime = new Date(result[nextValidIndex].date).getTime()
        const stepsToNext = nextValidIndex - i
        interpolatedTime = nextTime - (stepsToNext * 1000) // 1 second per step
      } else {
        // No valid timestamps found - use current time as fallback
        interpolatedTime = Date.now()
      }
      
      result[i] = {
        ...result[i],
        date: new Date(interpolatedTime).toISOString()
      }
      fixedCount++
    }
  }
  
  return { points: result, fixedCount }
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

export async function parseMultipleJSONFiles(files: File[]): Promise<MergedMission> {
  if (files.length === 0) {
    throw new FileParseError('No files provided')
  }
  
  if (files.length === 1) {
    const singleMission = await parseJSONFile(files[0])
    
    // Interpolate timestamps for invalid 1970 epoch dates
    const { points: fixedDropPoints, fixedCount: dropPointsFixed } = interpolateTimestamps(singleMission.flightLog.dropPoints)
    const { points: fixedWaypoints, fixedCount: waypointsFixed } = interpolateTimestamps(singleMission.flightLog.waypoints)
    
    const totalFixed = dropPointsFixed + waypointsFixed
    if (totalFixed > 0) {
      console.warn(`⚠️ Fixed ${totalFixed} invalid timestamps (${dropPointsFixed} drop points, ${waypointsFixed} waypoints) using interpolation. This data was missing and times are best-effort estimates.`)
    }
    
    return {
      ...singleMission,
      flightLog: {
        ...singleMission.flightLog,
        dropPoints: fixedDropPoints,
        waypoints: fixedWaypoints
      },
      sourceFiles: [files[0].name],
      isMerged: false
    }
  }
  
  const missions: MissionLog[] = []
  const sourceFiles: string[] = []
  
  // Parse all files and fix timestamps
  let totalDropPointsFixed = 0
  let totalWaypointsFixed = 0
  
  for (const file of files) {
    try {
      console.log(`Parsing file: ${file.name}`)
      const mission = await parseJSONFile(file)
      
      // Fix timestamps in each mission before adding to the list
      const { points: fixedDropPoints, fixedCount: dropPointsFixed } = interpolateTimestamps(mission.flightLog.dropPoints)
      const { points: fixedWaypoints, fixedCount: waypointsFixed } = interpolateTimestamps(mission.flightLog.waypoints)
      
      totalDropPointsFixed += dropPointsFixed
      totalWaypointsFixed += waypointsFixed
      
      const fixedMission = {
        ...mission,
        flightLog: {
          ...mission.flightLog,
          dropPoints: fixedDropPoints,
          waypoints: fixedWaypoints
        }
      }
      
      console.log(`Successfully parsed ${file.name}:`, {
        dropPoints: fixedDropPoints.length,
        waypoints: fixedWaypoints.length,
        timestampsFixed: dropPointsFixed + waypointsFixed,
        fieldName: mission.fieldName
      })
      
      missions.push(fixedMission)
      sourceFiles.push(file.name)
    } catch (error) {
      console.error(`Failed to parse ${file.name}:`, error)
      throw new FileParseError(`Failed to parse ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  const totalFixed = totalDropPointsFixed + totalWaypointsFixed
  if (totalFixed > 0) {
    console.warn(`⚠️ Fixed ${totalFixed} invalid timestamps across all files (${totalDropPointsFixed} drop points, ${totalWaypointsFixed} waypoints) using interpolation. This data was missing and times are best-effort estimates.`)
  }
  
  // Merge missions
  const baseMission = missions[0]
  const mergedDropPoints: DropPoint[] = []
  const mergedWaypoints: Waypoint[] = []
  
  // Color generation for different files (different shades)
  const generateSourceIndex = (fileIndex: number) => fileIndex
  
  missions.forEach((mission, missionIndex) => {
    const sourceIndex = generateSourceIndex(missionIndex)
    const sourceFile = sourceFiles[missionIndex]
    
    // Add drop points with source tracking (timestamps already fixed)
    mission.flightLog.dropPoints.forEach(point => {
      mergedDropPoints.push({
        ...point,
        sourceFile,
        sourceIndex
      })
    })
    
    // Add waypoints with source tracking (timestamps already fixed)
    mission.flightLog.waypoints.forEach(point => {
      mergedWaypoints.push({
        ...point,
        sourceFile,
        sourceIndex
      })
    })
  })
  
  // Sort by timestamp to maintain chronological order
  mergedDropPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  mergedWaypoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  // Calculate merged dates
  const allTimestamps = [
    ...mergedDropPoints.map(p => new Date(p.date).getTime()),
    ...mergedWaypoints.map(p => new Date(p.date).getTime())
  ].filter(t => !isNaN(t) && t > 946684800000) // Filter out dates before year 2000
   .sort((a, b) => a - b)
  
  const startDate = allTimestamps.length > 0 ? new Date(allTimestamps[0]).toISOString() : baseMission.flightLog.startDate
  const endDate = allTimestamps.length > 0 ? new Date(allTimestamps[allTimestamps.length - 1]).toISOString() : baseMission.flightLog.endDate
  
  // Create merged mission
  const mergedMission: MergedMission = {
    appVersion: baseMission.appVersion,
    droneName: baseMission.droneName,
    fieldName: `Merged: ${missions.map(m => m.fieldName).join(', ')}`,
    pilotName: baseMission.pilotName,
    uploaded: baseMission.uploaded,
    sourceFiles,
    isMerged: true,
    flightLog: {
      dropPoints: mergedDropPoints,
      waypoints: mergedWaypoints,
      endDate,
      startDate,
      flightDate: baseMission.flightLog.flightDate,
      homepoint: baseMission.flightLog.homepoint,
      pilotName: baseMission.flightLog.pilotName,
      polygon: baseMission.flightLog.polygon,
      trichogrammaBullets: missions.reduce((sum, m) => sum + (m.flightLog.trichogrammaBullets || 0), 0)
    }
  }
  
  return mergedMission
}

function validateMissionLog(data: unknown): void {
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
  const flightLog = 'flightLog' in data && data.flightLog
  if (!flightLog || typeof flightLog !== 'object') {
    throw new FileParseError('Invalid flightLog structure')
  }

  const flightLogFields = ['dropPoints', 'endDate', 'startDate', 'waypoints']
  for (const field of flightLogFields) {
    if (!(field in flightLog)) {
      throw new FileParseError(`Missing required flightLog field: ${field}`)
    }
  }

  // Create type assertion function for flight log arrays
  function assertFlightLogArrays(log: Record<string, unknown>): asserts log is Record<string, unknown> & {
    dropPoints: unknown[]
    waypoints: unknown[]
  } {
    if (!('dropPoints' in log) || !Array.isArray(log.dropPoints)) {
      throw new FileParseError('dropPoints must be an array')
    }
    if (!('waypoints' in log) || !Array.isArray(log.waypoints)) {
      throw new FileParseError('waypoints must be an array')
    }
  }

  const typedFlightLog = flightLog as Record<string, unknown>
  assertFlightLogArrays(typedFlightLog)

  // Validate point structures
  validatePoints(typedFlightLog.dropPoints, 'dropPoints')
  validatePoints(typedFlightLog.waypoints, 'waypoints')
}

// Type assertion function for point objects
function assertPointObject(point: unknown, type: string, index: number): asserts point is Record<string, unknown> {
  if (!point || typeof point !== 'object') {
    throw new FileParseError(`Invalid ${type} structure at index ${index}`)
  }
}

// Type assertion function for accessing object properties
function assertHasProperty<T extends Record<string, unknown>, K extends string>(
  obj: T,
  property: K,
  type: string,
  index: number
): asserts obj is T & Record<K, unknown> {
  if (!(property in obj)) {
    throw new FileParseError(`Missing ${property} in ${type} at index ${index}`)
  }
}

// Type assertion for number properties with range validation
function assertValidCoordinate(
  value: unknown,
  property: 'latitude' | 'longitude',
  type: string,
  index: number
): asserts value is number {
  if (typeof value !== 'number') {
    throw new FileParseError(`Invalid ${property} type in ${type} at index ${index}`)
  }
  
  const range = property === 'latitude' ? [-90, 90] : [-180, 180]
  if (value < range[0] || value > range[1]) {
    throw new FileParseError(`Invalid ${property} range in ${type} at index ${index}`)
  }
}

function validatePoints(points: unknown[], type: string): void {
  const requiredFields = ['latitude', 'longitude', 'altitude', 'date'] as const
  
  points.forEach((point, index) => {
    assertPointObject(point, type, index)
    
    for (const field of requiredFields) {
      assertHasProperty(point, field, type, index)
    }
    
    // Validate coordinate ranges with proper type assertions
    assertValidCoordinate(point.latitude, 'latitude', type, index)
    assertValidCoordinate(point.longitude, 'longitude', type, index)
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
      coveredAreaHectares: 0,
      averageDropDistance: 0,
      averageDropLineDistance: 0,
      maxDropPerMinute: 0
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
  const coveredAreaHectares = calculateCoveredAreaHectares(dropPoints)
  const { averageDropDistance, averageDropLineDistance } = calculateDropDistances(dropPoints)
  
  // Calculate max drops per minute
  const maxDropPerMinute = calculateMaxDropPerMinute(dropPoints)

  return {
    dropPointsCount: dropPoints.length,
    waypointsCount: waypoints.length,
    flightDuration,
    totalDistance,
    averageAltitude: Math.round(averageAltitude * 100) / 100,
    minAltitude: Math.round(minAltitude * 100) / 100,
    maxAltitude: Math.round(maxAltitude * 100) / 100,
    averageSpeed: Math.round(averageSpeed * 100) / 100,
    coveredAreaHectares: Math.round(coveredAreaHectares * 100) / 100,
    averageDropDistance: Math.round(averageDropDistance * 100) / 100,
    averageDropLineDistance: Math.round(averageDropLineDistance * 100) / 100,
    maxDropPerMinute: Math.round(maxDropPerMinute * 100) / 100
  }
}

function calculateTotalDistance(waypoints: unknown[]): number {
  if (waypoints.length < 2) return 0
  
  let totalDistance = 0
  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1]
    const curr = waypoints[i]
    
    // Type guards
    if (prev && typeof prev === 'object' && 'latitude' in prev && 'longitude' in prev &&
        curr && typeof curr === 'object' && 'latitude' in curr && 'longitude' in curr &&
        typeof prev.latitude === 'number' && typeof prev.longitude === 'number' &&
        typeof curr.latitude === 'number' && typeof curr.longitude === 'number') {
      totalDistance += calculateDistance(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      )
    }
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

function calculateCoveredAreaHectares(dropPoints: unknown[]): number {
  if (dropPoints.length < 3) return 0
  
  // Filter out invalid coordinates with proper type guard
  const validPoints = dropPoints.filter((p): p is { latitude: number; longitude: number } => {
    return p !== null && 
           typeof p === 'object' && 
           'latitude' in p && 
           'longitude' in p &&
           typeof p.latitude === 'number' && 
           typeof p.longitude === 'number' &&
           p.latitude !== 0 && 
           p.longitude !== 0
  })
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
  
  // Calculate area in square meters, then convert to hectares
  const areaSquareMeters = bufferedWidth * bufferedHeight
  const areaHectares = areaSquareMeters * 0.0001 // 1 square meter = 0.0001 hectares
  
  return areaHectares
}

function calculateDropDistances(dropPoints: unknown[]): { averageDropDistance: number, averageDropLineDistance: number } {
  if (dropPoints.length < 2) {
    return { averageDropDistance: 0, averageDropLineDistance: 0 }
  }
  
  // Filter out invalid coordinates
  const validPoints = dropPoints.filter((p): p is { latitude: number; longitude: number; date: string } => {
    return p !== null && 
           typeof p === 'object' && 
           'latitude' in p && 
           'longitude' in p && 
           'date' in p &&
           typeof p.latitude === 'number' && 
           typeof p.longitude === 'number' && 
           typeof p.date === 'string' &&
           p.latitude !== 0 && 
           p.longitude !== 0
  })
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
  const dropLines: { latitude: number; longitude: number; date: string }[][] = []
  const maxTimeGapMinutes = 2 // If gap > 2 minutes, start new drop-line
  const maxDistanceMeters = 50 // If distance > 50m, start new drop-line
  
  let currentLine: { latitude: number; longitude: number; date: string }[] = [sortedPoints[0]]
  
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

function calculateMaxDropPerMinute(dropPoints: unknown[]): number {
  if (dropPoints.length < 2) return 0
  
  // Filter out invalid coordinates and sort by timestamp
  const validPoints = dropPoints
    .filter((p): p is { latitude: number; longitude: number; date: string } => {
      return p !== null && 
             typeof p === 'object' && 
             'latitude' in p && 
             'longitude' in p && 
             'date' in p &&
             typeof p.latitude === 'number' && 
             typeof p.longitude === 'number' && 
             typeof p.date === 'string' &&
             p.latitude !== 0 && 
             p.longitude !== 0 && 
             Boolean(p.date)
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  if (validPoints.length < 2) return 0
  
  // Group drops by minute intervals
  const dropsPerMinute: { [key: string]: number } = {}
  
  for (const point of validPoints) {
    const timestamp = new Date(point.date)
    // Round down to the nearest minute
    const minuteKey = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), 
                               timestamp.getHours(), timestamp.getMinutes()).toISOString()
    
    dropsPerMinute[minuteKey] = (dropsPerMinute[minuteKey] || 0) + 1
  }
  
  // Find the maximum drops in any single minute
  const dropCounts = Object.values(dropsPerMinute)
  return dropCounts.length > 0 ? Math.max(...dropCounts) : 0
}