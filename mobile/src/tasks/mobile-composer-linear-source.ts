import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import type { LinearIssue } from '../../../src/shared/types'
import {
  buildLinearLinkedWorkItem,
  resolveLinearAutoName,
  shouldApplyAutoName
} from './composer-linked-work-item'
import type { MobileLinkedWorkItem } from './mobile-composer-source-types'

export function useMobileComposerLinearIssueSelect(args: {
  name: string
  resolveTokenRef: MutableRefObject<number>
  lastAutoNameRef: MutableRefObject<string>
  setLinkedWorkItem: (item: MobileLinkedWorkItem | null) => void
  setNameState: Dispatch<SetStateAction<string>>
  clearBaseAndBranch: () => void
}) {
  const {
    name,
    resolveTokenRef,
    lastAutoNameRef,
    setLinkedWorkItem,
    setNameState,
    clearBaseAndBranch
  } = args

  return useCallback(
    (issue: LinearIssue) => {
      resolveTokenRef.current += 1
      setLinkedWorkItem(buildLinearLinkedWorkItem(issue))
      const suggested = resolveLinearAutoName(issue)
      const identifierTyped = name.trim().toLowerCase() === issue.identifier.toLowerCase()
      if (
        suggested &&
        (identifierTyped ||
          shouldApplyAutoName({ currentName: name, lastAutoName: lastAutoNameRef.current }))
      ) {
        setNameState(suggested)
        lastAutoNameRef.current = suggested
      }
      clearBaseAndBranch()
    },
    [clearBaseAndBranch, lastAutoNameRef, name, resolveTokenRef, setLinkedWorkItem, setNameState]
  )
}
