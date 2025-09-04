import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { MergedMission } from '../types/mission'

interface ShapefileFeature {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
  properties: {
    [key: string]: string | number
  }
}


// Create a simple DBF file content (dBASE format is complex, so we'll create a minimal version)
function createDBF(features: ShapefileFeature[]): Uint8Array {
  const records = features.length
  const fieldCount = 10 // id, type, lat, lng, altitude, speed, heading, date, sourceFile, sourceIndex
  const recordLength = 1 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 20 + 50 + 8 // 1 deletion flag + fields
  
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
    { name: 'TYPE', type: 'C', length: 8, decimal: 0 },
    { name: 'LATITUDE', type: 'N', length: 8, decimal: 6 },
    { name: 'LONGITUDE', type: 'N', length: 8, decimal: 6 },
    { name: 'ALTITUDE', type: 'N', length: 8, decimal: 2 },
    { name: 'SPEED', type: 'N', length: 8, decimal: 2 },
    { name: 'HEADING', type: 'N', length: 8, decimal: 2 },
    { name: 'DATE', type: 'C', length: 20, decimal: 0 },
    { name: 'SOURCEFILE', type: 'C', length: 50, decimal: 0 },
    { name: 'SOURCEIDX', type: 'N', length: 8, decimal: 0 }
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
    const type = feature.properties.type.toString().padEnd(8, ' ')
    const typeBytes = textEncoder.encode(type)
    for (let i = 0; i < 8; i++) {
      view.setUint8(offset++, typeBytes[i] || 32)
    }
    
    // LATITUDE
    const lat = feature.geometry.coordinates[1].toFixed(6).padStart(8, ' ')
    const latBytes = textEncoder.encode(lat)
    for (let i = 0; i < 8; i++) {
      view.setUint8(offset++, latBytes[i] || 32)
    }
    
    // LONGITUDE
    const lng = feature.geometry.coordinates[0].toFixed(6).padStart(8, ' ')
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
  })
  
  return new Uint8Array(buffer)
}

// Create a simple SHP file (points only)
function createSHP(features: ShapefileFeature[]): Uint8Array {
  const recordCount = features.length
  const shpHeaderLength = 100
  const recordHeaderLength = 8
  const pointRecordLength = 20 // Point: 4 bytes type + 8 bytes X + 8 bytes Y
  
  const fileLength = shpHeaderLength + (recordCount * (recordHeaderLength + pointRecordLength))
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
  view.setInt32(offset, 1, true) // Shape type: Point (little endian)
  offset += 4
  
  // Bounding box (little endian doubles)
  const lats = features.map(f => f.geometry.coordinates[1])
  const lngs = features.map(f => f.geometry.coordinates[0])
  const minLng = Math.min(...lngs)
  const minLat = Math.min(...lats)
  const maxLng = Math.max(...lngs)
  const maxLat = Math.max(...lats)
  
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
  features.forEach((feature, index) => {
    // Record header
    view.setInt32(offset, index + 1, false) // Record number (big endian)
    offset += 4
    view.setInt32(offset, pointRecordLength / 2, false) // Content length in 16-bit words (big endian)
    offset += 4
    
    // Point record
    view.setInt32(offset, 1, true) // Shape type: Point (little endian)
    offset += 4
    view.setFloat64(offset, feature.geometry.coordinates[0], true) // X (longitude)
    offset += 8
    view.setFloat64(offset, feature.geometry.coordinates[1], true) // Y (latitude)
    offset += 8
  })
  
  return new Uint8Array(buffer)
}

// Create a simple SHX file (index)
function createSHX(features: ShapefileFeature[]): Uint8Array {
  const recordCount = features.length
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
  view.setInt32(offset, 1, true) // Shape type: Point
  offset += 4
  
  // Bounding box (same as SHP)
  const lats = features.map(f => f.geometry.coordinates[1])
  const lngs = features.map(f => f.geometry.coordinates[0])
  const minLng = Math.min(...lngs)
  const minLat = Math.min(...lats)
  const maxLng = Math.max(...lngs)
  const maxLat = Math.max(...lats)
  
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
  features.forEach(() => {
    view.setInt32(offset, recordOffset, false) // Record offset (big endian)
    offset += 4
    view.setInt32(offset, 10, false) // Content length: 20 bytes / 2 = 10 words (big endian)
    offset += 4
    recordOffset += 14 // 8 bytes header + 20 bytes content = 28 bytes = 14 words
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
            sourceIndex: point.sourceIndex || 0
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
            sourceIndex: point.sourceIndex || 0
          }
        })
      }
    })
  }
  
  if (features.length === 0) {
    throw new Error('No valid points to export')
  }
  
  // Create the shapefile components
  const shpData = createSHP(features)
  const shxData = createSHX(features)
  const dbfData = createDBF(features)
  
  // Create a PRJ file for WGS84 coordinate system
  const prjContent = `GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]`
  
  // Create ZIP file with all components
  const zip = new JSZip()
  const baseName = `${mission.fieldName}_${new Date().toISOString().split('T')[0]}`
  
  zip.file(`${baseName}.shp`, shpData)
  zip.file(`${baseName}.shx`, shxData)
  zip.file(`${baseName}.dbf`, dbfData)
  zip.file(`${baseName}.prj`, prjContent)
  
  // Generate and save the ZIP file
  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, `${baseName}.zip`)
}