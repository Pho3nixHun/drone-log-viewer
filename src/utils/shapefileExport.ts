import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { MergedMission } from '../types/mission'
import { calculatePolygonUnion, calculatePolygonArea } from './polygonUtils'


// Utility function to calculate polygon centroid
function calculateCentroid(coords: [number, number][]): [number, number] {
  let x = 0, y = 0
  for (const [lng, lat] of coords) {
    x += lng
    y += lat
  }
  return [x / coords.length, y / coords.length]
}

interface ShapefileFeature {
  type: 'Feature'
  geometry: {
    type: 'Point' | 'Polygon'
    coordinates: [number, number] | [number, number][][] // Point coords or Polygon coords
  }
  properties: {
    [key: string]: string | number
  }
}


// Create a simple DBF file content (dBASE format is complex, so we'll create a minimal version)
function createDBF(features: ShapefileFeature[]): Uint8Array {
  const records = features.length
  const fieldCount = 12 // id, type, geom_type, lat, lng, altitude, speed, heading, date, sourceFile, sourceIndex, area
  const recordLength = 1 + 8 + 12 + 8 + 8 + 8 + 8 + 8 + 8 + 20 + 50 + 8 + 12 // 1 deletion flag + fields
  
  const headerLength = 32 + (fieldCount * 32) + 1
  const fileSize = headerLength + (records * recordLength)
  
  const buffer = new ArrayBuffer(fileSize)
  const view = new DataView(buffer)
  const textEncoder = new TextEncoder()
  
  let offset = 0
  
  // Header
  view.setUint8(offset++, 0x03) // dBASE III
  view.setUint8(offset++, 125) // Last update year (2023 - 1900 = 123, using 125)
  view.setUint8(offset++, 1) // Month
  view.setUint8(offset++, 1) // Day
  view.setUint32(offset, records, true) // Number of records
  offset += 4
  view.setUint16(offset, headerLength, true) // Header length
  offset += 2
  view.setUint16(offset, recordLength, true) // Record length
  offset += 2
  
  // Skip reserved bytes
  offset += 20
  
  // Field descriptors
  const fields = [
    { name: 'ID', type: 'N', length: 8, decimal: 0 },
    { name: 'TYPE', type: 'C', length: 12, decimal: 0 },
    { name: 'GEOM_TYPE', type: 'C', length: 8, decimal: 0 },
    { name: 'LATITUDE', type: 'N', length: 8, decimal: 6 },
    { name: 'LONGITUDE', type: 'N', length: 8, decimal: 6 },
    { name: 'ALTITUDE', type: 'N', length: 8, decimal: 2 },
    { name: 'SPEED', type: 'N', length: 8, decimal: 2 },
    { name: 'HEADING', type: 'N', length: 8, decimal: 2 },
    { name: 'DATE', type: 'C', length: 20, decimal: 0 },
    { name: 'SOURCEFILE', type: 'C', length: 50, decimal: 0 },
    { name: 'SOURCEIDX', type: 'N', length: 8, decimal: 0 },
    { name: 'AREA', type: 'N', length: 12, decimal: 4 }
  ]
  
  fields.forEach(field => {
    const nameBytes = textEncoder.encode(field.name.padEnd(11, '\0'))
    for (let i = 0; i < 11; i++) {
      view.setUint8(offset++, nameBytes[i] || 0)
    }
    view.setUint8(offset++, field.type.charCodeAt(0))
    offset += 4 // Skip address
    view.setUint8(offset++, field.length)
    view.setUint8(offset++, field.decimal)
    offset += 14 // Skip reserved bytes
  })
  
  view.setUint8(offset++, 0x0D) // Header terminator
  
  // Records
  features.forEach((feature, index) => {
    view.setUint8(offset++, 0x20) // Active record
    
    // ID
    const id = (index + 1).toString().padStart(8, ' ')
    const idBytes = textEncoder.encode(id)
    for (let i = 0; i < 8; i++) {
      view.setUint8(offset++, idBytes[i] || 32)
    }
    
    // TYPE
    const type = feature.properties.type.toString().padEnd(12, ' ')
    const typeBytes = textEncoder.encode(type)
    for (let i = 0; i < 12; i++) {
      view.setUint8(offset++, typeBytes[i] || 32)
    }
    
    // GEOM_TYPE
    const geomType = feature.geometry.type.padEnd(8, ' ')
    const geomTypeBytes = textEncoder.encode(geomType)
    for (let i = 0; i < 8; i++) {
      view.setUint8(offset++, geomTypeBytes[i] || 32)
    }
    
    // LATITUDE (center point for polygons, actual for points)
    let lat: string
    let lng: string
    
    if (feature.geometry.type === 'Point') {
      lat = (feature.geometry.coordinates as [number, number])[1].toFixed(6).padStart(8, ' ')
      lng = (feature.geometry.coordinates as [number, number])[0].toFixed(6).padStart(8, ' ')
    } else {
      // For polygons, use centroid
      lat = (feature.properties.latitude as number).toFixed(6).padStart(8, ' ')
      lng = (feature.properties.longitude as number).toFixed(6).padStart(8, ' ')
    }
    
    const latBytes = textEncoder.encode(lat)
    for (let i = 0; i < 8; i++) {
      view.setUint8(offset++, latBytes[i] || 32)
    }
    
    // LONGITUDE
    const lngBytes = textEncoder.encode(lng)
    for (let i = 0; i < 8; i++) {
      view.setUint8(offset++, lngBytes[i] || 32)
    }
    
    // ALTITUDE
    const alt = feature.properties.altitude.toString().padStart(8, ' ')
    const altBytes = textEncoder.encode(alt)
    for (let i = 0; i < 8; i++) {
      view.setUint8(offset++, altBytes[i] || 32)
    }
    
    // SPEED
    const speed = feature.properties.speed.toString().padStart(8, ' ')
    const speedBytes = textEncoder.encode(speed)
    for (let i = 0; i < 8; i++) {
      view.setUint8(offset++, speedBytes[i] || 32)
    }
    
    // HEADING
    const heading = feature.properties.heading.toString().padStart(8, ' ')
    const headingBytes = textEncoder.encode(heading)
    for (let i = 0; i < 8; i++) {
      view.setUint8(offset++, headingBytes[i] || 32)
    }
    
    // DATE
    const date = feature.properties.date.toString().padEnd(20, ' ')
    const dateBytes = textEncoder.encode(date)
    for (let i = 0; i < 20; i++) {
      view.setUint8(offset++, dateBytes[i] || 32)
    }
    
    // SOURCEFILE
    const sourceFile = feature.properties.sourceFile.toString().padEnd(50, ' ')
    const sourceFileBytes = textEncoder.encode(sourceFile)
    for (let i = 0; i < 50; i++) {
      view.setUint8(offset++, sourceFileBytes[i] || 32)
    }
    
    // SOURCEIDX
    const sourceIdx = feature.properties.sourceIndex.toString().padStart(8, ' ')
    const sourceIdxBytes = textEncoder.encode(sourceIdx)
    for (let i = 0; i < 8; i++) {
      view.setUint8(offset++, sourceIdxBytes[i] || 32)
    }
    
    // AREA
    const area = (typeof feature.properties.area === 'number' ? feature.properties.area : 0).toFixed(4).padStart(12, ' ')
    const areaBytes = textEncoder.encode(area)
    for (let i = 0; i < 12; i++) {
      view.setUint8(offset++, areaBytes[i] || 32)
    }
  })
  
  return new Uint8Array(buffer)
}

