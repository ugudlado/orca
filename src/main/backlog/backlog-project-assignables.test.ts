import { describe, expect, it } from 'vitest'
import { backlogUserOnProject, buildBacklogProjectAssignables } from './backlog-project-assignables'

describe('backlogUserOnProject', () => {
  it('matches numeric and string project ids', () => {
    expect(backlogUserOnProject({ memberships: [{ projectId: 3 }] }, '3')).toBe(true)
    expect(backlogUserOnProject({ memberships: [{ projectId: '3' }] }, '3')).toBe(true)
    expect(backlogUserOnProject({ memberships: [{ project_id: 3 }] }, '3')).toBe(true)
    expect(backlogUserOnProject({ memberships: [{ projectId: 2 }] }, '3')).toBe(false)
  })
})

describe('buildBacklogProjectAssignables', () => {
  it('includes project members and granted agents like Backlog AssigneePicker', () => {
    expect(
      buildBacklogProjectAssignables({
        projectId: '7',
        usersRaw: [
          { id: 'u1', name: 'alice', memberships: [{ projectId: 7 }] },
          { id: 'u2', name: 'bob', memberships: [{ projectId: 9 }] }
        ],
        agentsRaw: [
          { id: 'a1', name: 'claude' },
          { id: 'a2', name: 'alice' }
        ]
      })
    ).toEqual([
      { id: 'u1', name: 'alice', kind: 'user' },
      { id: 'a1', name: 'claude', kind: 'agent' }
    ])
  })

  it('accepts wrapped payloads', () => {
    expect(
      buildBacklogProjectAssignables({
        projectId: '1',
        usersRaw: { users: [{ id: 'u1', name: 'sam', memberships: [{ projectId: 1 }] }] },
        agentsRaw: { agents: [{ id: 'a1', name: 'codex' }] }
      })
    ).toEqual([
      { id: 'a1', name: 'codex', kind: 'agent' },
      { id: 'u1', name: 'sam', kind: 'user' }
    ])
  })
})
