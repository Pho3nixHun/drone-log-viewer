# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a sophisticated React-based agricultural drone log analysis and visualization platform. The application provides advanced interactive visualization of flight paths, mission statistics, trichogramma (beneficial insect) density distribution analysis, and multi-WDM mission file support with computational geometry features.

**Current Status (September 2025)**: The application has 38 TypeScript files with a mature architecture featuring WebGPU acceleration, comprehensive internationalization, and professional A4-formatted report generation.

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Mantine (components, forms, overlays, modals)
- **Mapping**: Leaflet with React-Leaflet
- **State Management**: Zustand store with advanced features
- **Canvas**: HTML5 Canvas for high-performance heatmap rendering
- **GPU Acceleration**: WebGPU with CPU fallback
- **Icons**: Tabler Icons
- **Internationalization**: i18next (English/Hungarian)
- **GIS Export**: Shapefile generation with JSZip
- **Geospatial Library**: Turf.js for professional computational geometry

## Architecture

### Component Structure

**Layout Components:**

- `App.tsx` - Main application with file upload and A4-formatted layout
- `MainLayout.tsx` - AppShell layout with dynamic header height
- `Header.tsx` - Application header

**MapViewer Module (Advanced Multi-Layer System):**

- `MapViewer.tsx` - Main Leaflet map container with dynamic layer rendering
- `MapControlsSidebar.tsx` - **Primary** tabbed control interface (Layers, Time, Replay)
- `ControlPanel.tsx` - ⚠️ **DUPLICATE** of MapControlsSidebar (needs removal)
- `LayerControls.tsx` - **LARGE COMPONENT** (484 lines) - layer management with source file controls
- `HeatmapDialog.tsx` - **LARGE COMPONENT** (439 lines) - heatmap generation with GPU acceleration
- `HeatmapLayer.tsx` - Leaflet overlay for heatmap visualization
- `DropPointsLayer.tsx` - Drop point visualization layer
- `WaypointsLayer.tsx` - Flight path waypoint visualization
- `PolygonLayer.tsx` - Individual field boundary polygons
- `PolygonUnionLayer.tsx` - **Multi-WDM polygon union with computational geometry**
- `MissionWaypointsLayer.tsx` - Mission waypoints from WDM files
- `ReplayControls.tsx` - Temporal playback controls
- `TimeChart.tsx` - Time-based data visualization
- `TimeSlider.tsx` - Time range selection interface

**ReportPanel Module:**

- `ReportPanel.tsx` - Wrapper component for mission reports (underutilized in App.tsx)
- `MissionParameters.tsx` - Mission parameter display
- `MissionSummary.tsx` - Statistical summary generation
- `FlightStats.tsx` - Flight performance analytics

**FileUploader Module:**

- `FileUploader.tsx` - **Multi-directory browsing with hybrid JSON+WDM support**

### Advanced Utility Modules (`src/utils/`)

**Core Processing (High Complexity):**

- `heatmapUtils.ts` (653 lines) - **Three distribution methods**: Gaussian, Lévy flight, Exponential with WebGPU acceleration
- `shapefileExport.ts` (673 lines) - Professional GIS export respecting map settings
- `fileParser.ts` (630 lines) - Multi-file JSON+WDM parsing with timestamp interpolation
- `polygonUtils.ts` (209 lines) - **Turf.js-powered computational geometry** for polygon operations
- `webgpuUtils.ts` (235 lines) - **GPU acceleration with automatic fallback detection**

**Supporting Utilities:**

- `mapHelpers.ts` (156 lines) - **Turf.js-enhanced** GPS coordinate transformations and bounds calculation
- `canvasUtils.ts` - Canvas operations with high-DPI rendering
- `thermalColors.ts` - HSL-based thermal color mapping (282-step system)
- `colorUtils.ts` - Color manipulation utilities
- `dateHelpers.ts` - Date/time formatting utilities

### State Management (`src/stores/`)

**Single Zustand Store**: `missionStore.ts` with advanced features:

- **Multi-file mission support** with individual source file tracking
- **WDM (mission settings) integration** with polygon union calculations
- **Dynamic heatmap layer management** with parameters and removal
- **Temporal replay system** with speed control and time bounds
- **Layer visibility state** including dynamic heatmap layers
- **Source file filtering and removal** for JSON logs and WDM files
- **Map view state** with tile layer switching (OSM/Satellite)
- **Dialog state management** (heatmap dialog opened/closed)
- **Comprehensive error handling** and loading states

