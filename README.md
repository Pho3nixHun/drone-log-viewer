# Drone Log Viewer

A web application for visualizing agricultural drone flight data with interactive maps and comprehensive reporting.

## Features

- **File Upload**: Drag & drop JSON log file upload with validation
- **Interactive Map**: Leaflet-based map with zoom, pan, and layers
- **Layer Toggle**: Switch between drop points, waypoints, and field boundary
- **Flight Path**: Connected waypoint visualization with directional indicators  
- **Mission Report**: Comprehensive flight statistics and metadata
- **Responsive Design**: Works on desktop, tablet, and mobile

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

1. **Upload a drone log file**: Click "Select File" or drag and drop a JSON file
2. **View the map**: Interactive map shows flight data with different layers
3. **Toggle layers**: Use the layer controls to show/hide:
   - Drop Points (blue circles) - Agricultural application points
   - Flight Path (yellow line) - Connected waypoints showing drone route
   - Field Boundary (green polygon) - Field area outline
4. **View report**: Right panel shows mission summary and flight statistics

## Sample Data

A sample log file is available at `/public/sample-log.json` for testing.

## Data Format

The application expects JSON files with the following structure:

```typescript
{
  appVersion: number
  droneName: string
  fieldName: string
  pilotName: string
  uploaded: boolean
  flightLog: {
    dropPoints: Array<{
      latitude: number
      longitude: number
      altitude: number
      date: string
      heading: number
      speed: number
    }>
    waypoints: Array<{
      latitude: number
      longitude: number
      altitude: number
      date: string
      heading: number
      speed: number
    }>
    startDate: string
    endDate: string
    flightDate: string
    polygon: string
    trichogrammaBullets: number
  }
}
```

## Technology Stack

- **React 18** with TypeScript
- **Mantine** for UI components
- **Leaflet** & **React-Leaflet** for mapping
- **Zustand** for state management
- **Vite** for build tooling

## Architecture

The project is structured as follows:

```
src/
├── components/
│   ├── FileUploader/     # File upload component
│   ├── MapViewer/        # Map and layer components
│   ├── ReportPanel/      # Statistics and summary components
│   └── Layout/           # App layout components
├── stores/               # Zustand stores
├── types/                # TypeScript type definitions
├── utils/                # Helper utilities
└── App.tsx              # Main application component
```

## Development Notes

This application implements a complete drone log visualization solution with:
- Type-safe data parsing and validation
- Interactive mapping with Leaflet
- Responsive design with Mantine UI
- Efficient state management with Zustand
- Modular component architecture
