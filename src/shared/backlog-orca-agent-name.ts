/** Backlog agent entity name used for token mint and task assignee updates. */
export function buildBacklogOrcaAgentName(hostname: string): string {
  const trimmed = hostname.trim()
  if (!trimmed) {
    return 'orca-local'
  }
  return `orca-${trimmed}`
}
