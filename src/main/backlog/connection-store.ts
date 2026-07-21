import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { safeStorage } from 'electron'
import {
  CredentialDecryptionError,
  credentialFileHasContent,
  readStoredCredentialToken
} from '../integration-credential-file'
import type { BacklogViewer } from '../../shared/backlog-types'

export type BacklogConnectionFile = {
  version: 1
  serverUrl: string
  viewer: BacklogViewer
}

let cachedToken: string | null | undefined
let credentialError: string | undefined
let cachedConnection: BacklogConnectionFile | null | undefined
let connectionLoaded = false

function getOrcaDir(): string {
  return join(homedir(), '.orca')
}

function getTokenPath(): string {
  return join(getOrcaDir(), 'backlog-token.enc')
}

function getConnectionPath(): string {
  return join(getOrcaDir(), 'backlog-connection.json')
}

function ensureOrcaDir(): void {
  const dir = getOrcaDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function writeEncryptedToken(path: string, token: string): void {
  if (safeStorage.isEncryptionAvailable()) {
    writeFileSync(path, safeStorage.encryptString(token), { mode: 0o600 })
    return
  }
  console.warn('[backlog] safeStorage encryption unavailable — storing token in plaintext')
  writeFileSync(path, token, { encoding: 'utf-8', mode: 0o600 })
}

function readConnectionFromDisk(): BacklogConnectionFile | null {
  const path = getConnectionPath()
  if (!existsSync(path)) {
    return null
  }
  try {
    const parsed = JSON.parse(
      readFileSync(path, { encoding: 'utf-8' })
    ) as Partial<BacklogConnectionFile>
    if (parsed.version !== 1 || typeof parsed.serverUrl !== 'string' || !parsed.viewer) {
      return null
    }
    const viewer = parsed.viewer
    if (
      typeof viewer.name !== 'string' ||
      typeof viewer.operator !== 'boolean' ||
      typeof viewer.admin !== 'boolean'
    ) {
      return null
    }
    return {
      version: 1,
      serverUrl: parsed.serverUrl,
      viewer: {
        id: typeof viewer.id === 'string' ? viewer.id : null,
        name: viewer.name,
        operator: viewer.operator,
        admin: viewer.admin
      }
    }
  } catch {
    return null
  }
}

export function getConnectionFile(): BacklogConnectionFile | null {
  if (!connectionLoaded) {
    cachedConnection = readConnectionFromDisk()
    connectionLoaded = true
  }
  return cachedConnection ?? null
}

export function writeConnectionFile(file: BacklogConnectionFile): void {
  ensureOrcaDir()
  cachedConnection = file
  connectionLoaded = true
  writeFileSync(getConnectionPath(), JSON.stringify(file, null, 2), {
    encoding: 'utf-8',
    mode: 0o600
  })
}

export function clearConnectionFile(): void {
  cachedConnection = null
  connectionLoaded = true
  try {
    unlinkSync(getConnectionPath())
  } catch {
    // Missing file is fine.
  }
}

export function hasStoredToken(): boolean {
  if (cachedToken !== undefined && cachedToken !== null) {
    return true
  }
  return credentialFileHasContent(getTokenPath())
}

export function loadToken(options: { force?: boolean } = {}): string | null {
  if (!options.force && cachedToken !== undefined) {
    return cachedToken
  }
  const path = getTokenPath()
  if (!existsSync(path)) {
    cachedToken = null
    return null
  }
  try {
    const raw = readFileSync(path)
    const token = readStoredCredentialToken('Backlog', raw)
    cachedToken = token
    credentialError = undefined
    return token
  } catch (error) {
    if (error instanceof CredentialDecryptionError) {
      credentialError = error.message
      throw error
    }
    cachedToken = null
    return null
  }
}

export function saveToken(token: string): void {
  ensureOrcaDir()
  writeEncryptedToken(getTokenPath(), token)
  cachedToken = token
  credentialError = undefined
}

export function deleteToken(): void {
  cachedToken = null
  credentialError = undefined
  try {
    unlinkSync(getTokenPath())
  } catch {
    // Token may not exist.
  }
}

export function getCredentialError(): string | undefined {
  return credentialError
}

export function clearCredentials(): void {
  deleteToken()
  clearConnectionFile()
}
