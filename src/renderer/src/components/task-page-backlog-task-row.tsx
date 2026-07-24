import React from 'react'
import { EllipsisVertical, ExternalLink, MessageSquare } from 'lucide-react'
import type { BacklogTask } from '../../../shared/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { backlogStatusChipClassName } from '@/lib/backlog-status-chip'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'

/** Match GitHub issue list column rhythm (ID · title · assignee · status · updated · actions). */
export const BACKLOG_TASK_GRID_CLASS =
  'min-w-[820px] grid-cols-[96px_minmax(320px,1fr)_84px_100px_92px_122px]'

const BACKLOG_TASK_ROW_SURFACE_CLASS =
  '[background:color-mix(in_srgb,var(--muted)_50%,var(--background))]'
const BACKLOG_TASK_ROW_HOVER_SURFACE_CLASS =
  'group-hover/backlog-task-row:[background:color-mix(in_srgb,var(--muted)_70%,var(--background))]'

export const BACKLOG_TASK_STICKY_ID_HEADER_CLASS = cn(
  'sticky left-3 z-30 before:absolute before:-left-3 before:top-0 before:bottom-0 before:w-3 before:bg-inherit',
  BACKLOG_TASK_ROW_SURFACE_CLASS
)
export const BACKLOG_TASK_STICKY_TITLE_HEADER_CLASS = cn(
  'sticky left-[116px] z-30 border-r border-border/50 before:absolute before:-left-2 before:top-0 before:bottom-0 before:w-2 before:bg-inherit',
  BACKLOG_TASK_ROW_SURFACE_CLASS
)
export const BACKLOG_TASK_STICKY_ID_CELL_CLASS = cn(
  'sticky left-3 z-20 flex items-center before:absolute before:-left-3 before:top-0 before:bottom-0 before:w-3 before:bg-inherit',
  BACKLOG_TASK_ROW_SURFACE_CLASS,
  BACKLOG_TASK_ROW_HOVER_SURFACE_CLASS
)
export const BACKLOG_TASK_STICKY_TITLE_CELL_CLASS = cn(
  'sticky left-[116px] z-20 min-w-0 border-r border-border/50 pr-2 before:absolute before:-left-2 before:top-0 before:bottom-0 before:w-2 before:bg-inherit',
  BACKLOG_TASK_ROW_SURFACE_CLASS,
  BACKLOG_TASK_ROW_HOVER_SURFACE_CLASS
)

const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

function formatRelativeTime(input: string): string {
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) {
    return 'recently'
  }
  const diffMs = date.getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / 60_000)
  if (Math.abs(diffMinutes) < 60) {
    return relativeTimeFormatter.format(diffMinutes, 'minute')
  }
  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return relativeTimeFormatter.format(diffHours, 'hour')
  }
  const diffDays = Math.round(diffHours / 24)
  return relativeTimeFormatter.format(diffDays, 'day')
}

function formatBacklogTaskIdLabel(taskId: string): string {
  return taskId.trim()
}

const PRIORITY_LABEL: Record<NonNullable<BacklogTask['priority']>, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
}

/** Display-only badge — priority editing stays in Backlog's own UI. */
const PRIORITY_BADGE_CLASS: Record<NonNullable<BacklogTask['priority']>, string> = {
  urgent: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-200',
  high: 'border-orange-500/40 bg-orange-500/10 text-orange-800 dark:text-orange-200',
  medium: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  low: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-200'
}

type TaskPageBacklogTaskRowProps = {
  task: BacklogTask
  projectName?: string | null
  onOpen: (task: BacklogTask) => void
  onStart: (task: BacklogTask) => void
}

export function TaskPageBacklogTaskRow({
  task,
  projectName,
  onOpen,
  onStart
}: TaskPageBacklogTaskRowProps): React.JSX.Element {
  const idLabel = formatBacklogTaskIdLabel(task.id)
  const projectLabel = projectName?.trim() || null
  const milestoneLabel =
    task.milestone?.trim() && task.milestone.trim() !== projectLabel ? task.milestone.trim() : null
  const hasContext = Boolean(
    projectLabel ||
    milestoneLabel ||
    task.labels.length > 0 ||
    task.priority ||
    task.commentCount > 0
  )

  const idPill = (
    <span
      className="inline-flex max-w-full items-center rounded-md border border-border/50 bg-muted/40 px-1.5 py-0.5 text-muted-foreground"
      aria-label={`Task ${idLabel}`}
    >
      <span className="truncate font-mono text-[11px] font-normal">{idLabel}</span>
    </span>
  )

  return (
    // Why: clickable div not a <button> — nested Start / menu buttons would be invalid HTML.
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(task)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(task)
        }
      }}
      className={cn(
        'group/backlog-task-row grid cursor-pointer gap-2 px-3 py-2 text-left transition-colors hover:[background:color-mix(in_srgb,var(--muted)_70%,var(--background))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        BACKLOG_TASK_GRID_CLASS
      )}
    >
      <div className={BACKLOG_TASK_STICKY_ID_CELL_CLASS}>{idPill}</div>

      <div className={BACKLOG_TASK_STICKY_TITLE_CELL_CLASS}>
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground">{task.title}</h3>
        </div>
        {hasContext ? (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {task.priority ? (
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium',
                  PRIORITY_BADGE_CLASS[task.priority]
                )}
              >
                {PRIORITY_LABEL[task.priority]}
              </span>
            ) : null}
            {projectLabel ? <span className="truncate">{projectLabel}</span> : null}
            {milestoneLabel ? <span className="truncate">{milestoneLabel}</span> : null}
            {task.labels.slice(0, 3).map((label) => (
              <span
                key={label}
                className="rounded-full border border-border/50 bg-background/80 px-1.5 py-0 text-[10px] text-muted-foreground"
              >
                {label}
              </span>
            ))}
            {task.commentCount > 0 ? (
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="size-3" />
                {task.commentCount}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="min-w-0 flex items-center text-xs text-muted-foreground">
        {task.assignee?.name ? (
          <span className="truncate">{task.assignee.name}</span>
        ) : (
          <span className="text-xs text-muted-foreground/60">-</span>
        )}
      </div>

      <div className="flex items-center">
        <span className={backlogStatusChipClassName(task.status)}>
          <span className="truncate">{task.status || '—'}</span>
        </span>
      </div>

      {task.updatedAt ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center text-[11px] text-muted-foreground">
              {formatRelativeTime(task.updatedAt)}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {new Date(task.updatedAt).toLocaleString()}
          </TooltipContent>
        </Tooltip>
      ) : (
        <div className="flex items-center text-[11px] text-muted-foreground">—</div>
      )}

      <div className="flex items-center justify-start gap-1 lg:justify-end">
        <Button
          type="button"
          variant="outline"
          size="xs"
          data-contextual-tour-target="tasks-start-workspace"
          onClick={(event) => {
            event.stopPropagation()
            onStart(task)
          }}
          className="min-w-[72px] bg-background/80 font-semibold"
          aria-label={translate(
            'auto.components.TaskPage.e104fa3d3d',
            'Start workspace from issue'
          )}
        >
          {translate('auto.components.TaskPage.7d08e8be0f', 'Start')}
        </Button>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(event) => event.stopPropagation()}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
              aria-label={translate('auto.components.TaskPage.66ae7330f6', 'More actions')}
            >
              <EllipsisVertical className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenuItem onSelect={() => void window.api.shell.openUrl(task.url)}>
              <ExternalLink className="size-4" />
              {translate('auto.components.TaskPage.c1d1600362', 'Open in browser')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
