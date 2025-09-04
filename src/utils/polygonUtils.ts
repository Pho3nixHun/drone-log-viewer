// Utility functions for polygon operations using computational geometry

export interface Point {
  x: number
  y: number
}

export interface Edge {
  p1: Point
  p2: Point
}

/**
 * Calculate the area of a polygon using the shoelace formula
 * Returns area in square degrees
 */
export function calculatePolygonArea(coords: [number, number][]): number {
  if (coords.length < 3) return 0
  
  let area = 0
  const n = coords.length
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    // Note: coords are [lat, lng], but for area calculation we use [lng, lat] as [x, y]
    area += coords[i][1] * coords[j][0] // lng * lat
    area -= coords[j][1] * coords[i][0] // lng * lat
  }
  
  return Math.abs(area) / 2
}

/**
 * Convert area from square degrees to hectares
 * Uses Haversine-based conversion for accuracy
 */
export function squareDegreesToHectares(areaDegrees: number, avgLatitude: number): number {
  // Calculate meters per degree at the given latitude
  const latRadians = (avgLatitude * Math.PI) / 180
  const metersPerDegreeLat = 111320 // approximately constant
  const metersPerDegreeLng = 111320 * Math.cos(latRadians)
  
  // Convert square degrees to square meters
  const areaSquareMeters = areaDegrees * metersPerDegreeLat * metersPerDegreeLng
  
  // Convert to hectares (1 hectare = 10,000 square meters)
  return areaSquareMeters / 10000
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  let inside = false
  const x = point[1], y = point[0] // lng, lat
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0] // lng, lat
    const xj = polygon[j][1], yj = polygon[j][0] // lng, lat
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  
  return inside
}

/**
 * Check if polygon A completely contains polygon B
 */
export function polygonContainsPolygon(polyA: [number, number][], polyB: [number, number][]): boolean {
  return polyB.every(point => isPointInPolygon(point, polyA))
}

/**
 * Check if two polygons intersect (have any overlapping area)
 */
export function polygonsIntersect(poly1: [number, number][], poly2: [number, number][]): boolean {
  // Check if any vertex of poly1 is inside poly2
  for (const point of poly1) {
    if (isPointInPolygon(point, poly2)) {
      return true
    }
  }
  
  // Check if any vertex of poly2 is inside poly1
  for (const point of poly2) {
    if (isPointInPolygon(point, poly1)) {
      return true
    }
  }
  
  // Check if any edges intersect
  for (let i = 0; i < poly1.length; i++) {
    const p1 = { x: poly1[i][1], y: poly1[i][0] }
    const p2 = { x: poly1[(i + 1) % poly1.length][1], y: poly1[(i + 1) % poly1.length][0] }
    
    for (let j = 0; j < poly2.length; j++) {
      const p3 = { x: poly2[j][1], y: poly2[j][0] }
      const p4 = { x: poly2[(j + 1) % poly2.length][1], y: poly2[(j + 1) % poly2.length][0] }
      
      if (lineIntersection(p1, p2, p3, p4)) {
        return true
      }
    }
  }
  
  return false
}

/**
 * Find intersection point of two line segments
 */
function lineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x)
  
  if (Math.abs(denom) < 1e-10) return null // Lines are parallel
  
  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom
  const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / denom
  
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: p1.x + t * (p2.x - p1.x),
      y: p1.y + t * (p2.y - p1.y)
    }
  }
  
  return null
}

/**
 * Calculate the union of multiple polygons
 * Handles containment cases properly - if one polygon contains another, only the containing polygon contributes to the union
 */
