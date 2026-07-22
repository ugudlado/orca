import type { BacklogTask } from '../../shared/backlog-types'

export type ServerAssignee = {
  id?: string | number
  name?: string
}

export type ServerAcceptanceCriterionItem = {
  index?: number
  text?: string
  checked?: boolean
}

export type ServerSubtaskSummary = {
  id?: string
  title?: string
}

export type ServerTask = {
  id: string | number
  title?: string
  status?: string
  description?: string
  rawContent?: string
  assignee?: ServerAssignee | string | null
  labels?: string[]
  milestone?: string | null
  priority?: 'urgent' | 'high' | 'medium' | 'low'
  epic?: string | null
  dueDate?: string | null
  blocked?: boolean | null
  dependencies?: string[]
  acceptanceCriteriaItems?: ServerAcceptanceCriterionItem[]
  implementationNotes?: string
  documentation?: string[]
  commentCount?: number
  createdDate?: string
  updatedDate?: string
  parentTaskId?: string
  parentTaskTitle?: string
  subtaskSummaries?: ServerSubtaskSummary[]
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

function mapAcceptanceCriteriaItems(
  raw: ServerAcceptanceCriterionItem[] | undefined
): BacklogTask['acceptanceCriteriaItems'] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw
    .filter(
      (item): item is ServerAcceptanceCriterionItem => item !== null && typeof item === 'object'
    )
    .map((item, position) => ({
      index: typeof item.index === 'number' ? item.index : position + 1,
      text: typeof item.text === 'string' ? item.text : '',
      checked: item.checked === true
    }))
}

function mapSubtaskSummaries(
  raw: ServerSubtaskSummary[] | undefined
): BacklogTask['subtaskSummaries'] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw
    .filter((item): item is ServerSubtaskSummary => item !== null && typeof item === 'object')
    .filter((item): item is { id: string; title?: string } => typeof item.id === 'string')
    .map((item) => ({ id: item.id, title: typeof item.title === 'string' ? item.title : item.id }))
}

export function mapTask(projectId: string, serverUrl: string, raw: ServerTask): BacklogTask {
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
    epic: typeof raw.epic === 'string' ? raw.epic : undefined,
    dueDate: typeof raw.dueDate === 'string' ? raw.dueDate : undefined,
    blocked: raw.blocked === true,
    dependencies: Array.isArray(raw.dependencies)
      ? raw.dependencies.filter((dep) => typeof dep === 'string')
      : [],
    acceptanceCriteriaItems: mapAcceptanceCriteriaItems(raw.acceptanceCriteriaItems),
    implementationNotes:
      typeof raw.implementationNotes === 'string' ? raw.implementationNotes : undefined,
    documentation: Array.isArray(raw.documentation)
      ? raw.documentation.filter((doc) => typeof doc === 'string')
      : [],
    commentCount: typeof raw.commentCount === 'number' ? raw.commentCount : 0,
    createdAt: raw.createdDate,
    updatedAt: raw.updatedDate,
    parentTaskId: typeof raw.parentTaskId === 'string' ? raw.parentTaskId : undefined,
    parentTaskTitle: typeof raw.parentTaskTitle === 'string' ? raw.parentTaskTitle : undefined,
    subtaskSummaries: mapSubtaskSummaries(raw.subtaskSummaries)
  }
}
