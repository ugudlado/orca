import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runOrchestratorWorkflow } from './run-orchestrator-workflow'

type MockStoreState = {
  worktreesByRepo: Record<string, { id: string; hostId?: string; isMainWorktree: boolean }[]>
  createTab: ReturnType<typeof vi.fn>
  queueTabStartupCommand: ReturnType<typeof vi.fn>
  setActiveTabType: ReturnType<typeof vi.fn>
  setTabBarOrder: ReturnType<typeof vi.fn>
  tabsByWorktree: Record<string, { id: string }[]>
  openFiles: { id: string; worktreeId: string }[]
  browserTabsByWorktree: Record<string, { id: string }[]>
  tabBarOrderByWorktree: Record<string, string[]>
}

let mockState: MockStoreState
const getNotifyEndpointMock = vi.fn()

vi.mock('@/store', () => ({
  useAppStore: {
    getState: () => mockState
  }
}))

function createStoreState(worktreesByRepo: MockStoreState['worktreesByRepo']): MockStoreState {
  return {
    worktreesByRepo,
    createTab: vi.fn(() => ({ id: 'tab-new' })),
    queueTabStartupCommand: vi.fn(),
    setActiveTabType: vi.fn(),
    setTabBarOrder: vi.fn(),
    tabsByWorktree: {},
    openFiles: [],
    browserTabsByWorktree: {},
    tabBarOrderByWorktree: {}
  }
}

describe('runOrchestratorWorkflow', () => {
  beforeEach(() => {
    getNotifyEndpointMock.mockReset()
    getNotifyEndpointMock.mockResolvedValue({ port: 1234, token: 'tok' })
    ;(globalThis as { window: unknown }).window = {
      api: { orchestrator: { getNotifyEndpoint: getNotifyEndpointMock } }
    }
  })

  it('returns no-worktree when the repo has no worktrees', async () => {
    mockState = createStoreState({})
    const result = await runOrchestratorWorkflow({
      task: { id: 'ORC-117' },
      repoId: 'repo-1',
      schema: 'feature'
    })
    expect(result).toEqual({ ok: false, reason: 'no-worktree' })
    expect(mockState.createTab).not.toHaveBeenCalled()
  })

  it('returns invalid-ticket-id (no tab) for shell-unsafe task ids', async () => {
    mockState = createStoreState({
      'repo-1': [{ id: 'wt-main', isMainWorktree: true }]
    })
    const result = await runOrchestratorWorkflow({
      task: { id: 'ORC-1; rm -rf ~' },
      repoId: 'repo-1',
      schema: 'feature'
    })
    expect(result).toEqual({ ok: false, reason: 'invalid-ticket-id' })
    expect(mockState.createTab).not.toHaveBeenCalled()
  })

  it('spawns on the main worktree when one is marked isMainWorktree', async () => {
    mockState = createStoreState({
      'repo-1': [
        { id: 'wt-side', isMainWorktree: false },
        { id: 'wt-main', isMainWorktree: true }
      ]
    })
    const result = await runOrchestratorWorkflow({
      task: { id: 'ORC-117' },
      repoId: 'repo-1',
      schema: 'feature'
    })
    expect(result).toEqual({ ok: true, tabId: 'tab-new' })
    expect(mockState.createTab).toHaveBeenCalledWith('wt-main', undefined, undefined, {
      quickCommandLabel: 'orchestrator feature'
    })
  })

  it('falls back to the first worktree when none is marked main', async () => {
    mockState = createStoreState({
      'repo-1': [{ id: 'wt-only', isMainWorktree: false }]
    })
    await runOrchestratorWorkflow({ task: { id: 'ORC-117' }, repoId: 'repo-1', schema: 'patch' })
    expect(mockState.createTab).toHaveBeenCalledWith('wt-only', undefined, undefined, {
      quickCommandLabel: 'orchestrator patch'
    })
  })

  it('includes ORCHESTRATOR_NOTIFY_CMD in the queued env for a local worktree', async () => {
    mockState = createStoreState({
      'repo-1': [{ id: 'wt-main', isMainWorktree: true }]
    })
    await runOrchestratorWorkflow({ task: { id: 'ORC-117' }, repoId: 'repo-1', schema: 'feature' })
    expect(getNotifyEndpointMock).toHaveBeenCalled()
    const call = mockState.queueTabStartupCommand.mock.calls[0]
    expect(call[1].env.ORCHESTRATOR_NOTIFY_CMD).toContain('127.0.0.1:1234')
  })

  it('omits ORCHESTRATOR_NOTIFY_CMD for a non-local (SSH/runtime) worktree', async () => {
    mockState = createStoreState({
      'repo-1': [{ id: 'wt-main', isMainWorktree: true, hostId: 'ssh:host-1' }]
    })
    await runOrchestratorWorkflow({ task: { id: 'ORC-117' }, repoId: 'repo-1', schema: 'feature' })
    expect(getNotifyEndpointMock).not.toHaveBeenCalled()
    const call = mockState.queueTabStartupCommand.mock.calls[0]
    expect(call[1].env).toEqual({})
  })
})
