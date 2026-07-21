import React from 'react'
import { ArrowRight, ExternalLink } from 'lucide-react'
import type { BacklogTask } from '../../../shared/types'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'

type TaskPageBacklogTaskDetailProps = {
  selectedTask: BacklogTask | null
  onUse: (task: BacklogTask) => void
}

export function TaskPageBacklogTaskDetail({
  selectedTask,
  onUse
}: TaskPageBacklogTaskDetailProps): React.JSX.Element {
  if (!selectedTask) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10 text-sm text-muted-foreground">
        {translate(
          'auto.components.task.page.backlog.select_task',
          'Select a task to view details.'
        )}
      </div>
    )
  }

  return (
    <>
      <div className="flex-none border-b border-border/50 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">{selectedTask.id}</p>
            <h3 className="mt-1 text-base font-medium leading-snug">{selectedTask.title}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  data-contextual-tour-target="tasks-start-workspace"
                  onClick={() => onUse(selectedTask)}
                  aria-label={translate('auto.components.TaskPage.9497f2787c', 'Start workspace')}
                >
                  <ArrowRight className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                {translate('auto.components.TaskPage.9497f2787c', 'Start workspace')}
              </TooltipContent>
            </Tooltip>
            <button
              type="button"
              onClick={() => void window.api.shell.openUrl(selectedTask.url)}
              aria-label={translate(
                'auto.components.task.page.backlog.open_external',
                'Open in Backlog'
              )}
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-3.5" />
            </button>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <div>
            <dt className="text-muted-foreground">
              {translate('auto.components.TaskPage.154b0fa623', 'Status')}
            </dt>
            <dd>{selectedTask.status}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {translate('auto.components.TaskPage.d2a876ca53', 'Assignee')}
            </dt>
            <dd>{selectedTask.assignee?.name ?? '—'}</dd>
          </div>
          {selectedTask.milestone ? (
            <div className="col-span-2">
              <dt className="text-muted-foreground">
                {translate('auto.components.task.page.backlog.milestone', 'Milestone')}
              </dt>
              <dd>{selectedTask.milestone}</dd>
            </div>
          ) : null}
          {selectedTask.labels.length > 0 ? (
            <div className="col-span-2">
              <dt className="text-muted-foreground">
                {translate('auto.components.TaskPage.d0ca4aa1d0', 'Labels')}
              </dt>
              <dd>{selectedTask.labels.join(', ')}</dd>
            </div>
          ) : null}
        </dl>
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm whitespace-pre-wrap text-muted-foreground scrollbar-sleek"
        style={{ scrollbarGutter: 'stable' }}
      >
        {selectedTask.body.trim() ||
          translate('auto.components.task.page.backlog.no_body', 'No description.')}
      </div>
      <div className="flex-none border-t border-border/50 px-4 py-3">
        <Button className="w-full sm:w-auto" onClick={() => onUse(selectedTask)}>
          {translate('auto.components.task.page.backlog.use', 'Use')}
        </Button>
      </div>
    </>
  )
}
