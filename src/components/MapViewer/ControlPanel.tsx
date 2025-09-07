/*
 * Last maintenance check: 2025/09/05 ✅
 * Description: Control panel component for map viewer, including layer controls, time slider, and replay controls.
 */

import { Box, Paper, Tabs, rem } from "@mantine/core";
import { IconStack2, IconClock, IconPlayerPlay } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useMissionStore } from "@/stores/missionStore";
import { LayerControls } from "./LayerControls";
import { TimeSlider } from "./TimeSlider";
import { ReplayControls } from "./ReplayControls";
import { TimeChart } from "./TimeChart";

export function ControlPanel() {
  const { currentMission, isReplaying } = useMissionStore();
  const { t } = useTranslation();

  if (!currentMission) return null;

  const iconStyle = { width: rem(12), height: rem(12) };

  return (
    <Paper shadow="sm">
      <Tabs defaultValue="layers">
        <Tabs.List>
          <Tabs.Tab
            value="layers"
            leftSection={
              <>
                <IconStack2 style={iconStyle} />
                <IconStack2 />
              </>
            }
          >
            {t("map.layers")}
          </Tabs.Tab>
          <Tabs.Tab
            value="time"
            leftSection={<IconClock style={iconStyle} />}
            disabled={isReplaying}
          >
            {t("map.timeFilter")}
          </Tabs.Tab>
          <Tabs.Tab
            value="replay"
            leftSection={<IconPlayerPlay style={iconStyle} />}
          >
            {t("map.replay")}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="layers" p="sm">
          <LayerControls />
        </Tabs.Panel>

        <Tabs.Panel value="time" p="sm">
          <Box mt="md">
            <TimeChart />
          </Box>
          <TimeSlider />
        </Tabs.Panel>

        <Tabs.Panel value="replay" p="sm">
          <ReplayControls />
        </Tabs.Panel>
      </Tabs>
    </Paper>
  );
}
