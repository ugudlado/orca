// Why: the "Run workflow" dropdown must reflect whatever workflows the orchestrator CLI
// actually has configured (config/workflows/*.yaml resolved via `orchestrator config-path`),
// not a hardcoded snapshot that drifts as workflows are added/removed. Lists filenames only —
// never parses YAML — per the orchestrator/orca integration boundary.
import { execFile } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

// Why: schema names end up interpolated into a shell command (buildOrchestratorRunCommand) —
// same trust boundary as ticket ids, so filenames outside this charset are dropped rather
// than surfaced.
const SAFE_SCHEMA_NAME = /^[A-Za-z0-9._-]+$/

export async function listOrchestratorWorkflowSchemas(cwd: string): Promise<string[]> {
  const { stdout } = await execFileAsync('orchestrator', ['config-path'], { cwd })
  const configPath = stdout.trim()
  const entries = await readdir(path.join(configPath, 'workflows'), { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.yaml'))
    .map((entry) => entry.name.slice(0, -'.yaml'.length))
    .filter((name) => SAFE_SCHEMA_NAME.test(name))
    .sort()
}
