import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import type * as Os from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const OLD_FETCH = globalThis.fetch
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

async function loadClientModule() {
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
  return import('./client')
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

beforeEach(() => {
  tempHome = mkdtempLike('orca-backlog-client-')
  netFetchMock.mockReset()
  resolveProxyMock.mockReset()
  setProxyMock.mockReset()
  closeAllConnectionsMock.mockReset()
  resolveProxyMock.mockResolvedValue('DIRECT')
  globalThis.fetch = vi.fn(async () => {
    throw new Error('fetch should not be called')
  }) as typeof fetch
  vi.restoreAllMocks()
})

afterEach(() => {
  globalThis.fetch = OLD_FETCH
})

describe('Backlog client', () => {
  it('normalizes server URLs without a protocol to http', async () => {
    const backlog = await loadClientModule()
    expect(backlog.normalizeBacklogServerUrl('localhost:6420')).toBe('http://localhost:6420')
    expect(backlog.normalizeBacklogServerUrl('http://localhost:6420/')).toBe(
      'http://localhost:6420'
    )
  })

  it('appends project query parameters for project-scoped routes', async () => {
    const backlog = await loadClientModule()
    expect(backlog.appendProjectQuery('/api/tasks', 'alpha')).toBe('/api/tasks?project=alpha')
    expect(backlog.appendProjectQuery('/api/tasks?status=Todo', 'alpha')).toBe(
      '/api/tasks?status=Todo&project=alpha'
    )
    expect(backlog.appendProjectQuery('/api/me')).toBe('/api/me')
  })

  it('sends Bearer auth on backlog requests', async () => {
    writeConnectedState('http://localhost:6420', 'user-token')
    netFetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )
    const backlog = await loadClientModule()

    await backlog.backlogRequest('/api/tasks', undefined, { project: 'proj-1' })

    expect(netFetchMock).toHaveBeenCalledWith(
      'http://localhost:6420/api/tasks?project=proj-1',
      expect.objectContaining({ headers: expect.any(Headers) })
    )
    const headers = netFetchMock.mock.calls[0]?.[1]?.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer user-token')
  })
})
