export interface MissionLog {
  appVersion: number
  droneName: string
  fieldName: string
  flightLog: FlightLog
  pilotName: string
  uploaded: boolean
}

export interface MissionSettings {
  filename?: string // Added to track which file this came from
  info: {
    name: string
    area: number
    areaCalc: number
    routeLength: number
    dropCountEst: number
    durationMillisEst: number
    additionalOptions: any[]
  }
  polygon: [number, number][]
  missionWaypoints: [number, number][]
  missionParams: {
    dDL: number // line spacing in meters
    dTFB: number // drop distance (format unknown)
    linesOffset: number
    startingPos: number // corner to start from (1-4)
    altitude: number // altitude in meters
    speed: number // speed in m/s
    angle: number // angle of flight lines in degrees
  }
}

export interface MergedMission {
  appVersion: number
  droneName: string
  fieldName: string
  flightLog: FlightLog
  pilotName: string
  uploaded: boolean
  sourceFiles: string[]
  isMerged: boolean
  missionSettings?: MissionSettings[]
}

export interface FlightLog {
  dropPoints: DropPoint[]
  endDate: string
  flightDate: string
  homepoint: Homepoint
  pilotName: string
  polygon: string
  startDate: string
  trichogrammaBullets: number
  waypoints: Waypoint[]
}

export interface DropPoint {
  altitude: number
  date: string
  heading: number
  latitude: number
  longitude: number
  speed: number
  sourceFile?: string
  sourceIndex?: number
}

export interface Homepoint {
  altitude: number
  heading: number
  latitude: number
  longitude: number
}

export interface Waypoint {
  altitude: number
  date: string
  heading: number
  latitude: number
  longitude: number
  speed: number
  sourceFile?: string
  sourceIndex?: number
}

// Additional types for the application state
export type LayerType = 'dropPoints' | 'waypoints' | 'polygon' | 'missionWaypoints' | 'polygonUnion'

export interface MissionStats {
  dropPointsCount: number
  waypointsCount: number
  flightDuration: number
  totalDistance: number
  averageAltitude: number
  minAltitude: number
  maxAltitude: number
  averageSpeed: number
  coveredAreaHectares: number
  averageDropDistance: number
  averageDropLineDistance: number
  maxDropPerMinute: number
}