// Create SHP file for specific geometry type
function createSHP(features: ShapefileFeature[], geometryType: 'Point' | 'Polygon'): Uint8Array {
  const filteredFeatures = features.filter(f => f.geometry.type === geometryType)
  const recordCount = filteredFeatures.length
  
  if (recordCount === 0) {
    throw new Error(`No ${geometryType} features to export`)
  }
  
  const shpHeaderLength = 100
  const recordHeaderLength = 8
  
  let recordLength: number
  let shapeTypeCode: number
  
  if (geometryType === 'Point') {
    recordLength = 20 // Point: 4 bytes type + 8 bytes X + 8 bytes Y
    shapeTypeCode = 1
  } else {
    // Polygon: estimate based on average number of points
    const avgPoints = filteredFeatures.reduce((sum, f) => {
      const coords = f.geometry.coordinates as [number, number][][]
      return sum + coords[0].length // assuming single ring for simplicity
    }, 0) / recordCount
    recordLength = 44 + (avgPoints * 16) // Header + bounding box + points
    shapeTypeCode = 5
  }
  
  // Calculate file length (this is approximate for polygons)
  let fileLength = shpHeaderLength + (recordCount * recordHeaderLength)
  
  if (geometryType === 'Point') {
    fileLength += recordCount * recordLength
  } else {
    // For polygons, calculate actual size
    filteredFeatures.forEach(feature => {
      const coords = (feature.geometry.coordinates as [number, number][][])[0]
      fileLength += 44 + (coords.length * 16) // polygon header + points
    })
  }
  const buffer = new ArrayBuffer(fileLength)
  const view = new DataView(buffer)
  
  let offset = 0
  
  // Main file header (100 bytes)
  view.setInt32(offset, 9994, false) // File code (big endian)
  offset += 4
  offset += 20 // Skip unused bytes
  view.setInt32(offset, fileLength / 2, false) // File length in 16-bit words (big endian)
  offset += 4
  view.setInt32(offset, 1000, true) // Version (little endian)
  offset += 4
  view.setInt32(offset, shapeTypeCode, true) // Shape type (little endian)
  offset += 4
  
  // Calculate bounding box from filtered features
  let allLats: number[] = []
  let allLngs: number[] = []
  
  if (geometryType === 'Point') {
    allLats = filteredFeatures.map(f => (f.geometry.coordinates as [number, number])[1])
    allLngs = filteredFeatures.map(f => (f.geometry.coordinates as [number, number])[0])
  } else {
    filteredFeatures.forEach(f => {
      const coords = (f.geometry.coordinates as [number, number][][])[0]
      coords.forEach(([lng, lat]) => {
        allLngs.push(lng)
        allLats.push(lat)
      })
    })
  }
  
  const minLng = Math.min(...allLngs)
  const minLat = Math.min(...allLats)
  const maxLng = Math.max(...allLngs)
  const maxLat = Math.max(...allLats)
  
  view.setFloat64(offset, minLng, true) // Xmin
  offset += 8
  view.setFloat64(offset, minLat, true) // Ymin
  offset += 8
  view.setFloat64(offset, maxLng, true) // Xmax
  offset += 8
  view.setFloat64(offset, maxLat, true) // Ymax
  offset += 8
  view.setFloat64(offset, 0, true) // Zmin
  offset += 8
  view.setFloat64(offset, 0, true) // Zmax
  offset += 8
  view.setFloat64(offset, 0, true) // Mmin
  offset += 8
  view.setFloat64(offset, 0, true) // Mmax
  offset += 8
  
  // Records
  filteredFeatures.forEach((feature, index) => {
    // Record header
    view.setInt32(offset, index + 1, false) // Record number (big endian)
    offset += 4
    
    if (geometryType === 'Point') {
      view.setInt32(offset, 10, false) // Content length: 20 bytes / 2 = 10 words (big endian)
      offset += 4
      
      // Point record
      view.setInt32(offset, 1, true) // Shape type: Point (little endian)
      offset += 4
      view.setFloat64(offset, (feature.geometry.coordinates as [number, number])[0], true) // X (longitude)
      offset += 8
      view.setFloat64(offset, (feature.geometry.coordinates as [number, number])[1], true) // Y (latitude)
      offset += 8
    } else {
      // Polygon record
      const coords = (feature.geometry.coordinates as [number, number][][])[0]
      const contentLength = (44 + (coords.length * 16)) / 2 // Convert bytes to 16-bit words
      
      view.setInt32(offset, contentLength, false) // Content length (big endian)
      offset += 4
      
      // Polygon record
      view.setInt32(offset, 5, true) // Shape type: Polygon (little endian)
      offset += 4
      
      // Bounding box for this polygon
      const polyLngs = coords.map(([lng]) => lng)
      const polyLats = coords.map(([, lat]) => lat)
      const polyMinLng = Math.min(...polyLngs)
      const polyMinLat = Math.min(...polyLats)
      const polyMaxLng = Math.max(...polyLngs)
      const polyMaxLat = Math.max(...polyLats)
      
      view.setFloat64(offset, polyMinLng, true) // Xmin
      offset += 8
      view.setFloat64(offset, polyMinLat, true) // Ymin
      offset += 8
      view.setFloat64(offset, polyMaxLng, true) // Xmax
      offset += 8
      view.setFloat64(offset, polyMaxLat, true) // Ymax
      offset += 8
      
      // Number of parts (always 1 for simple polygons)
      view.setInt32(offset, 1, true)
      offset += 4
      
      // Number of points
      view.setInt32(offset, coords.length, true)
      offset += 4
      
      // Parts array (start index of each ring, always [0] for simple polygons)
      view.setInt32(offset, 0, true)
      offset += 4
      
      // Points array
      coords.forEach(([lng, lat]) => {
        view.setFloat64(offset, lng, true) // X (longitude)
        offset += 8
        view.setFloat64(offset, lat, true) // Y (latitude)
        offset += 8
      })
    }
  })
  
  return new Uint8Array(buffer)
}

