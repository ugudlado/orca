import React from 'react'
import { ExternalLink, LoaderCircle, X } from 'lucide-react'
import { VisuallyHidden } from 'radix-ui'
import type {
  BacklogAssignable,
  BacklogTask,
  BacklogTaskComment,
  BacklogTaskUpdate
} from '../../../shared/types'
import { Button } from '@/components/ui/button'
import { TaskPageBacklogTaskFields } from '@/components/task-page-backlog-task-fields'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useBacklogTaskDetailEditor } from '@/hooks/useBacklogTaskDetailEditor'
import { translate } from '@/i18n/i18n'

type TaskPageBacklogTaskDetailProps = {
  selectedTask: BacklogTask | null
  projectId?: string | null
  projectName?: string | null
  availableStatuses: readonly string[]
  onClose: () => void
  onStart: (task: BacklogTask) => void
  onTaskUpdated: (task: BacklogTask) => void
  /** Opens a linked task (dependency) in its own detail view. */
  onOpenTask: (taskId: string) => void
  updateTask: (
    projectId: string,
    taskId: string,
    updates: BacklogTaskUpdate
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  listAssignables: (projectId: string) => Promise<BacklogAssignable[]>
  listComments: (projectId: string, taskId: string) => Promise<BacklogTaskComment[]>
}

export function TaskPageBacklogTaskDetail({
  selectedTask,
  projectId,
  projectName,
  availableStatuses,
  onClose,
  onStart,
  onTaskUpdated,
  onOpenTask,
  updateTask,
  listAssignables,
  listComments
}: TaskPageBacklogTaskDetailProps): React.JSX.Element {
  const editor = useBacklogTaskDetailEditor({
    selectedTask,
    projectId,
    availableStatuses,
    onTaskUpdated,
    updateTask,
    listAssignables,
    listComments
  })

  return (
    <Sheet open={selectedTask !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full p-0 sm:max-w-[560px]"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
        }}
      >
        <VisuallyHidden.Root asChild>
          <SheetTitle>
            {selectedTask?.title ??
              translate('auto.components.task.page.backlog.detail_title', 'Backlog task')}
          </SheetTitle>
        </VisuallyHidden.Root>
        <VisuallyHidden.Root asChild>
          <SheetDescription>
            {translate(
              'auto.components.task.page.backlog.detail_description',
              'Preview and edit the selected Backlog task.'
            )}
          </SheetDescription>
        </VisuallyHidden.Root>

        {selectedTask ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex flex-none items-start justify-between gap-2 border-b border-border/60 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs text-muted-foreground">{selectedTask.id}</p>
                {projectName?.trim() ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {projectName.trim()}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  data-contextual-tour-target="tasks-start-workspace"
                  className="min-w-[72px] bg-background/80 font-semibold"
                  onClick={() => onStart(selectedTask)}
                >
                  {translate('auto.components.TaskPage.7d08e8be0f', 'Start')}
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => void window.api.shell.openUrl(selectedTask.url)}
                      aria-label={translate(
                        'auto.components.task.page.backlog.open_external',
                        'Open in Backlog'
                      )}
                      className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
                    >
                      <ExternalLink className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {translate(
                      'auto.components.task.page.backlog.open_external',
                      'Open in Backlog'
                    )}
                  </TooltipContent>
                </Tooltip>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={translate('auto.components.task.page.backlog.close_detail', 'Close')}
                  className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>

            <TaskPageBacklogTaskFields
              task={selectedTask}
              isEditing={editor.isEditing}
              saving={editor.saving}
              title={editor.title}
              setTitle={editor.setTitle}
              status={editor.status}
              setStatus={editor.setStatus}
              statusOptions={editor.statusOptions}
              assigneeName={editor.assigneeName}
              setAssigneeName={editor.setAssigneeName}
              assignables={editor.assigneeOptions}
              assignablesLoading={editor.assignablesLoading}
              assignablesError={editor.assignablesError}
              body={editor.body}
              setBody={editor.setBody}
              dueDate={editor.dueDate}
              setDueDate={editor.setDueDate}
              onStartEdit={editor.handleStartEdit}
              onOpenTask={onOpenTask}
              commentsOpen={editor.commentsOpen}
              comments={editor.comments}
              commentsLoading={editor.commentsLoading}
              commentsError={editor.commentsError}
              onOpenComments={editor.handleOpenComments}
            />

            <div className="flex flex-none items-center justify-between gap-2 border-t border-border/60 px-4 py-3">
              <Button
                type="button"
                variant="outline"
                className="bg-background/80 font-semibold"
                data-contextual-tour-target="tasks-start-workspace"
                onClick={() => onStart(selectedTask)}
              >
                {translate('auto.components.TaskPage.7d08e8be0f', 'Start')}
              </Button>
              {editor.isEditing ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={editor.saving}
                    onClick={editor.handleCancelEdit}
                  >
                    {translate('auto.components.GitLabItemDialog.f72fad3b16', 'Cancel')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!editor.dirty || editor.saving}
                    onClick={() => void editor.handleSave()}
                  >
                    {editor.saving ? (
                      <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
                    ) : null}
                    {translate('auto.components.LinearItemDrawer.b5675b0694', 'Save')}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
