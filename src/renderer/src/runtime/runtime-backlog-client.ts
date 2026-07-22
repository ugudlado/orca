import type {
  BacklogConnectArgs,
  BacklogConnectResult,
  BacklogConnectionStatus,
  BacklogMutationResult,
  BacklogProject,
  BacklogAssignable,
  BacklogTask,
  BacklogTaskComment,
  BacklogTaskFilter,
  BacklogTaskUpdate,
  GlobalSettings
} from '../../../shared/types'
import { callRuntimeRpc, getActiveRuntimeTarget } from './runtime-rpc-client'
import {
  getTaskSourceRuntimeSettings,
  type TaskSourceContext
} from '../../../shared/task-source-context'

export type RuntimeBacklogSettings =
  | Pick<GlobalSettings, 'activeRuntimeEnvironmentId'>
  | TaskSourceContext
  | null
  | undefined

export type BacklogEnsureProjectAgentTokenResult =
  | { ok: true; agentId: string; hashPrefix: string; token: string }
  | { ok: false; error: string }

function isTaskSourceRuntimeSettings(
  settings: RuntimeBacklogSettings
): settings is TaskSourceContext {
  return settings !== null && settings !== undefined && 'kind' in settings
}

function getBacklogRuntimeTarget(
  settings: RuntimeBacklogSettings
): ReturnType<typeof getActiveRuntimeTarget> {
  return getActiveRuntimeTarget(
    isTaskSourceRuntimeSettings(settings) ? getTaskSourceRuntimeSettings(settings) : settings
  )
}

export async function backlogStatus(
  settings: RuntimeBacklogSettings
): Promise<BacklogConnectionStatus> {
  const target = getBacklogRuntimeTarget(settings)
  return target.kind === 'environment'
    ? callRuntimeRpc<BacklogConnectionStatus>(target, 'backlog.status', undefined, {
        timeoutMs: 15_000
      })
    : window.api.backlog.status()
}

export async function backlogConnect(
  settings: RuntimeBacklogSettings,
  args: BacklogConnectArgs
): Promise<BacklogConnectResult> {
  const target = getBacklogRuntimeTarget(settings)
  return target.kind === 'environment'
    ? callRuntimeRpc<BacklogConnectResult>(target, 'backlog.connect', args, { timeoutMs: 30_000 })
    : window.api.backlog.connect(args)
}

export async function backlogDisconnect(settings: RuntimeBacklogSettings): Promise<void> {
  const target = getBacklogRuntimeTarget(settings)
  if (target.kind === 'environment') {
    await callRuntimeRpc<{ ok: true }>(target, 'backlog.disconnect', undefined, {
      timeoutMs: 15_000
    })
    return
  }
  await window.api.backlog.disconnect()
}

export async function backlogListProjects(
  settings: RuntimeBacklogSettings
): Promise<BacklogProject[]> {
  const target = getBacklogRuntimeTarget(settings)
  return target.kind === 'environment'
    ? callRuntimeRpc<BacklogProject[]>(target, 'backlog.listProjects', undefined, {
        timeoutMs: 30_000
      })
    : window.api.backlog.listProjects()
}

export async function backlogListTasks(
  settings: RuntimeBacklogSettings,
  projectId: string,
  filter?: BacklogTaskFilter
): Promise<BacklogTask[]> {
  const target = getBacklogRuntimeTarget(settings)
  const args = { projectId, filter }
  return target.kind === 'environment'
    ? callRuntimeRpc<BacklogTask[]>(target, 'backlog.listTasks', args, { timeoutMs: 30_000 })
    : window.api.backlog.listTasks(args)
}

export async function backlogGetTask(
  settings: RuntimeBacklogSettings,
  projectId: string,
  taskId: string
): Promise<BacklogTask | null> {
  const target = getBacklogRuntimeTarget(settings)
  const args = { projectId, taskId }
  return target.kind === 'environment'
    ? callRuntimeRpc<BacklogTask | null>(target, 'backlog.getTask', args, { timeoutMs: 30_000 })
    : window.api.backlog.getTask(args)
}

export async function backlogListProjectAssignables(
  settings: RuntimeBacklogSettings,
  projectId: string
): Promise<BacklogAssignable[]> {
  const target = getBacklogRuntimeTarget(settings)
  const args = { projectId }
  return target.kind === 'environment'
    ? callRuntimeRpc<BacklogAssignable[]>(target, 'backlog.listProjectAssignables', args, {
        timeoutMs: 30_000
      })
    : window.api.backlog.listProjectAssignables(args)
}

export async function backlogListProjectStatuses(
  settings: RuntimeBacklogSettings,
  projectId: string
): Promise<string[]> {
  const target = getBacklogRuntimeTarget(settings)
  const args = { projectId }
  return target.kind === 'environment'
    ? callRuntimeRpc<string[]>(target, 'backlog.listProjectStatuses', args, { timeoutMs: 30_000 })
    : window.api.backlog.listProjectStatuses(args)
}

export async function backlogUpdateTask(
  settings: RuntimeBacklogSettings,
  projectId: string,
  taskId: string,
  updates: BacklogTaskUpdate
): Promise<BacklogMutationResult> {
  const target = getBacklogRuntimeTarget(settings)
  const args = { projectId, taskId, updates }
  return target.kind === 'environment'
    ? callRuntimeRpc<BacklogMutationResult>(target, 'backlog.updateTask', args, {
        timeoutMs: 30_000
      })
    : window.api.backlog.updateTask(args)
}

export async function backlogListTaskComments(
  settings: RuntimeBacklogSettings,
  projectId: string,
  taskId: string
): Promise<BacklogTaskComment[]> {
  const target = getBacklogRuntimeTarget(settings)
  const args = { projectId, taskId }
  return target.kind === 'environment'
    ? callRuntimeRpc<BacklogTaskComment[]>(target, 'backlog.listTaskComments', args, {
        timeoutMs: 30_000
      })
    : window.api.backlog.listTaskComments(args)
}

export async function backlogEnsureProjectAgentToken(
  settings: RuntimeBacklogSettings,
  args: { projectId: string; agentName: string; agentId?: string | null }
): Promise<BacklogEnsureProjectAgentTokenResult> {
  const target = getBacklogRuntimeTarget(settings)
  return target.kind === 'environment'
    ? callRuntimeRpc<BacklogEnsureProjectAgentTokenResult>(
        target,
        'backlog.ensureProjectAgentToken',
        args,
        { timeoutMs: 30_000 }
      )
    : window.api.backlog.ensureProjectAgentToken(args)
}

export async function backlogRevokeProjectAgentToken(
  settings: RuntimeBacklogSettings,
  args: { projectId: string; agentId: string; hashPrefix: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const target = getBacklogRuntimeTarget(settings)
  return target.kind === 'environment'
    ? callRuntimeRpc<{ ok: true }>(target, 'backlog.revokeProjectAgentToken', args, {
        timeoutMs: 15_000
      })
    : window.api.backlog.revokeProjectAgentToken(args)
}
