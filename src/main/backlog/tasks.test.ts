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

async function loadTasksModule() {
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
  return import('./tasks')
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
  tempHome = mkdtempLike('orca-backlog-tasks-')
  netFetchMock.mockReset()
  resolveProxyMock.mockResolvedValue('DIRECT')
})

describe('getTask', () => {
  it('fetches a task and maps it through mapTask', async () => {
    writeConnectedState('http://localhost:6420', 'user-token')
    netFetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: 'TASK-1',
        title: 'Set up CI',
        status: 'Done',
        description: 'Configure CI.',
        assignee: { id: 'u1', name: 'alice' }
      })
    )

    const tasks = await loadTasksModule()
    const task = await tasks.getTask('1', 'TASK-1')

    expect(task).toMatchObject({ id: 'TASK-1', title: 'Set up CI', status: 'Done' })
  })

  it('returns null on a failed request', async () => {
    writeConnectedState('http://localhost:6420', 'user-token')
    netFetchMock.mockResolvedValueOnce(new Response('not found', { status: 404 }))

    const tasks = await loadTasksModule()
    const task = await tasks.getTask('1', 'TASK-missing')

    expect(task).toBeNull()
  })
})

describe('updateTask payload shape', () => {
  it('serializes only dueDate alongside the existing editable fields', async () => {
    writeConnectedState('http://localhost:6420', 'user-token')
    netFetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    const tasks = await loadTasksModule()
    const result = await tasks.updateTask('1', 'TASK-1', { dueDate: '2026-09-01' })

    expect(result.ok).toBe(true)
    const [, init] = netFetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({ dueDate: '2026-09-01' })
  })
})
