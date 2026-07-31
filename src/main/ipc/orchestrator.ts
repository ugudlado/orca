import { ipcMain } from 'electron'
import { orchestratorNotifyServer } from '../orchestrator/notify-server'
import { listOrchestratorWorkflowSchemas } from '../orchestrator/list-workflow-schemas'

export function registerOrchestratorHandlers(): void {
  ipcMain.removeHandler('orchestrator:getNotifyEndpoint')
  ipcMain.handle(
    'orchestrator:getNotifyEndpoint',
    (): Promise<{ port: number; token: string }> => orchestratorNotifyServer.getEndpoint()
  )

  ipcMain.removeHandler('orchestrator:listWorkflowSchemas')
  ipcMain.handle(
    'orchestrator:listWorkflowSchemas',
    async (_event, cwd: string): Promise<string[]> => {
      try {
        return await listOrchestratorWorkflowSchemas(cwd)
      } catch {
        // Why: CLI missing from PATH or config-path/readdir failure — caller falls back to
        // its static default list rather than surfacing an empty dropdown.
        return []
      }
    }
  )
}
