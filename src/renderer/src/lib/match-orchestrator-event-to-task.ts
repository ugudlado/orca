import type { BacklogTask } from '../../../shared/backlog-types'
import type { OrchestratorNotifyEventPayload } from '../../../shared/orchestrator-cli-notify'

/**
 * Matches a notify event's `change_id` against currently-loaded backlog tasks by exact
 * string equality — `change_id` is the same ticket id string used to build the
 * `orchestrator run <ticketId>` command, so no transformation is needed. Returns null
 * (log-and-drop, per design doc) when no loaded task matches.
 */
export function matchOrchestratorEventToTask(
  event: OrchestratorNotifyEventPayload,
  loadedTasks: readonly Pick<BacklogTask, 'id'>[]
): Pick<BacklogTask, 'id'> | null {
  return loadedTasks.find((task) => task.id === event.change_id) ?? null
}
