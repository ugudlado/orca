// Why: minimal loopback listener for `orchestrator run`'s ORCHESTRATOR_NOTIFY_CMD hook.
// Deliberately separate from AgentHookServer (src/main/agent-hooks/server.ts) — that class
// owns agent-status semantics and hook-source routing; this only relays one opaque JSON
// payload per the orchestrator/orca integration boundary (see docs/orchestrator-integration-design.md):
// orca never parses orchestrator stdout or state files, so this module must not interpret
// `event`/`schema`/`reason` beyond passing them through.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import { readRequestBody } from '../../shared/agent-hook-listener'
import type { OrchestratorNotifyEventPayload } from '../../shared/orchestrator-cli-notify'

const NOTIFY_TOKEN_HEADER = 'x-orca-orchestrator-token'
const NOTIFY_PATHNAME = '/orchestrator-event'

function isOrchestratorNotifyEventPayload(value: unknown): value is OrchestratorNotifyEventPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { event?: unknown }).event === 'string' &&
    typeof (value as { change_id?: unknown }).change_id === 'string'
  )
}

class OrchestratorNotifyServer {
  private server: Server | null = null
  private port = 0
  private token = ''
  private listener: ((payload: OrchestratorNotifyEventPayload) => void) | null = null

  setListener(listener: (payload: OrchestratorNotifyEventPayload) => void): void {
    this.listener = listener
  }

  /** Lazily starts the listener and returns its loopback endpoint. Safe to call repeatedly. */
  async getEndpoint(): Promise<{ port: number; token: string }> {
    if (this.server) {
      return { port: this.port, token: this.token }
    }
    this.token = randomUUID()
    const handleRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
      const pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname
      if (req.method !== 'POST' || pathname !== NOTIFY_PATHNAME) {
        res.writeHead(404)
        res.end()
        return
      }
      if (req.headers[NOTIFY_TOKEN_HEADER] !== this.token) {
        res.writeHead(403)
        res.end()
        return
      }
      try {
        const body = await readRequestBody(req)
        if (isOrchestratorNotifyEventPayload(body)) {
          this.listener?.(body)
        }
      } catch {
        // Why: fail open — a malformed notify payload must never break the orchestrator run.
      }
      res.writeHead(204)
      res.end()
    }
    this.server = createServer((req, res) => {
      void handleRequest(req, res)
    })
    await new Promise<void>((resolve, reject) => {
      const onError = (err: Error): void => reject(err)
      this.server!.once('error', onError)
      this.server!.listen(0, '127.0.0.1', () => {
        this.server!.off('error', onError)
        this.server!.on('error', (err) => {
          console.error('[orchestrator-notify] server error', err)
        })
        const address = this.server!.address()
        if (address && typeof address === 'object') {
          this.port = address.port
        }
        resolve()
      })
    })
    return { port: this.port, token: this.token }
  }

  stop(): void {
    this.server?.close()
    this.server = null
    this.port = 0
    this.token = ''
  }
}

export const orchestratorNotifyServer = new OrchestratorNotifyServer()
