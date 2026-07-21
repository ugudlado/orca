import { basename } from 'node:path'
import type {
  BacklogProject,
  BacklogTask,
  BacklogTaskFilter,
  BacklogTaskUpdate,
  BacklogMutationResult
} from '../../shared/backlog-types'
import { backlogRequest, getStatus } from './client'

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

type ServerAssignee = {
  id?: string | number
  name?: string
}

type ServerTask = {
  id: string | number
  title?: string
  status?: string
  description?: string
  rawContent?: string
  assignee?: ServerAssignee | string | null
  labels?: string[]
  milestone?: string | null
  priority?: 'high' | 'medium' | 'low'
  createdAt?: string
  updatedAt?: string
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

function mapAssignee(raw: ServerTask['assignee']): BacklogTask['assignee'] {
  if (!raw) {
    return null
  }
  if (typeof raw === 'string') {
    return { id: raw, name: raw }
  }
  const id = raw.id !== undefined ? String(raw.id) : (raw.name ?? '')
  const name = typeof raw.name === 'string' ? raw.name : id
  if (!id && !name) {
    return null
  }
  return { id: id || name, name: name || id }
}

function taskUrl(serverUrl: string, taskId: string): string {
  return `${serverUrl}#${taskId}`
}

function mapTask(projectId: string, serverUrl: string, raw: ServerTask): BacklogTask {
  const id = String(raw.id)
  const body = raw.description ?? raw.rawContent ?? ''
  return {
    id,
    projectId,
    title: typeof raw.title === 'string' ? raw.title : id,
    status: typeof raw.status === 'string' ? raw.status : '',
    body,
    url: taskUrl(serverUrl, id),
    assignee: mapAssignee(raw.assignee),
    labels: Array.isArray(raw.labels)
      ? raw.labels.filter((label) => typeof label === 'string')
      : [],
    milestone: typeof raw.milestone === 'string' ? raw.milestone : undefined,
    priority: raw.priority,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt
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
    await backlogRequest(
      `/api/tasks/${encodeURIComponent(taskId)}`,
      {
        method: 'PATCH',
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
