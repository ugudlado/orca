import type { BacklogProject } from '../../../src/shared/backlog-types'
import type { RpcClient } from '../transport/rpc-client'
import {
  connectBacklogAccount as connectBacklogViaRpc,
  fetchBacklogStatus,
  listBacklogProjects
} from './backlog-mobile-rpc'
import { resolveBacklogVisibleProjectIds } from './backlog-mobile-task-helpers'
import {
  pickMobileBacklogProjectSelection,
  resolveDefaultMobileBacklogProjectId
} from './backlog-mobile-workspace-create'

const DEFAULT_BACKLOG_SERVER_URL = 'http://localhost:6420'

export type MobileBacklogBootstrapSettings = {
  backlogVisibleProjectIds?: unknown
  backlogServerUrl?: string
}

export type MobileBacklogConnectionSnapshot = {
  connected?: boolean
  serverUrl?: string | null
}

export async function hydrateMobileBacklogTaskProvider(args: {
  client: RpcClient
  settings: MobileBacklogBootstrapSettings
  backlogStatus: MobileBacklogConnectionSnapshot | null
  stale: () => boolean
  setBacklogConnected: (connected: boolean) => void
  setBacklogProjects: (projects: BacklogProject[]) => void
  setSelectedBacklogProjectId: (projectId: string | null) => void
  setBacklogVisibleProjectIds: (ids: string[]) => void
  setBacklogServerUrlDraft: (url: string) => void
}): Promise<void> {
  const backlogIsConnected = args.backlogStatus?.connected === true
  args.setBacklogConnected(backlogIsConnected)
  if (!backlogIsConnected) {
    args.setBacklogProjects([])
    args.setSelectedBacklogProjectId(null)
    return
  }

  args.setBacklogVisibleProjectIds(
    resolveBacklogVisibleProjectIds(args.settings.backlogVisibleProjectIds, [])
  )
  args.setBacklogServerUrlDraft(
    typeof args.settings.backlogServerUrl === 'string' && args.settings.backlogServerUrl.trim()
      ? args.settings.backlogServerUrl.trim()
      : args.backlogStatus?.serverUrl?.trim() || DEFAULT_BACKLOG_SERVER_URL
  )

  try {
    const projects = await listBacklogProjects(args.client)
    if (args.stale()) {
      return
    }
    args.setBacklogProjects(projects)
    const visibleIds = resolveBacklogVisibleProjectIds(
      args.settings.backlogVisibleProjectIds,
      projects
    )
    args.setBacklogVisibleProjectIds(visibleIds)
    args.setSelectedBacklogProjectId(resolveDefaultMobileBacklogProjectId(visibleIds, projects))
  } catch {
    if (!args.stale()) {
      args.setBacklogProjects([])
      args.setSelectedBacklogProjectId(null)
    }
  }
}

export async function reloadMobileBacklogTaskContext(args: {
  client: RpcClient
  settings: MobileBacklogBootstrapSettings
  setBacklogConnected: (connected: boolean) => void
  setBacklogProjects: (projects: BacklogProject[]) => void
  setSelectedBacklogProjectId: (updater: (current: string | null) => string | null) => void
  setBacklogVisibleProjectIds: (ids: string[]) => void
}): Promise<void> {
  const status = await fetchBacklogStatus(args.client)
  args.setBacklogConnected(status.connected)
  if (!status.connected) {
    args.setBacklogProjects([])
    args.setSelectedBacklogProjectId(() => null)
    return
  }
  const projects = await listBacklogProjects(args.client)
  args.setBacklogProjects(projects)
  const visibleIds = resolveBacklogVisibleProjectIds(
    args.settings.backlogVisibleProjectIds,
    projects
  )
  args.setBacklogVisibleProjectIds(visibleIds)
  args.setSelectedBacklogProjectId((current) =>
    pickMobileBacklogProjectSelection(current, visibleIds, projects)
  )
}

export async function connectMobileBacklogAccount(args: {
  client: RpcClient
  serverUrl: string
  token: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await connectBacklogViaRpc(args.client, {
    serverUrl: args.serverUrl.trim(),
    token: args.token.trim()
  })
  if (result.ok === false) {
    return { ok: false, error: result.error }
  }
  return { ok: true }
}

export function resolveMobileBacklogServerUrlDraft(
  settingsUrl: unknown,
  statusUrl: string | null | undefined
): string {
  if (typeof settingsUrl === 'string' && settingsUrl.trim()) {
    return settingsUrl.trim()
  }
  return statusUrl?.trim() || DEFAULT_BACKLOG_SERVER_URL
}
