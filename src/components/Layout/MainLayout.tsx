import { AppShell } from '@mantine/core'
import { Header } from './Header'
import { useMissionStore } from '../../stores/missionStore'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { currentMission } = useMissionStore()
  
  return (
    <AppShell header={{ height: currentMission ? 60 : 80 }}>
      <AppShell.Header>
        <Header />
      </AppShell.Header>
      
      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  )
}