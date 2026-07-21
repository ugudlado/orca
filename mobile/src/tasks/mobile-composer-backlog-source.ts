import type { MutableRefObject } from 'react'
import { useCallback } from 'react'
import type { BacklogTask } from '../../../src/shared/backlog-types'
import { buildBacklogLinkedWorkItem } from './composer-linked-work-item'
import type { MobileLinkedWorkItem } from './mobile-composer-source-types'

export function applyBacklogTaskComposerSelection(args: {
  task: BacklogTask
  name: string
  resolveTokenRef: MutableRefObject<number>
  setLinkedWorkItem: (item: MobileLinkedWorkItem | null) => void
  applyAutoName: (suggested: string, currentName: string) => void
  clearBaseAndBranch: () => void
}): void {
  args.resolveTokenRef.current += 1
  args.setLinkedWorkItem(
    buildBacklogLinkedWorkItem({
      id: args.task.id,
      projectId: args.task.projectId,
      title: args.task.title,
      url: args.task.url
    })
  )
  args.applyAutoName(args.task.title, args.name)
  args.clearBaseAndBranch()
}

export function useMobileComposerBacklogTaskSelect(args: {
  name: string
  resolveTokenRef: MutableRefObject<number>
  setLinkedWorkItem: (item: MobileLinkedWorkItem | null) => void
  applyAutoName: (suggested: string, currentName: string) => void
  clearBaseAndBranch: () => void
}) {
  const { name, resolveTokenRef, setLinkedWorkItem, applyAutoName, clearBaseAndBranch } = args
  return useCallback(
    (task: BacklogTask) => {
      applyBacklogTaskComposerSelection({
        task,
        name,
        resolveTokenRef,
        setLinkedWorkItem,
        applyAutoName,
        clearBaseAndBranch
      })
    },
    [applyAutoName, clearBaseAndBranch, name, resolveTokenRef, setLinkedWorkItem]
  )
}
