import { describe, expect, it } from 'vitest'
import {
  collectBacklogTaskStatuses,
  filterBacklogTasks,
  isBacklogCompletedStatus
} from './backlog-task-filters'

describe('isBacklogCompletedStatus', () => {
  it('matches terminal statuses case-insensitively', () => {
    expect(isBacklogCompletedStatus('Done')).toBe(true)
    expect(isBacklogCompletedStatus('closed')).toBe(true)
    expect(isBacklogCompletedStatus('In Progress')).toBe(false)
    expect(isBacklogCompletedStatus('To Do')).toBe(false)
  })
})

describe('collectBacklogTaskStatuses', () => {
  it('returns unique statuses sorted', () => {
    expect(
      collectBacklogTaskStatuses([
        { status: 'Done' },
        { status: 'To Do' },
        { status: 'to do' },
        { status: 'In Progress' },
        { status: '  ' }
      ])
    ).toEqual(['Done', 'In Progress', 'To Do'])
  })
})

describe('filterBacklogTasks', () => {
  const tasks = [
    { id: '1', status: 'To Do', assignee: null },
    { id: '2', status: 'Done', assignee: null },
    { id: '3', status: 'In Progress', assignee: { name: 'orca-host' } },
    { id: '4', status: 'Done', assignee: { name: 'alice' } }
  ]

  it('filters by selected statuses', () => {
    expect(
      filterBacklogTasks(tasks, { statuses: ['To Do', 'In Progress'] }).map((t) => t.id)
    ).toEqual(['1', '3'])
  })

  it('treats empty statuses as no status filter', () => {
    expect(filterBacklogTasks(tasks, { statuses: [] }).map((t) => t.id)).toEqual([
      '1',
      '2',
      '3',
      '4'
    ])
  })

  it('filters unassigned', () => {
    expect(filterBacklogTasks(tasks, { unassigned: true }).map((t) => t.id)).toEqual(['1', '2'])
  })

  it('composes status and unassigned', () => {
    expect(
      filterBacklogTasks(tasks, { statuses: ['Done'], unassigned: true }).map((t) => t.id)
    ).toEqual(['2'])
  })
})
