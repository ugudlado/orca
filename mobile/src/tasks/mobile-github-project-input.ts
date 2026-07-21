import type { GitHubProjectRow } from './mobile-github-project-group-sort'

export type GitHubProjectRef = {
  owner: string
  ownerType: 'organization' | 'user'
  number: number
}

export function githubProjectKey(project: GitHubProjectRef): string {
  return `${project.ownerType}:${project.owner}:${project.number}`
}

export function parseGitHubProjectInput(
  input: string
): { owner: string; number: number; viewNumber?: number } | null {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }
  const short = /^([A-Za-z0-9][A-Za-z0-9-]*)\/(\d+)$/.exec(trimmed)
  if (short) {
    return { owner: short[1]!, number: Number(short[2]) }
  }
  try {
    const url = new URL(trimmed)
    if (url.hostname !== 'github.com') {
      return null
    }
    const parts = url.pathname.split('/').filter(Boolean)
    if ((parts[0] === 'orgs' || parts[0] === 'users') && parts[2] === 'projects' && parts[3]) {
      const number = Number(parts[3])
      if (!Number.isInteger(number) || number < 1) {
        return null
      }
      const viewNumber =
        parts[4] === 'views' && parts[5] && Number.isInteger(Number(parts[5]))
          ? Number(parts[5])
          : undefined
      return {
        owner: parts[1]!,
        number,
        ...(viewNumber && viewNumber > 0 ? { viewNumber } : {})
      }
    }
  } catch {
    return null
  }
  return null
}

export function projectRowType(row: GitHubProjectRow): 'issue' | 'pr' | null {
  if (row.itemType === 'ISSUE') {
    return 'issue'
  }
  if (row.itemType === 'PULL_REQUEST') {
    return 'pr'
  }
  return null
}

export function canCreateWorkspaceFromProjectRow(row: GitHubProjectRow): boolean {
  // Why: desktop only exposes Project "Start work" for backed issue/PR rows
  // with enough GitHub identity to build the linked work item.
  return projectRowType(row) !== null && row.content.number != null && Boolean(row.content.url)
}

export function splitRepositorySlug(slug: string | null): { owner: string; repo: string } | null {
  const [owner, repo] = slug?.split('/') ?? []
  return owner && repo ? { owner, repo } : null
}
