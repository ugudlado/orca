export type BacklogViewer = {
  id: string | null
  name: string
  operator: boolean
  admin: boolean
}

export type BacklogConnectionStatus = {
  connected: boolean
  viewer: BacklogViewer | null
  serverUrl: string | null
  /** Hostname of the Orca host that stores credentials (for orca-&lt;hostname&gt; agent naming). */
  hostHostname?: string
  // Set when a stored token file exists but could not be decrypted.
  credentialError?: string
}

export type BacklogProject = {
  id: number
  guid?: string
  seq?: number
  /** Path or display name from the server project list. */
  path: string
  name: string
}

export type BacklogTaskAssignee = {
  id: string
  name: string
}

export type BacklogTask = {
  id: string
  projectId: string
  title: string
  status: string
  body: string
  url: string
  assignee: BacklogTaskAssignee | null
  labels: string[]
  milestone?: string
  priority?: 'high' | 'medium' | 'low'
  createdAt?: string
  updatedAt?: string
}

export type BacklogTaskUpdate = {
  title?: string
  status?: string
  assignee?: string | null
  labels?: string[]
  milestone?: string | null
  priority?: 'high' | 'medium' | 'low'
}

export type BacklogTaskFilter = {
  status?: string
  assignee?: string
}

export type BacklogConnectArgs = {
  serverUrl: string
  token: string
}

export type BacklogMutationResult = { ok: true } | { ok: false; error: string }

export type BacklogConnectResult =
  | { ok: true; viewer: BacklogViewer; serverUrl: string }
  | { ok: false; error: string }

/** Persisted meta for a cached project-scoped agent token (plaintext lives in .enc file). */
export type BacklogProjectTokenMeta = {
  hashPrefix: string
  projectId: string
}
