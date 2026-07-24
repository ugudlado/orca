import type { AppState } from '../types'
import type { CacheEntry } from './github'
import { isIntegrationCredentialDecryptionError } from '../../../../shared/integration-credential-errors'
import { backlogRevokeProjectAgentToken } from '@/runtime/runtime-backlog-client'
import { getProviderRuntimeContextKey } from '@/lib/provider-runtime-context'
import {
  getTaskSourceCacheScope,
  getTaskSourceRuntimeSettings,
  type TaskSourceContext
} from '../../../../shared/task-source-context'
import type { BacklogConnectionStatus } from '../../../../shared/types'

export const BACKLOG_CACHE_TTL_MS = 60_000

export function isFreshBacklogCacheEntry<T>(
  entry: CacheEntry<T> | undefined
): entry is CacheEntry<T> {
  return entry !== undefined && Date.now() - entry.fetchedAt < BACKLOG_CACHE_TTL_MS
}

export function looksLikeBacklogAuthError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return /authenticat|unauthorized|401/i.test(msg)
}

export type BacklogReadOptions = { sourceContext?: TaskSourceContext | null }
export type BacklogPatchOptions = { sourceContext?: TaskSourceContext | null }

export type BacklogReadScope = {
  settings: AppState['settings'] | TaskSourceContext | null
  contextKey: string
  cachePrefix: string | null
  explicitSource: boolean
}

let backlogStatusReadGeneration = 0
let backlogMutationGeneration = 0

export function bumpBacklogStatusReadGeneration(): number {
  backlogStatusReadGeneration += 1
  return backlogStatusReadGeneration
}

export function getBacklogStatusReadGeneration(): number {
  return backlogStatusReadGeneration
}

export function getBacklogMutationGeneration(): number {
  return backlogMutationGeneration
}

export function beginBacklogMutation(): number {
  backlogMutationGeneration += 1
  return backlogMutationGeneration
}

export function isCurrentBacklogMutation(generation: number): boolean {
  return generation === backlogMutationGeneration
}

export function isCurrentBacklogRuntimeContext(
  contextKey: string,
  settings: AppState['settings']
): boolean {
  return getProviderRuntimeContextKey(settings) === contextKey
}

export function canWriteBacklogReadResult(
  contextKey: string,
  mutationGeneration: number,
  settings: AppState['settings'],
  explicitSource = false
): boolean {
  return (
    mutationGeneration === backlogMutationGeneration &&
    (explicitSource || isCurrentBacklogRuntimeContext(contextKey, settings))
  )
}

export function getBacklogReadScope(
  settings: AppState['settings'],
  sourceContext?: TaskSourceContext | null
): BacklogReadScope {
  if (!sourceContext) {
    return {
      settings,
      contextKey: getProviderRuntimeContextKey(settings),
      cachePrefix: null,
      explicitSource: false
    }
  }
  const runtimeSettings = getTaskSourceRuntimeSettings(sourceContext)
  return {
    settings: sourceContext,
    contextKey: `${getProviderRuntimeContextKey(runtimeSettings)}::${getTaskSourceCacheScope(sourceContext)}`,
    cachePrefix: getTaskSourceCacheScope(sourceContext),
    explicitSource: true
  }
}

export function scopedBacklogCacheKey(scope: BacklogReadScope, key: string): string {
  return scope.cachePrefix ? `${scope.cachePrefix}::${key}` : key
}

export async function revokeCachedBacklogProjectTokens(get: () => AppState): Promise<void> {
  const { settings } = get()
  const agentId = settings?.backlogAgentId
  const meta = settings?.backlogProjectTokenMeta
  if (!agentId || !meta || Object.keys(meta).length === 0) {
    return
  }
  await Promise.allSettled(
    Object.entries(meta).map(([projectId, { hashPrefix }]) =>
      backlogRevokeProjectAgentToken(settings, { projectId, agentId, hashPrefix })
    )
  )
}

export function applyBacklogReadError(
  get: () => AppState,
  set: (partial: { backlogStatus?: BacklogConnectionStatus }) => void,
  error: unknown
): void {
  if (isIntegrationCredentialDecryptionError(error)) {
    void get().checkBacklogConnection()
    return
  }
  if (looksLikeBacklogAuthError(error)) {
    set({ backlogStatus: { connected: false, viewer: null, serverUrl: null } })
  }
}
