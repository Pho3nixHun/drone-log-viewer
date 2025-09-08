import { Button, Text } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMissionStore } from "@/stores/missionStore";
import { exportToShapefile } from "@/utils/shapefileExport";

export function ExportControls() {
  const { currentMission, selectedLayers, selectedSourceFiles } = useMissionStore();
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const handleExport = async () => {
    if (!currentMission) return;

    try {
      setIsExporting(true);
      await exportToShapefile(
        currentMission,
        selectedLayers,
        selectedSourceFiles,
      );
      setExportMessage(t("export.success"));
    } catch (error) {
      console.error("Export error:", error);
      setExportMessage(t("export.error"));
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportMessage(null), 3000);
    }
  };

  return (
    <>
      <Button
        size="xs"
        variant="light"
        leftSection={<IconDownload size={14} />}
        onClick={handleExport}
        loading={isExporting}
        fullWidth
      >
        {isExporting ? t("export.exporting") : t("export.shapefile")}
      </Button>

      {exportMessage && (
        <Text
          size="xs"
          c={exportMessage.includes("success") ? "green" : "red"}
          ta="center"
        >
          {exportMessage}
        </Text>
      )}
    </>
  );
}