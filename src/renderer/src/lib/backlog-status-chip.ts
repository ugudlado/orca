import { isBacklogCompletedStatus } from './backlog-task-filters'

/** Stable chip palette using design-system color tokens (not ad-hoc hex). */
const STATUS_CHIP_PALETTE = [
  'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-200',
  'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-200',
  'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-200',
  'border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-200',
  'border-orange-500/40 bg-orange-500/10 text-orange-800 dark:text-orange-200',
  'border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200',
  'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-200'
] as const

function hashStatusKey(status: string): number {
  let hash = 0
  for (let i = 0; i < status.length; i += 1) {
    hash = (hash * 31 + status.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/** Known Backlog defaults get fixed colors; custom statuses get a stable palette slot. */
export function getBacklogStatusChipClass(status: string): string {
  const normalized = status.trim().toLowerCase()
  if (!normalized) {
    return 'border-border/50 bg-muted/40 text-muted-foreground'
  }
  if (isBacklogCompletedStatus(status)) {
    return 'border-primary/40 bg-primary/10 text-primary'
  }
  if (
    normalized === 'todo' ||
    normalized === 'to do' ||
    normalized === 'open' ||
    normalized === 'backlog' ||
    normalized === 'ready'
  ) {
    return 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-200'
  }
  if (
    normalized === 'in progress' ||
    normalized === 'in-progress' ||
    normalized === 'started' ||
    normalized === 'doing'
  ) {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200'
  }
  if (normalized === 'review' || normalized === 'in review' || normalized === 'verify') {
    return 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-200'
  }
  if (normalized === 'blocked' || normalized === 'on hold') {
    return 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-200'
  }
  return STATUS_CHIP_PALETTE[hashStatusKey(normalized) % STATUS_CHIP_PALETTE.length]
}

export function backlogStatusChipClassName(status: string, className?: string): string {
  const base =
    'inline-flex max-w-full items-center truncate rounded-full border px-2 py-0.5 text-[10px] font-medium'
  return [base, getBacklogStatusChipClass(status), className].filter(Boolean).join(' ')
}
