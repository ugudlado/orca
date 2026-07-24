import { basename } from 'node:path'
import type {
  BacklogAssignable,
  BacklogProject,
  BacklogTask,
  BacklogTaskFilter,
  BacklogTaskUpdate,
  BacklogMutationResult
} from '../../shared/backlog-types'
import { backlogRequest, getStatus } from './client'
import { buildBacklogProjectAssignables } from './backlog-project-assignables'
import { mapTask, type ServerTask } from './backlog-task-field-mapping'

type ServerProject = {
  id: number
  guid?: string
  seq?: number
  path: string
}

type ProjectsResponse = {
  projects: ServerProject[]
  currentId?: number
}

function projectDisplayName(path: string): string {
  const base = basename(path)
  return base.length > 0 ? base : path
}

function mapProject(project: ServerProject): BacklogProject {
  return {
    id: project.id,
    guid: project.guid,
    seq: project.seq,
    path: project.path,
    name: projectDisplayName(project.path)
  }
}

function serverUrlOrThrow(): string {
  const serverUrl = getStatus().serverUrl
  if (!serverUrl) {
    throw new Error('Not connected to Backlog.')
  }
  return serverUrl
}

export async function listProjects(): Promise<BacklogProject[]> {
  const data = await backlogRequest<ProjectsResponse>('/api/projects')
  return Array.isArray(data.projects) ? data.projects.map(mapProject) : []
}

export async function listTasks(
  projectId: string,
  filter?: BacklogTaskFilter
): Promise<BacklogTask[]> {
  const params = new URLSearchParams()
  if (filter?.status) {
    params.set('status', filter.status)
  }
  if (filter?.assignee) {
    params.set('assignee', filter.assignee)
  }
  const query = params.toString()
  const path = query ? `/api/tasks?${query}` : '/api/tasks'
  const serverUrl = serverUrlOrThrow()
  const data = await backlogRequest<ServerTask[] | { tasks?: ServerTask[] }>(path, undefined, {
    project: projectId
  })
  const tasks = Array.isArray(data) ? data : Array.isArray(data.tasks) ? data.tasks : []
  return tasks.map((task) => mapTask(projectId, serverUrl, task))
}

export async function getTask(projectId: string, taskId: string): Promise<BacklogTask | null> {
  const serverUrl = serverUrlOrThrow()
  try {
    const raw = await backlogRequest<ServerTask>(
      `/api/tasks/${encodeURIComponent(taskId)}`,
      undefined,
      {
        project: projectId
      }
    )
    return mapTask(projectId, serverUrl, raw)
  } catch {
    return null
  }
}

export async function updateTask(
  projectId: string,
  taskId: string,
  updates: BacklogTaskUpdate
): Promise<BacklogMutationResult> {
  try {
    // Why: Backlog HTTP task update is PUT only (PATCH is not registered).
    await backlogRequest(
      `/api/tasks/${encodeURIComponent(taskId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates)
      },
      { project: projectId }
    )
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to update task.'
    }
  }
}

type ServerUser = {
  id?: string | number
  name?: string
  memberships?: { projectId?: number | string; project_id?: number | string }[]
}

type ServerAgent = {
  id?: string | number
  name?: string
}

/** Users with project membership + agents with a live grant on the project. */
export async function listProjectAssignables(projectId: string): Promise<BacklogAssignable[]> {
  // Prefer the project-scoped assignables route (works with pinned tokens). Fall back to
  // composing /api/users + /api/agents for older Backlog servers.
  try {
    const data = await backlogRequest<BacklogAssignable[] | { assignables?: BacklogAssignable[] }>(
      '/api/assignables',
      undefined,
      { project: projectId }
    )
    const raw = Array.isArray(data)
      ? data
      : data && typeof data === 'object' && Array.isArray(data.assignables)
        ? data.assignables
        : []
    const assignables = raw
      .filter(
        (entry): entry is BacklogAssignable =>
          entry !== null &&
          typeof entry === 'object' &&
          typeof entry.id === 'string' &&
          typeof entry.name === 'string' &&
          (entry.kind === 'user' || entry.kind === 'agent')
      )
      .map((entry) => ({
        id: entry.id,
        name: entry.name.trim(),
        kind: entry.kind
      }))
      .filter((entry) => entry.name.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name))
    if (
      assignables.length > 0 ||
      Array.isArray(data) ||
      Array.isArray((data as { assignables?: unknown }).assignables)
    ) {
      return assignables
    }
  } catch (error) {
    console.warn(
      '[backlog] listProjectAssignables /api/assignables failed, falling back:',
      error instanceof Error ? error.message : error
    )
  }

  // Why: pinned/admin tokens may 403 one of these routes; keep the other list instead of
  // wiping the picker via Promise.all rejection (matches older Backlog AssigneePicker sources).
  const [usersResult, agentsResult] = await Promise.allSettled([
    backlogRequest<ServerUser[] | { users?: ServerUser[] }>('/api/users'),
    backlogRequest<ServerAgent[] | { agents?: ServerAgent[] }>('/api/agents', undefined, {
      project: projectId
    })
  ])

  const usersRaw = usersResult.status === 'fulfilled' ? usersResult.value : []
  const agentsRaw = agentsResult.status === 'fulfilled' ? agentsResult.value : []

  if (usersResult.status === 'rejected' && agentsResult.status === 'rejected') {
    const userError =
      usersResult.reason instanceof Error ? usersResult.reason.message : String(usersResult.reason)
    const agentError =
      agentsResult.reason instanceof Error
        ? agentsResult.reason.message
        : String(agentsResult.reason)
    throw new Error(
      `Could not load Backlog assignees (${userError}; ${agentError}). Reconnect with a user or operator token.`
    )
  }

  if (usersResult.status === 'rejected') {
    console.warn(
      '[backlog] listProjectAssignables users failed:',
      usersResult.reason instanceof Error ? usersResult.reason.message : usersResult.reason
    )
  }
  if (agentsResult.status === 'rejected') {
    console.warn(
      '[backlog] listProjectAssignables agents failed:',
      agentsResult.reason instanceof Error ? agentsResult.reason.message : agentsResult.reason
    )
  }

  return buildBacklogProjectAssignables({ projectId, usersRaw, agentsRaw })
}

/** Workflow statuses from the project's Backlog config (`GET /api/statuses`). */
export async function listProjectStatuses(projectId: string): Promise<string[]> {
  const data = await backlogRequest<string[] | { statuses?: string[] }>(
    '/api/statuses',
    undefined,
    { project: projectId }
  )
  const raw = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray(data.statuses)
      ? data.statuses
      : []
  const seen = new Set<string>()
  const statuses: string[] = []
  for (const entry of raw) {
    if (typeof entry !== 'string') {
      continue
    }
    const trimmed = entry.trim()
    if (!trimmed) {
      continue
    }
    const key = trimmed.toLowerCase()
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    statuses.push(trimmed)
  }
  return statuses
}
