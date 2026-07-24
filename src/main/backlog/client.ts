import { hostname } from 'node:os'
import { net, session } from 'electron'
import { ensureElectronProxyFromEnvironment } from '../network/proxy-settings'
import { withSpan } from '../observability/tracer'
import type {
  BacklogConnectArgs,
  BacklogConnectionStatus,
  BacklogConnectResult,
  BacklogViewer
} from '../../shared/backlog-types'
import {
  clearCredentials,
  getConnectionFile,
  getCredentialError,
  hasStoredToken,
  loadToken,
  saveToken,
  writeConnectionFile
} from './connection-store'

const BACKLOG_API_USER_AGENT = 'Orca'

export class BacklogApiError extends Error {
  status: number | null

  constructor(message: string, status: number | null = null) {
    super(message)
    this.status = status
  }
}

export function normalizeBacklogServerUrl(serverUrl: string): string {
  const trimmed = serverUrl.trim()
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
  const url = new URL(withProtocol)
  url.pathname = url.pathname.replace(/\/+$/, '')
  url.search = ''
  url.hash = ''
  return url.toString().replace(/\/$/, '')
}

function toViewer(data: Record<string, unknown>): BacklogViewer {
  const user = data.user as Record<string, unknown> | null | undefined
  const userId =
    user && (typeof user.id === 'string' || typeof user.id === 'number') ? String(user.id) : null
  const userName = user && typeof user.name === 'string' ? user.name : 'Backlog user'
  return {
    id: userId,
    name: userName,
    operator: data.operator === true,
    admin: data.admin === true
  }
}

function describeErrorCause(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('cause' in error)) {
    return undefined
  }
  const cause = (error as { cause?: unknown }).cause
  if (cause instanceof Error) {
    return `${cause.name}: ${cause.message}`
  }
  return cause === undefined ? undefined : String(cause)
}

async function backlogFetch(url: string, init: RequestInit): Promise<Response> {
  return withSpan(
    'backlog.request',
    async (span) => {
      span.setAttribute('backlog.serverUrl', new URL(url).origin)
      await ensureElectronProxyFromEnvironment({
        proxySession: session.defaultSession,
        probeUrl: url
      }).catch((error) => {
        span.addEvent('backlog.proxySetupFailed', {
          errorName: error instanceof Error ? error.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error)
        })
      })
      try {
        return await net.fetch(url, init)
      } catch (error) {
        span.setAttribute(
          'backlog.transportErrorName',
          error instanceof Error ? error.name : typeof error
        )
        span.setAttribute(
          'backlog.transportErrorMessage',
          error instanceof Error ? error.message : String(error)
        )
        const cause = describeErrorCause(error)
        if (cause) {
          span.setAttribute('backlog.transportErrorCause', cause)
        }
        throw error
      }
    },
    { kind: 'client' }
  )
}

async function readBacklogError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string; message?: string }
    if (typeof data.error === 'string' && data.error) {
      return data.error
    }
    if (typeof data.message === 'string' && data.message) {
      return data.message
    }
  } catch {
    // Fall through.
  }
  return response.statusText || `Backlog request failed (${response.status})`
}

export function appendProjectQuery(path: string, project?: string): string {
  if (!project) {
    return path
  }
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}project=${encodeURIComponent(project)}`
}

export async function backlogRequest<T>(
  path: string,
  init?: RequestInit,
  options?: { project?: string; token?: string }
): Promise<T> {
  const serverUrl = getConnectionFile()?.serverUrl ?? null
  if (!serverUrl) {
    throw new BacklogApiError('Not connected to Backlog.', null)
  }
  let token = options?.token
  if (!token) {
    token = loadToken({ force: true }) ?? undefined
  }
  if (!token) {
    throw new BacklogApiError('Not connected to Backlog.', null)
  }

  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')
  if (init?.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }
  headers.set('User-Agent', BACKLOG_API_USER_AGENT)
  headers.set('Authorization', `Bearer ${token}`)

  const requestPath = appendProjectQuery(path, options?.project)
  const response = await backlogFetch(`${serverUrl}${requestPath}`, {
    ...init,
    headers
  })

  if (response.status === 401) {
    if (!options?.token) {
      clearCredentials()
    }
    throw new BacklogApiError(await readBacklogError(response), 401)
  }

  if (!response.ok) {
    throw new BacklogApiError(await readBacklogError(response), response.status)
  }

  if (response.status === 204) {
    return null as T
  }
  return (await response.json()) as T
}

export function getStatus(): BacklogConnectionStatus {
  const connection = getConnectionFile()
  const stored = hasStoredToken()
  const credentialError = getCredentialError()
  return {
    connected: stored && connection !== null,
    viewer: connection?.viewer ?? null,
    serverUrl: connection?.serverUrl ?? null,
    hostHostname: hostname(),
    ...(credentialError ? { credentialError } : {})
  }
}

export async function connect(args: BacklogConnectArgs): Promise<BacklogConnectResult> {
  let serverUrl: string
  try {
    serverUrl = normalizeBacklogServerUrl(args.serverUrl)
  } catch {
    return { ok: false, error: 'Enter a valid Backlog server URL.' }
  }

  const token = args.token.trim()
  if (!token) {
    return { ok: false, error: 'API token is required.' }
  }

  try {
    const headers = new Headers()
    headers.set('Accept', 'application/json')
    headers.set('User-Agent', BACKLOG_API_USER_AGENT)
    headers.set('Authorization', `Bearer ${token}`)
    const response = await backlogFetch(`${serverUrl}/api/me`, { headers })
    if (response.status === 401) {
      return { ok: false, error: await readBacklogError(response) }
    }
    if (!response.ok) {
      return { ok: false, error: await readBacklogError(response) }
    }
    const viewer = toViewer((await response.json()) as Record<string, unknown>)
    saveToken(token)
    writeConnectionFile({ version: 1, serverUrl, viewer })
    return { ok: true, viewer, serverUrl }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Connection failed.'
    }
  }
}

export function disconnect(): void {
  clearCredentials()
}

export function isAuthError(error: unknown): boolean {
  return error instanceof BacklogApiError && error.status === 401
}

/** Warm connection metadata at startup without decrypting the user token. */
export function initBacklogConnection(): void {
  getConnectionFile()
}

export { hasStoredToken, loadToken }
