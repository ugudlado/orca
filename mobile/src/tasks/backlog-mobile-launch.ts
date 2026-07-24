import { buildBacklogOrcaAgentName } from '../../../src/shared/backlog-orca-agent-name'
import { buildBacklogStartWorkTaskUpdate } from '../../../src/shared/backlog-start-work-update'
import type { RpcClient } from '../transport/rpc-client'
import {
  ensureBacklogProjectAgentToken,
  fetchBacklogStatus,
  updateBacklogTaskStatus
} from './backlog-mobile-rpc'

type SettingsEnvelope = {
  settings?: {
    backlogServerUrl?: string | null
    backlogAgentId?: string | null
  }
}

async function readBacklogLaunchSettings(client: RpcClient): Promise<{
  serverUrl: string
  agentId: string | null
}> {
  const response = await client.sendRequest('settings.get')
  if (!response.ok) {
    return { serverUrl: '', agentId: null }
  }
  const settings = (response.result as SettingsEnvelope | undefined)?.settings
  return {
    serverUrl:
      typeof settings?.backlogServerUrl === 'string' ? settings.backlogServerUrl.trim() : '',
    agentId:
      typeof settings?.backlogAgentId === 'string' && settings.backlogAgentId.trim()
        ? settings.backlogAgentId.trim()
        : null
  }
}

export async function resolveMobileBacklogStartupEnv(args: {
  client: RpcClient
  projectId: string
  taskId: string
  serverUrl?: string
  agentId?: string | null
}): Promise<
  | { ok: true; startupEnv: Record<string, string>; agentId: string; hashPrefix: string }
  | { ok: false; error: string }
> {
  const status = await fetchBacklogStatus(args.client)
  const settings = await readBacklogLaunchSettings(args.client)
  const agentName = buildBacklogOrcaAgentName(status.hostHostname ?? 'local')
  const tokenResult = await ensureBacklogProjectAgentToken(args.client, {
    projectId: args.projectId,
    agentName,
    agentId: args.agentId ?? settings.agentId
  })
  if (!tokenResult.ok) {
    return tokenResult
  }
  const backlogUrl = (
    args.serverUrl?.trim() ||
    settings.serverUrl ||
    status.serverUrl?.trim() ||
    ''
  ).trim()
  if (!backlogUrl) {
    return { ok: false, error: 'Backlog server URL is not configured.' }
  }
  return {
    ok: true,
    agentId: tokenResult.agentId,
    hashPrefix: tokenResult.hashPrefix,
    startupEnv: {
      BACKLOG_URL: backlogUrl,
      BACKLOG_TOKEN: tokenResult.token,
      BACKLOG_PROJECT_ID: args.projectId,
      BACKLOG_TASK_ID: args.taskId
    }
  }
}

export async function markMobileBacklogTaskInProgress(args: {
  client: RpcClient
  projectId: string
  taskId: string
  hostHostname?: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  let hostname = args.hostHostname?.trim() || ''
  if (!hostname) {
    const status = await fetchBacklogStatus(args.client).catch(() => null)
    hostname = status?.hostHostname?.trim() || 'local'
  }
  const updates = buildBacklogStartWorkTaskUpdate(hostname)
  return updateBacklogTaskStatus(args.client, {
    projectId: args.projectId,
    taskId: args.taskId,
    ...updates
  })
}
