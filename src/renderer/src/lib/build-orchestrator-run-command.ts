// Why: pure command/env construction for the "Run workflow" ticket action (see
// docs/orchestrator-integration-design.md). Kept side-effect-free and separate from the
// spawn call (run-orchestrator-workflow.ts) so the shell-safety invariants below are
// unit-testable without a PTY/Electron harness.
export const ORCHESTRATOR_WORKFLOW_SCHEMAS = [
  'feature',
  'bugfix',
  'patch',
  'design',
  'implement'
] as const

export type OrchestratorWorkflowSchema = (typeof ORCHESTRATOR_WORKFLOW_SCHEMAS)[number]

export type BuildOrchestratorRunCommandArgs = {
  ticketId: string
  schema: OrchestratorWorkflowSchema
  /** Loopback notify endpoint; omit when the run's terminal won't reach the Electron host (e.g. SSH/runtime execution — see resolveOrchestratorNotifyEnv). */
  notifyEndpoint?: { port: number; token: string }
}

export type OrchestratorRunCommand = {
  command: string
  env: Record<string, string>
}

/**
 * Builds the `orchestrator run` invocation. Never references orchestrator step names or
 * state-file contents — per the integration boundary, orca only shells out and consumes the
 * one opaque notify JSON payload.
 */
// Why: ticket ids come from the backlog service (a remote trust boundary) and are
// interpolated into a shell command — restrict to characters that are inert in
// POSIX shells and cmd/PowerShell rather than attempting per-shell quoting.
const SAFE_TICKET_ID = /^[A-Za-z0-9._-]+$/

export function buildOrchestratorRunCommand({
  ticketId,
  schema,
  notifyEndpoint
}: BuildOrchestratorRunCommandArgs): OrchestratorRunCommand {
  if (!SAFE_TICKET_ID.test(ticketId)) {
    throw new Error(
      `Refusing to run workflow: ticket id contains unsupported characters (${JSON.stringify(ticketId)})`
    )
  }
  const command = `orchestrator run ${ticketId} --schema ${schema}`
  if (!notifyEndpoint) {
    return { command, env: {} }
  }
  // Why: no quoting — the token is a UUID (no shell metacharacters), so this stays
  // portable across POSIX shells and Windows cmd/PowerShell without escaping rules.
  const notifyCmd = `curl -s -X POST -H content-type:application/json -H x-orca-orchestrator-token:${notifyEndpoint.token} --data-binary @- http://127.0.0.1:${notifyEndpoint.port}/orchestrator-event`
  return {
    command,
    env: { ORCHESTRATOR_NOTIFY_CMD: notifyCmd }
  }
}
