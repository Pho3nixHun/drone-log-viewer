import { Polygon, Popup } from "react-leaflet";
import { useTranslation } from "react-i18next";
import { useMissionStore } from "@/stores/missionStore";
import { parsePolygonString } from "@/utils/mapHelpers";

export function PolygonLayer() {
  const { currentMission, selectedSourceFiles } = useMissionStore();
  const { t } = useTranslation();

  if (!currentMission) return null;

  // Collect polygons from enabled WDM files
  const wdmPolygons: Array<{
    coords: [number, number][];
    filename: string;
    fieldName: string;
    color: string;
  }> = [];

  if (currentMission.missionSettings) {
    currentMission.missionSettings.forEach((settings, index) => {
      const filename = settings.filename || `wdm-${index}`;

      // Only show if this WDM file is enabled
      if (
        selectedSourceFiles.has(filename) &&
        settings.polygon &&
        settings.polygon.length >= 3
      ) {
        // Use different colors for different WDM files
        const hue = (index * 120) % 360; // Spread colors around the color wheel
        wdmPolygons.push({
          coords: settings.polygon,
          filename,
          fieldName: settings.info.name,
          color: `hsl(${hue}, 60%, 50%)`,
        });
      }
    });
  }

  // Fallback to flight log polygon if no WDM polygons are available
  let fallbackPolygon: [number, number][] | null = null;
  if (
    wdmPolygons.length === 0 &&
    currentMission.flightLog.polygon &&
    currentMission.flightLog.polygon !== "-1"
  ) {
    fallbackPolygon = parsePolygonString(currentMission.flightLog.polygon);
  }

  return (
    <>
      {/* Render WDM polygons */}
      {wdmPolygons.map((polygon, index) => (
        <Polygon
          key={`wdm-${index}`}
          positions={polygon.coords}
          pathOptions={{
            color: polygon.color,
            weight: 2,
            opacity: 1,
            fillColor: polygon.color,
            fillOpacity: 0.2,
          }}
        >
          <Popup>
            <div style={{ minWidth: 200 }}>
              <strong>{t("tooltip.fieldBoundary")}</strong>
              <br />
              <strong>{t("tooltip.field")}:</strong> {polygon.fieldName}
              <br />
              <strong>Source:</strong> {polygon.filename}
              <br />
              <strong>{t("tooltip.points")}:</strong> {polygon.coords.length}
            </div>
          </Popup>
        </Polygon>
      ))}

      {/* Render fallback polygon if no WDM polygons */}
      {fallbackPolygon && fallbackPolygon.length >= 3 && (
        <Polygon
          positions={fallbackPolygon}
          pathOptions={{
            color: "#51cf66",
            weight: 2,
            opacity: 1,
            fillColor: "#51cf66",
            fillOpacity: 0.2,
          }}
        >
          <Popup>
            <div style={{ minWidth: 200 }}>
              <strong>{t("tooltip.fieldBoundary")}</strong>
              <br />
              <strong>{t("tooltip.field")}:</strong> {currentMission.fieldName}
              <br />
              <strong>{t("tooltip.points")}:</strong> {fallbackPolygon.length}
            </div>
          </Popup>
        </Polygon>
      )}
    </>
  );
}
