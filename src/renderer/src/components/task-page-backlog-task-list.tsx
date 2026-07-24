import React from 'react'
import { LoaderCircle } from 'lucide-react'
import type { BacklogTask } from '../../../shared/types'
import {
  BACKLOG_TASK_GRID_CLASS,
  BACKLOG_TASK_STICKY_ID_HEADER_CLASS,
  BACKLOG_TASK_STICKY_TITLE_HEADER_CLASS,
  TaskPageBacklogTaskRow
} from '@/components/task-page-backlog-task-row'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'

type TaskPageBacklogTaskListProps = {
  tasks: readonly BacklogTask[]
  displayedTasks: readonly BacklogTask[]
  tasksLoading: boolean
  tasksError: string | null
  projectName: string | undefined
  onOpen: (task: BacklogTask) => void
  onStart: (task: BacklogTask) => void
}

export function TaskPageBacklogTaskList({
  tasks,
  displayedTasks,
  tasksLoading,
  tasksError,
  projectName,
  onOpen,
  onStart
}: TaskPageBacklogTaskListProps): React.JSX.Element {
  return (
    <div
      className="min-h-0 flex-1 overflow-auto bg-background scrollbar-sleek scrollbar-sleek-lg"
      style={{ scrollbarGutter: 'stable' }}
    >
      {tasksLoading && tasks.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : null}
      {tasksError ? (
        <div className="border-b border-border px-4 py-4 text-sm text-destructive">
          {tasksError}
        </div>
      ) : null}
      {!tasksLoading && tasks.length === 0 && !tasksError ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          {translate('auto.components.task.page.backlog.no_tasks', 'No tasks match filters.')}
        </div>
      ) : null}
      {!tasksLoading && tasks.length > 0 && displayedTasks.length === 0 && !tasksError ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          {translate(
            'auto.components.task.page.backlog.no_quick_filter_tasks',
            'No tasks match the quick filters.'
          )}
        </div>
      ) : null}
      {displayedTasks.length > 0 ? (
        <>
          <div
            className={cn(
              'sticky top-0 z-40 grid gap-2 border-b border-border/50 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground',
              '[background:color-mix(in_srgb,var(--muted)_50%,var(--background))]',
              BACKLOG_TASK_GRID_CLASS
            )}
          >
            <span className={BACKLOG_TASK_STICKY_ID_HEADER_CLASS}>
              {translate('auto.components.TaskPage.eb10c32872', 'ID')}
            </span>
            <span className={BACKLOG_TASK_STICKY_TITLE_HEADER_CLASS}>
              {translate('auto.components.TaskPage.5eccb3c841', 'Title / Context')}
            </span>
            <span>{translate('auto.components.TaskPage.8aba10579d', 'Assignees')}</span>
            <span>{translate('auto.components.TaskPage.154b0fa623', 'Status')}</span>
            <span>{translate('auto.components.TaskPage.f362667d55', 'Updated')}</span>
            <span />
          </div>
          {displayedTasks.map((task) => (
            <TaskPageBacklogTaskRow
              key={task.id}
              task={task}
              projectName={projectName}
              onOpen={onOpen}
              onStart={onStart}
            />
          ))}
        </>
      ) : null}
    </div>
  )
}
