import type { StateCreator } from 'zustand'
import type { AppState } from '../types'
import type {
  BacklogAssignable,
  BacklogConnectionStatus,
  BacklogConnectResult,
  BacklogProject,
  BacklogTask,
  BacklogTaskComment,
  BacklogTaskFilter,
  BacklogTaskUpdate
} from '../../../../shared/types'
import type { CacheEntry } from './github'
import {
  backlogEnsureProjectAgentToken,
  backlogGetTask,
  backlogListProjectAssignables,
  backlogListProjectStatuses,
  backlogListProjects,
  backlogListTaskComments,
  backlogListTasks,
  backlogRevokeProjectAgentToken,
  backlogUpdateTask,
  type BacklogEnsureProjectAgentTokenResult
} from '@/runtime/runtime-backlog-client'
import { getTaskSourceCacheScope } from '../../../../shared/task-source-context'
import {
  applyBacklogReadError,
  canWriteBacklogReadResult,
  getBacklogMutationGeneration,
  getBacklogReadScope,
  isFreshBacklogCacheEntry,
  looksLikeBacklogAuthError,
  scopedBacklogCacheKey,
  type BacklogPatchOptions,
  type BacklogReadOptions
} from './backlog-slice-helpers'
import { createBacklogConnectionActions } from './backlog-slice-connection'
import { isIntegrationCredentialDecryptionError } from '../../../../shared/integration-credential-errors'

