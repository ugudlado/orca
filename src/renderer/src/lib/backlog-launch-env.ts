import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { buildBacklogOrcaAgentName } from '../../../shared/backlog-orca-agent-name'
import { translate } from '@/i18n/i18n'

function isLocalhostBacklogUrl(serverUrl: string): boolean {
  try {
    const hostname = new URL(serverUrl).hostname.toLowerCase()
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  } catch {
    return /localhost|127\.0\.0\.1/i.test(serverUrl)
  }
}

/** Prefer main-reported hostname (sandboxed preload cannot call node:os). */
export function resolveBacklogHostHostname(): string {
  return useAppStore.getState().backlogStatus.hostHostname?.trim() || 'local'
}

export async function resolveBacklogWorkItemLaunchEnv(args: {
  backlogProjectId: string
  backlogTaskId: string
  repoConnectionId: string | null
}): Promise<Record<string, string> | null> {
  const store = useAppStore.getState()
  const settings = store.settings
  const agentName = buildBacklogOrcaAgentName(resolveBacklogHostHostname())
  const tokenResult = await store.ensureBacklogProjectAgentToken({
    projectId: args.backlogProjectId,
    agentName
  })
  if (!tokenResult.ok) {
    toast.error(tokenResult.error)
    return null
  }
  const backlogUrl =
    settings?.backlogServerUrl?.trim() || store.backlogStatus.serverUrl?.trim() || ''
  if (!backlogUrl) {
    toast.error(
      translate(
        'auto.renderer.lib.backlog.launch.env.missing_url',
        'Backlog server URL is not configured.'
      )
    )
    return null
  }
  if (args.repoConnectionId && isLocalhostBacklogUrl(backlogUrl)) {
    toast.message(
      translate(
        'auto.renderer.lib.backlog.launch.env.localhost_remote',
        'Backlog uses a localhost URL but this workspace runs on a remote host. Remote agents may not reach Backlog unless the server URL is reachable from that host.'
      )
    )
  }
  return {
    BACKLOG_URL: backlogUrl,
    BACKLOG_TOKEN: tokenResult.token,
    BACKLOG_PROJECT_ID: args.backlogProjectId,
    BACKLOG_TASK_ID: args.backlogTaskId
  }
}

export function getBacklogOrcaAgentNameForAssignee(): string {
  return buildBacklogOrcaAgentName(resolveBacklogHostHostname())
}
