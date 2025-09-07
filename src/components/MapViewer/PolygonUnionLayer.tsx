import { Polygon, Popup } from "react-leaflet";
import { useMissionStore } from "@/stores/missionStore";
import {
  calculatePolygonUnion,
  calculatePolygonArea,
  squareDegreesToHectares,
} from "@/utils/polygonUtils";

export function PolygonUnionLayer() {
  const { currentMission, selectedLayers, selectedSourceFiles } =
    useMissionStore();

  if (!currentMission?.missionSettings || !selectedLayers.has("polygonUnion"))
    return null;

  // Collect polygons from enabled WDM files
  const enabledPolygons: [number, number][][] = [];

  currentMission.missionSettings.forEach((settings, index) => {
    const filename = settings.filename || `wdm-${index}`;

    // Only include polygons from enabled WDM files
    if (
      selectedSourceFiles.has(filename) &&
      settings.polygon &&
      settings.polygon.length >= 3
    ) {
      enabledPolygons.push(settings.polygon);
    }
  });

  if (enabledPolygons.length === 0) return null;

  // Calculate the union polygon
  const unionPolygon = calculatePolygonUnion(enabledPolygons);
  const unionArea = calculatePolygonArea(unionPolygon);
  const avgLatitude =
    unionPolygon.reduce((sum, coord) => sum + coord[0], 0) /
    unionPolygon.length;
  const areaHectares = squareDegreesToHectares(unionArea, avgLatitude);

  return (
    <Polygon
      positions={unionPolygon}
      pathOptions={{
        color: "#ff6b35",
        weight: 3,
        opacity: 0.8,
        fillColor: "#ff6b35",
        fillOpacity: 0.15,
        dashArray: "15, 10", // Dashed outline to distinguish from individual polygons
      }}
    >
      <Popup>
        <div style={{ minWidth: 180 }}>
          <strong>Combined Field Area</strong>
          <br />
          <strong>Total Area:</strong> {areaHectares.toFixed(2)} hectares
          <br />
          <strong>Source fields:</strong> {enabledPolygons.length}
          <br />
          <em>Union of all field polygons with overlaps merged</em>
        </div>
      </Popup>
    </Polygon>
  );
}
