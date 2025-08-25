# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based drone log analysis and visualization tool focused on processing agricultural drone flight data. The application provides interactive visualization of flight paths, mission statistics, and trichogramma (beneficial insect) density distribution analysis.

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Mantine (components, forms, overlays)
- **Mapping**: Leaflet with React-Leaflet
- **State Management**: Zustand store
- **Canvas**: HTML5 Canvas for high-performance heatmap rendering
- **Icons**: Tabler Icons

## Architecture

### Component Structure
- `App.tsx` - Main application with file upload and layout
- `MainLayout.tsx` - Layout with header and two-panel design
- `MapViewer/` - Interactive map with layers (drop points, waypoints, polygons)
- `ReportPanel/` - Flight statistics and mission summary
- `TrichogrammaCanvas/` - Advanced heatmap visualization component

### Utility Modules (`src/utils/`)
- `thermalColors.ts` - HSL-based thermal color mapping (282-step system)
- `canvasUtils.ts` - Canvas operations, bounds calculation, drawing utilities
- `heatmapUtils.ts` - Gaussian density calculations with async processing
- `fileParser.ts` - JSON log file parsing and validation
- `mapHelpers.ts` - GPS coordinate transformations
- `dateHelpers.ts` - Date/time formatting utilities

## Data Structure

The primary data format is JSON flight logs containing:
- **dropPoints**: Array of GPS coordinates with latitude/longitude, altitude, speed, heading, timestamps
- **waypoints**: Flight path waypoints for navigation visualization  
- **fieldPolygons**: Agricultural field boundary definitions
- **metadata**: appVersion, droneName, fieldName, mission details

## Key Features

### Interactive Map Visualization
- Leaflet-based map with multiple layer types
- Real-time GPS coordinate display on hover
- Configurable layer visibility controls
- Flight path visualization with waypoints

### Advanced Heatmap Generation
- **Gaussian distribution modeling** for trichogramma insect dispersal
- **Async processing** using requestAnimationFrame to prevent UI blocking
- **Customizable parameters**: sigma (spread), max distance, insects per drop, resolution
- **Real-time progress tracking** with loading overlays
- **High-resolution rendering** with 2x canvas scaling
- **Interactive tooltips** showing GPS coordinates and density values

### Performance Optimizations
- **Non-blocking computation**: Heatmap generation yields control to browser via RAF
- **Chunked processing**: Large datasets processed in segments
- **Efficient memory usage**: Float32Array for density maps
- **Canvas optimization**: High-DPI rendering with proper scaling

## Development Guidelines

### Code Organization
- Prefer editing existing files over creating new ones
- Extract reusable utilities to `src/utils/`
- Use TypeScript interfaces for complex data structures
- Follow established component patterns and naming conventions

### Performance Considerations
- Use async processing for CPU-intensive operations
- Implement progress tracking for long-running tasks
- Filter invalid GPS coordinates (0,0 or out-of-bounds values)
- Consider memory usage when processing large datasets

### Testing & Validation
- Run `npm run dev` to start development server
- Check browser console for errors during development
- Test with various log file sizes and coordinate ranges
- Verify heatmap generation doesn't block UI thread

## Common Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production  
npm run preview    # Preview production build
```

## Data Processing Notes

- GPS coordinates are in decimal degrees format
- Timestamps in ISO 8601 format (UTC)
- Invalid coordinates (0,0) are filtered out automatically
- Large files (1MB+) are handled efficiently with streaming patterns
- Gaussian density calculations use real-world meter distances
- Color mapping uses HSL space for smooth thermal transitions (blue→red→white)