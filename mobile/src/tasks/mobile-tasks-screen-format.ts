import type { RpcSuccess } from '../transport/types'
import type {
  GitHubPreset,
  GitHubTaskKind,
  LinearFilter
} from './mobile-tasks-screen-picker-options'

export function isMobileTasksRpcSuccess(response: unknown): response is RpcSuccess {
  return Boolean(response && typeof response === 'object' && (response as RpcSuccess).ok)
}

export function mobileTaskTime(value: string): number {
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : 0
}

export function formatMobileTaskUpdatedAt(value: string): string {
  const time = mobileTaskTime(value)
  if (!time) {
    return ''
  }
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60_000))
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h`
  }
  return `${Math.floor(hours / 24)}d`
}

export function getMobileTaskPresetQuery(preset: GitHubPreset): string {
  switch (preset) {
    case 'my-issues':
      return 'assignee:@me is:issue is:open'
    case 'prs':
      return 'is:pr is:open'
    case 'my-prs':
      return 'author:@me is:pr is:open'
    case 'review':
      return 'review-requested:@me is:pr is:open'
    case 'issues':
    default:
      return 'is:issue is:open'
  }
}

export function normalizeMobileGitHubPreset(value: unknown): GitHubPreset {
  return value === 'my-issues' ||
    value === 'prs' ||
    value === 'my-prs' ||
    value === 'review' ||
    value === 'issues'
    ? value
    : 'issues'
}

export function normalizeMobileLinearFilter(value: unknown): LinearFilter {
  return value === 'assigned' || value === 'created' || value === 'completed' || value === 'all'
    ? value
    : 'all'
}

export function githubKindFromMobileTaskQuery(
  query: string,
  fallbackPreset: GitHubPreset
): GitHubTaskKind {
  if (/\bis:pr\b/i.test(query)) {
    return 'prs'
  }
  if (/\bis:issue\b/i.test(query)) {
    return 'issues'
  }
  return fallbackPreset === 'prs' || fallbackPreset === 'my-prs' || fallbackPreset === 'review'
    ? 'prs'
    : 'issues'
}
