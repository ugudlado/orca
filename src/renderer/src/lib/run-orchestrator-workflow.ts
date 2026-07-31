// Why: "Run workflow" ticket action (docs/orchestrator-integration-design.md). Spawns
// `orchestrator run <ticketId> --schema <schema>` in a new terminal pane on the repo's
// default worktree — mirrors run-quick-command-in-new-tab.ts's createTab +
// queueTabStartupCommand pattern, adding ORCHESTRATOR_NOTIFY_CMD to the env.
import { useAppStore } from '@/store'
import { reconcileTabOrder } from '@/components/tab-bar/reconcile-order'
import { LOCAL_EXECUTION_HOST_ID } from '../../../shared/execution-host'
import type { BacklogTask, Worktree } from '../../../shared/types'
import {
  buildOrchestratorRunCommand,
  type OrchestratorWorkflowSchema
} from './build-orchestrator-run-command'

export type RunOrchestratorWorkflowArgs = {
  task: Pick<BacklogTask, 'id'>
  repoId: string
  schema: OrchestratorWorkflowSchema
}

export type RunOrchestratorWorkflowResult =
  | { ok: true; tabId: string }
  | { ok: false; reason: 'no-worktree' }

function getDefaultWorktree(worktrees: readonly Worktree[]): Worktree | null {
  return worktrees.find((worktree) => worktree.isMainWorktree) ?? worktrees[0] ?? null
}

function isLocalWorktree(worktree: Worktree): boolean {
  return !worktree.hostId || worktree.hostId === LOCAL_EXECUTION_HOST_ID
}

export async function runOrchestratorWorkflow({
  task,
  repoId,
  schema
}: RunOrchestratorWorkflowArgs): Promise<RunOrchestratorWorkflowResult> {
  const store = useAppStore.getState()
  const worktree = getDefaultWorktree(store.worktreesByRepo[repoId] ?? [])
  if (!worktree) {
    return { ok: false, reason: 'no-worktree' }
  }

  // Why: 127.0.0.1 only reaches the Electron host from a locally-executed terminal — an
  // SSH/runtime pane's curl would hit the remote box and the notify would silently vanish.
  // Omitting the env var still runs the workflow; it just skips the in-app badge.
  const notifyEndpoint = isLocalWorktree(worktree)
    ? await window.api.orchestrator.getNotifyEndpoint().catch(() => undefined)
    : undefined

  const { command, env } = buildOrchestratorRunCommand({
    ticketId: task.id,
    schema,
    notifyEndpoint
  })

  const tab = store.createTab(worktree.id, undefined, undefined, {
    quickCommandLabel: `orchestrator ${schema}`
  })
  store.queueTabStartupCommand(tab.id, { command, env })
  store.setActiveTabType('terminal')

  const fresh = useAppStore.getState()
  const termIds = (fresh.tabsByWorktree[worktree.id] ?? []).map((t) => t.id)
  const editorIds = fresh.openFiles.filter((f) => f.worktreeId === worktree.id).map((f) => f.id)
  const browserIds = (fresh.browserTabsByWorktree?.[worktree.id] ?? []).map((t) => t.id)
  const base = reconcileTabOrder(
    fresh.tabBarOrderByWorktree[worktree.id],
    termIds,
    editorIds,
    browserIds
  )
  const order = base.filter((id) => id !== tab.id)
  order.push(tab.id)
  fresh.setTabBarOrder(worktree.id, order)

  return { ok: true, tabId: tab.id }
}
