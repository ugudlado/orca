import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import { resolveComposerBranchPick } from './composer-linked-work-item'
import type { ComposerBaseState, MobileLinkedWorkItem } from './mobile-composer-source-types'

export function useMobileComposerBranchSelect(args: {
  name: string
  worktreeBranches: readonly string[]
  resolveTokenRef: MutableRefObject<number>
  lastAutoNameRef: MutableRefObject<string>
  branchSelectionRef: MutableRefObject<{ refName: string; localBranchName: string } | null>
  setLinkedWorkItem: (item: MobileLinkedWorkItem | null) => void
  setForkPushWarning: Dispatch<SetStateAction<string | null>>
  setBranchCreateIntent: Dispatch<SetStateAction<boolean>>
  setResolvingBase: Dispatch<SetStateAction<boolean>>
  setReuseEligibleBranch: Dispatch<SetStateAction<string | null>>
  setReuseSelectedBranch: Dispatch<SetStateAction<boolean>>
  setBase: Dispatch<SetStateAction<ComposerBaseState>>
  setNameState: Dispatch<SetStateAction<string>>
}) {
  const {
    name,
    worktreeBranches,
    resolveTokenRef,
    lastAutoNameRef,
    branchSelectionRef,
    setLinkedWorkItem,
    setForkPushWarning,
    setBranchCreateIntent,
    setResolvingBase,
    setReuseEligibleBranch,
    setReuseSelectedBranch,
    setBase,
    setNameState
  } = args

  return useCallback(
    (refName: string, localBranchName: string) => {
      resolveTokenRef.current += 1
      setLinkedWorkItem(null)
      setForkPushWarning(null)
      setBranchCreateIntent(false)
      setResolvingBase(false)
      const pick = resolveComposerBranchPick({
        refName,
        localBranchName,
        currentName: name,
        lastAutoName: lastAutoNameRef.current,
        worktreeBranches
      })
      setReuseEligibleBranch(pick.reuseEligibleBranch)
      setReuseSelectedBranch(pick.reuseSelectedBranch)
      setBase(pick.base)
      branchSelectionRef.current = { refName, localBranchName }
      if (pick.name !== undefined) {
        setNameState(pick.name)
        lastAutoNameRef.current = pick.lastAutoName ?? ''
      }
    },
    [
      branchSelectionRef,
      lastAutoNameRef,
      name,
      resolveTokenRef,
      setBase,
      setBranchCreateIntent,
      setForkPushWarning,
      setLinkedWorkItem,
      setNameState,
      setResolvingBase,
      setReuseEligibleBranch,
      setReuseSelectedBranch,
      worktreeBranches
    ]
  )
}

export function useMobileComposerCreateBranch(args: {
  resolveTokenRef: MutableRefObject<number>
  lastAutoNameRef: MutableRefObject<string>
  setLinkedWorkItem: (item: MobileLinkedWorkItem | null) => void
  setNameState: Dispatch<SetStateAction<string>>
  setBranchCreateIntent: Dispatch<SetStateAction<boolean>>
  clearBaseAndBranch: () => void
}) {
  const {
    resolveTokenRef,
    lastAutoNameRef,
    setLinkedWorkItem,
    setNameState,
    setBranchCreateIntent,
    clearBaseAndBranch
  } = args

  return useCallback(
    (branchName: string) => {
      resolveTokenRef.current += 1
      setLinkedWorkItem(null)
      clearBaseAndBranch()
      setNameState(branchName)
      lastAutoNameRef.current = branchName
      setBranchCreateIntent(true)
    },
    [
      clearBaseAndBranch,
      lastAutoNameRef,
      resolveTokenRef,
      setBranchCreateIntent,
      setLinkedWorkItem,
      setNameState
    ]
  )
}

export function useMobileComposerClearSmartSelection(args: {
  name: string
  resolveTokenRef: MutableRefObject<number>
  lastAutoNameRef: MutableRefObject<string>
  setLinkedWorkItem: (item: MobileLinkedWorkItem | null) => void
  setNameState: Dispatch<SetStateAction<string>>
  setResolvingBase: Dispatch<SetStateAction<boolean>>
  clearBaseAndBranch: () => void
}) {
  const {
    name,
    resolveTokenRef,
    lastAutoNameRef,
    setLinkedWorkItem,
    setNameState,
    setResolvingBase,
    clearBaseAndBranch
  } = args

  return useCallback(() => {
    resolveTokenRef.current += 1
    setLinkedWorkItem(null)
    clearBaseAndBranch()
    setResolvingBase(false)
    if (name === lastAutoNameRef.current) {
      setNameState('')
      lastAutoNameRef.current = ''
    }
  }, [
    clearBaseAndBranch,
    lastAutoNameRef,
    name,
    resolveTokenRef,
    setLinkedWorkItem,
    setNameState,
    setResolvingBase
  ])
}
