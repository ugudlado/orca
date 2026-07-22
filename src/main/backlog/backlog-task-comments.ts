import type { BacklogTaskComment } from '../../shared/backlog-types'
import { backlogRequest } from './client'

type ServerHistoryCommentPayload = {
  body?: string
  userId?: string | null
  agentName?: string
}

type ServerHistoryEvent = {
  id?: string
  ts?: string
  type?: string
  payload?: ServerHistoryCommentPayload
}

type ServerHistoryPage = {
  events?: ServerHistoryEvent[]
}

/** Lazy — only called when the detail panel's activity section is opened, never on list/get. */
export async function listTaskComments(
  projectId: string,
  taskId: string
): Promise<BacklogTaskComment[]> {
  const params = new URLSearchParams({ taskId, type: 'comment' })
  const data = await backlogRequest<ServerHistoryPage>(
    `/api/history?${params.toString()}`,
    undefined,
    { project: projectId }
  )
  const events = Array.isArray(data.events) ? data.events : []
  return events
    .filter((event) => event.type === 'comment' && typeof event.payload?.body === 'string')
    .map((event) => ({
      id: typeof event.id === 'string' ? event.id : '',
      ts: typeof event.ts === 'string' ? event.ts : '',
      body: event.payload?.body ?? '',
      // Why: history payload only carries userId (a raw id, not a display name) and the
      // deprecated agentName — neither is safe to show as-is, so leave unresolved for now.
      authorName: null
    }))
}
