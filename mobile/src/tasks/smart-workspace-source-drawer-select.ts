import type { SmartWorkspaceSourceRow as SourceRow } from '../../../src/shared/new-workspace/smart-workspace-source-results'
import type { MobileComposerSource } from '../tasks/use-mobile-composer-source'

export function applySmartWorkspaceSourceRowSelection(
  row: SourceRow,
  composer: MobileComposerSource
): void {
  switch (row.kind) {
    case 'use-name':
      composer.setName(row.name)
      break
    case 'create-branch':
      composer.handleSmartCreateBranch(row.name)
      break
    case 'github':
      composer.handleSmartGitHubItemSelect(row.item)
      break
    case 'gitlab':
      composer.handleSmartGitLabItemSelect(row.item)
      break
    case 'branch':
      composer.handleSmartBranchSelect(row.refName, row.localBranchName)
      break
    case 'linear':
      composer.handleSmartLinearIssueSelect(row.issue)
      break
    case 'backlog':
      composer.handleSmartBacklogTaskSelect(row.task)
      break
  }
}
