import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { safeStorage } from 'electron'
import {
  CredentialDecryptionError,
  credentialFileHasContent,
  readStoredCredentialToken
} from '../integration-credential-file'
import { BacklogApiError, backlogRequest, isAuthError } from './client'

export type BacklogMintedProjectToken = {
  token: string
  hashPrefix: string
}

type AgentRecord = {
  id: string
  name?: string
}

type AgentsResponse = {
  agents?: AgentRecord[]
}

type MintTokenResponse = {
  token: string
  scopeProjectId?: string
}

export function hashPrefixForToken(token: string): string {
  return createHash('sha256').update(token.trim()).digest('hex').slice(0, 8)
}

function getProjectTokenDir(): string {
  return join(homedir(), '.orca', 'backlog-project-tokens')
}

function getProjectTokenPath(projectId: string): string {
  const safeId = Buffer.from(projectId).toString('base64url')
  return join(getProjectTokenDir(), `${safeId}.enc`)
}

function ensureProjectTokenDir(): void {
  const dir = getProjectTokenDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function writeProjectToken(projectId: string, token: string): void {
  ensureProjectTokenDir()
  const path = getProjectTokenPath(projectId)
  if (safeStorage.isEncryptionAvailable()) {
    writeFileSync(path, safeStorage.encryptString(token), { mode: 0o600 })
    return
  }
  writeFileSync(path, token, { encoding: 'utf-8', mode: 0o600 })
}

function readProjectToken(projectId: string): string | null {
  const path = getProjectTokenPath(projectId)
  if (!credentialFileHasContent(path)) {
    return null
  }
  try {
    const raw = readFileSync(path)
    return readStoredCredentialToken('Backlog', raw)
  } catch (error) {
    if (error instanceof CredentialDecryptionError) {
      throw error
    }
    return null
  }
}

function deleteProjectTokenFile(projectId: string): void {
  try {
    unlinkSync(getProjectTokenPath(projectId))
  } catch {
    // Missing cache is fine.
  }
}

export async function ensureAgent(
  agentName: string,
  existingAgentId?: string | null
): Promise<string> {
  if (existingAgentId) {
    return existingAgentId
  }
  const trimmedName = agentName.trim()
  if (!trimmedName) {
    throw new BacklogApiError('Agent name is required.', null)
  }

  const listed = await backlogRequest<AgentRecord[] | AgentsResponse>('/api/agents')
  const agents = Array.isArray(listed) ? listed : Array.isArray(listed.agents) ? listed.agents : []
  const match = agents.find((agent) => agent.name === trimmedName)
  if (match?.id) {
    return match.id
  }

  const created = await backlogRequest<AgentRecord>('/api/agents', {
    method: 'POST',
    body: JSON.stringify({ name: trimmedName })
  })
  if (!created.id) {
    throw new BacklogApiError('Backlog did not return an agent id.', null)
  }
  return created.id
}

export async function ensureProjectGrant(agentId: string, projectId: string): Promise<void> {
  await backlogRequest(`/api/agents/${encodeURIComponent(agentId)}/grants`, {
    method: 'POST',
    body: JSON.stringify({ projectId })
  })
}

async function mintProjectToken(
  agentId: string,
  projectId: string
): Promise<BacklogMintedProjectToken> {
  const response = await backlogRequest<MintTokenResponse>(
    `/api/agents/${encodeURIComponent(agentId)}/tokens`,
    {
      method: 'POST',
      body: JSON.stringify({ label: 'orca', projectId })
    }
  )
  if (typeof response.token !== 'string' || !response.token) {
    throw new BacklogApiError('Backlog did not return a project token.', null)
  }
  return {
    token: response.token,
    hashPrefix: hashPrefixForToken(response.token)
  }
}

type ProjectTokenCacheHooks = {
  getCached?: () => Promise<string | null>
  setCached?: (token: string) => Promise<void>
}

export async function ensureProjectAgentToken(args: {
  agentId: string
  projectId: string
  getCached?: ProjectTokenCacheHooks['getCached']
  setCached?: ProjectTokenCacheHooks['setCached']
}): Promise<BacklogMintedProjectToken> {
  const readCached = args.getCached ?? (async () => readProjectToken(args.projectId))
  const writeCached =
    args.setCached ??
    (async (token: string) => {
      writeProjectToken(args.projectId, token)
    })

  const cached = await readCached()
  if (cached) {
    try {
      await backlogRequest('/api/tasks', undefined, {
        project: args.projectId,
        token: cached
      })
      return { token: cached, hashPrefix: hashPrefixForToken(cached) }
    } catch (error) {
      if (isAuthError(error)) {
        deleteProjectTokenFile(args.projectId)
      } else {
        throw error
      }
    }
  }

  await ensureProjectGrant(args.agentId, args.projectId)
  const minted = await mintProjectToken(args.agentId, args.projectId)
  await writeCached(minted.token)
  return minted
}

/** Re-mint when a cached project token was revoked server-side. */
export async function ensureProjectAgentTokenFresh(args: {
  agentId: string
  projectId: string
}): Promise<BacklogMintedProjectToken> {
  deleteProjectTokenFile(args.projectId)
  return ensureProjectAgentToken(args)
}

export async function loadProjectAgentToken(projectId: string): Promise<string | null> {
  return readProjectToken(projectId)
}

export async function revokeProjectAgentToken(args: {
  agentId: string
  projectId: string
  hashPrefix: string
}): Promise<void> {
  const prefix = args.hashPrefix.trim()
  if (prefix) {
    try {
      await backlogRequest(
        `/api/agents/${encodeURIComponent(args.agentId)}/tokens/${encodeURIComponent(prefix)}`,
        { method: 'DELETE' }
      )
    } catch (error) {
      // Why: disconnect/deslect should still drop local cache when revoke races.
      if (!isAuthError(error)) {
        console.warn('[backlog] revoke project agent token failed:', error)
      }
    }
  }
  deleteProjectTokenFile(args.projectId)
}
