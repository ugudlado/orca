import React from 'react'
import type { BacklogProject } from '../../../shared/types'
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

type TaskPageBacklogPanelFiltersProps = {
  projects: readonly BacklogProject[]
  projectsLoading: boolean
  selectedProjectId: string | null
  setSelectedProjectId: (projectId: string) => void
  assigneeFilter: string
  setAssigneeFilter: (value: string) => void
  availableStatuses: readonly string[]
  selectedStatuses: readonly string[] | null
  toggleStatus: (status: string) => void
  quickFilterUnassigned: boolean
  setQuickFilterUnassigned: (value: boolean) => void
  projectStatusesLoading: boolean
}

export function TaskPageBacklogPanelFilters({
  projects,
  projectsLoading,
  selectedProjectId,
  setSelectedProjectId,
  assigneeFilter,
  setAssigneeFilter,
  availableStatuses,
  selectedStatuses,
  toggleStatus,
  quickFilterUnassigned,
  setQuickFilterUnassigned,
  projectStatusesLoading
}: TaskPageBacklogPanelFiltersProps): React.JSX.Element {
  return (
    <div className="flex flex-none flex-col gap-2 border-b border-border/50 bg-background px-3 py-2">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[160px] flex-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {translate('auto.components.task.page.backlog.project', 'Project')}
          </Label>
          <Select
            value={selectedProjectId ?? undefined}
            onValueChange={setSelectedProjectId}
            disabled={projectsLoading || projects.length === 0}
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
              {projects.map((project) => (
                <SelectItem key={String(project.id)} value={String(project.id)} className="text-xs">
                  {project.name || project.path}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[160px] flex-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {translate('auto.components.TaskPage.d2a876ca53', 'Assignee')}
          </Label>
          <Input
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
            placeholder={translate(
              'auto.components.task.page.backlog.assignee_ph',
              'Filter assignee'
            )}
            className="mt-1 h-8 text-xs"
            disabled={quickFilterUnassigned}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {translate('auto.components.TaskPage.154b0fa623', 'Status')}
        </span>
        {availableStatuses.length === 0 ? (
          <span className="text-[11px] text-muted-foreground">
            {projectStatusesLoading
              ? translate(
                  'auto.components.task.page.backlog.loading_statuses',
                  'Loading project statuses…'
                )
              : translate(
                  'auto.components.task.page.backlog.no_status_filters',
                  'No statuses configured for this project'
                )}
          </span>
        ) : (
          availableStatuses.map((status) => {
            const selected =
              selectedStatuses?.some(
                (entry) => entry.trim().toLowerCase() === status.trim().toLowerCase()
              ) ?? false
            return (
              <Button
                key={status}
                type="button"
                size="xs"
                variant="outline"
                aria-pressed={selected}
                className={cn(
                  'h-7 rounded-full px-2.5 text-[11px]',
                  selected
                    ? backlogStatusChipClassName(status, 'ring-1 ring-foreground/15')
                    : 'opacity-70'
                )}
                onClick={() => toggleStatus(status)}
              >
                {status}
              </Button>
            )
          })
        )}
        <span className="mx-1 h-4 w-px bg-border/60" aria-hidden="true" />
        <Button
          type="button"
          size="xs"
          variant={quickFilterUnassigned ? 'secondary' : 'outline'}
          aria-pressed={quickFilterUnassigned}
          className="h-7 rounded-full px-2.5 text-[11px]"
          onClick={() => setQuickFilterUnassigned(!quickFilterUnassigned)}
        >
          {translate('auto.components.TaskPage.42a9160321', 'Unassigned')}
        </Button>
      </div>
    </div>
  )
}
