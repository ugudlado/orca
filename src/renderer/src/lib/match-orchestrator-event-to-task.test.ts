import { describe, expect, it } from 'vitest'
import { matchOrchestratorEventToTask } from './match-orchestrator-event-to-task'

describe('matchOrchestratorEventToTask', () => {
  it('matches by exact change_id/task id equality', () => {
    const match = matchOrchestratorEventToTask({ event: 'blocked', change_id: 'ORC-117' }, [
      { id: 'ORC-116' },
      { id: 'ORC-117' }
    ])
    expect(match).toEqual({ id: 'ORC-117' })
  })

  it('returns null (not throw) when no loaded task matches', () => {
    const match = matchOrchestratorEventToTask({ event: 'blocked', change_id: 'ORC-999' }, [
      { id: 'ORC-116' }
    ])
    expect(match).toBeNull()
  })

  it('returns null when no tasks are loaded', () => {
    const match = matchOrchestratorEventToTask({ event: 'blocked', change_id: 'ORC-117' }, [])
    expect(match).toBeNull()
  })
})
