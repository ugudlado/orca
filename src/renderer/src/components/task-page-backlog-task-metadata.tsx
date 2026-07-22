import React from 'react'
import { ChevronDown, ExternalLink, LoaderCircle } from 'lucide-react'
import type { BacklogTask, BacklogTaskComment } from '../../../shared/types'
import CommentMarkdown from '@/components/sidebar/CommentMarkdown'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { translate } from '@/i18n/i18n'

type TaskPageBacklogTaskMetadataProps = {
  task: BacklogTask
  commentsOpen: boolean
  comments: readonly BacklogTaskComment[]
  commentsLoading: boolean
  commentsError: string | null
  onOpenComments: () => void
}

export function TaskPageBacklogTaskMetadata({
  task,
  commentsOpen,
  comments,
  commentsLoading,
  commentsError,
  onOpenComments
}: TaskPageBacklogTaskMetadataProps): React.JSX.Element {
  return (
    <>
      {task.acceptanceCriteriaItems.length > 0 ? (
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {translate(
              'auto.components.task.page.backlog.acceptance_criteria',
              'Acceptance criteria'
            )}
          </Label>
          <ul className="space-y-1">
            {task.acceptanceCriteriaItems.map((item) => (
              <li key={item.index} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={item.checked}
                  disabled
                  className="mt-0.5 size-3.5 shrink-0"
                  aria-label={item.text}
                />
                <span className={item.checked ? 'text-muted-foreground line-through' : ''}>
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {task.implementationNotes?.trim() ? (
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {translate(
              'auto.components.task.page.backlog.implementation_notes',
              'Implementation notes'
            )}
          </Label>
          <CommentMarkdown content={task.implementationNotes} />
        </div>
      ) : null}

      {task.documentation.length > 0 ? (
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {translate('auto.components.task.page.backlog.documentation', 'Documentation')}
          </Label>
          <ul className="space-y-1">
            {task.documentation.map((url) => (
              <li key={url}>
                <a
                  href={url}
                  onClick={(event) => {
                    event.preventDefault()
                    void window.api.shell.openUrl(url)
                  }}
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="size-3 shrink-0" />
                  <span className="truncate">{url}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-1.5">
        {!commentsOpen ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenComments}
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
          >
            <ChevronDown className="size-3.5" />
            {task.commentCount > 0
              ? `${translate('auto.components.task.page.backlog.show_comments', 'Show comments')} (${task.commentCount})`
              : translate('auto.components.task.page.backlog.no_comments', 'No comments')}
          </Button>
        ) : (
          <>
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {translate('auto.components.task.page.backlog.comments', 'Comments')}
            </Label>
            {commentsLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <LoaderCircle className="size-3 animate-spin" />
                {translate('auto.components.task.page.backlog.loading_comments', 'Loading…')}
              </div>
            ) : commentsError ? (
              <p className="text-xs text-destructive">{commentsError}</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {translate('auto.components.task.page.backlog.no_comments', 'No comments')}
              </p>
            ) : (
              <ul className="space-y-2">
                {comments.map((comment) => (
                  <li key={comment.id} className="rounded-md border border-border/50 p-2 text-xs">
                    <p className="mb-1 text-muted-foreground">
                      {new Date(comment.ts).toLocaleString()}
                    </p>
                    <p className="whitespace-pre-wrap">{comment.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {task.createdAt || task.updatedAt ? (
        <dl className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          {task.createdAt ? (
            <div>
              <dt>{translate('auto.components.task.page.backlog.created', 'Created')}</dt>
              <dd>{new Date(task.createdAt).toLocaleString()}</dd>
            </div>
          ) : null}
          {task.updatedAt ? (
            <div>
              <dt>{translate('auto.components.task.page.backlog.updated', 'Updated')}</dt>
              <dd>{new Date(task.updatedAt).toLocaleString()}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </>
  )
}
