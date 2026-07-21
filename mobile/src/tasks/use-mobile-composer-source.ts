import { useCallback, useRef, useState } from 'react'
import { resolveComposerManualBranchNameChange } from '../../../src/shared/composer-branch-selection'
import { shouldApplyAutoName } from './composer-linked-work-item'
import type { RpcClient } from '../transport/rpc-client'
import {
  MOBILE_COMPOSER_EMPTY_BASE,
  useMobileComposerBaseResolve
} from './mobile-composer-base-resolve'
import {
  useMobileComposerBranchSelect,
  useMobileComposerClearSmartSelection,
  useMobileComposerCreateBranch
} from './mobile-composer-branch-select'
import { useMobileComposerBacklogTaskSelect } from './mobile-composer-backlog-source'
import { useMobileComposerDerivedSelection } from './mobile-composer-derived-selection'
import {
  useMobileComposerGitHubItemSelect,
  useMobileComposerGitLabItemSelect
} from './mobile-composer-hosted-item-select'
import { useMobileComposerLinearIssueSelect } from './mobile-composer-linear-source'
import type { ComposerBaseState, MobileLinkedWorkItem } from './mobile-composer-source-types'

export type UseMobileComposerSourceArgs = {
  client: RpcClient | null
  selectedRepoId: string | null
  worktreeBranches?: readonly string[]
  onError?: (message: string) => void
}

export function useMobileComposerSource(args: UseMobileComposerSourceArgs) {
  const { client, selectedRepoId, worktreeBranches = [], onError } = args
  const [name, setNameState] = useState('')
  const [linkedWorkItem, setLinkedWorkItem] = useState<MobileLinkedWorkItem | null>(null)
  const [base, setBase] = useState<ComposerBaseState>(MOBILE_COMPOSER_EMPTY_BASE)
  const [reuseEligibleBranch, setReuseEligibleBranch] = useState<string | null>(null)
  const [reuseSelectedBranch, setReuseSelectedBranch] = useState(false)
  const [forkPushWarning, setForkPushWarning] = useState<string | null>(null)
  const [resolvingBase, setResolvingBase] = useState(false)
  const [branchCreateIntent, setBranchCreateIntent] = useState(false)

  const lastAutoNameRef = useRef('')
  const branchSelectionRef = useRef<{ refName: string; localBranchName: string } | null>(null)
  const resolveTokenRef = useRef(0)

  const setName = useCallback((value: string) => setNameState(value), [])

  const applyAutoName = useCallback((suggested: string, currentName: string) => {
    if (suggested && shouldApplyAutoName({ currentName, lastAutoName: lastAutoNameRef.current })) {
      setNameState(suggested)
      lastAutoNameRef.current = suggested
    }
  }, [])

  const clearBaseAndBranch = useCallback(() => {
    branchSelectionRef.current = null
    setBranchCreateIntent(false)
    setBase(MOBILE_COMPOSER_EMPTY_BASE)
    setReuseEligibleBranch(null)
    setReuseSelectedBranch(false)
    setForkPushWarning(null)
    // Why: superseding selection bumps the resolve token; reset resolvingBase here
    // so an in-flight base resolve cannot leave the flag stuck true.
    setResolvingBase(false)
  }, [])

  const runBaseResolve = useMobileComposerBaseResolve({
    resolveTokenRef,
    onError,
    setBase,
    setForkPushWarning,
    setResolvingBase
  })

  const selectHandlerDeps = {
    client,
    selectedRepoId,
    name,
    resolveTokenRef,
    setLinkedWorkItem,
    applyAutoName,
    clearBaseAndBranch,
    runBaseResolve
  }

  const handleSmartGitHubItemSelect = useMobileComposerGitHubItemSelect(selectHandlerDeps)
  const handleSmartGitLabItemSelect = useMobileComposerGitLabItemSelect(selectHandlerDeps)
  const handleSmartLinearIssueSelect = useMobileComposerLinearIssueSelect({
    name,
    resolveTokenRef,
    lastAutoNameRef,
    setLinkedWorkItem,
    setNameState,
    clearBaseAndBranch
  })
  const handleSmartBacklogTaskSelect = useMobileComposerBacklogTaskSelect({
    name,
    resolveTokenRef,
    setLinkedWorkItem,
    applyAutoName,
    clearBaseAndBranch
  })
  const handleSmartBranchSelect = useMobileComposerBranchSelect({
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
  })
  const handleSmartCreateBranch = useMobileComposerCreateBranch({
    resolveTokenRef,
    lastAutoNameRef,
    setLinkedWorkItem,
    setNameState,
    setBranchCreateIntent,
    clearBaseAndBranch
  })
  const handleClearSmartNameSelection = useMobileComposerClearSmartSelection({
    name,
    resolveTokenRef,
    lastAutoNameRef,
    setLinkedWorkItem,
    setNameState,
    setResolvingBase,
    clearBaseAndBranch
  })

  const handleBranchNameOverrideChange = useCallback(
    (value: string) => {
      const next = resolveComposerManualBranchNameChange({
        value,
        pushTarget: base.pushTarget,
        forkPushWarning
      })
      setBase({
        ...base,
        branchNameOverride: next.branchNameOverride,
        pushTarget: next.pushTarget
      })
      setForkPushWarning(next.forkPushWarning)
    },
    [base, forkPushWarning]
  )

  const { smartNameSelection, createSelection } = useMobileComposerDerivedSelection({
    linkedWorkItem,
    base,
    branchSelectionRef,
    reuseEligibleBranch,
    reuseSelectedBranch,
    branchCreateIntent,
    name
  })

  const isNameAutoManaged = !name.trim() || name === lastAutoNameRef.current

  return {
    name,
    setName,
    linkedWorkItem,
    branchNameOverride: base.branchNameOverride,
    handleBranchNameOverrideChange,
    reuseEligibleBranch,
    reuseSelectedBranch,
    setReuseSelectedBranch,
    forkPushWarning,
    resolvingBase,
    isNameAutoManaged,
    smartNameSelection,
    createSelection,
    handleSmartGitHubItemSelect,
    handleSmartGitLabItemSelect,
    handleSmartLinearIssueSelect,
    handleSmartBacklogTaskSelect,
    handleSmartBranchSelect,
    handleSmartCreateBranch,
    handleClearSmartNameSelection
  }
}

export type MobileComposerSource = ReturnType<typeof useMobileComposerSource>
