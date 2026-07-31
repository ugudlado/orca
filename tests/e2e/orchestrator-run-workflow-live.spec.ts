/**
 * E2E: "Run workflow" composer action actually spawns the real `orchestrator`
 * CLI in a terminal tab.
 *
 * Why E2E: run-orchestrator-workflow.test.ts only asserts the store calls it
 * makes (mocked createTab/queueTabStartupCommand); it never proves a PTY
 * consumes the queued command or that the real orchestrator binary runs. This
 * spec drives the actual composer UI and reads the actual terminal buffer.
 */

import { execFileSync } from 'node:child_process'
import { test, expect } from './helpers/orca-app'
import { waitForActiveWorktree, waitForSessionReady } from './helpers/store'
import { waitForTerminalOutput } from './helpers/terminal'
import type { LinkedWorkItemSummary } from '../../src/renderer/src/lib/new-workspace'

const TEST_TICKET_ID = 'E2E-TEST-1'

function hasOrchestratorOnPath(): boolean {
  try {
    execFileSync('orchestrator', ['--help'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

test.describe('Orchestrator run workflow — live CLI spawn', () => {
  test.skip(!hasOrchestratorOnPath(), 'orchestrator CLI is not on PATH on this machine')

  test('spawns a terminal running the real orchestrator CLI for the selected schema', async ({
    orcaPage
  }) => {
    await waitForSessionReady(orcaPage)
    await waitForActiveWorktree(orcaPage)

    const linkedWorkItem: LinkedWorkItemSummary = {
      provider: 'backlog',
      type: 'issue',
      number: 0,
      title: 'E2E orchestrator smoke test',
      url: 'https://example.invalid/backlog/E2E-TEST-1',
      backlogTaskId: TEST_TICKET_ID,
      backlogProjectId: 'e2e-project'
    }

    await orcaPage.evaluate((linkedWorkItem) => {
      const store = window.__store
      if (!store) {
        throw new Error('window.__store is not available')
      }
      store.getState().openModal('new-workspace-composer', { linkedWorkItem })
    }, linkedWorkItem)

    const composer = orcaPage.getByRole('dialog')
    await expect(composer).toBeVisible()

    await composer.getByRole('tab', { name: 'Workflow' }).click()
    await composer.getByText('Select workflow').click()
    await orcaPage.getByRole('option', { name: 'feature', exact: true }).click()
    await composer.getByRole('button', { name: 'Start' }).click()

    await expect(composer).toBeHidden()

    // Why: no spec/project.yaml exists in the seeded test repo, so the real
    // CLI fails fast — proof it launched with our exact args, without
    // triggering a full multi-agent workflow run.
    await waitForTerminalOutput(
      orcaPage,
      `orchestrator run ${TEST_TICKET_ID} --schema feature`,
      15_000
    )
    await waitForTerminalOutput(orcaPage, 'spec/project.yaml not found', 15_000)
  })
})
