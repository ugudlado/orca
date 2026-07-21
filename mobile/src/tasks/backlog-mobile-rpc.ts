import type {
  BacklogConnectResult,
  BacklogConnectionStatus,
  BacklogProject,
  BacklogTask
} from '../../../src/shared/backlog-types'
import type { RpcClient } from '../transport/rpc-client'
import type { RpcSuccess } from '../transport/types'

export async function fetchBacklogStatus(client: RpcClient): Promise<BacklogConnectionStatus> {
  const response = await client.sendRequest('backlog.status')
  if (!response.ok) {
    throw new Error(response.error.message)
  }
  return (response as RpcSuccess).result as BacklogConnectionStatus
}

export async function connectBacklogAccount(
  client: RpcClient,
  args: { serverUrl: string; token: string }
): Promise<BacklogConnectResult> {
  const response = await client.sendRequest('backlog.connect', {
    serverUrl: args.serverUrl.trim(),
    token: args.token.trim()
  })
  if (!response.ok) {
    throw new Error(response.error.message)
  }
  return (response as RpcSuccess).result as BacklogConnectResult
}

export async function listBacklogProjects(client: RpcClient): Promise<BacklogProject[]> {
  const response = await client.sendRequest('backlog.listProjects')
  if (!response.ok) {
    throw new Error(response.error.message)
  }
  const result = (response as RpcSuccess).result
  if (Array.isArray(result)) {
    return result as BacklogProject[]
  }
  const envelope = result as { projects?: BacklogProject[] }
  return envelope.projects ?? []
}

export async function listBacklogTasks(
  client: RpcClient,
  projectId: string
): Promise<BacklogTask[]> {
  const response = await client.sendRequest('backlog.listTasks', { projectId })
  if (!response.ok) {
    throw new Error(response.error.message)
  }
  const result = (response as RpcSuccess).result
  return Array.isArray(result) ? (result as BacklogTask[]) : []
}

export async function getBacklogTask(
  client: RpcClient,
  projectId: string,
  taskId: string
): Promise<BacklogTask> {
  const response = await client.sendRequest('backlog.getTask', { projectId, taskId })
  if (!response.ok) {
    throw new Error(response.error.message)
  }
  const result = (response as RpcSuccess).result as BacklogTask | { task?: BacklogTask } | null
  if (result && typeof result === 'object' && 'task' in result && result.task) {
    return result.task
  }
  if (result && typeof result === 'object' && 'id' in result) {
    return result as BacklogTask
  }
  throw new Error('Task not found')
}

export async function ensureBacklogProjectAgentToken(
  client: RpcClient,
  args: { projectId: string; agentName: string; agentId?: string | null }
): Promise<
  { ok: true; agentId: string; hashPrefix: string; token: string } | { ok: false; error: string }
> {
  const response = await client.sendRequest('backlog.ensureProjectAgentToken', {
    projectId: args.projectId,
    agentName: args.agentName,
    ...(args.agentId ? { agentId: args.agentId } : {})
  })
  if (!response.ok) {
    throw new Error(response.error.message)
  }
  return (response as RpcSuccess).result as
    | { ok: true; agentId: string; hashPrefix: string; token: string }
    | { ok: false; error: string }
}

export async function updateBacklogTaskStatus(
  client: RpcClient,
  args: { projectId: string; taskId: string; status: string; assignee: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await client.sendRequest('backlog.updateTask', {
    projectId: args.projectId,
    taskId: args.taskId,
    updates: { status: args.status, assignee: args.assignee }
  })
  if (!response.ok) {
    throw new Error(response.error.message)
  }
  return (response as RpcSuccess).result as { ok: true } | { ok: false; error: string }
}