export type BacklogSlice = {
  backlogStatus: BacklogConnectionStatus
  backlogStatusChecked: boolean
  backlogStatusContextKey: string | null
  backlogProjectsCache: CacheEntry<BacklogProject[]> | null
  backlogTasksByProject: Record<string, CacheEntry<BacklogTask[]>>
  backlogTaskCache: Record<string, CacheEntry<BacklogTask>>

  checkBacklogConnection: () => Promise<void>
  connectBacklog: (args: { serverUrl: string; token: string }) => Promise<BacklogConnectResult>
  disconnectBacklog: () => Promise<void>
  listBacklogProjects: (options?: BacklogReadOptions) => Promise<BacklogProject[]>
  listBacklogTasks: (
    projectId: string,
    filter?: BacklogTaskFilter,
    options?: BacklogReadOptions
  ) => Promise<BacklogTask[]>
  getBacklogTask: (
    projectId: string,
    taskId: string,
    options?: BacklogReadOptions
  ) => Promise<BacklogTask | null>
  listBacklogProjectAssignables: (projectId: string) => Promise<BacklogAssignable[]>
  listBacklogProjectStatuses: (projectId: string) => Promise<string[]>
  /** Lazy — call only when the detail panel's activity section is opened. */
  listBacklogTaskComments: (projectId: string, taskId: string) => Promise<BacklogTaskComment[]>
  updateBacklogTask: (
    projectId: string,
    taskId: string,
    updates: BacklogTaskUpdate
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  patchBacklogTask: (
    projectId: string,
    taskId: string,
    patch: Partial<BacklogTask>,
    options?: BacklogPatchOptions
  ) => void
  ensureBacklogProjectAgentToken: (args: {
    projectId: string
    agentName: string
  }) => Promise<BacklogEnsureProjectAgentTokenResult>
  revokeBacklogProjectAgentToken: (args: { projectId: string }) => Promise<void>
}

export const createBacklogSlice: StateCreator<AppState, [], [], BacklogSlice> = (set, get) => ({
  backlogStatus: { connected: false, viewer: null, serverUrl: null },
  backlogStatusChecked: false,
  backlogStatusContextKey: null,
  backlogProjectsCache: null,
  backlogTasksByProject: {},
  backlogTaskCache: {},

  ...createBacklogConnectionActions(set, get),

  listBacklogProjects: async (options): Promise<BacklogProject[]> => {
    const scope = getBacklogReadScope(get().settings, options?.sourceContext)
    const cached = get().backlogProjectsCache
    if (cached !== null && isFreshBacklogCacheEntry(cached)) {
      return cached.data ?? []
    }
    const requestGeneration = getBacklogMutationGeneration()
    try {
      const projects = (await backlogListProjects(scope.settings)) ?? []
      if (
        canWriteBacklogReadResult(
          scope.contextKey,
          requestGeneration,
          get().settings,
          scope.explicitSource
        )
      ) {
        set({ backlogProjectsCache: { data: projects, fetchedAt: Date.now() } })
      }
      return projects
    } catch (error) {
      console.warn('[backlog] listBacklogProjects failed:', error)
      applyBacklogReadError(get, set, error)
      if (isIntegrationCredentialDecryptionError(error) || looksLikeBacklogAuthError(error)) {
        return []
      }
      throw error
    }
  },

  listBacklogTasks: async (projectId, filter, options): Promise<BacklogTask[]> => {
    const scope = getBacklogReadScope(get().settings, options?.sourceContext)
    const cacheKey = scopedBacklogCacheKey(scope, `${projectId}::${JSON.stringify(filter ?? {})}`)
    const cached = get().backlogTasksByProject[cacheKey]
    if (cached !== undefined && isFreshBacklogCacheEntry(cached)) {
      return cached.data ?? []
    }
    const requestGeneration = getBacklogMutationGeneration()
    try {
      const tasks = (await backlogListTasks(scope.settings, projectId, filter)) ?? []
      if (
        canWriteBacklogReadResult(
          scope.contextKey,
          requestGeneration,
          get().settings,
          scope.explicitSource
        )
      ) {
        set((s) => ({
          backlogTasksByProject: {
            ...s.backlogTasksByProject,
            [cacheKey]: { data: tasks, fetchedAt: Date.now() }
          }
        }))
      }
      return tasks
    } catch (error) {
      console.warn('[backlog] listBacklogTasks failed:', error)
      applyBacklogReadError(get, set, error)
      if (isIntegrationCredentialDecryptionError(error) || looksLikeBacklogAuthError(error)) {
        return []
      }
      throw error
    }
  },

  getBacklogTask: async (projectId, taskId, options) => {
    const scope = getBacklogReadScope(get().settings, options?.sourceContext)
    const cacheKey = scopedBacklogCacheKey(scope, `${projectId}::${taskId}`)
    const cached = get().backlogTaskCache[cacheKey]
    if (isFreshBacklogCacheEntry(cached)) {
      return cached.data
    }
    const requestGeneration = getBacklogMutationGeneration()
    try {
      const task = await backlogGetTask(scope.settings, projectId, taskId)
      if (
        canWriteBacklogReadResult(
          scope.contextKey,
          requestGeneration,
          get().settings,
          scope.explicitSource
        )
      ) {
        set((s) => ({
          backlogTaskCache: {
            ...s.backlogTaskCache,
            [cacheKey]: { data: task, fetchedAt: Date.now() }
          }
        }))
      }
      return task
    } catch (error) {
      console.warn('[backlog] getBacklogTask failed:', error)
      applyBacklogReadError(get, set, error)
      return null
    }
  },

  listBacklogProjectAssignables: async (projectId) => {
    return (await backlogListProjectAssignables(get().settings, projectId)) ?? []
  },

  listBacklogProjectStatuses: async (projectId) => {
    return (await backlogListProjectStatuses(get().settings, projectId)) ?? []
  },

  listBacklogTaskComments: async (projectId, taskId) => {
    return (await backlogListTaskComments(get().settings, projectId, taskId)) ?? []
  },

  updateBacklogTask: async (projectId, taskId, updates) => {
    const result = await backlogUpdateTask(get().settings, projectId, taskId, updates)
    if (result.ok) {
      const patch: Partial<BacklogTask> = {}
      if (updates.title !== undefined) {
        patch.title = updates.title
      }
      if (updates.description !== undefined) {
        patch.body = updates.description
      }
      if (updates.status !== undefined) {
        patch.status = updates.status
      }
      if (updates.dueDate !== undefined) {
        patch.dueDate = updates.dueDate ?? undefined
      }
      if (updates.assignee !== undefined) {
        patch.assignee =
          updates.assignee === null ? null : { id: updates.assignee, name: updates.assignee }
      }
      get().patchBacklogTask(projectId, taskId, patch)
    }
    return result
  },

  patchBacklogTask: (projectId, taskId, patch, options) => {
    const sourceScope =
      options?.sourceContext?.provider === 'backlog'
        ? getTaskSourceCacheScope(options.sourceContext)
        : null
    const canPatchCacheKey = (key: string): boolean =>
      sourceScope === null || key.startsWith(`${sourceScope}::`)
    set((s) => {
      const taskCacheKeySuffix = `${projectId}::${taskId}`
      let changed = false
      const nextTaskCache = { ...s.backlogTaskCache }
      for (const [key, entry] of Object.entries(nextTaskCache)) {
        if (!canPatchCacheKey(key) || !key.endsWith(taskCacheKeySuffix) || !entry?.data) {
          continue
        }
        nextTaskCache[key] = { ...entry, data: { ...entry.data, ...patch }, fetchedAt: 0 }
        changed = true
      }
      const nextTasksByProject = { ...s.backlogTasksByProject }
      for (const [key, entry] of Object.entries(nextTasksByProject)) {
        if (!canPatchCacheKey(key) || !entry?.data) {
          continue
        }
        const index = entry.data.findIndex(
          (task) => task.id === taskId && task.projectId === projectId
        )
        if (index === -1) {
          continue
        }
        const nextTasks = [...entry.data]
        nextTasks[index] = { ...nextTasks[index], ...patch }
        nextTasksByProject[key] = { ...entry, data: nextTasks, fetchedAt: 0 }
        changed = true
      }
      return changed
        ? { backlogTaskCache: nextTaskCache, backlogTasksByProject: nextTasksByProject }
        : {}
    })
  },

  ensureBacklogProjectAgentToken: async ({ projectId, agentName }) => {
    const settings = get().settings
    const agentId = settings?.backlogAgentId
    const result = await backlogEnsureProjectAgentToken(settings, {
      projectId,
      agentName,
      agentId
    })
    if (result.ok) {
      await get().updateSettings({
        backlogAgentId: result.agentId,
        backlogProjectTokenMeta: {
          ...settings?.backlogProjectTokenMeta,
          [projectId]: { hashPrefix: result.hashPrefix }
        }
      })
    }
    return result
  },

  revokeBacklogProjectAgentToken: async ({ projectId }) => {
    const settings = get().settings
    const agentId = settings?.backlogAgentId
    const hashPrefix = settings?.backlogProjectTokenMeta?.[projectId]?.hashPrefix
    if (!agentId || !hashPrefix) {
      return
    }
    await backlogRevokeProjectAgentToken(settings, { projectId, agentId, hashPrefix })
    const meta = { ...settings?.backlogProjectTokenMeta }
    delete meta[projectId]
    await get().updateSettings({ backlogProjectTokenMeta: meta })
  }
})
