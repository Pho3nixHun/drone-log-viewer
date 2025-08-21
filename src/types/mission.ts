export interface MissionLog {
  appVersion: number
  droneName: string
  fieldName: string
  flightLog: FlightLog
  pilotName: string
  uploaded: boolean
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
}

// Additional types for the application state
export type LayerType = 'dropPoints' | 'waypoints' | 'polygon'

export interface MissionStats {
  dropPointsCount: number
  waypointsCount: number
  flightDuration: number
  totalDistance: number
  averageAltitude: number
  minAltitude: number
  maxAltitude: number
  averageSpeed: number
  coveredAreaAcres: number
  averageDropDistance: number
  averageDropLineDistance: number
}