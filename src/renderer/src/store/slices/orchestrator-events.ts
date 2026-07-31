import type { StateCreator } from 'zustand'
import type { AppState } from '../types'
import type { OrchestratorNotifyEventPayload } from '../../../../shared/orchestrator-cli-notify'

/** Latest notify event per matched ticket id, for the backlog row badge. Display-only —
 *  never interpreted beyond the opaque payload fields (see docs/orchestrator-integration-design.md). */
export type OrchestratorEventsSlice = {
  orchestratorEventByTaskId: Record<string, OrchestratorNotifyEventPayload>
  setOrchestratorEventForTask: (taskId: string, event: OrchestratorNotifyEventPayload) => void
  dismissOrchestratorEventForTask: (taskId: string) => void
}

export const createOrchestratorEventsSlice: StateCreator<
  AppState,
  [],
  [],
  OrchestratorEventsSlice
> = (set) => ({
  orchestratorEventByTaskId: {},

  setOrchestratorEventForTask: (taskId, event) =>
    set((state) => ({
      orchestratorEventByTaskId: { ...state.orchestratorEventByTaskId, [taskId]: event }
    })),

  dismissOrchestratorEventForTask: (taskId) =>
    set((state) => {
      if (!(taskId in state.orchestratorEventByTaskId)) {
        return state
      }
      const next = { ...state.orchestratorEventByTaskId }
      delete next[taskId]
      return { orchestratorEventByTaskId: next }
    })
})
