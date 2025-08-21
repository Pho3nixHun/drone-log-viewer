# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository appears to be a drone log analysis tool focused on processing agricultural drone flight data. The main data consists of JSON flight logs containing GPS coordinates, altitude, speed, and timestamp information from agricultural drone operations.

## Data Structure

The primary data format is JSON containing:
- Flight log data with dropPoints array containing GPS coordinates (latitude/longitude), altitude, speed, heading, and timestamps
- Drone metadata including appVersion, droneName, and fieldName
- Agricultural field operations data (example shows "dombegyhaza bab3 20250625 53ha 9540" indicating field location and area)

## Key Observations

- Repository contains large JSON log files (1.1MB+) with detailed flight telemetry
- Data includes GPS coordinates for agricultural spraying/monitoring operations
- Timestamps indicate flight operations and drop points for agricultural applications
- No traditional source code structure detected - appears to be a data processing/analysis repository
- No package.json, build scripts, or conventional development tools found

## Working with this Repository

Since this appears to be primarily a data repository:
- Use appropriate tools for large JSON file processing when analyzing flight logs  
- Consider using streaming JSON parsers for large files
- GPS coordinates are in decimal degrees format
- Timestamps are in ISO 8601 format (UTC)
- Some entries contain null/zero coordinate values which may need filtering

## Data Analysis Considerations

- Flight logs contain sequential GPS points showing drone path
- Altitude data is available for 3D flight path analysis
- Speed and heading data enables motion analysis
- Large file sizes require efficient parsing strategies