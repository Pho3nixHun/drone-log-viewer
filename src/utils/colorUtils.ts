// Generate distinct colors for different source files
export function getSourceFileColor(
  sourceIndex: number,
  type: "drop" | "waypoint",
): string {
  // Base colors for drop points (reds) and waypoints (yellows)
  const dropColors = [
    "#ff4757", // Red
    "#ff3742", // Slightly darker red
    "#ff6b7a", // Lighter red
    "#ff5722", // Orange-red
    "#e53e3e", // Dark red
    "#f56565", // Light red
    "#fc8181", // Very light red
    "#e53e3e", // Another dark red
  ];

  const waypointColors = [
    "#ffd700", // Gold
    "#ffcc00", // Darker gold
    "#ffe066", // Light gold
    "#ffa500", // Orange
    "#ffb347", // Light orange
    "#ffd966", // Pale gold
    "#ffe599", // Very light gold
    "#ffad33", // Orange-yellow
  ];

  const colors = type === "drop" ? dropColors : waypointColors;
  return colors[sourceIndex % colors.length];
}

// Generate tooltip background color based on source file
export function getTooltipColor(sourceIndex: number): string {
  const colors = [
    "#f8f9fa", // Light gray
    "#e3f2fd", // Light blue
    "#f3e5f5", // Light purple
    "#e8f5e8", // Light green
    "#fff3e0", // Light orange
    "#fce4ec", // Light pink
    "#e0f2f1", // Light teal
    "#f1f8e9", // Light lime
  ];

  return colors[sourceIndex % colors.length];
}
