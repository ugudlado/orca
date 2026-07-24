import { describe, expect, it } from 'vitest'
import { mapTask } from './backlog-task-field-mapping'

describe('mapTask field parity', () => {
  it('maps a fully-populated task response into BacklogTask', () => {
    const task = mapTask('1', 'http://localhost:6420', {
      id: 'TASK-1',
      title: 'Set up CI',
      status: 'Done',
      description: 'Configure CI.',
      assignee: { id: 'u1', name: 'alice' },
      labels: ['infra'],
      milestone: 'm-0',
      priority: 'high',
      epic: 'Launch Epic',
      dueDate: '2026-08-01',
      blocked: true,
      dependencies: ['TASK-0'],
      acceptanceCriteriaItems: [{ index: 1, text: 'Runs on push', checked: true }],
      implementationNotes: 'Used GitHub Actions.',
      documentation: ['https://example.com/doc'],
      commentCount: 3,
      createdDate: '2026-07-21T22:01:10.339Z',
      updatedDate: '2026-07-22T01:00:00.000Z',
      parentTaskId: 'TASK-0',
      parentTaskTitle: 'Epic parent'
    })

    expect(task).toMatchObject({
      id: 'TASK-1',
      priority: 'high',
      epic: 'Launch Epic',
      dueDate: '2026-08-01',
      blocked: true,
      dependencies: ['TASK-0'],
      implementationNotes: 'Used GitHub Actions.',
      documentation: ['https://example.com/doc'],
      commentCount: 3,
      createdAt: '2026-07-21T22:01:10.339Z',
      updatedAt: '2026-07-22T01:00:00.000Z',
      parentTaskId: 'TASK-0',
      parentTaskTitle: 'Epic parent'
    })
    expect(task.acceptanceCriteriaItems).toEqual([
      { index: 1, text: 'Runs on push', checked: true }
    ])
  })

  it('maps a task with every new field absent without throwing', () => {
    const task = mapTask('1', 'http://localhost:6420', {
      id: 'TASK-2',
      title: 'Bare task',
      status: 'To Do',
      assignee: null
    })

    expect(task).toMatchObject({
      id: 'TASK-2',
      priority: undefined,
      epic: undefined,
      dueDate: undefined,
      blocked: false,
      dependencies: [],
      acceptanceCriteriaItems: [],
      implementationNotes: undefined,
      documentation: [],
      commentCount: 0,
      parentTaskId: undefined,
      parentTaskTitle: undefined,
      subtaskSummaries: []
    })
  })
})