// Create a simple SHX file (index)
function createSHX(features: ShapefileFeature[], geometryType: 'Point' | 'Polygon'): Uint8Array {
  const filteredFeatures = features.filter(f => f.geometry.type === geometryType)
  const recordCount = filteredFeatures.length
  
  if (recordCount === 0) {
    throw new Error(`No ${geometryType} features to index`)
  }
  const shxHeaderLength = 100
  const indexRecordLength = 8
  
  const fileLength = shxHeaderLength + (recordCount * indexRecordLength)
  const buffer = new ArrayBuffer(fileLength)
  const view = new DataView(buffer)
  
  let offset = 0
  
  // Header (same as SHP)
  view.setInt32(offset, 9994, false) // File code
  offset += 4
  offset += 20 // Skip unused bytes
  view.setInt32(offset, fileLength / 2, false) // File length in 16-bit words
  offset += 4
  view.setInt32(offset, 1000, true) // Version
  offset += 4
  const shapeTypeCode = geometryType === 'Point' ? 1 : 5
  view.setInt32(offset, shapeTypeCode, true) // Shape type
  offset += 4
  
  // Calculate bounding box from filtered features
  let allLats: number[] = []
  let allLngs: number[] = []
  
  if (geometryType === 'Point') {
    allLats = filteredFeatures.map(f => (f.geometry.coordinates as [number, number])[1])
    allLngs = filteredFeatures.map(f => (f.geometry.coordinates as [number, number])[0])
  } else {
    filteredFeatures.forEach(f => {
      const coords = (f.geometry.coordinates as [number, number][][])[0]
      coords.forEach(([lng, lat]) => {
        allLngs.push(lng)
        allLats.push(lat)
      })
    })
  }
  
  const minLng = Math.min(...allLngs)
  const minLat = Math.min(...allLats)
  const maxLng = Math.max(...allLngs)
  const maxLat = Math.max(...allLats)
  
  view.setFloat64(offset, minLng, true)
  offset += 8
  view.setFloat64(offset, minLat, true)
  offset += 8
  view.setFloat64(offset, maxLng, true)
  offset += 8
  view.setFloat64(offset, maxLat, true)
  offset += 8
  view.setFloat64(offset, 0, true) // Z values
  offset += 8
  view.setFloat64(offset, 0, true)
  offset += 8
  view.setFloat64(offset, 0, true) // M values
  offset += 8
  view.setFloat64(offset, 0, true)
  offset += 8
  
  // Index records
  let recordOffset = 50 // Start after header (in 16-bit words)
  filteredFeatures.forEach((feature) => {
    view.setInt32(offset, recordOffset, false) // Record offset (big endian)
    offset += 4
    
    let contentLength: number
    if (geometryType === 'Point') {
      contentLength = 10 // 20 bytes / 2 = 10 words
      recordOffset += 14 // 8 bytes header + 20 bytes content = 28 bytes = 14 words
    } else {
      // Polygon: calculate actual content length
      const coords = (feature.geometry.coordinates as [number, number][][])[0]
      contentLength = (44 + (coords.length * 16)) / 2 // Convert bytes to 16-bit words
      recordOffset += 4 + contentLength // 8 bytes header + content
    }
    
    view.setInt32(offset, contentLength, false) // Content length (big endian)
    offset += 4
  })
  
  return new Uint8Array(buffer)
}

