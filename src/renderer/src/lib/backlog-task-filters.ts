/** Statuses treated as finished for Backlog Tasks status chips. */
export function isBacklogCompletedStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase()
  return (
    normalized === 'done' ||
    normalized === 'closed' ||
    normalized === 'cancelled' ||
    normalized === 'canceled' ||
    normalized === 'complete' ||
    normalized === 'completed'
  )
}

type BacklogTaskFilterable = {
  status: string
  assignee: { name: string } | null
}

/** Unique statuses from tasks, stable order: first-seen then localeCompare for ties. */
export function collectBacklogTaskStatuses(tasks: readonly { status: string }[]): string[] {
  const seen = new Map<string, string>()
  for (const task of tasks) {
    const trimmed = task.status.trim()
    if (!trimmed) {
      continue
    }
    const key = trimmed.toLowerCase()
    if (!seen.has(key)) {
      seen.set(key, trimmed)
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

export function filterBacklogTasks<T extends BacklogTaskFilterable>(
  tasks: readonly T[],
  options: {
    /** When non-empty, keep tasks whose status matches any selected value (case-insensitive). */
    statuses?: readonly string[]
    unassigned?: boolean
  }
): T[] {
  let result = [...tasks]
  const selectedStatuses = (options.statuses ?? [])
    .map((status) => status.trim().toLowerCase())
    .filter(Boolean)
  if (selectedStatuses.length > 0) {
    const allowed = new Set(selectedStatuses)
    result = result.filter((task) => allowed.has(task.status.trim().toLowerCase()))
  }
  if (options.unassigned) {
    result = result.filter((task) => !task.assignee)
  }
  return result
}
