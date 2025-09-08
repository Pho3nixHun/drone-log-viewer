import { Stack, Switch, Text, Group, Badge, Button } from "@mantine/core";
import { IconFile, IconSettings, IconTrash, IconPlus } from "@tabler/icons-react";
import { useMissionStore } from "@/stores/missionStore";
import { useRef } from "react";

export function SourceFileControls() {
  const {
    currentMission,
    selectedSourceFiles,
    toggleSourceFile,
    removeSourceFile,
    appendMissionLogs,
    appendMissionSettings,
  } = useMissionStore();

  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const wdmFileInputRef = useRef<HTMLInputElement>(null);

  const handleAddJsonFiles = () => {
    jsonFileInputRef.current?.click();
  };

  const handleAddWdmFiles = () => {
    wdmFileInputRef.current?.click();
  };

  const handleJsonFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      await appendMissionLogs(Array.from(files));
      // Reset the input to allow selecting the same file again
      event.target.value = '';
    }
  };

  const handleWdmFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      await appendMissionSettings(Array.from(files));
      // Reset the input to allow selecting the same file again
      event.target.value = '';
    }
  };

  if (!currentMission?.sourceFiles || currentMission.sourceFiles.length < 1) {
    return null;
  }

  const { dropPoints, waypoints } = currentMission.flightLog;

  // Only prevent deletion if it's the last JSON file (WDM files can always be removed)
  const isLastJsonFile = currentMission.sourceFiles.length === 1;

  return (
    <Stack gap="xs">
      {/* Hidden file inputs */}
      <input
        ref={jsonFileInputRef}
        type="file"
        accept=".json"
        multiple
        style={{ display: 'none' }}
        onChange={handleJsonFileChange}
      />
      <input
        ref={wdmFileInputRef}
        type="file"
        accept=".wdm"
        multiple
        style={{ display: 'none' }}
        onChange={handleWdmFileChange}
      />

      {/* JSON Log Files Section */}
      <Group justify="space-between" align="center">
        <Text size="sm" fw={600} c="dimmed">
          Flight Logs ({currentMission.sourceFiles.length})
        </Text>
        <Button
          size="xs"
          variant="subtle"
          leftSection={<IconPlus size={12} />}
          onClick={handleAddJsonFiles}
          color="blue"
        >
          Add Logs
        </Button>
      </Group>

      {currentMission.sourceFiles.map((sourceFile, index) => {
        const dropCount = dropPoints.filter(
          (p) => p.sourceFile === sourceFile
        ).length;
        const waypointCount = waypoints.filter(
          (p) => p.sourceFile === sourceFile
        ).length;
        const totalCount = dropCount + waypointCount;

        return (
          <Group key={sourceFile} justify="space-between" wrap="nowrap">
            <Group gap="xs" style={{ flex: 1 }} wrap="nowrap">
              <IconFile
                size={16}
                color={`hsl(${(index * 45) % 360}, 70%, 50%)`}
              />
              <Text size="xs" style={{ flex: 1, minWidth: 0 }}>
                {sourceFile.replace(".json", "")}
              </Text>
              <Badge size="xs" variant="light" color="gray">
                {totalCount}
              </Badge>
              {!isLastJsonFile && (
                <Button
                  size="xs"
                  variant="subtle"
                  color="red"
                  onClick={() => removeSourceFile(sourceFile)}
                  p={2}
                  title={`Remove ${sourceFile}`}
                >
                  <IconTrash size={10} />
                </Button>
              )}
            </Group>
            <Switch
              size="sm"
              checked={selectedSourceFiles.has(sourceFile)}
              onChange={() => toggleSourceFile(sourceFile)}
            />
          </Group>
        );
      })}

      {/* WDM Mission Files Section */}
      <Group justify="space-between" align="center">
        <Text size="sm" fw={600} c="dimmed">
          Mission Settings ({currentMission.missionSettings?.length || 0})
        </Text>
        <Button
          size="xs"
          variant="subtle"
          leftSection={<IconPlus size={12} />}
          onClick={handleAddWdmFiles}
          color="green"
        >
          Add WDM
        </Button>
      </Group>

      {currentMission.missionSettings?.map((settings, index) => {
        const sourceFileKey = settings.filename || `wdm-${index}`;
        return (
          <Group key={sourceFileKey} justify="space-between" wrap="nowrap">
            <Group gap="xs" style={{ flex: 1 }} wrap="nowrap">
              <IconSettings size={16} color="var(--mantine-color-green-6)" />
              <Text size="xs" style={{ flex: 1, minWidth: 0 }}>
                {settings.filename
                  ? settings.filename.replace(".wdm", "")
                  : `Mission ${index + 1}`}
              </Text>
              <Badge size="xs" variant="light" color="green">
                WDM
              </Badge>
              <Button
                size="xs"
                variant="subtle"
                color="red"
                onClick={() => removeSourceFile(sourceFileKey)}
                p={2}
                title={`Remove ${sourceFileKey}`}
              >
                <IconTrash size={10} />
              </Button>
            </Group>
            <Switch
              size="sm"
              checked={selectedSourceFiles.has(sourceFileKey)}
              onChange={() => toggleSourceFile(sourceFileKey)}
            />
          </Group>
        );
      })}
    </Stack>
  );
}
