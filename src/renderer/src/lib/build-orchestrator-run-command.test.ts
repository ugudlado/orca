import { describe, expect, it } from 'vitest'
import { buildOrchestratorRunCommand } from './build-orchestrator-run-command'

describe('buildOrchestratorRunCommand', () => {
  it('builds the run command with no env when there is no notify endpoint', () => {
    const result = buildOrchestratorRunCommand({ ticketId: 'ORC-117', schema: 'feature' })
    expect(result.command).toBe('orchestrator run ORC-117 --schema feature')
    expect(result.env).toEqual({})
  })

  it('adds ORCHESTRATOR_NOTIFY_CMD pointing at the loopback endpoint when provided', () => {
    const result = buildOrchestratorRunCommand({
      ticketId: 'ORC-117',
      schema: 'bugfix',
      notifyEndpoint: { port: 54321, token: 'abc-123' }
    })
    expect(result.env.ORCHESTRATOR_NOTIFY_CMD).toContain(
      'http://127.0.0.1:54321/orchestrator-event'
    )
    expect(result.env.ORCHESTRATOR_NOTIFY_CMD).toContain('x-orca-orchestrator-token:abc-123')
  })

  it('never emits shell quoting so the command survives POSIX and Windows shells alike', () => {
    const result = buildOrchestratorRunCommand({
      ticketId: 'ORC-117',
      schema: 'design',
      notifyEndpoint: { port: 1, token: 'tok' }
    })
    expect(result.command).not.toMatch(/['"]/)
    expect(result.env.ORCHESTRATOR_NOTIFY_CMD).not.toMatch(/['"]/)
  })

  it('never references orchestrator step names or state-file paths — boundary rule', () => {
    const result = buildOrchestratorRunCommand({
      ticketId: 'ORC-117',
      schema: 'implement',
      notifyEndpoint: { port: 1, token: 'tok' }
    })
    const combined = `${result.command} ${result.env.ORCHESTRATOR_NOTIFY_CMD}`
    expect(combined).not.toMatch(/state\.yaml|_state\.yaml|explore|design-review|ticket-qa/)
  })
})
