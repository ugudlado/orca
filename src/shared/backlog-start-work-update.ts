import { buildBacklogOrcaAgentName } from './backlog-orca-agent-name'

/** Status/assignee applied after a successful Backlog start-work launch. */
export function buildBacklogStartWorkTaskUpdate(hostname: string): {
  status: string
  assignee: string
} {
  return {
    status: 'In Progress',
    assignee: buildBacklogOrcaAgentName(hostname)
  }
}
