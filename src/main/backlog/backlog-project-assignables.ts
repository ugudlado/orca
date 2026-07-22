import type { BacklogAssignable } from '../../shared/backlog-types'

export type BacklogAssignableUserInput = {
  id?: string | number
  name?: string
  memberships?: { projectId?: number | string; project_id?: number | string }[]
}

export type BacklogAssignableAgentInput = {
  id?: string | number
  name?: string
}

function membershipProjectId(membership: {
  projectId?: number | string
  project_id?: number | string
}): string | null {
  const raw = membership.projectId ?? membership.project_id
  if (raw === undefined || raw === null || raw === '') {
    return null
  }
  return String(raw)
}

/** True when a user membership row is for the given Backlog project (id/guid/ref string). */
export function backlogUserOnProject(user: BacklogAssignableUserInput, projectId: string): boolean {
  const target = projectId.trim()
  if (!target) {
    return false
  }
  const memberships = Array.isArray(user.memberships) ? user.memberships : []
  return memberships.some((membership) => {
    const mid = membershipProjectId(membership)
    if (mid === null) {
      return false
    }
    if (mid === target) {
      return true
    }
    const asNumber = Number(mid)
    const targetNumber = Number(target)
    return Number.isFinite(asNumber) && Number.isFinite(targetNumber) && asNumber === targetNumber
  })
}

function asRecordArray<T>(
  data: T[] | { users?: T[]; agents?: T[] } | null | undefined,
  key: 'users' | 'agents'
): T[] {
  if (Array.isArray(data)) {
    return data
  }
  if (!data || typeof data !== 'object') {
    return []
  }
  const nested = data[key]
  return Array.isArray(nested) ? nested : []
}

/** Mirror Backlog UI AssigneePicker: project members + agents granted on the project. */
export function buildBacklogProjectAssignables(args: {
  projectId: string
  usersRaw: unknown
  agentsRaw: unknown
}): BacklogAssignable[] {
  const users = asRecordArray(args.usersRaw as BacklogAssignableUserInput[], 'users')
  const agents = asRecordArray(args.agentsRaw as BacklogAssignableAgentInput[], 'agents')
  const assignables: BacklogAssignable[] = []
  const seenNames = new Set<string>()

  for (const user of users) {
    const name = typeof user.name === 'string' ? user.name.trim() : ''
    if (!name || !backlogUserOnProject(user, args.projectId)) {
      continue
    }
    const key = name.toLowerCase()
    if (seenNames.has(key)) {
      continue
    }
    seenNames.add(key)
    assignables.push({
      id: user.id !== undefined ? String(user.id) : name,
      name,
      kind: 'user'
    })
  }

  for (const agent of agents) {
    const name = typeof agent.name === 'string' ? agent.name.trim() : ''
    if (!name) {
      continue
    }
    const key = name.toLowerCase()
    if (seenNames.has(key)) {
      continue
    }
    seenNames.add(key)
    assignables.push({
      id: agent.id !== undefined ? String(agent.id) : name,
      name,
      kind: 'agent'
    })
  }

  return assignables.sort((a, b) => a.name.localeCompare(b.name))
}
