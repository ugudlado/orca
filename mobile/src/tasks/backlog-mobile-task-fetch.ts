import type { RpcClient } from '../transport/rpc-client'
import { getBacklogTask, listBacklogTasks } from './backlog-mobile-rpc'
import { createBacklogTaskListItem, filterBacklogTasksByQuery } from './backlog-mobile-task-helpers'

export type MobileBacklogDetailPayload = {
  provider: 'backlog'
  body: string
  comments: []
  labels: string[]
  assignee?: string
  status: string
}

export async function fetchMobileBacklogTaskListItems(
  client: RpcClient,
  projectId: string,
  query: string
): Promise<ReturnType<typeof createBacklogTaskListItem>[]> {
  const tasks = await listBacklogTasks(client, projectId)
  return filterBacklogTasksByQuery(tasks, query).map(createBacklogTaskListItem)
}

export async function fetchMobileBacklogDetailPayload(
  client: RpcClient,
  projectId: string,
  taskId: string
): Promise<MobileBacklogDetailPayload> {
  const task = await getBacklogTask(client, projectId, taskId)
  return {
    provider: 'backlog',
    body: task.body,
    comments: [],
    labels: task.labels,
    assignee: task.assignee?.name,
    status: task.status
  }
}
