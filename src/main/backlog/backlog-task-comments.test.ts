import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import type * as Os from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { netFetchMock, resolveProxyMock, setProxyMock, closeAllConnectionsMock } = vi.hoisted(
  () => ({
    netFetchMock: vi.fn(),
    resolveProxyMock: vi.fn(),
    setProxyMock: vi.fn(),
    closeAllConnectionsMock: vi.fn()
  })
)

let tempHome = ''

function mkdtempLike(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix))
}

async function loadCommentsModule() {
  vi.resetModules()
  vi.doMock('electron', () => ({
    net: { fetch: netFetchMock },
    safeStorage: {
      isEncryptionAvailable: () => false,
      encryptString: (value: string) => Buffer.from(value),
      decryptString: (value: Buffer) => value.toString('utf-8')
    },
    session: {
      defaultSession: {
        closeAllConnections: closeAllConnectionsMock,
        resolveProxy: resolveProxyMock,
        setProxy: setProxyMock
      }
    }
  }))
  vi.doMock('os', async () => {
    const actual = await vi.importActual<typeof Os>('os')
    return { ...actual, homedir: () => tempHome }
  })
  return import('./backlog-task-comments')
}

function writeConnectedState(serverUrl: string, token: string): void {
  const orcaDir = join(tempHome, '.orca')
  mkdirSync(orcaDir, { recursive: true })
  writeFileSync(join(orcaDir, 'backlog-token.enc'), token, { encoding: 'utf-8', mode: 0o600 })
  writeFileSync(
    join(orcaDir, 'backlog-connection.json'),
    JSON.stringify({
      version: 1,
      serverUrl,
      viewer: { id: 'u1', name: 'Ada', operator: true, admin: false }
    }),
    { encoding: 'utf-8' }
  )
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

beforeEach(() => {
  tempHome = mkdtempLike('orca-backlog-task-comments-')
  netFetchMock.mockReset()
  resolveProxyMock.mockResolvedValue('DIRECT')
})

describe('listTaskComments', () => {
  it('fetches comment-type history events for a task', async () => {
    writeConnectedState('http://localhost:6420', 'user-token')
    netFetchMock.mockResolvedValueOnce(
      jsonResponse({
        events: [
          {
            id: 'h1',
            ts: '2026-07-22T00:00:00.000Z',
            type: 'comment',
            payload: { body: 'Looks good', userId: 'u1' }
          },
          {
            id: 'h2',
            ts: '2026-07-22T00:05:00.000Z',
            type: 'state_transition',
            payload: {}
          }
        ]
      })
    )

    const comments = await loadCommentsModule()
    const result = await comments.listTaskComments('1', 'TASK-1')

    expect(result).toEqual([
      { id: 'h1', ts: '2026-07-22T00:00:00.000Z', body: 'Looks good', authorName: null }
    ])
    const [url] = netFetchMock.mock.calls[0] as [string]
    expect(url).toContain('/api/history?')
    expect(url).toContain('taskId=TASK-1')
    expect(url).toContain('type=comment')
  })
})
