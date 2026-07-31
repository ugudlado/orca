// Why: shared IPC contract for the external `orchestrator` CLI's ORCHESTRATOR_NOTIFY_CMD
// hook (see docs/orchestrator-integration-design.md). Orca treats this payload as opaque —
// it must never be parsed beyond these fields, and no orchestrator step names or state-file
// contents may be interpreted here.
export type OrchestratorNotifyEventPayload = {
  event: string
  change_id: string
  schema?: string
  reason?: string
  state_yaml_path?: string
}