## Data Structure

### Primary Data Formats:

- **JSON Flight Logs**: GPS coordinates (lat/lng), altitude, speed, heading, timestamps
- **WDM Mission Files**: Mission waypoints, field boundaries, operational parameters
- **Multi-file Missions**: Automatic merging with source file tracking

### Advanced Data Processing:

- **Timestamp interpolation** for missing/invalid timestamps
- **GPS coordinate validation** with (0,0) filtering
- **Multi-WDM polygon union** calculations using Turf.js computational geometry
- **Real-world distance calculations** for density mapping with geodetic accuracy
- **Professional polygon operations**: containment, intersection, area calculation, convex hulls

## Key Features

### Advanced Heatmap Generation System

- **Three Mathematical Models**:
  - Gaussian distribution (traditional dispersal)
  - Lévy flight (complex foraging patterns)
  - Exponential decay (simple distance-based)
- **WebGPU Acceleration** with automatic CPU fallback
- **Real-time Parameter Adjustment** with research-based defaults
- **Interactive Map Integration** with removable layer management
- **Progress Tracking** with non-blocking UI updates
- **Multiple Simultaneous Heatmaps** with individual controls

### Multi-WDM Mission Support

- **Turf.js Polygon Union Calculations** for overlapping field boundaries with geodetic precision
- **Individual WDM File Management** with removal capability
- **Mission Waypoint Visualization** from WDM data
- **Professional Computational Geometry** using industry-standard Turf.js library

### Interactive Visualization

- **Temporal Replay System** with variable speed control
- **Multi-layer Map Visualization** with individual layer toggles
- **Real-time Coordinate Display** on hover interactions
- **Time-based Filtering** and data visualization
- **Professional Shapefile Export** respecting current map settings

### File Management

- **Multi-directory File Browsing** capability
- **Hybrid JSON Log + WDM File** processing
- **Source File Filtering and Removal** without data loss
- **Drag-and-drop Interface** with validation

## Development Guidelines

### Code Organization

- **Modular Component Design** with clear separation of concerns
- **Advanced TypeScript Usage** with comprehensive interfaces
- **Utility Function Extraction** for reusable logic
- **State Management Centralization** via Zustand store
- **Performance-First Architecture** with GPU acceleration

### Performance Considerations

- **WebGPU Integration** for computational tasks
- **Async Processing** with requestAnimationFrame yielding
- **Memory Efficiency** with Float32Array for large datasets
- **Non-blocking UI Updates** during intensive calculations
- **Chunked Data Processing** for large file handling

### Current Architecture Status (Updated September 2025)

**Core Architecture (Stable):**

- Multi-WDM support with polygon union calculations ✅
- WebGPU-accelerated heatmap generation ✅
- Advanced mathematical distribution models (Gaussian, Lévy flight, Exponential) ✅
- Internationalization infrastructure (English/Hungarian) ✅
- Professional GIS export capabilities ✅
- Temporal replay and filtering system ✅
- A4-formatted report generation with professional layout ✅

**Recent Architectural Improvements (September 2025):**

- Consolidated to single MapControlsSidebar (ControlPanel.tsx removed)
- **Turf.js Integration**: Professional geospatial library implementation
- Enhanced component structure analysis and maintainability tracking
- Improved state management with comprehensive Zustand store
- **36% Code Reduction**: Significant simplification in geospatial utilities
- **Type-Safe Polygon Operations**: Industry-standard computational geometry

**Component Relationship:**

- `HeatmapDialog` is accessed via `LayerControls` "Generate Heatmap" button
- Generated heatmaps automatically become removable map layers
- Dialog uses global state management via Zustand store
- Modal positioning handled by Mantine Modal with proper z-index

## Current Implementation Notes

### Heatmap Dialog Implementation

- **Primary Location**: `src/components/MapViewer/HeatmapDialog.tsx`
- **Access Method**: Button in LayerControls component
- **State Management**: Global Zustand store with `heatmapDialogOpened` state
- **Modal Framework**: Mantine Modal with proper z-index and positioning

### Recent Maintainability Improvements (Completed)

**Component Refactoring (September 2025):**

