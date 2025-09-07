# Drone Log Visualization Web App - Implementation Plan

## Project Overview

Build a web application that allows users to upload drone log JSON files and visualize flight data on an interactive map with detailed reporting capabilities.

## Data Structure (Based on types.ts)

```typescript
MissionLog {
  appVersion: number
  droneName: string
  fieldName: string
  flightLog: FlightLog
  pilotName: string
  uploaded: boolean
}

FlightLog {
  dropPoints: DropPoint[]      // Agricultural drop points
  endDate: string             // Mission end timestamp
  flightDate: string          // Flight date
  homepoint: Homepoint        // Take-off/landing location
  pilotName: string           // Pilot identifier
  polygon: string             // Field boundary data
  startDate: string           // Mission start timestamp
  trichogrammaBullets: number // Bullet count for biocontrol
  waypoints: Waypoint[]       // Flight path points
}
```

## Technology Stack

### Frontend Framework: **React 18 + TypeScript + Vite**

- **Why**: Fast development, excellent TypeScript support, modern tooling
- **Alternative considered**: Next.js (overkill for this single-page app)

### Mapping Library: **Leaflet + React-Leaflet**

- **Why**: Lightweight, excellent plugin ecosystem, works well with multiple tile providers
- **Plugins**:
  - `leaflet-draw` for polygon display
  - `leaflet-polyline-decorator` for directional arrows on waypoint paths
- **Alternative considered**: Mapbox GL (requires API key, more complex for this use case)

### State Management: **Zustand**

- **Why**: Simple, TypeScript-friendly, minimal boilerplate
- **Alternative considered**: Redux Toolkit (too heavy for this project)

### UI Components: **Mantine**

- **Why**: Modern design, excellent TypeScript support, comprehensive component set
- **Components needed**: FileButton, Table, Card, Group, Stack, Badge, Button, Tabs

### File Handling: **Native File API**

- **Why**: Built-in browser support, no external dependencies needed

### Styling: **Mantine CSS + CSS Modules**

- **Why**: Scoped styles, excellent integration with Mantine

### Build Tool: **Vite**

- **Why**: Fast HMR, excellent TypeScript support, modern build tooling

## Application Architecture

### Component Structure

```
src/
├── components/
│   ├── FileUploader/
│   │   └── FileUploader.tsx
│   ├── ReportPanel/
│   │   ├── ReportPanel.tsx
│   │   ├── MissionSummary.tsx
│   │   └── FlightStats.tsx
│   ├── MapViewer/
│   │   ├── MapViewer.tsx
│   │   ├── LayerControls.tsx
│   │   ├── DropPointsLayer.tsx
│   │   ├── WaypointsLayer.tsx
│   │   └── PolygonLayer.tsx
│   └── Layout/
│       ├── Header.tsx
│       └── MainLayout.tsx
├── stores/
│   └── missionStore.ts
├── types/
│   └── mission.ts
├── utils/
│   ├── fileParser.ts
│   ├── mapHelpers.ts
│   └── dateHelpers.ts
└── App.tsx
```

### State Management Structure

```typescript
interface MissionStore {
  // Data
  currentMission: MissionLog | null;

  // UI State
  selectedLayers: Set<"dropPoints" | "waypoints" | "polygon">;
  mapCenter: [number, number];
  mapZoom: number;

  // Actions
  loadMission: (file: File) => Promise<void>;
  toggleLayer: (layer: string) => void;
  setMapView: (center: [number, number], zoom: number) => void;
  reset: () => void;
}
```

## Implementation Plan

### Phase 1: Project Setup & Basic Structure

1. **Initialize Vite React TypeScript project**

   ```bash
   npm create vite@latest drone-log-viewer -- --template react-ts
   ```

2. **Install dependencies**

   ```bash
   npm install @mantine/core @mantine/hooks @mantine/dates
   npm install leaflet react-leaflet
   npm install zustand
   npm install @types/leaflet
   ```

3. **Setup project structure** - Create folder hierarchy and basic components

4. **Configure TypeScript** - Copy existing types.ts and extend as needed

### Phase 2: File Upload & Data Processing

1. **Create FileUploader component**
   - Drag & drop interface using Mantine FileButton
   - JSON validation against MissionLog schema
   - Error handling for malformed files

2. **Implement file parser utility**
   - Parse JSON and validate structure
   - Handle missing or invalid fields gracefully
   - Calculate derived data (flight duration = endDate - startDate)

3. **Setup Zustand store**
   - Mission data management
   - Loading states
   - Error states

### Phase 3: Map Implementation

1. **MapViewer base component**
   - Leaflet map initialization
   - Responsive container
   - Default tile layer (OpenStreetMap)

2. **DropPointsLayer component**
   - Render drop points as circular markers
   - Color-code by altitude or timestamp
   - Click for point details popup

3. **WaypointsLayer component**
   - Render waypoints as connected polyline
   - Yellow line connecting waypoints in sequence
   - Directional arrows showing flight path
   - Different marker style from drop points

4. **PolygonLayer component**
   - Parse and render field boundary polygon
   - Semi-transparent fill with distinct border

5. **LayerControls component**
   - Toggle switches for each layer
   - Legend showing marker meanings

### Phase 4: Report Panel

1. **MissionSummary component**
   - Display: droneName, fieldName, appVersion, pilotName
   - Date range: flightDate, startDate, endDate, calculated duration
   - Mission stats: trichogrammaBullets count

2. **FlightStats component**
   - Drop points count and statistics
   - Waypoints count and path length
   - Flight area coverage
   - Min/max/average altitude

### Phase 5: UI/UX Polish

1. **Responsive design** - Mobile-friendly layout
2. **Loading states** - Skeleton loaders during file processing
3. **Error handling** - User-friendly error messages
4. **Data export** - Allow downloading processed data as CSV/GeoJSON
5. **Map controls** - Zoom to fit data, reset view, fullscreen mode

## File Structure

```
drone-log-viewer/
├── public/
├── src/
│   ├── components/
│   ├── stores/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   ├── main.tsx
│   └── App.css
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## Development Timeline

- **Phase 1**: 1 day (setup)
- **Phase 2**: 2 days (file handling)
- **Phase 3**: 3 days (mapping)
- **Phase 4**: 2 days (reporting)
- **Phase 5**: 2 days (polish)

**Total: ~10 days**

## Key Features Summary

✅ **File Upload**: Drag & drop JSON file upload with validation  
✅ **Interactive Map**: Leaflet-based map with zoom, pan, layers  
✅ **Layer Toggle**: Switch between drop points, waypoints, field boundary  
✅ **Flight Path**: Connected waypoint visualization with directional indicators  
✅ **Mission Report**: Comprehensive flight statistics and metadata  
✅ **Responsive Design**: Works on desktop, tablet, and mobile  
✅ **Error Handling**: Graceful handling of invalid files and missing data

## Technical Decisions Rationale

**React + TypeScript**: Ensures type safety for complex drone data structures  
**Leaflet over Mapbox**: No API key required, lightweight, extensive plugin ecosystem  
**Mantine over Material-UI**: Modern design, excellent TypeScript support, less opinionated  
**Zustand over Redux**: Simpler state management, perfect for single-page app scope  
**Vite over Create React App**: Faster builds, modern tooling, better dev experience
