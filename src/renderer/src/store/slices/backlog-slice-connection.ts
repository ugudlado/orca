import type { StateCreator } from 'zustand'
import type { AppState } from '../types'
import type { BacklogConnectResult } from '../../../../shared/types'
import { backlogConnect, backlogDisconnect, backlogStatus } from '@/runtime/runtime-backlog-client'
import { getProviderRuntimeContextKey } from '@/lib/provider-runtime-context'
import { translate } from '@/i18n/i18n'
import {
  beginBacklogMutation,
  bumpBacklogStatusReadGeneration,
  getBacklogMutationGeneration,
  getBacklogStatusReadGeneration,
  isCurrentBacklogMutation,
  isCurrentBacklogRuntimeContext,
  revokeCachedBacklogProjectTokens
} from './backlog-slice-helpers'

type BacklogSliceSet = Parameters<StateCreator<AppState, [], [], AppState>>[0]
type BacklogSliceGet = Parameters<StateCreator<AppState, [], [], AppState>>[1]

export function createBacklogConnectionActions(set: BacklogSliceSet, get: BacklogSliceGet) {
  return {
    checkBacklogConnection: async (): Promise<void> => {
      const contextKey = getProviderRuntimeContextKey(get().settings)
      const statusReadGeneration = bumpBacklogStatusReadGeneration()
      const mutationGeneration = getBacklogMutationGeneration()
      if (get().backlogStatusContextKey !== contextKey) {
        set({ backlogStatusChecked: false })
      }
      try {
        const status = await backlogStatus(get().settings)
        if (
          mutationGeneration !== getBacklogMutationGeneration() ||
          statusReadGeneration !== getBacklogStatusReadGeneration() ||
          getProviderRuntimeContextKey(get().settings) !== contextKey
        ) {
          return
        }
        const prev = get().backlogStatus
        if (
          prev.connected !== status.connected ||
          prev.credentialError !== status.credentialError ||
          prev.serverUrl !== status.serverUrl ||
          prev.viewer?.id !== status.viewer?.id
        ) {
          set({
            backlogStatus: status,
            backlogStatusChecked: true,
            backlogStatusContextKey: contextKey
          })
        } else if (!get().backlogStatusChecked) {
          set({ backlogStatusChecked: true, backlogStatusContextKey: contextKey })
        } else if (get().backlogStatusContextKey !== contextKey) {
          set({ backlogStatusContextKey: contextKey })
        }
      } catch {
        if (
          mutationGeneration !== getBacklogMutationGeneration() ||
          statusReadGeneration !== getBacklogStatusReadGeneration() ||
          getProviderRuntimeContextKey(get().settings) !== contextKey
        ) {
          return
        }
        if (get().backlogStatus.connected) {
          set({
            backlogStatus: { connected: false, viewer: null, serverUrl: null },
            backlogStatusChecked: true,
            backlogStatusContextKey: contextKey
          })
        } else if (!get().backlogStatusChecked) {
          set({ backlogStatusChecked: true, backlogStatusContextKey: contextKey })
        } else if (get().backlogStatusContextKey !== contextKey) {
          set({ backlogStatusContextKey: contextKey })
        }
      }
    },

    connectBacklog: async (args: {
      serverUrl: string
      token: string
    }): Promise<BacklogConnectResult> => {
      const requestGeneration = beginBacklogMutation()
      const contextKey = getProviderRuntimeContextKey(get().settings)
      try {
        const result = await backlogConnect(get().settings, args)
        if (
          result.ok &&
          isCurrentBacklogMutation(requestGeneration) &&
          isCurrentBacklogRuntimeContext(contextKey, get().settings)
        ) {
          set({
            backlogStatus: {
              connected: true,
              viewer: result.viewer,
              serverUrl: result.serverUrl
            },
            backlogStatusChecked: true,
            backlogStatusContextKey: contextKey
          })
          await get().updateSettings({ backlogServerUrl: result.serverUrl })
          void get().checkBacklogConnection()
        } else if (result.ok) {
          return {
            ok: false as const,
            error: translate(
              'auto.store.slices.backlog.connectSuperseded',
              'Backlog connection was superseded by a newer request.'
            )
          }
        }
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Connection failed'
        return { ok: false as const, error: message }
      }
    },

    disconnectBacklog: async (): Promise<void> => {
      const requestGeneration = beginBacklogMutation()
      const contextKey = getProviderRuntimeContextKey(get().settings)
      await revokeCachedBacklogProjectTokens(get)
      await backlogDisconnect(get().settings)
      if (
        !isCurrentBacklogMutation(requestGeneration) ||
        !isCurrentBacklogRuntimeContext(contextKey, get().settings)
      ) {
        return
      }
      await get().updateSettings({ backlogAgentId: null, backlogProjectTokenMeta: {} })
      set({
        backlogStatus: { connected: false, viewer: null, serverUrl: null },
        backlogProjectsCache: null,
        backlogTasksByProject: {},
        backlogTaskCache: {},
        backlogStatusChecked: true,
        backlogStatusContextKey: contextKey
      })
    }
  }
}
