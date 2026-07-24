import { useMemo, type MutableRefObject } from 'react'
import {
  buildSmartNameSelection,
  resolveComposerCreateSelection
} from './composer-linked-work-item'
import type {
  ComposerBaseState,
  MobileComposerCreateSelection,
  MobileLinkedWorkItem,
  SmartNameSelection
} from './mobile-composer-source-types'

export function useMobileComposerDerivedSelection(args: {
  linkedWorkItem: MobileLinkedWorkItem | null
  base: ComposerBaseState
  branchSelectionRef: MutableRefObject<{ refName: string; localBranchName: string } | null>
  reuseEligibleBranch: string | null
  reuseSelectedBranch: boolean
  branchCreateIntent: boolean
  name: string
}): {
  smartNameSelection: SmartNameSelection | null
  createSelection: MobileComposerCreateSelection | null
} {
  const {
    linkedWorkItem,
    base,
    branchSelectionRef,
    reuseEligibleBranch,
    reuseSelectedBranch,
    branchCreateIntent,
    name
  } = args

  const smartNameSelection = useMemo<SmartNameSelection | null>(
    () => buildSmartNameSelection({ linkedWorkItem, baseBranch: base.baseBranch }),
    [base.baseBranch, linkedWorkItem]
  )

  const createSelection = useMemo<MobileComposerCreateSelection | null>(
    () =>
      resolveComposerCreateSelection({
        linkedWorkItem,
        base,
        branch: branchSelectionRef.current,
        reuseEligibleBranch,
        reuseSelectedBranch,
        branchCreateIntent,
        name
      }),
    [base, branchCreateIntent, linkedWorkItem, name, reuseEligibleBranch, reuseSelectedBranch]
  )

  return { smartNameSelection, createSelection }
}