export async function exportToShapefile(mission: MergedMission, selectedLayers: Set<string>, selectedSourceFiles: Set<string>): Promise<void> {
  const { dropPoints, waypoints } = mission.flightLog
  const features: ShapefileFeature[] = []
  
  // Add drop points only if layer is selected
  if (selectedLayers.has('dropPoints')) {
    dropPoints.forEach((point, index) => {
      if (point.latitude !== 0 && point.longitude !== 0 && (!point.sourceFile || selectedSourceFiles.has(point.sourceFile))) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [point.longitude, point.latitude]
          },
          properties: {
            id: index + 1,
            type: 'drop',
            latitude: point.latitude,
            longitude: point.longitude,
            altitude: point.altitude,
            speed: point.speed || 0,
            heading: point.heading || 0,
            date: point.date,
            sourceFile: point.sourceFile || 'unknown',
            sourceIndex: point.sourceIndex || 0,
            area: 0
          }
        })
      }
    })
  }
  
  // Add waypoints only if layer is selected
  if (selectedLayers.has('waypoints')) {
    waypoints.forEach((point, index) => {
      if (point.latitude !== 0 && point.longitude !== 0 && (!point.sourceFile || selectedSourceFiles.has(point.sourceFile))) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [point.longitude, point.latitude]
          },
          properties: {
            id: dropPoints.length + index + 1,
            type: 'waypoint',
            latitude: point.latitude,
            longitude: point.longitude,
            altitude: point.altitude,
            speed: point.speed || 0,
            heading: point.heading || 0,
            date: point.date,
            sourceFile: point.sourceFile || 'unknown',
            sourceIndex: point.sourceIndex || 0,
            area: 0
          }
        })
      }
    })
  }

  // Add mission waypoints from WDM files only if layer is selected
  if (selectedLayers.has('missionWaypoints') && mission.missionSettings) {
    let missionWaypointId = dropPoints.length + waypoints.length + 1
    
    mission.missionSettings.forEach((settings, settingsIndex) => {
      const filename = settings.filename || `wdm-${settingsIndex}`
      
      if (selectedSourceFiles.has(filename) && settings.missionWaypoints) {
        settings.missionWaypoints.forEach((coord) => {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [coord[0], coord[1]] // [longitude, latitude]
            },
            properties: {
              id: missionWaypointId++,
              type: 'mission_waypoint',
              latitude: coord[1],
              longitude: coord[0],
              altitude: settings.missionParams?.altitude || 0,
              speed: settings.missionParams?.speed || 0,
              heading: settings.missionParams?.angle || 0,
              date: new Date().toISOString(),
              sourceFile: filename,
              sourceIndex: settingsIndex,
              area: 0
            }
          })
        })
      }
    })
  }

  // Add polygon features from WDM files only if layer is selected
  if (selectedLayers.has('polygon') && mission.missionSettings) {
    let polygonId = dropPoints.length + waypoints.length + 1
    if (selectedLayers.has('missionWaypoints')) {
      // Adjust ID if mission waypoints were added
      const missionWaypointsCount = mission.missionSettings.reduce((count, settings, index) => {
        const filename = settings.filename || `wdm-${index}`
        return count + (selectedSourceFiles.has(filename) && settings.missionWaypoints ? settings.missionWaypoints.length : 0)
      }, 0)
      polygonId += missionWaypointsCount
    }

    mission.missionSettings.forEach((settings, settingsIndex) => {
      const filename = settings.filename || `wdm-${settingsIndex}`
      
      if (selectedSourceFiles.has(filename) && settings.polygon && settings.polygon.length > 0) {
        // Calculate polygon area and centroid
        const coords = settings.polygon.map(([lat, lng]) => [lng, lat] as [number, number]) // Convert to [lng, lat]
        const area = calculatePolygonArea(settings.polygon) // Use original [lat, lng] format for area calculation
        const centroid = calculateCentroid(coords)
        
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[...coords, coords[0]]] // Close the polygon
          },
          properties: {
            id: polygonId++,
            type: 'field_polygon',
            latitude: centroid[1],
            longitude: centroid[0],
            altitude: settings.missionParams?.altitude || 0,
            speed: 0,
            heading: 0,
            date: new Date().toISOString(),
            sourceFile: filename,
            sourceIndex: settingsIndex,
            area: area
          }
        })
      }
    })
  }

  // Add polygon union feature if layer is selected and we have multiple WDM files
  if (selectedLayers.has('polygonUnion') && mission.missionSettings && mission.missionSettings.length > 1) {
    // Collect enabled polygons for union calculation
    const enabledPolygons: [number, number][][] = []
    
    mission.missionSettings.forEach((settings, settingsIndex) => {
      const filename = settings.filename || `wdm-${settingsIndex}`
      if (selectedSourceFiles.has(filename) && settings.polygon && settings.polygon.length > 0) {
        enabledPolygons.push(settings.polygon)
      }
    })
    
    if (enabledPolygons.length > 1) {
      // Calculate the union polygon
      const unionPolygon = calculatePolygonUnion(enabledPolygons)
      const unionArea = calculatePolygonArea(unionPolygon)
      const unionCentroid = calculateCentroid(unionPolygon.map(([lat, lng]) => [lng, lat] as [number, number]))
      
      // Add union polygon as a feature
      const unionCoords = unionPolygon.map(([lat, lng]) => [lng, lat] as [number, number]) // Convert to [lng, lat] for GeoJSON
      
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[...unionCoords, unionCoords[0]]] // Close the polygon
        },
        properties: {
          id: features.length + 1,
          type: 'polygon_union',
          latitude: unionCentroid[1],
          longitude: unionCentroid[0],
          altitude: 0,
          speed: 0,
          heading: 0,
          date: new Date().toISOString(),
          sourceFile: 'union',
          sourceIndex: -1,
          area: unionArea
        }
      })
    }
  }

  if (features.length === 0) {
    throw new Error('No valid features to export')
  }
  
  // Separate features by geometry type
  const pointFeatures = features.filter(f => f.geometry.type === 'Point')
  const polygonFeatures = features.filter(f => f.geometry.type === 'Polygon')
  
  // Create ZIP file with all components
  const zip = new JSZip()
  const baseName = `${mission.fieldName}_${new Date().toISOString().split('T')[0]}`
  
  // Create a PRJ file for WGS84 coordinate system
  const prjContent = `GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]`
  
  // Create point shapefile if we have point features
  if (pointFeatures.length > 0) {
    const pointShpData = createSHP(pointFeatures, 'Point')
    const pointShxData = createSHX(pointFeatures, 'Point')
    const pointDbfData = createDBF(pointFeatures)
    
    zip.file(`${baseName}_points.shp`, pointShpData)
    zip.file(`${baseName}_points.shx`, pointShxData)
    zip.file(`${baseName}_points.dbf`, pointDbfData)
    zip.file(`${baseName}_points.prj`, prjContent)
  }
  
  // Create polygon shapefile if we have polygon features
  if (polygonFeatures.length > 0) {
    const polygonShpData = createSHP(polygonFeatures, 'Polygon')
    const polygonShxData = createSHX(polygonFeatures, 'Polygon')
    const polygonDbfData = createDBF(polygonFeatures)
    
    zip.file(`${baseName}_polygons.shp`, polygonShpData)
    zip.file(`${baseName}_polygons.shx`, polygonShxData)
    zip.file(`${baseName}_polygons.dbf`, polygonDbfData)
    zip.file(`${baseName}_polygons.prj`, prjContent)
  }
  
  // Generate and save the ZIP file
  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, `${baseName}.zip`)
}