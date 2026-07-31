import { ipcMain } from 'electron'
import { orchestratorNotifyServer } from '../orchestrator/notify-server'

export function registerOrchestratorHandlers(): void {
  ipcMain.removeHandler('orchestrator:getNotifyEndpoint')
  ipcMain.handle(
    'orchestrator:getNotifyEndpoint',
    (): Promise<{ port: number; token: string }> => orchestratorNotifyServer.getEndpoint()
  )
}
