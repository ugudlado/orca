import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ListTodo, LoaderCircle, RefreshCw } from 'lucide-react'
import type { BacklogProject, BacklogTask } from '../../../shared/types'
import { BacklogConnectDialog } from '@/components/backlog-connect-dialog'
import { TaskPageBacklogTaskDetail } from '@/components/task-page-backlog-task-detail'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useMountedRef } from '@/hooks/useMountedRef'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'

type TaskPageBacklogPanelProps = {
  connected: boolean
  statusReady: boolean
  visibleProjectIds: readonly string[]
  onConnect: () => void
  onUse: (task: BacklogTask) => void
  listProjects: () => Promise<BacklogProject[]>
  listTasks: (
    projectId: string,
    filter?: { status?: string; assignee?: string }
  ) => Promise<BacklogTask[]>
  checkConnection: () => Promise<void>
  onHideSource?: () => void
}

export function TaskPageBacklogPanel({
  connected,
  statusReady,
  visibleProjectIds,
  onConnect,
  onUse,
  listProjects,
  listTasks,
  checkConnection,
  onHideSource
}: TaskPageBacklogPanelProps): React.JSX.Element {
  const mountedRef = useMountedRef()
  const [connectOpen, setConnectOpen] = useState(false)
  const [projects, setProjects] = useState<BacklogProject[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [tasks, setTasks] = useState<BacklogTask[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const visibleProjects = useMemo(() => {
    if (visibleProjectIds.length === 0) {
      return projects
    }
    const allowed = new Set(visibleProjectIds)
    return projects.filter((project) => allowed.has(String(project.id)))
  }, [projects, visibleProjectIds])

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks]
  )

  const loadProjects = useCallback(async (): Promise<void> => {
    if (!connected) {
      setProjects([])
      return
    }
    setProjectsLoading(true)
    setProjectsError(null)
    try {
      const loaded = await listProjects()
      if (!mountedRef.current) {
        return
      }
      setProjects(loaded)
    } catch (error) {
      if (!mountedRef.current) {
        return
      }
      setProjectsError(error instanceof Error ? error.message : 'Failed to load projects')
      setProjects([])
    } finally {
      if (mountedRef.current) {
        setProjectsLoading(false)
      }
    }
  }, [connected, listProjects, mountedRef])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  useEffect(() => {
    if (visibleProjects.length === 0) {
      setSelectedProjectId(null)
      return
    }
    setSelectedProjectId((current) => {
      if (current && visibleProjects.some((p) => String(p.id) === current)) {
        return current
      }
      return String(visibleProjects[0].id)
    })
  }, [visibleProjects])

  const loadTasks = useCallback(async (): Promise<void> => {
    if (!connected || !selectedProjectId) {
      setTasks([])
      return
    }
    setTasksLoading(true)
    setTasksError(null)
    const filter = {
      ...(statusFilter.trim() ? { status: statusFilter.trim() } : {}),
      ...(assigneeFilter.trim() ? { assignee: assigneeFilter.trim() } : {})
    }
    try {
      const loaded = await listTasks(
        selectedProjectId,
        Object.keys(filter).length > 0 ? filter : undefined
      )
      if (!mountedRef.current) {
        return
      }
      setTasks(loaded)
      setSelectedTaskId((current) =>
        current && loaded.some((task) => task.id === current) ? current : (loaded[0]?.id ?? null)
      )
    } catch (error) {
      if (!mountedRef.current) {
        return
      }
      setTasksError(error instanceof Error ? error.message : 'Failed to load tasks')
      setTasks([])
      setSelectedTaskId(null)
    } finally {
      if (mountedRef.current) {
        setTasksLoading(false)
      }
    }
  }, [assigneeFilter, connected, listTasks, mountedRef, selectedProjectId, statusFilter])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  const handleRetry = (): void => {
    void checkConnection().then(() => {
      void loadProjects()
      void loadTasks()
    })
  }

  const handleConnectClick = (): void => {
    setConnectOpen(true)
    onConnect()
  }

  if (!statusReady) {
    return (
      <div className="mt-4 flex items-center justify-center py-14">
        <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!connected) {
    return (
      <>
        <div className="mt-4 flex flex-col items-center justify-center rounded-md border border-border/50 bg-muted/50 px-6 py-14 text-center shadow-sm">
          <ListTodo className="mb-4 size-8 text-muted-foreground/60" strokeWidth={1.75} />
          <p className="text-base font-medium text-foreground">
            {translate('auto.components.task.page.backlog.connect_title', 'Connect Backlog')}
          </p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {translate(
              'auto.components.task.page.backlog.connect_body',
              'Browse tasks from your Backlog server and start work in a workspace.'
            )}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button onClick={handleConnectClick}>
              {translate('auto.components.task.page.backlog.connect_cta', 'Connect Backlog')}
            </Button>
            {onHideSource ? (
              <Button variant="outline" onClick={onHideSource}>
                {translate('auto.components.task.page.backlog.hide', 'Hide Backlog')}
              </Button>
            ) : null}
          </div>
        </div>
        <BacklogConnectDialog
          open={connectOpen}
          onOpenChange={setConnectOpen}
          onConnected={() => {
            void checkConnection()
            void loadProjects()
          }}
        />
      </>
    )
  }

  return (
    <>
      <div className="flex min-h-0 max-h-full flex-col overflow-hidden rounded-md rounded-t-none border border-t-0 border-border/50 bg-background shadow-sm">
        <div className="flex h-10 flex-none items-center justify-between gap-3 border-b border-border/50 bg-muted/35 px-3">
          <div className="min-w-0 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {translate('auto.components.task.page.backlog.header', 'Backlog tasks')}
          </div>
          <div className="flex items-center gap-2">
            {(projectsError || tasksError) && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleRetry}>
                <RefreshCw className="mr-1.5 size-3.5" />
                {translate('auto.components.task.page.backlog.retry', 'Retry')}
              </Button>
            )}
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {tasks.length} {translate('auto.components.TaskPage.b7bae28b6a', 'shown')}
            </span>
          </div>
        </div>

        <div className="flex flex-none flex-wrap items-end gap-3 border-b border-border/50 px-3 py-2">
          <div className="min-w-[160px] flex-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {translate('auto.components.task.page.backlog.project', 'Project')}
            </Label>
            <Select
              value={selectedProjectId ?? undefined}
              onValueChange={setSelectedProjectId}
              disabled={projectsLoading || visibleProjects.length === 0}
            >
              <SelectTrigger className="mt-1 h-8 text-xs">
                <SelectValue
                  placeholder={translate(
                    'auto.components.task.page.backlog.project_placeholder',
                    'Select project'
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                {visibleProjects.map((project) => (
                  <SelectItem
                    key={String(project.id)}
                    value={String(project.id)}
                    className="text-xs"
                  >
                    {project.name || project.path}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[120px] flex-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {translate('auto.components.TaskPage.154b0fa623', 'Status')}
            </Label>
            <Input
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              placeholder={translate(
                'auto.components.task.page.backlog.status_ph',
                'Filter status'
              )}
              className="mt-1 h-8 text-xs"
            />
          </div>
          <div className="min-w-[120px] flex-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {translate('auto.components.TaskPage.d2a876ca53', 'Assignee')}
            </Label>
            <Input
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              placeholder={translate(
                'auto.components.task.page.backlog.assignee_ph',
                'Filter assignee'
              )}
              className="mt-1 h-8 text-xs"
            />
          </div>
        </div>

        {projectsError ? (
          <div className="border-b border-border/50 px-4 py-3 text-sm text-destructive">
            {projectsError}
          </div>
        ) : null}
        {visibleProjects.length === 0 && !projectsLoading ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            {translate(
              'auto.components.task.page.backlog.no_projects',
              'No visible Backlog projects. Choose projects in Settings → Integrations.'
            )}
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div
              className="min-h-0 overflow-y-auto border-b border-border/50 md:border-b-0 md:border-r scrollbar-sleek"
              style={{ scrollbarGutter: 'stable' }}
            >
              {tasksLoading && tasks.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : null}
              {tasksError ? (
                <div className="px-4 py-3 text-sm text-destructive">{tasksError}</div>
              ) : null}
              {!tasksLoading && tasks.length === 0 && !tasksError ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {translate(
                    'auto.components.task.page.backlog.no_tasks',
                    'No tasks match filters.'
                  )}
                </div>
              ) : null}
              <div className="divide-y divide-border/50">
                {tasks.map((task) => {
                  const active = task.id === selectedTaskId
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setSelectedTaskId(task.id)}
                      className={cn(
                        'grid w-full grid-cols-[72px_minmax(0,1fr)] gap-2 px-3 py-2 text-left transition hover:bg-muted/50',
                        active && 'bg-muted/60'
                      )}
                    >
                      <span className="font-mono text-xs text-muted-foreground">{task.id}</span>
                      <span className="min-w-0 truncate text-sm">{task.title}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex min-h-0 flex-col overflow-hidden">
              <TaskPageBacklogTaskDetail selectedTask={selectedTask} onUse={onUse} />
            </div>
          </div>
        )}
      </div>
      <BacklogConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
    </>
  )
}
