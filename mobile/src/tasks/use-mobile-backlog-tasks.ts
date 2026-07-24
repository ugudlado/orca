import { useCallback, useMemo, useState } from 'react'
import type { BacklogProject } from '../../../src/shared/backlog-types'
import type { RpcClient } from '../transport/rpc-client'
import type { RpcSuccess } from '../transport/types'
import type { PickerOption } from '../components/PickerModal'
import type { TaskProvider } from './mobile-task-providers'
import {
  connectMobileBacklogAccount,
  hydrateMobileBacklogTaskProvider,
  reloadMobileBacklogTaskContext,
  type MobileBacklogBootstrapSettings
} from './backlog-mobile-bootstrap'
import {
  buildMobileBacklogProjectPickerOptions,
  resolveMobileBacklogProjectLabel
} from './backlog-mobile-workspace-create'

export type MobileBacklogConnectState = 'idle' | 'connecting' | 'error'

export function useMobileBacklogTasks(args: {
  client: RpcClient | null
  connState: string
  tasksSupported: boolean
  taskUiReady: boolean
  setProvider: (provider: TaskProvider) => void
  setVisibleProviders: (updater: (current: TaskProvider[]) => TaskProvider[]) => void
}) {
  const { client, connState, tasksSupported, taskUiReady, setProvider, setVisibleProviders } = args

  const [backlogConnected, setBacklogConnected] = useState(false)
  const [backlogProjects, setBacklogProjects] = useState<BacklogProject[]>([])
  const [backlogVisibleProjectIds, setBacklogVisibleProjectIds] = useState<string[]>([])
  const [selectedBacklogProjectId, setSelectedBacklogProjectId] = useState<string | null>(null)
  const [backlogServerUrlDraft, setBacklogServerUrlDraft] = useState('')
  const [backlogTokenDraft, setBacklogTokenDraft] = useState('')
  const [showBacklogConnect, setShowBacklogConnect] = useState(false)
  const [showBacklogProjectPicker, setShowBacklogProjectPicker] = useState(false)
  const [backlogConnectState, setBacklogConnectState] = useState<MobileBacklogConnectState>('idle')
  const [backlogConnectError, setBacklogConnectError] = useState('')

  const openBacklogConnect = useCallback(() => {
    setBacklogTokenDraft('')
    setBacklogConnectState('idle')
    setBacklogConnectError('')
    setShowBacklogConnect(true)
  }, [])

  const hydrateFromBootstrap = useCallback(
    async (
      settings: MobileBacklogBootstrapSettings,
      backlogStatus: { connected?: boolean; serverUrl?: string | null } | null,
      stale: () => boolean
    ): Promise<void> => {
      if (!client) {
        return
      }
      await hydrateMobileBacklogTaskProvider({
        client,
        settings,
        backlogStatus,
        stale,
        setBacklogConnected,
        setBacklogProjects,
        setSelectedBacklogProjectId,
        setBacklogVisibleProjectIds,
        setBacklogServerUrlDraft
      })
    },
    [client]
  )

  const loadBacklogContext = useCallback(async (): Promise<void> => {
    if (!client || connState !== 'connected' || !tasksSupported) {
      return
    }
    const settingsResponse = await client.sendRequest('settings.get')
    const settings =
      settingsResponse.ok === true
        ? (((
            (settingsResponse as RpcSuccess).result as { settings?: MobileBacklogBootstrapSettings }
          ).settings ?? {}) as MobileBacklogBootstrapSettings)
        : {}
    await reloadMobileBacklogTaskContext({
      client,
      settings,
      setBacklogConnected,
      setBacklogProjects,
      setSelectedBacklogProjectId,
      setBacklogVisibleProjectIds
    })
  }, [client, connState, tasksSupported])

  const connectBacklogAccount = useCallback(async (): Promise<void> => {
    if (!client || connState !== 'connected' || !taskUiReady) {
      return
    }
    const serverUrl = backlogServerUrlDraft.trim()
    const token = backlogTokenDraft.trim()
    if (!serverUrl || !token || backlogConnectState === 'connecting') {
      return
    }
    setBacklogConnectState('connecting')
    setBacklogConnectError('')
    try {
      const result = await connectMobileBacklogAccount({ client, serverUrl, token })
      if (!result.ok) {
        throw new Error(result.error)
      }
      setBacklogTokenDraft('')
      setBacklogConnectState('idle')
      setShowBacklogConnect(false)
      setBacklogConnected(true)
      setVisibleProviders((current) =>
        current.includes('backlog') ? current : [...current, 'backlog']
      )
      setProvider('backlog')
      await loadBacklogContext()
    } catch (err) {
      setBacklogConnectState('error')
      setBacklogConnectError(err instanceof Error ? err.message : 'Connection failed')
    }
  }, [
    backlogConnectState,
    backlogServerUrlDraft,
    backlogTokenDraft,
    client,
    connState,
    loadBacklogContext,
    setProvider,
    setVisibleProviders,
    taskUiReady
  ])

  const backlogProjectLabel = useMemo(
    () => resolveMobileBacklogProjectLabel(backlogProjects, selectedBacklogProjectId),
    [backlogProjects, selectedBacklogProjectId]
  )

  const backlogProjectPickerOptions = useMemo((): PickerOption<string>[] => {
    return buildMobileBacklogProjectPickerOptions(backlogProjects, backlogVisibleProjectIds)
  }, [backlogProjects, backlogVisibleProjectIds])

  return {
    backlogConnected,
    backlogProjects,
    backlogVisibleProjectIds,
    selectedBacklogProjectId,
    setSelectedBacklogProjectId,
    backlogServerUrlDraft,
    setBacklogServerUrlDraft,
    backlogTokenDraft,
    setBacklogTokenDraft,
    showBacklogConnect,
    setShowBacklogConnect,
    showBacklogProjectPicker,
    setShowBacklogProjectPicker,
    backlogConnectState,
    setBacklogConnectState,
    backlogConnectError,
    setBacklogConnectError,
    openBacklogConnect,
    hydrateFromBootstrap,
    loadBacklogContext,
    connectBacklogAccount,
    backlogProjectLabel,
    backlogProjectPickerOptions
  }
}

export type MobileBacklogTasksState = ReturnType<typeof useMobileBacklogTasks>
