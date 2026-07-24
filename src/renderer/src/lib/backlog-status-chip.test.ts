import { describe, expect, it } from 'vitest'
import { getBacklogStatusChipClass } from './backlog-status-chip'

describe('getBacklogStatusChipClass', () => {
  it('maps known statuses to fixed tones', () => {
    expect(getBacklogStatusChipClass('To Do')).toContain('sky')
    expect(getBacklogStatusChipClass('In Progress')).toContain('amber')
    expect(getBacklogStatusChipClass('Done')).toContain('primary')
    expect(getBacklogStatusChipClass('Blocked')).toContain('rose')
  })

  it('is stable for custom statuses', () => {
    expect(getBacklogStatusChipClass('Waiting on Design')).toBe(
      getBacklogStatusChipClass('waiting on design')
    )
  })
})
