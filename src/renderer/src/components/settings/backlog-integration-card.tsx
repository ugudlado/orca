import { useEffect, useState } from 'react'
import { ListTodo, LoaderCircle, Unlink } from 'lucide-react'
import type { BacklogProject } from '../../../../shared/types'
import { BacklogConnectDialog } from '@/components/backlog-connect-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useMountedRef } from '@/hooks/useMountedRef'
import {
  getProviderRuntimeContextKey,
  hasRemoteProviderRuntime
} from '@/lib/provider-runtime-context'
import { useAppStore } from '@/store'
import { IntegrationCardDetails, IntegrationCardShell } from './integration-card-shell'
import { useIntegrationSubordinateRowClass } from './integration-card-presentation'
import { getProviderAccountScope } from './provider-account-scope'
import { ProviderHostScopeControl } from './ProviderHostScopeControl'
import { translate } from '@/i18n/i18n'

function projectKey(project: BacklogProject): string {
  return String(project.id)
}

export function BacklogIntegrationCard(): React.JSX.Element {
  const backlogStatus = useAppStore((s) => s.backlogStatus)
  const backlogStatusChecked = useAppStore((s) => s.backlogStatusChecked)
  const backlogStatusContextKey = useAppStore((s) => s.backlogStatusContextKey)
  const checkBacklogConnection = useAppStore((s) => s.checkBacklogConnection)
  const disconnectBacklog = useAppStore((s) => s.disconnectBacklog)
  const listBacklogProjects = useAppStore((s) => s.listBacklogProjects)
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const mountedRef = useMountedRef()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [projects, setProjects] = useState<BacklogProject[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsError, setProjectsError] = useState<string | null>(null)

  const contextMatches = backlogStatusContextKey === getProviderRuntimeContextKey(settings)
  const checking = !contextMatches || !backlogStatusChecked
  const connected = contextMatches && backlogStatus.connected
  const accountScope = getProviderAccountScope(settings)
  const visibleProjectIds = settings?.backlogVisibleProjectIds ?? []
  const credentialCopy = hasRemoteProviderRuntime(settings)
    ? translate(
        'auto.components.settings.backlog.integration.remote_credentials',
        'Connect with your Backlog server URL and API token. Credentials are sent to the selected remote runtime and stored there with runtime-supported encryption.'
      )
    : translate(
        'auto.components.settings.backlog.integration.local_credentials',
        'Connect with your Backlog server URL and API token. Credentials are stored locally and encrypted when local runtime storage supports it.'
      )
  const subordinateRowClass = useIntegrationSubordinateRowClass('flex items-center gap-3')
  const accountScopeRowClass = useIntegrationSubordinateRowClass('text-xs')

  useEffect(() => {
    if (!connected) {
      setProjects([])
      setProjectsError(null)
      return
    }
    let cancelled = false
    setProjectsLoading(true)
    setProjectsError(null)
    void listBacklogProjects()
      .then((loaded) => {
        if (!cancelled && mountedRef.current) {
          setProjects(loaded)
        }
      })
      .catch((error) => {
        if (!cancelled && mountedRef.current) {
          setProjectsError(error instanceof Error ? error.message : 'Failed to load projects')
          setProjects([])
        }
      })
      .finally(() => {
        if (!cancelled && mountedRef.current) {
          setProjectsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [connected, listBacklogProjects, mountedRef])

  const toggleProjectVisibility = (projectId: string, checked: boolean): void => {
    const next = checked
      ? visibleProjectIds.includes(projectId)
        ? visibleProjectIds
        : [...visibleProjectIds, projectId]
      : visibleProjectIds.filter((id) => id !== projectId)
    void updateSettings({ backlogVisibleProjectIds: next })
    if (!checked) {
      void useAppStore.getState().revokeBacklogProjectAgentToken({ projectId })
    }
  }

  const handleDisconnect = async (): Promise<void> => {
    await disconnectBacklog()
    if (mountedRef.current) {
      setProjects([])
      setProjectsError(null)
    }
  }

  const serverUrl = backlogStatus.serverUrl?.trim() || settings?.backlogServerUrl?.trim() || null
  const viewerName = backlogStatus.viewer?.name

  return (
    <IntegrationCardShell
      icon={<ListTodo className="size-5" strokeWidth={1.75} />}
      name="Backlog"
      description={
        connected
          ? translate(
              'auto.components.settings.backlog.integration.connected_description',
              'Connected to {{server}}',
              { server: serverUrl ?? 'Backlog server' }
            )
          : checking
            ? translate(
                'auto.components.settings.backlog.integration.checking',
                'Checking Backlog access before showing setup actions.'
              )
            : translate(
                'auto.components.settings.backlog.integration.disconnected',
                'Browse tasks from a self-hosted Backlog server.'
              )
      }
      checking={checking}
      statusTone={connected ? 'connected' : 'attention'}
      statusLabel={connected ? 'Connected' : 'Not connected'}
      actions={
        !checking ? (
          connected ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => void handleDisconnect()}>
                {translate(
                  'auto.components.settings.task.tracker.integration.cards.disconnect_all',
                  'Disconnect'
                )}
              </Button>
            </div>
          ) : (
            <Button variant="default" size="sm" onClick={() => setDialogOpen(true)}>
              {translate('auto.components.settings.backlog.integration.connect', 'Connect Backlog')}
            </Button>
          )
        ) : null
      }
    >
      <IntegrationCardDetails>
        <ProviderHostScopeControl
          labelPrefix={translate(
            'auto.components.settings.task.tracker.integration.cards.account_scope_prefix',
            'Account scope'
          )}
          scope={accountScope}
          className={accountScopeRowClass}
        />
        {connected ? (
          <div className="space-y-3">
            <div className={subordinateRowClass}>
              <div className="min-w-0 flex-1">
                {viewerName ? (
                  <p className="truncate text-sm font-medium text-foreground">{viewerName}</p>
                ) : null}
                {serverUrl ? (
                  <p className="truncate text-xs text-muted-foreground">{serverUrl}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void handleDisconnect()}
                aria-label={translate(
                  'auto.components.settings.backlog.integration.disconnect_aria',
                  'Disconnect Backlog'
                )}
                className="rounded-md p-1 text-muted-foreground/50 transition-colors hover:text-destructive"
              >
                <Unlink className="size-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">
                {translate(
                  'auto.components.settings.backlog.integration.visible_projects',
                  'Projects shown in Tasks'
                )}
              </p>
              {projectsLoading ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <LoaderCircle className="size-3.5 animate-spin" />
                  {translate(
                    'auto.components.settings.backlog.integration.loading_projects',
                    'Loading projects…'
                  )}
                </p>
              ) : null}
              {projectsError ? <p className="text-xs text-destructive">{projectsError}</p> : null}
              {!projectsLoading && projects.length === 0 && !projectsError ? (
                <p className="text-xs text-muted-foreground">
                  {translate(
                    'auto.components.settings.backlog.integration.no_projects',
                    'No projects returned from this server.'
                  )}
                </p>
              ) : null}
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border/60 p-2">
                {projects.map((project) => {
                  const id = projectKey(project)
                  const checked = visibleProjectIds.includes(id)
                  const checkboxId = `backlog-project-${id}`
                  return (
                    <div key={id} className="flex items-start gap-2">
                      <Checkbox
                        id={checkboxId}
                        checked={checked}
                        onCheckedChange={(value) => toggleProjectVisibility(id, value === true)}
                      />
                      <Label
                        htmlFor={checkboxId}
                        className="min-w-0 flex-1 cursor-pointer text-xs font-normal leading-snug"
                      >
                        <span className="block truncate font-medium text-foreground">
                          {project.name}
                        </span>
                        {project.path !== project.name ? (
                          <span className="block truncate text-muted-foreground">
                            {project.path}
                          </span>
                        ) : null}
                      </Label>
                    </div>
                  )
                })}
              </div>
              <p className="text-[11px] text-muted-foreground/70">
                {translate(
                  'auto.components.settings.backlog.integration.visible_projects_hint',
                  'Leave all unchecked to show every project you can access.'
                )}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void checkBacklogConnection()}>
              {translate(
                'auto.components.settings.task.tracker.integration.cards.c90f2ef419',
                'Re-check'
              )}
            </Button>
          </div>
        ) : !checking ? (
          <>
            <p className="text-xs text-muted-foreground">{credentialCopy}</p>
            <Button variant="ghost" size="sm" onClick={() => void checkBacklogConnection()}>
              {translate(
                'auto.components.settings.task.tracker.integration.cards.c90f2ef419',
                'Re-check'
              )}
            </Button>
          </>
        ) : null}
      </IntegrationCardDetails>

      <BacklogConnectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        overlayClassName="z-[110]"
        contentClassName="z-[120]"
      />
    </IntegrationCardShell>
  )
}
