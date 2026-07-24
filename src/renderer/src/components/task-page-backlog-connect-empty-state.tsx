import React from 'react'
import { ListTodo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'

type TaskPageBacklogConnectEmptyStateProps = {
  onConnect: () => void
  onHideSource?: () => void
}

export function TaskPageBacklogConnectEmptyState({
  onConnect,
  onHideSource
}: TaskPageBacklogConnectEmptyStateProps): React.JSX.Element {
  return (
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
        <Button onClick={onConnect}>
          {translate('auto.components.task.page.backlog.connect_cta', 'Connect Backlog')}
        </Button>
        {onHideSource ? (
          <Button variant="outline" onClick={onHideSource}>
            {translate('auto.components.task.page.backlog.hide', 'Hide Backlog')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
