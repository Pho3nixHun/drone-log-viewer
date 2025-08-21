import L from 'leaflet'
import type { DropPoint, Waypoint } from '../types/mission'

export function getBounds(points: (DropPoint | Waypoint)[]): any | null {
  if (points.length === 0) return null
  
  const validPoints = points.filter(p => p.latitude !== 0 && p.longitude !== 0)
  if (validPoints.length === 0) return null
  
  let minLat = validPoints[0].latitude
  let maxLat = validPoints[0].latitude
  let minLng = validPoints[0].longitude
  let maxLng = validPoints[0].longitude
  
  validPoints.forEach(point => {
    minLat = Math.min(minLat, point.latitude)
    maxLat = Math.max(maxLat, point.latitude)
    minLng = Math.min(minLng, point.longitude)
    maxLng = Math.max(maxLng, point.longitude)
  })
  
  return L.latLngBounds([minLat, minLng], [maxLat, maxLng])
}

export function getMapCenter(points: (DropPoint | Waypoint)[]): [number, number] | null {
  const bounds = getBounds(points)
  if (!bounds) return null
  
  const center = bounds.getCenter()
  return [center.lat, center.lng]
}

export function parsePolygonString(polygonStr: string): [number, number][] {
  try {
    // Handle different polygon string formats
    if (polygonStr.startsWith('POLYGON')) {
      // WKT format: "POLYGON((lng lat, lng lat, ...))"
      const coordsStr = polygonStr.replace(/POLYGON\s*\(\s*\(/, '').replace(/\)\s*\)/, '')
      return coordsStr.split(',').map(pair => {
        const [lng, lat] = pair.trim().split(' ').map(Number)
        return [lat, lng] as [number, number]
      })
    } else if (polygonStr.startsWith('[') || polygonStr.startsWith('{')) {
      // JSON format
      const coords = JSON.parse(polygonStr)
      if (Array.isArray(coords) && Array.isArray(coords[0])) {
        return coords.map(([lat, lng]: [number, number]) => [lat, lng])
      }
    } else {
      // Our generated format: "lat,lng;lat,lng;..." 
      const coords = polygonStr.split(';').map(pair => {
        const [lat, lng] = pair.split(',').map(Number)
        return [lat, lng] as [number, number]
      }).filter(coord => !isNaN(coord[0]) && !isNaN(coord[1]))
      
      return coords
    }
  } catch (error) {
    console.warn('Failed to parse polygon string:', error, polygonStr)
    return []
  }
  
  return []
}

export function getColorForAltitude(altitude: number, minAlt: number, maxAlt: number): string {
  if (maxAlt === minAlt) return '#3388ff'
  
  const ratio = (altitude - minAlt) / (maxAlt - minAlt)
  
  // Color gradient from blue (low) to red (high)
  if (ratio < 0.5) {
    // Blue to green
    const r = Math.floor(ratio * 2 * 255)
    return `rgb(${r}, 255, ${255 - r})`
  } else {
    // Green to red
    const g = Math.floor((1 - ratio) * 2 * 255)
    return `rgb(255, ${g}, 0)`
  }
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  } else {
    return `${(meters / 1000).toFixed(1)}km`
  }
}

export function generatePolygonFromPoints(dropPoints: (DropPoint | Waypoint)[]): string {
  // Filter out invalid coordinates
  const validPoints = dropPoints.filter(p => p.latitude !== 0 && p.longitude !== 0)
  if (validPoints.length < 3) return ''
  
  // Create a convex hull of the drop points
  const hullPoints = convexHull(validPoints)
  
  // Add 10m buffer to each point of the hull
  const bufferDegrees = 0.00009 // roughly 10 meters
  
  // Calculate the centroid of the hull for buffer expansion
  const centroidLat = hullPoints.reduce((sum, p) => sum + p.latitude, 0) / hullPoints.length
  const centroidLng = hullPoints.reduce((sum, p) => sum + p.longitude, 0) / hullPoints.length
  
  // Expand each hull point outward from the centroid
  const bufferedPoints = hullPoints.map(point => {
    const deltaLat = point.latitude - centroidLat
    const deltaLng = point.longitude - centroidLng
    
    // Normalize and extend by buffer distance
    const distance = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng)
    const normalizedLat = distance > 0 ? deltaLat / distance : 0
    const normalizedLng = distance > 0 ? deltaLng / distance : 0
    
    return {
      latitude: point.latitude + normalizedLat * bufferDegrees,
      longitude: point.longitude + normalizedLng * bufferDegrees
    }
  })
  
  // Close the polygon by adding the first point at the end
  const polygonPoints = [...bufferedPoints, bufferedPoints[0]]
  
  // Format as coordinate pairs separated by semicolons
  const polygon = polygonPoints.map(p => `${p.latitude},${p.longitude}`).join(';')
  
  return polygon
}

// Convex hull algorithm using Graham scan
function convexHull(points: (DropPoint | Waypoint)[]): (DropPoint | Waypoint)[] {
  if (points.length < 3) return points
  
  // Find the point with the lowest y-coordinate (and leftmost if tie)
  let start = points[0]
  for (let i = 1; i < points.length; i++) {
    if (points[i].latitude < start.latitude || 
        (points[i].latitude === start.latitude && points[i].longitude < start.longitude)) {
      start = points[i]
    }
  }
  
  // Sort points by polar angle with respect to start point
  const sortedPoints = points.filter(p => p !== start).sort((a, b) => {
    const angleA = Math.atan2(a.latitude - start.latitude, a.longitude - start.longitude)
    const angleB = Math.atan2(b.latitude - start.latitude, b.longitude - start.longitude)
    
    if (angleA === angleB) {
      // If angles are equal, sort by distance (closer points first)
      const distA = (a.latitude - start.latitude) ** 2 + (a.longitude - start.longitude) ** 2
      const distB = (b.latitude - start.latitude) ** 2 + (b.longitude - start.longitude) ** 2
      return distA - distB
    }
    
    return angleA - angleB
  })
  
  // Graham scan to find convex hull
  const hull: (DropPoint | Waypoint)[] = [start]
  
  for (const point of sortedPoints) {
    // Remove points that create right turn
    while (hull.length > 1 && 
           crossProduct(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) {
      hull.pop()
    }
    hull.push(point)
  }
  
  return hull
}

// Calculate cross product to determine turn direction
function crossProduct(o: DropPoint | Waypoint, a: DropPoint | Waypoint, b: DropPoint | Waypoint): number {
  return (a.longitude - o.longitude) * (b.latitude - o.latitude) - 
         (a.latitude - o.latitude) * (b.longitude - o.longitude)
}