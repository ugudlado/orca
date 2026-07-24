import type { BacklogProject } from '../../../src/shared/backlog-types'
import type { RpcClient } from '../transport/rpc-client'
import { buildTaskWorkspaceCreateParams } from './workspace-create-params'
import type { WorkspaceCreateTaskItem } from './workspace-create-params'
import {
  markMobileBacklogTaskInProgress,
  resolveMobileBacklogStartupEnv
} from './backlog-mobile-launch'
import { backlogTaskToWorkspaceCreateItem } from './backlog-mobile-task-helpers'
import type { BacklogTask } from '../../../src/shared/backlog-types'
import type { WorkspaceAgentChoice } from './workspace-agent-selection'

type SetupDecision = 'run' | 'skip'

export async function buildMobileBacklogWorkspaceCreateParams(args: {
  client: RpcClient
  source: BacklogTask
  targetRepoId: string
  setupDecision: SetupDecision
  agent: WorkspaceAgentChoice
  workspaceName?: string
  note?: string
  baseBranch?: string
  branchNameOverride?: string
  sparseCheckout?: { directories: string[]; presetId?: string }
  backlogServerUrl?: string
  backlogAgentId?: string | null
}): Promise<ReturnType<typeof buildTaskWorkspaceCreateParams>> {
  const backlogItem: WorkspaceCreateTaskItem = backlogTaskToWorkspaceCreateItem(args.source)
  const launch = await resolveMobileBacklogStartupEnv({
    client: args.client,
    projectId: args.source.projectId,
    taskId: args.source.id,
    serverUrl: args.backlogServerUrl?.trim() ?? '',
    agentId: args.backlogAgentId ?? null
  })
  if (!launch.ok) {
    throw new Error(launch.error)
  }
  return buildTaskWorkspaceCreateParams({
    item: backlogItem,
    targetRepoId: args.targetRepoId,
    setupDecision: args.setupDecision,
    agent: args.agent,
    workspaceName: args.workspaceName,
    note: args.note,
    baseBranch: args.baseBranch,
    branchNameOverride: args.branchNameOverride,
    sparseCheckout: args.sparseCheckout,
    startupEnv: launch.startupEnv
  })
}

export async function markMobileBacklogTaskStartedAfterWorkspaceCreate(args: {
  client: RpcClient
  projectId: string
  taskId: string
}): Promise<void> {
  const mark = await markMobileBacklogTaskInProgress(args)
  if (!mark.ok) {
    console.warn('[backlog] failed to mark task in progress:', mark.error)
  }
}

export function buildMobileBacklogProjectPickerOptions(
  projects: readonly BacklogProject[],
  visibleProjectIds: readonly string[]
): Array<{ value: string; label: string; subtitle: string }> {
  const visibleSet = new Set(visibleProjectIds)
  const candidates =
    visibleSet.size > 0
      ? projects.filter((project) => visibleSet.has(String(project.id)))
      : projects
  return candidates.map((project) => ({
    value: String(project.id),
    label: project.name || project.path,
    subtitle: project.path
  }))
}

export function resolveMobileBacklogProjectLabel(
  projects: readonly BacklogProject[],
  selectedProjectId: string | null
): string {
  const match = projects.find((project) => String(project.id) === selectedProjectId)
  return match?.name ?? match?.path ?? 'Project'
}

export function resolveDefaultMobileBacklogProjectId(
  visibleIds: readonly string[],
  projects: readonly BacklogProject[]
): string | null {
  return visibleIds[0] ?? (projects[0] ? String(projects[0].id) : null)
}

export function pickMobileBacklogProjectSelection(
  current: string | null,
  visibleIds: readonly string[],
  projects: readonly BacklogProject[]
): string | null {
  if (current && visibleIds.includes(current)) {
    return current
  }
  return resolveDefaultMobileBacklogProjectId(visibleIds, projects)
}
