import React, { useEffect, useState } from 'react'
import { Check, ChevronsUpDown, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { OrchestratorWorkflowSchema } from '@/lib/build-orchestrator-run-command'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'

export type WorkflowSchemaComboboxProps = {
  value: OrchestratorWorkflowSchema | null
  onValueChange: (schema: OrchestratorWorkflowSchema | null) => void
  /** Repo path passed as cwd to `orchestrator config-path` — resolves per-repo workflow configs. */
  repoPath: string
  disabled?: boolean
  triggerClassName?: string
}

// Why: mirrors AgentCombobox's full-width searchable-combobox styling so the
// workflow picker reads as a first-class form row alongside Project / Agent.
export function WorkflowSchemaCombobox({
  value,
  onValueChange,
  repoPath,
  disabled,
  triggerClassName
}: WorkflowSchemaComboboxProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [schemas, setSchemas] = useState<OrchestratorWorkflowSchema[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    window.api.orchestrator
      .listWorkflowSchemas(repoPath)
      .then((result) => {
        if (!cancelled) {
          setSchemas(result)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [repoPath])

  return (
    <div className="min-w-0 w-full">
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || loading}
            className={cn(
              'h-9 w-full min-w-0 justify-between px-3 py-0 text-xs font-normal',
              triggerClassName
            )}
          >
            <span className="truncate leading-none">
              {loading ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                (value ??
                translate(
                  'auto.components.NewWorkspaceComposerCard.selectWorkflow',
                  'Select workflow…'
                ))
              )}
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command shouldFilter>
            <CommandInput
              placeholder={translate(
                'auto.components.NewWorkspaceComposerCard.searchWorkflow',
                'Search workflows…'
              )}
            />
            <CommandList>
              <CommandEmpty>{translate('common.empty', 'No workflows found.')}</CommandEmpty>
              <CommandGroup>
                {schemas.map((schema) => (
                  <CommandItem
                    key={schema}
                    value={schema}
                    onSelect={() => {
                      onValueChange(schema)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'size-4 shrink-0',
                        value === schema ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {schema}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
