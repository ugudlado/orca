import type { BacklogTask } from '../../../src/shared/backlog-types'
import type { WorkspaceCreateTaskItem } from './workspace-create-params'

export function buildBacklogTaskPasteContent(
  task: Pick<BacklogTask, 'id' | 'title' | 'body'>
): string {
  return `# ${task.id} ${task.title}\n\n${task.body}`
}

export function filterBacklogTasksByQuery(tasks: BacklogTask[], query: string): BacklogTask[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) {
    return tasks
  }
  return tasks.filter((task) => {
    const haystack = `${task.id} ${task.title} ${task.body} ${task.status}`.toLowerCase()
    return haystack.includes(trimmed)
  })
}

export function createBacklogTaskListItem(task: BacklogTask): {
  key: string
  provider: 'backlog'
  title: string
  subtitle: string
  status: string
  updatedAt: string
  source: BacklogTask
} {
  const projectLabel = task.projectId
  return {
    key: `backlog:${task.projectId}:${task.id}`,
    provider: 'backlog',
    title: task.title,
    subtitle: `${task.id} · ${projectLabel}`,
    status: task.status,
    updatedAt: task.updatedAt ?? task.createdAt ?? '',
    source: task
  }
}

export function backlogTaskToWorkspaceCreateItem(task: BacklogTask): WorkspaceCreateTaskItem {
  return {
    provider: 'backlog',
    source: {
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      url: task.url,
      body: task.body
    }
  }
}

export function resolveBacklogVisibleProjectIds(
  settingsIds: unknown,
  projects: readonly { id: number }[]
): string[] {
  const available = new Set(projects.map((project) => String(project.id)))
  if (!Array.isArray(settingsIds) || settingsIds.length === 0) {
    return [...available]
  }
  const selected = settingsIds
    .map((value) => String(value).trim())
    .filter((id) => id.length > 0 && available.has(id))
  return selected.length > 0 ? selected : [...available]
}
