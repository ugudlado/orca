import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { LoaderCircle, RefreshCw } from 'lucide-react'
import type {
  BacklogAssignable,
  BacklogProject,
  BacklogTask,
  BacklogTaskComment,
  BacklogTaskUpdate
} from '../../../shared/types'
import { BacklogConnectDialog } from '@/components/backlog-connect-dialog'
import { TaskPageBacklogConnectEmptyState } from '@/components/task-page-backlog-connect-empty-state'
import { TaskPageBacklogPanelFilters } from '@/components/task-page-backlog-panel-filters'
import { TaskPageBacklogTaskDetail } from '@/components/task-page-backlog-task-detail'
import { TaskPageBacklogTaskList } from '@/components/task-page-backlog-task-list'
import { Button } from '@/components/ui/button'
import { useMountedRef } from '@/hooks/useMountedRef'
import {
  collectBacklogTaskStatuses,
  filterBacklogTasks,
  isBacklogCompletedStatus
} from '@/lib/backlog-task-filters'
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
  updateTask: (
    projectId: string,
    taskId: string,
    updates: BacklogTaskUpdate
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  listAssignables: (projectId: string) => Promise<BacklogAssignable[]>
  listStatuses: (projectId: string) => Promise<string[]>
  /** Lazy — only called when the detail panel's activity section is opened. */
  listComments: (projectId: string, taskId: string) => Promise<BacklogTaskComment[]>
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
  updateTask,
  listAssignables,
  listStatuses,
  listComments,
  checkConnection,
  onHideSource
}: TaskPageBacklogPanelProps): React.JSX.Element {
  const mountedRef = useMountedRef()
  const [connectOpen, setConnectOpen] = useState(false)
  const [projects, setProjects] = useState<BacklogProject[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [tasks, setTasks] = useState<BacklogTask[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  // Why: null until first load — then default to non-completed statuses; [] means show every status.
  const [selectedStatuses, setSelectedStatuses] = useState<string[] | null>(null)
  const [quickFilterUnassigned, setQuickFilterUnassigned] = useState(false)
  // Why: project workflow from Backlog config (`/api/statuses`), not the statuses present on loaded tasks.
  const [projectStatuses, setProjectStatuses] = useState<string[]>([])
  const [projectStatusesLoading, setProjectStatusesLoading] = useState(false)

  const visibleProjects = useMemo(() => {
    if (visibleProjectIds.length === 0) {
      return projects
    }
    const allowed = new Set(visibleProjectIds)
    return projects.filter((project) => allowed.has(String(project.id)))
  }, [projects, visibleProjectIds])

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
      setSelectedTaskId(null)
      return
    }
    setSelectedProjectId((current) => {
      if (current && visibleProjects.some((p) => String(p.id) === current)) {
        return current
      }
      setSelectedTaskId(null)
      return String(visibleProjects[0].id)
    })
  }, [visibleProjects])

  const selectedProject = useMemo(
    () => visibleProjects.find((project) => String(project.id) === selectedProjectId) ?? null,
    [selectedProjectId, visibleProjects]
  )

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks]
  )

  const availableStatuses = useMemo(() => {
    if (projectStatuses.length > 0) {
      return projectStatuses
    }
    // Why: keep filters usable if config hasn't loaded yet or the statuses route failed.
    return collectBacklogTaskStatuses(tasks)
  }, [projectStatuses, tasks])

  useEffect(() => {
    setSelectedStatuses(null)
    setProjectStatuses([])
  }, [selectedProjectId])

  useEffect(() => {
    if (!connected || !selectedProjectId) {
      setProjectStatuses([])
      return
    }
    let cancelled = false
    setProjectStatusesLoading(true)
    void listStatuses(selectedProjectId)
      .then((loaded) => {
        if (!cancelled && mountedRef.current) {
          setProjectStatuses(loaded)
        }
      })
      .catch((error) => {
        console.warn('[backlog] listStatuses failed:', error)
        if (!cancelled && mountedRef.current) {
          setProjectStatuses([])
        }
      })
      .finally(() => {
        if (!cancelled && mountedRef.current) {
          setProjectStatusesLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [connected, listStatuses, mountedRef, selectedProjectId])

  useEffect(() => {
    if (selectedStatuses !== null || availableStatuses.length === 0) {
      return
    }
    setSelectedStatuses(availableStatuses.filter((status) => !isBacklogCompletedStatus(status)))
  }, [availableStatuses, selectedStatuses])

  const displayedTasks = useMemo(
    () =>
      filterBacklogTasks(tasks, {
        statuses: selectedStatuses ?? undefined,
        unassigned: quickFilterUnassigned
      }),
    [quickFilterUnassigned, selectedStatuses, tasks]
  )

  const toggleStatusFilter = (status: string): void => {
    setSelectedStatuses((current) => {
      const base = current ?? []
      const key = status.trim().toLowerCase()
      const exists = base.some((entry) => entry.trim().toLowerCase() === key)
      if (exists) {
        return base.filter((entry) => entry.trim().toLowerCase() !== key)
      }
      return [...base, status]
    })
  }

  const loadTasks = useCallback(async (): Promise<void> => {
    if (!connected || !selectedProjectId) {
      setTasks([])
      setSelectedTaskId(null)
      return
    }
    setTasksLoading(true)
    setTasksError(null)
    const assignee = assigneeFilter.trim()
    const filter = assignee && !quickFilterUnassigned ? { assignee } : undefined
    try {
      const loaded = await listTasks(selectedProjectId, filter)
      if (!mountedRef.current) {
        return
      }
      setTasks(loaded)
      setSelectedTaskId((current) =>
        current && loaded.some((task) => task.id === current) ? current : null
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
  }, [assigneeFilter, connected, listTasks, mountedRef, quickFilterUnassigned, selectedProjectId])

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
        <TaskPageBacklogConnectEmptyState
          onConnect={handleConnectClick}
          onHideSource={onHideSource}
        />
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
      <div className="flex min-h-0 max-h-full flex-col overflow-hidden rounded-md rounded-t-none border border-t-0 border-border/50 bg-muted/50 shadow-sm">
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
              {displayedTasks.length} {translate('auto.components.TaskPage.b7bae28b6a', 'shown')}
              {displayedTasks.length !== tasks.length ? ` / ${tasks.length}` : null}
            </span>
          </div>
        </div>

        <TaskPageBacklogPanelFilters
          projects={visibleProjects}
          projectsLoading={projectsLoading}
          selectedProjectId={selectedProjectId}
          setSelectedProjectId={(value) => {
            setSelectedTaskId(null)
            setSelectedProjectId(value)
          }}
          assigneeFilter={assigneeFilter}
          setAssigneeFilter={setAssigneeFilter}
          availableStatuses={availableStatuses}
          selectedStatuses={selectedStatuses}
          toggleStatus={toggleStatusFilter}
          quickFilterUnassigned={quickFilterUnassigned}
          setQuickFilterUnassigned={setQuickFilterUnassigned}
          projectStatusesLoading={projectStatusesLoading}
        />

        {projectsError ? (
          <div className="border-b border-border/50 bg-background px-4 py-3 text-sm text-destructive">
            {projectsError}
          </div>
        ) : null}
        {visibleProjects.length === 0 && !projectsLoading ? (
          <div className="bg-background px-4 py-10 text-center text-sm text-muted-foreground">
            {translate(
              'auto.components.task.page.backlog.no_projects',
              'No visible Backlog projects. Choose projects in Settings → Integrations.'
            )}
          </div>
        ) : (
          <TaskPageBacklogTaskList
            tasks={tasks}
            displayedTasks={displayedTasks}
            tasksLoading={tasksLoading}
            tasksError={tasksError}
            projectName={selectedProject?.name || selectedProject?.path}
            availableStatuses={availableStatuses}
            onOpen={(opened) => setSelectedTaskId(opened.id)}
            onStart={onUse}
            onUpdateTask={(task, updates) => {
              if (!selectedProjectId || !updates.status) {
                return
              }
              const status = updates.status
              void updateTask(selectedProjectId, task.id, { status }).then((result) => {
                if (result.ok) {
                  setTasks((current) =>
                    current.map((t) => (t.id === task.id ? { ...t, status } : t))
                  )
                }
              })
            }}
          />
        )}
      </div>
      <TaskPageBacklogTaskDetail
        selectedTask={selectedTask}
        projectId={selectedProjectId}
        projectName={selectedProject?.name || selectedProject?.path}
        availableStatuses={availableStatuses}
        onClose={() => setSelectedTaskId(null)}
        onOpenTask={(taskId) => setSelectedTaskId(taskId)}
        listComments={listComments}
        onStart={onUse}
        onTaskUpdated={(updated) => {
          setTasks((current) =>
            current.map((task) => (task.id === updated.id ? { ...task, ...updated } : task))
          )
        }}
        updateTask={updateTask}
        listAssignables={listAssignables}
      />
      <BacklogConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
    </>
  )
}
