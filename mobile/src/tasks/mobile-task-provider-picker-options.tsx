import { TaskProviderLogo } from '../components/TaskProviderLogo'
import type { PickerOption } from '../components/PickerModal'
import { colors } from '../theme/mobile-theme'
import type { TaskProvider } from './mobile-task-providers'

export const MOBILE_TASK_PROVIDER_PICKER_OPTIONS: PickerOption<TaskProvider>[] = [
  {
    value: 'github',
    label: 'GitHub',
    subtitle: 'Issues and pull requests',
    renderIcon: (selected) => (
      <TaskProviderLogo
        provider="github"
        size={16}
        color={selected ? colors.textPrimary : colors.textSecondary}
      />
    )
  },
  {
    value: 'gitlab',
    label: 'GitLab',
    subtitle: 'Issues and merge requests',
    renderIcon: (selected) => (
      <TaskProviderLogo
        provider="gitlab"
        size={16}
        color={selected ? colors.textPrimary : colors.textSecondary}
      />
    )
  },
  {
    value: 'linear',
    label: 'Linear',
    subtitle: 'Assigned and team issues',
    renderIcon: (selected) => (
      <TaskProviderLogo
        provider="linear"
        size={16}
        color={selected ? colors.textPrimary : colors.textSecondary}
      />
    )
  },
  {
    value: 'backlog',
    label: 'Backlog',
    subtitle: 'Tasks from your Backlog server',
    renderIcon: (selected) => (
      <TaskProviderLogo
        provider="backlog"
        size={16}
        color={selected ? colors.textPrimary : colors.textSecondary}
      />
    )
  }
]
