import { ipcMain } from 'electron'
import { connect, disconnect, getStatus } from '../backlog/client'
import {
  ensureAgent,
  ensureProjectAgentToken,
  revokeProjectAgentToken
} from '../backlog/agent-tokens'
import {
  getTask,
  listProjectAssignables,
  listProjectStatuses,
  listProjects,
  listTasks,
  updateTask
} from '../backlog/tasks'
import { listTaskComments } from '../backlog/backlog-task-comments'
import { _resetPreflightCache } from './preflight'
import type {
  BacklogConnectArgs,
  BacklogTaskFilter,
  BacklogTaskUpdate
} from '../../shared/backlog-types'

function normalizeProjectId(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function normalizeTaskFilter(value: unknown): BacklogTaskFilter | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const input = value as BacklogTaskFilter
  const filter: BacklogTaskFilter = {}
  if (typeof input.status === 'string' && input.status.trim()) {
    filter.status = input.status.trim()
  }
  if (typeof input.assignee === 'string' && input.assignee.trim()) {
    filter.assignee = input.assignee.trim()
  }
  return Object.keys(filter).length > 0 ? filter : undefined
}

function normalizeTaskUpdate(value: unknown): BacklogTaskUpdate | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const input = value as BacklogTaskUpdate
  if (input.title !== undefined && typeof input.title !== 'string') {
    return null
  }
  if (input.description !== undefined && typeof input.description !== 'string') {
    return null
  }
  if (input.status !== undefined && typeof input.status !== 'string') {
    return null
  }
  if (
    input.assignee !== undefined &&
    input.assignee !== null &&
    typeof input.assignee !== 'string'
  ) {
    return null
  }
  if (input.dueDate !== undefined && input.dueDate !== null && typeof input.dueDate !== 'string') {
    return null
  }
  return input
}

const BACKLOG_IPC_CHANNELS = [
  'backlog:status',
  'backlog:connect',
  'backlog:disconnect',
  'backlog:listProjects',
  'backlog:listTasks',
  'backlog:getTask',
  'backlog:listProjectAssignables',
  'backlog:listProjectStatuses',
  'backlog:updateTask',
  'backlog:listTaskComments',
  'backlog:ensureProjectAgentToken',
  'backlog:revokeProjectAgentToken'
] as const

function removeBacklogHandlers(): void {
  for (const channel of BACKLOG_IPC_CHANNELS) {
    ipcMain.removeHandler(channel)
  }
}

export function registerBacklogHandlers(): void {
  // Why: dev main reload and late-added channels must not leave stale ipcMain state.
  removeBacklogHandlers()

  ipcMain.handle('backlog:status', async () => getStatus())

  ipcMain.handle('backlog:connect', async (_event, args: BacklogConnectArgs) => {
    if (typeof args?.serverUrl !== 'string' || typeof args?.token !== 'string') {
      return { ok: false, error: 'Server URL and token are required.' }
    }
    const result = await connect({
      serverUrl: args.serverUrl,
      token: args.token
    })
    if (result.ok) {
      _resetPreflightCache()
    }
    return result
  })

  ipcMain.handle('backlog:disconnect', async () => {
    disconnect()
    _resetPreflightCache()
  })

  ipcMain.handle('backlog:listProjects', async () => listProjects())

  ipcMain.handle(
    'backlog:listTasks',
    async (_event, args: { projectId: string; filter?: BacklogTaskFilter }) => {
      const projectId = normalizeProjectId(args?.projectId)
      if (!projectId) {
        return []
      }
      return listTasks(projectId, normalizeTaskFilter(args?.filter))
    }
  )

  ipcMain.handle('backlog:getTask', async (_event, args: { projectId: string; taskId: string }) => {
    const projectId = normalizeProjectId(args?.projectId)
    const taskId = normalizeProjectId(args?.taskId)
    if (!projectId || !taskId) {
      return null
    }
    return getTask(projectId, taskId)
  })

  ipcMain.handle('backlog:listProjectAssignables', async (_event, args: { projectId: string }) => {
    const projectId = normalizeProjectId(args?.projectId)
    if (!projectId) {
      return []
    }
    return listProjectAssignables(projectId)
  })

  ipcMain.handle('backlog:listProjectStatuses', async (_event, args: { projectId: string }) => {
    const projectId = normalizeProjectId(args?.projectId)
    if (!projectId) {
      return []
    }
    return listProjectStatuses(projectId)
  })

  ipcMain.handle(
    'backlog:updateTask',
    async (_event, args: { projectId: string; taskId: string; updates: BacklogTaskUpdate }) => {
      const projectId = normalizeProjectId(args?.projectId)
      const taskId = normalizeProjectId(args?.taskId)
      const updates = normalizeTaskUpdate(args?.updates)
      if (!projectId || !taskId || !updates) {
        return { ok: false, error: 'Project, task, and updates are required.' }
      }
      return updateTask(projectId, taskId, updates)
    }
  )

  ipcMain.handle(
    'backlog:listTaskComments',
    async (_event, args: { projectId: string; taskId: string }) => {
      const projectId = normalizeProjectId(args?.projectId)
      const taskId = normalizeProjectId(args?.taskId)
      if (!projectId || !taskId) {
        return []
      }
      return listTaskComments(projectId, taskId)
    }
  )

  ipcMain.handle(
    'backlog:ensureProjectAgentToken',
    async (_event, args: { projectId: string; agentName: string; agentId?: string | null }) => {
      const projectId = normalizeProjectId(args?.projectId)
      const agentName = typeof args?.agentName === 'string' ? args.agentName.trim() : ''
      if (!projectId || !agentName) {
        return { ok: false, error: 'Project and agent name are required.' }
      }
      try {
        const agentId = await ensureAgent(agentName, args?.agentId)
        const minted = await ensureProjectAgentToken({ agentId, projectId })
        return {
          ok: true as const,
          agentId,
          hashPrefix: minted.hashPrefix,
          // Why: session env injection needs the pinned token once at launch;
          // the user credential never leaves main.
          token: minted.token
        }
      } catch (error) {
        return {
          ok: false as const,
          error: error instanceof Error ? error.message : 'Failed to ensure project agent token.'
        }
      }
    }
  )

  ipcMain.handle(
    'backlog:revokeProjectAgentToken',
    async (_event, args: { projectId: string; agentId: string; hashPrefix: string }) => {
      const projectId = normalizeProjectId(args?.projectId)
      const agentId = normalizeProjectId(args?.agentId)
      const hashPrefix = typeof args?.hashPrefix === 'string' ? args.hashPrefix.trim() : ''
      if (!projectId || !agentId) {
        return { ok: false, error: 'Project and agent id are required.' }
      }
      await revokeProjectAgentToken({ agentId, projectId, hashPrefix })
      return { ok: true }
    }
  )
}
