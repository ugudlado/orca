import { useCallback, type MutableRefObject } from 'react'
import type { GitHubWorkItem, GitLabWorkItem } from '../../../src/shared/types'
import { resolveGitHubWorkItemIdentity } from '../../../src/shared/new-workspace/github-work-item-identity'
import type { RpcClient } from '../transport/rpc-client'
import {
  buildGitHubLinkedWorkItem,
  buildGitLabLinkedWorkItem,
  resolveWorkItemAutoName
} from './composer-linked-work-item'
import {
  resolveComposerMrBase,
  resolveComposerPrBase,
  type ComposerHostedBase
} from './composer-source-base-resolve'
import type { MobileLinkedWorkItem } from './mobile-composer-source-types'

export function useMobileComposerGitHubItemSelect(args: {
  client: RpcClient | null
  selectedRepoId: string | null
  name: string
  resolveTokenRef: MutableRefObject<number>
  setLinkedWorkItem: (item: MobileLinkedWorkItem | null) => void
  applyAutoName: (suggested: string, currentName: string) => void
  clearBaseAndBranch: () => void
  runBaseResolve: (token: number, resolve: Promise<ComposerHostedBase>) => void
}) {
  const {
    client,
    selectedRepoId,
    name,
    resolveTokenRef,
    setLinkedWorkItem,
    applyAutoName,
    clearBaseAndBranch,
    runBaseResolve
  } = args

  return useCallback(
    (item: GitHubWorkItem) => {
      const token = (resolveTokenRef.current += 1)
      const identity = resolveGitHubWorkItemIdentity(item)
      const repoId = item.repoId || selectedRepoId
      setLinkedWorkItem(
        buildGitHubLinkedWorkItem({
          type: identity.type,
          number: identity.number,
          title: item.title,
          url: item.url,
          repoId: item.repoId
        })
      )
      applyAutoName(
        resolveWorkItemAutoName({ ...identity, title: item.title, provider: 'github' }),
        name
      )
      clearBaseAndBranch()
      if (identity.type !== 'pr' || !client || !repoId) {
        return
      }
      runBaseResolve(
        token,
        resolveComposerPrBase({
          client,
          repoId,
          prNumber: identity.number,
          ...(item.branchName ? { headRefName: item.branchName } : {}),
          ...(item.baseRefName ? { baseRefName: item.baseRefName } : {}),
          ...(item.isCrossRepository !== undefined
            ? { isCrossRepository: item.isCrossRepository }
            : {})
        })
      )
    },
    [
      applyAutoName,
      clearBaseAndBranch,
      client,
      name,
      runBaseResolve,
      resolveTokenRef,
      selectedRepoId,
      setLinkedWorkItem
    ]
  )
}

export function useMobileComposerGitLabItemSelect(args: {
  client: RpcClient | null
  selectedRepoId: string | null
  name: string
  resolveTokenRef: MutableRefObject<number>
  setLinkedWorkItem: (item: MobileLinkedWorkItem | null) => void
  applyAutoName: (suggested: string, currentName: string) => void
  clearBaseAndBranch: () => void
  runBaseResolve: (token: number, resolve: Promise<ComposerHostedBase>) => void
}) {
  const {
    client,
    selectedRepoId,
    name,
    resolveTokenRef,
    setLinkedWorkItem,
    applyAutoName,
    clearBaseAndBranch,
    runBaseResolve
  } = args

  return useCallback(
    (item: GitLabWorkItem) => {
      const token = (resolveTokenRef.current += 1)
      const repoId = item.repoId || selectedRepoId
      setLinkedWorkItem(
        buildGitLabLinkedWorkItem({
          type: item.type,
          number: item.number,
          title: item.title,
          url: item.url,
          repoId: item.repoId
        })
      )
      applyAutoName(
        resolveWorkItemAutoName({
          type: item.type,
          number: item.number,
          title: item.title,
          provider: 'gitlab'
        }),
        name
      )
      clearBaseAndBranch()
      if (item.type !== 'mr' || !client || !repoId) {
        return
      }
      runBaseResolve(
        token,
        resolveComposerMrBase({
          client,
          repoId,
          mrIid: item.number,
          ...(item.branchName ? { sourceBranch: item.branchName } : {}),
          ...(item.baseRefName ? { targetBranch: item.baseRefName } : {}),
          ...(item.isCrossRepository !== undefined
            ? { isCrossRepository: item.isCrossRepository }
            : {})
        })
      )
    },
    [
      applyAutoName,
      clearBaseAndBranch,
      client,
      name,
      runBaseResolve,
      resolveTokenRef,
      selectedRepoId,
      setLinkedWorkItem
    ]
  )
}
