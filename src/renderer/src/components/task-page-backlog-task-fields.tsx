import React from 'react'
import { Bot, LoaderCircle, Pencil, UserRound } from 'lucide-react'
import type { BacklogAssignable, BacklogTask, BacklogTaskComment } from '../../../shared/types'
import CommentMarkdown from '@/components/sidebar/CommentMarkdown'
import { TaskPageBacklogTaskMetadata } from '@/components/task-page-backlog-task-metadata'
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
import { backlogStatusChipClassName } from '@/lib/backlog-status-chip'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'

const UNASSIGNED_VALUE = '__unassigned__'

const PRIORITY_LABEL: Record<NonNullable<BacklogTask['priority']>, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
}

type TaskPageBacklogTaskFieldsProps = {
  task: BacklogTask
  isEditing: boolean
  saving: boolean
  title: string
  setTitle: (value: string) => void
  status: string
  setStatus: (value: string) => void
  statusOptions: readonly string[]
  assigneeName: string | null
  setAssigneeName: (value: string | null) => void
  assignables: readonly BacklogAssignable[]
  assignablesLoading: boolean
  assignablesError: string | null
  body: string
  setBody: (value: string) => void
  dueDate: string
  setDueDate: (value: string) => void
  onStartEdit: () => void
  /** Opens a linked task (dependency) in its own detail view. */
  onOpenTask: (taskId: string) => void
  commentsOpen: boolean
  comments: readonly BacklogTaskComment[]
  commentsLoading: boolean
  commentsError: string | null
  onOpenComments: () => void
}

export function TaskPageBacklogTaskFields({
  task,
  isEditing,
  saving,
  title,
  setTitle,
  status,
  setStatus,
  statusOptions,
  assigneeName,
  setAssigneeName,
  assignables,
  assignablesLoading,
  assignablesError,
  body,
  setBody,
  dueDate,
  setDueDate,
  onStartEdit,
  onOpenTask,
  commentsOpen,
  comments,
  commentsLoading,
  commentsError,
  onOpenComments
}: TaskPageBacklogTaskFieldsProps): React.JSX.Element {
  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 scrollbar-sleek">
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {translate('auto.components.TaskPage.5eccb3c841', 'Title / Context')}
          </Label>
          {!isEditing ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={onStartEdit}
              className="gap-1.5"
            >
              <Pencil className="size-3.5" />
              {translate('auto.components.GitLabItemDialog.da4174b00f', 'Edit')}
            </Button>
          ) : null}
        </div>
        {isEditing ? (
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-9 text-sm font-medium"
            disabled={saving}
          />
        ) : (
          <h3 className="truncate text-sm font-medium">{task.title}</h3>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {translate('auto.components.TaskPage.154b0fa623', 'Status')}
          </Label>
          {isEditing ? (
            <Select value={status || undefined} onValueChange={setStatus} disabled={saving}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option} value={option} className="text-xs">
                    <span className={backlogStatusChipClassName(option)}>{option}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : task.status ? (
            <span className={backlogStatusChipClassName(task.status)}>{task.status}</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {translate('auto.components.TaskPage.d2a876ca53', 'Assignee')}
          </Label>
          {isEditing ? (
            <Select
              value={assigneeName ?? UNASSIGNED_VALUE}
              onValueChange={(value) => setAssigneeName(value === UNASSIGNED_VALUE ? null : value)}
              disabled={saving}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue
                  placeholder={translate(
                    'auto.components.LinearItemDrawer.866316f22c',
                    'Unassigned'
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED_VALUE} className="text-xs">
                  {translate('auto.components.LinearItemDrawer.866316f22c', 'Unassigned')}
                </SelectItem>
                {assignablesLoading ? (
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                    <LoaderCircle className="size-3 animate-spin" />
                    {translate('auto.components.LinearItemDrawer.b2376d0179', 'Loading members')}
                  </div>
                ) : null}
                {!assignablesLoading && assignablesError ? (
                  <div className="px-2 py-1.5 text-xs text-destructive">{assignablesError}</div>
                ) : null}
                {assignables.map((entry) => (
                  <SelectItem
                    key={`${entry.kind}:${entry.id}`}
                    value={entry.name}
                    className="text-xs"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {entry.kind === 'agent' ? (
                        <Bot className="size-3 shrink-0 text-muted-foreground" />
                      ) : (
                        <UserRound className="size-3 shrink-0 text-muted-foreground" />
                      )}
                      <span>{entry.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm text-muted-foreground">{task.assignee?.name ?? '—'}</span>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {translate('auto.components.task.page.backlog.due_date', 'Due date')}
          </Label>
          {isEditing ? (
            <Input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              disabled={saving}
              className="h-8 text-xs"
            />
          ) : (
            <span className="text-sm text-muted-foreground">{task.dueDate ?? '—'}</span>
          )}
        </div>
        {task.blocked ? (
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {translate('auto.components.task.page.backlog.blocked', 'Blocked')}
            </Label>
            <span className="inline-flex items-center rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-200">
              {translate('auto.components.task.page.backlog.blocked', 'Blocked')}
            </span>
          </div>
        ) : null}
      </div>
      {task.milestone ||
      task.labels.length > 0 ||
      task.priority ||
      task.epic ||
      task.dependencies.length > 0 ? (
        <dl className="grid grid-cols-1 gap-2 text-xs">
          {task.priority ? (
            <div>
              <dt className="text-muted-foreground">
                {translate('auto.components.task.page.backlog.priority', 'Priority')}
              </dt>
              <dd>{PRIORITY_LABEL[task.priority]}</dd>
            </div>
          ) : null}
          {task.milestone ? (
            <div>
              <dt className="text-muted-foreground">
                {translate('auto.components.task.page.backlog.milestone', 'Milestone')}
              </dt>
              <dd>{task.milestone}</dd>
            </div>
          ) : null}
          {task.epic ? (
            <div>
              <dt className="text-muted-foreground">
                {translate('auto.components.task.page.backlog.epic', 'Epic')}
              </dt>
              <dd>{task.epic}</dd>
            </div>
          ) : null}
          {task.labels.length > 0 ? (
            <div>
              <dt className="text-muted-foreground">
                {translate('auto.components.TaskPage.d0ca4aa1d0', 'Labels')}
              </dt>
              <dd>{task.labels.join(', ')}</dd>
            </div>
          ) : null}
          {task.dependencies.length > 0 ? (
            <div>
              <dt className="text-muted-foreground">
                {translate('auto.components.task.page.backlog.dependencies', 'Depends on')}
              </dt>
              <dd className="flex flex-wrap gap-1.5">
                {task.dependencies.map((depId) => (
                  <button
                    key={depId}
                    type="button"
                    onClick={() => onOpenTask(depId)}
                    className="rounded-md border border-border/50 bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:bg-muted/70"
                  >
                    {depId}
                  </button>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {translate('auto.components.task.page.backlog.description', 'Description')}
        </Label>
        {isEditing ? (
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={12}
            disabled={saving}
            className={cn(
              'w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm',
              'shadow-xs outline-none placeholder:text-muted-foreground',
              'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            placeholder={translate('auto.components.task.page.backlog.no_body', 'No description.')}
          />
        ) : task.body.trim() ? (
          <div className="min-w-0">
            <CommentMarkdown content={task.body} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {translate('auto.components.task.page.backlog.no_body', 'No description.')}
          </p>
        )}
      </div>

      <TaskPageBacklogTaskMetadata
        task={task}
        commentsOpen={commentsOpen}
        comments={comments}
        commentsLoading={commentsLoading}
        commentsError={commentsError}
        onOpenComments={onOpenComments}
      />
    </div>
  )
}
