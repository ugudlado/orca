import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import type * as Os from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

function writeUserConnection(): void {
  const orcaDir = join(tempHome, '.orca')
  mkdirSync(orcaDir, { recursive: true })
  writeFileSync(join(orcaDir, 'backlog-token.enc'), 'user-token', { encoding: 'utf-8' })
  writeFileSync(
    join(orcaDir, 'backlog-connection.json'),
    JSON.stringify({
      version: 1,
      serverUrl: 'http://localhost:6420',
      viewer: { id: 'u1', name: 'Ada', operator: true, admin: false }
    })
  )
}

function projectTokenPath(projectId: string): string {
  const safeId = Buffer.from(projectId).toString('base64url')
  return join(tempHome, '.orca', 'backlog-project-tokens', `${safeId}.enc`)
}

async function loadAgentTokensModule() {
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
  return import('./agent-tokens')
}

beforeEach(() => {
  tempHome = mkdtempLike('orca-backlog-agent-tokens-')
  netFetchMock.mockReset()
  resolveProxyMock.mockResolvedValue('DIRECT')
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Backlog agent tokens', () => {
  it('derives hashPrefix from trimmed token sha256', async () => {
    const agentTokens = await loadAgentTokensModule()
    expect(agentTokens.hashPrefixForToken('  secret-token  ')).toBe(
      agentTokens.hashPrefixForToken('secret-token')
    )
    expect(agentTokens.hashPrefixForToken('secret-token')).toHaveLength(8)
  })

  it('reuses cached project token without minting again', async () => {
    writeUserConnection()
    const projectId = 'project-a'
    mkdirSync(join(tempHome, '.orca', 'backlog-project-tokens'), { recursive: true })
    writeFileSync(projectTokenPath(projectId), 'cached-agent-token', { encoding: 'utf-8' })

    netFetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )

    const agentTokens = await loadAgentTokensModule()
    const result = await agentTokens.ensureProjectAgentToken({
      agentId: 'agent-1',
      projectId
    })

    expect(result.token).toBe('cached-agent-token')
    expect(netFetchMock).toHaveBeenCalledTimes(1)
    expect(netFetchMock.mock.calls[0]?.[0]).toBe(
      'http://localhost:6420/api/tasks?project=project-a'
    )
    const headers = netFetchMock.mock.calls[0]?.[1]?.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer cached-agent-token')
  })

  it('mints and persists when cache is missing', async () => {
    writeUserConnection()
    netFetchMock
      .mockResolvedValueOnce(
        new Response(null, {
          status: 204
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'fresh-agent-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

    const agentTokens = await loadAgentTokensModule()
    const result = await agentTokens.ensureProjectAgentToken({
      agentId: 'agent-1',
      projectId: 'project-b'
    })

    expect(result.token).toBe('fresh-agent-token')
    expect(readFileSync(projectTokenPath('project-b'), 'utf-8')).toBe('fresh-agent-token')
    expect(netFetchMock).toHaveBeenCalledWith(
      'http://localhost:6420/api/agents/agent-1/tokens',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('drops cache and re-mints when the cached token is revoked (401)', async () => {
    writeUserConnection()
    const projectId = 'project-c'
    mkdirSync(join(tempHome, '.orca', 'backlog-project-tokens'), { recursive: true })
    writeFileSync(projectTokenPath(projectId), 'stale-agent-token', { encoding: 'utf-8' })

    netFetchMock
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'remined-agent-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

    const agentTokens = await loadAgentTokensModule()
    const result = await agentTokens.ensureProjectAgentToken({
      agentId: 'agent-1',
      projectId
    })

    expect(result.token).toBe('remined-agent-token')
    expect(readFileSync(projectTokenPath(projectId), 'utf-8')).toBe('remined-agent-token')
    expect(netFetchMock).toHaveBeenCalledWith(
      'http://localhost:6420/api/agents/agent-1/tokens',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('revokes remotely and clears the local cache even when the DELETE call fails', async () => {
    writeUserConnection()
    const projectId = 'project-d'
    mkdirSync(join(tempHome, '.orca', 'backlog-project-tokens'), { recursive: true })
    writeFileSync(projectTokenPath(projectId), 'agent-token-to-revoke', { encoding: 'utf-8' })

    netFetchMock.mockResolvedValueOnce(new Response('server error', { status: 500 }))

    const agentTokens = await loadAgentTokensModule()
    await agentTokens.revokeProjectAgentToken({
      agentId: 'agent-1',
      projectId,
      hashPrefix: 'abcd1234'
    })

    expect(netFetchMock).toHaveBeenCalledWith(
      'http://localhost:6420/api/agents/agent-1/tokens/abcd1234',
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(() => readFileSync(projectTokenPath(projectId), 'utf-8')).toThrow()
  })
})