export function calculatePolygonUnion(polygons: [number, number][][]): [number, number][] {
  if (polygons.length === 0) return []
  if (polygons.length === 1) return polygons[0]
  
  // Step 1: Remove polygons that are completely contained within other polygons
  const independentPolygons: [number, number][][] = []
  
  for (let i = 0; i < polygons.length; i++) {
    let isContained = false
    
    // Check if polygon i is contained within any other polygon
    for (let j = 0; j < polygons.length; j++) {
      if (i !== j && polygonContainsPolygon(polygons[j], polygons[i])) {
        isContained = true
        break
      }
    }
    
    // Only add if it's not contained within any other polygon
    if (!isContained) {
      independentPolygons.push(polygons[i])
    }
  }
  
  // If only one polygon remains after removing contained ones, return it
  if (independentPolygons.length === 1) {
    return independentPolygons[0]
  }
  
  // If no polygons intersect after removing contained ones, return the largest
  if (independentPolygons.length > 1) {
    let hasIntersection = false
    for (let i = 0; i < independentPolygons.length && !hasIntersection; i++) {
      for (let j = i + 1; j < independentPolygons.length; j++) {
        if (polygonsIntersect(independentPolygons[i], independentPolygons[j])) {
          hasIntersection = true
          break
        }
      }
    }
    
    if (!hasIntersection) {
      // Return the polygon with the largest area
      let largestPolygon = independentPolygons[0]
      let largestArea = calculatePolygonArea(largestPolygon)
      
      for (let i = 1; i < independentPolygons.length; i++) {
        const area = calculatePolygonArea(independentPolygons[i])
        if (area > largestArea) {
          largestArea = area
          largestPolygon = independentPolygons[i]
        }
      }
      
      return largestPolygon
    }
  }
  
  // For intersecting polygons, calculate actual union using convex hull approach
  const allPoints: Point[] = []
  
  // Add all vertices from independent polygons
  for (const polygon of independentPolygons) {
    for (const coord of polygon) {
      allPoints.push({ x: coord[1], y: coord[0] }) // lng, lat -> x, y
    }
  }
  
  // Add intersection points between independent polygons
  for (let i = 0; i < independentPolygons.length; i++) {
    for (let j = i + 1; j < independentPolygons.length; j++) {
      const poly1 = independentPolygons[i]
      const poly2 = independentPolygons[j]
      
      // Check each edge of poly1 against each edge of poly2
      for (let e1 = 0; e1 < poly1.length; e1++) {
        const p1 = { x: poly1[e1][1], y: poly1[e1][0] }
        const p2 = { x: poly1[(e1 + 1) % poly1.length][1], y: poly1[(e1 + 1) % poly1.length][0] }
        
        for (let e2 = 0; e2 < poly2.length; e2++) {
          const p3 = { x: poly2[e2][1], y: poly2[e2][0] }
          const p4 = { x: poly2[(e2 + 1) % poly2.length][1], y: poly2[(e2 + 1) % poly2.length][0] }
          
          const intersection = lineIntersection(p1, p2, p3, p4)
          if (intersection) {
            allPoints.push(intersection)
          }
        }
      }
    }
  }
  
  // Remove duplicate points
  const uniquePoints: Point[] = []
  for (const point of allPoints) {
    const isDuplicate = uniquePoints.some(up => 
      Math.abs(up.x - point.x) < 1e-8 && Math.abs(up.y - point.y) < 1e-8
    )
    if (!isDuplicate) {
      uniquePoints.push(point)
    }
  }
  
  // Create convex hull using Graham scan algorithm
  if (uniquePoints.length < 3) return independentPolygons[0] // Fallback
  
  const hull = convexHull(uniquePoints)
  
  // Convert back to [lat, lng] format
  return hull.map(point => [point.y, point.x] as [number, number])
}

/**
 * Calculate convex hull using Graham scan algorithm
 */
function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return points
  
  // Find the bottom-most point (and leftmost in case of tie)
  let bottomPoint = points[0]
  for (const point of points) {
    if (point.y < bottomPoint.y || (point.y === bottomPoint.y && point.x < bottomPoint.x)) {
      bottomPoint = point
    }
  }
  
  // Sort points by polar angle with respect to bottom point
  const sortedPoints = points.filter(p => p !== bottomPoint)
    .sort((a, b) => {
      const angleA = Math.atan2(a.y - bottomPoint.y, a.x - bottomPoint.x)
      const angleB = Math.atan2(b.y - bottomPoint.y, b.x - bottomPoint.x)
      if (Math.abs(angleA - angleB) < 1e-10) {
        // Same angle, sort by distance
        const distA = Math.sqrt(Math.pow(a.x - bottomPoint.x, 2) + Math.pow(a.y - bottomPoint.y, 2))
        const distB = Math.sqrt(Math.pow(b.x - bottomPoint.x, 2) + Math.pow(b.y - bottomPoint.y, 2))
        return distA - distB
      }
      return angleA - angleB
    })
  
  // Build convex hull
  const hull: Point[] = [bottomPoint]
  
  for (const point of sortedPoints) {
    // Remove points that make clockwise turn
    while (hull.length >= 2 && crossProduct(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) {
      hull.pop()
    }
    hull.push(point)
  }
  
  return hull
}

/**
 * Calculate cross product for three points (to determine turn direction)
 */
function crossProduct(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
}

/**
 * Calculate total field area from WDM mission settings
 * Uses proper polygon union algorithm to handle overlapping polygons
 */
export function calculateTotalFieldArea(missionSettings: Array<{
  polygon: [number, number][]
  info: { areaCalc: number }
}>): number {
  if (missionSettings.length === 0) return 0
  
  // For geometric accuracy, always use polygon coordinates and calculate union
  const validPolygons = missionSettings
    .filter(settings => settings.polygon && settings.polygon.length >= 3)
    .map(settings => settings.polygon)
  
  if (validPolygons.length === 0) return 0
  if (validPolygons.length === 1) {
    const area = calculatePolygonArea(validPolygons[0])
    const avgLat = validPolygons[0].reduce((sum, coord) => sum + coord[0], 0) / validPolygons[0].length
    return squareDegreesToHectares(area, avgLat)
  }
  
  // Calculate union of polygons
  const unionPolygon = calculatePolygonUnion(validPolygons)
  const unionArea = calculatePolygonArea(unionPolygon)
  
  // Calculate average latitude for accurate conversion
  const avgLatitude = unionPolygon.reduce((sum, coord) => sum + coord[0], 0) / unionPolygon.length
  
  return squareDegreesToHectares(unionArea, avgLatitude)
}