- ✅ **RESOLVED**: TrichrogrammaCanvas directory removed (was legacy code)
- ✅ **COMPLETED**: Duplicate ControlPanel.tsx removed - MapControlsSidebar.tsx is now the single control interface
- ✅ **COMPLETED**: App.tsx refactored to use ReportPanel wrapper component
- ✅ **COMPLETED**: LayerControls.tsx (was 484 lines) split into focused sub-components:
  - `TileLayerControls.tsx` - Map/satellite layer switching
  - `LayerToggleSection.tsx` - Data layer visibility switches
  - `HeatmapControls.tsx` - Heatmap layer management
  - `SourceFileControls.tsx` - File management and filtering
  - `ExportControls.tsx` - Shapefile export functionality
  - `MapLegend.tsx` - Visual legend display
- ✅ **COMPLETED**: HeatmapDialog.tsx (was 439 lines) split into focused sub-components:
  - `DistributionSelector.tsx` - Mathematical distribution method selection
  - `HeatmapParameterForm.tsx` - Parameter input forms
  - `GPUAccelerationToggle.tsx` - WebGPU control toggle

**Turf.js Integration (September 2025):**

- ✅ **COMPLETED**: polygonUtils.ts completely rewritten with Turf.js (327→209 lines, 36% reduction)
- ✅ **COMPLETED**: mapHelpers.ts enhanced with Turf.js convex hull and buffer operations (230→156 lines, 32% reduction)
- ✅ **COMPLETED**: shapefileExport.ts updated to use Turf.js centroid calculations
- ✅ **COMPLETED**: All TypeScript compilation errors resolved with proper type handling
- ✅ **COMPLETED**: Professional geometric operations: polygon union, area calculation, containment, intersection
- ✅ **COMPLETED**: Geodetic accuracy for all spatial calculations

### Architectural Benefits Achieved

**Component Structure Benefits:**

- **Improved Maintainability**: Components now follow single responsibility principle
- **Enhanced Testability**: Smaller, focused components are easier to unit test
- **Better Code Reusability**: Sub-components can be reused across different contexts
- **Reduced Cognitive Load**: Each component has a clear, focused purpose
- **Easier Debugging**: Issues can be isolated to specific functional areas
- **Consistent Architecture**: All components follow similar patterns and conventions

**Turf.js Integration Benefits:**

- **Professional Standards**: Using industry-standard geospatial library
- **Reduced Code Complexity**: 36% reduction in geospatial utility code
- **Enhanced Accuracy**: Geodetic calculations with proper coordinate system handling
- **Better Type Safety**: Leveraging well-typed Turf.js interfaces
- **Improved Performance**: Optimized algorithms for polygon operations
- **Easier Maintenance**: Less custom geometry code to maintain
- **Future-Proof**: Built on actively maintained, widely-adopted library

### Testing & Validation

- Run `npm run dev` for development server
- Run `npm run build` to check TypeScript compilation
- Test with various log file sizes and coordinate ranges
- Verify WebGPU acceleration on capable devices
- Test multi-WDM polygon union calculations

## Common Commands

```bash
npm run dev        # Start development server (with HMR)
npm run build      # Build for production with TypeScript checking
npm run preview    # Preview production build
npm run lint       # Run ESLint checks
```

## Data Processing Features

- **GPS Coordinate Processing**: Decimal degrees with validation
- **Timestamp Handling**: ISO 8601 with interpolation fallback
- **Multi-file Merging**: Automatic with source file tracking
- **Large File Support**: Streaming patterns with progress feedback
- **Mathematical Modeling**: Research-based distribution calculations
- **Color Mapping**: HSL space for smooth thermal transitions
- **GIS Integration**: Professional shapefile export with metadata

## Advanced Capabilities

- **Professional Computational Geometry**: Turf.js-powered polygon operations for complex field boundaries
- **GPU Computing**: WebGPU shaders for mathematical modeling
- **Temporal Analysis**: Time-based data filtering and replay
- **Multi-language Support**: Internationalization with professional translations
- **Professional Export**: GIS-compatible data formats with geodetic accuracy
- **Research-grade Analysis**: Multiple mathematical models for insect dispersal
- **Industry-Standard Geospatial Operations**: Built on widely-adopted Turf.js library

This platform represents a sophisticated agricultural technology solution with advanced computational capabilities for precision agriculture applications.
