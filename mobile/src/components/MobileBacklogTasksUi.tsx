import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Lock } from 'lucide-react-native'
import { BottomDrawer } from './BottomDrawer'
import { PickerModal, type PickerOption } from './PickerModal'
import { TaskProviderLogo } from './TaskProviderLogo'
import type { MobileBacklogConnectState } from '../tasks/use-mobile-backlog-tasks'
import { colors, radii, spacing, typography } from '../theme/mobile-theme'

type ConnectDrawerProps = {
  visible: boolean
  serverUrl: string
  token: string
  connectState: MobileBacklogConnectState
  connectError: string
  onServerUrlChange: (value: string) => void
  onTokenChange: (value: string) => void
  onClearConnectError: () => void
  onConnect: () => void
  onClose: () => void
}

export function MobileBacklogConnectDrawer({
  visible,
  serverUrl,
  token,
  connectState,
  connectError,
  onServerUrlChange,
  onTokenChange,
  onClearConnectError,
  onConnect,
  onClose
}: ConnectDrawerProps) {
  function handleFieldChange(setter: (value: string) => void, value: string): void {
    setter(value)
    if (connectState === 'error') {
      onClearConnectError()
    }
  }

  return (
    <BottomDrawer
      visible={visible}
      onClose={() => {
        if (connectState !== 'connecting') {
          onClose()
        }
      }}
    >
      <View style={styles.sheetHeader}>
        <View style={styles.sheetTitleRow}>
          <TaskProviderLogo provider="backlog" size={16} color={colors.textPrimary} />
          <Text style={styles.sheetTitle}>Connect Backlog server</Text>
        </View>
        <Text style={styles.sheetSubtitle}>
          Enter your Backlog server URL and a user API token from the Backlog web UI.
        </Text>
      </View>
      <View style={styles.createForm}>
        <Text style={styles.fieldLabel}>Server URL</Text>
        <TextInput
          style={styles.input}
          value={serverUrl}
          onChangeText={(next) => handleFieldChange(onServerUrlChange, next)}
          placeholder="http://localhost:6420"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          editable={connectState !== 'connecting'}
        />
        <Text style={styles.fieldLabel}>User token</Text>
        <TextInput
          style={styles.input}
          value={token}
          onChangeText={(next) => handleFieldChange(onTokenChange, next)}
          placeholder="Paste token"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          editable={connectState !== 'connecting'}
          onSubmitEditing={() => onConnect()}
        />
        {connectState === 'error' && connectError ? (
          <Text style={styles.detailError}>{connectError}</Text>
        ) : null}
        <View style={styles.securityHintRow}>
          <Lock size={13} color={colors.textMuted} />
          <Text style={styles.securityHintText}>
            Your token is encrypted via the host OS keychain and stored on the connected desktop
            host.
          </Text>
        </View>
        <Pressable
          style={[
            styles.createButton,
            (!serverUrl.trim() || !token.trim() || connectState === 'connecting') &&
              styles.createButtonDisabled
          ]}
          disabled={!serverUrl.trim() || !token.trim() || connectState === 'connecting'}
          onPress={() => onConnect()}
        >
          {connectState === 'connecting' ? (
            <ActivityIndicator size="small" color={colors.bgBase} />
          ) : (
            <Text style={styles.createButtonText}>Connect</Text>
          )}
        </Pressable>
      </View>
    </BottomDrawer>
  )
}

type DisconnectedProps = {
  taskUiReady: boolean
  onConnect: () => void
}

export function MobileBacklogDisconnectedPrompt({ taskUiReady, onConnect }: DisconnectedProps) {
  return (
    <View style={styles.centered}>
      <TaskProviderLogo provider="backlog" size={32} color={colors.textSecondary} />
      <Text style={styles.emptyText}>Connect your Backlog server</Text>
      <Text style={styles.centeredHint}>
        Browse tasks from your self-hosted Backlog.md server and start work in Orca.
      </Text>
      <Pressable
        style={[styles.targetButton, styles.centerActionButton]}
        disabled={!taskUiReady}
        onPress={() => {
          if (taskUiReady) {
            onConnect()
          }
        }}
      >
        <Text style={styles.targetButtonText}>Connect Backlog</Text>
      </Pressable>
    </View>
  )
}

type ProjectSegmentProps = {
  taskUiReady: boolean
  projectLabel: string
  onOpenPicker: () => void
}

export function MobileBacklogProjectSegment({
  taskUiReady,
  projectLabel,
  onOpenPicker
}: ProjectSegmentProps) {
  return (
    <Pressable
      style={styles.segmentButton}
      disabled={!taskUiReady}
      onPress={() => {
        if (taskUiReady) {
          onOpenPicker()
        }
      }}
    >
      <Text style={styles.segmentSecondaryText}>{projectLabel}</Text>
    </Pressable>
  )
}

type ProjectPickerProps = {
  visible: boolean
  options: PickerOption<string>[]
  selected: string
  onSelect: (projectId: string) => void
  onClose: () => void
}

export function MobileBacklogProjectPickerModal({
  visible,
  options,
  selected,
  onSelect,
  onClose
}: ProjectPickerProps) {
  return (
    <PickerModal
      visible={visible}
      title="Backlog project"
      options={options}
      selected={selected}
      onSelect={onSelect}
      onClose={onClose}
    />
  )
}

type DetailAssigneeProps = {
  assignee: string
}

export function MobileBacklogDetailAssigneeMeta({ assignee }: DetailAssigneeProps) {
  return (
    <View style={styles.detailMetaItem}>
      <Text style={styles.detailMetaLabel}>Assignee</Text>
      <Text style={styles.detailMetaValue}>{assignee}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  sheetHeader: {
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.md
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary
  },
  sheetSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18
  },
  createForm: {
    gap: spacing.sm
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary
  },
  input: {
    backgroundColor: colors.bgRaised,
    color: colors.textPrimary,
    borderRadius: radii.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.bodySize,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  detailError: {
    color: colors.statusRed,
    fontSize: 12
  },
  securityHintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm
  },
  securityHintText: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17
  },
  createButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.textPrimary,
    borderRadius: radii.button,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center'
  },
  createButtonDisabled: {
    opacity: 0.45
  },
  createButtonText: {
    color: colors.bgBase,
    fontWeight: '600',
    fontSize: typography.bodySize
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center'
  },
  centeredHint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18
  },
  targetButton: {
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  centerActionButton: {
    marginTop: spacing.sm
  },
  targetButtonText: {
    fontSize: typography.bodySize,
    fontWeight: '600',
    color: colors.textPrimary
  },
  segmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  segmentSecondaryText: {
    fontSize: 12,
    color: colors.textSecondary
  },
  detailMetaItem: {
    gap: 2
  },
  detailMetaLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  detailMetaValue: {
    fontSize: 13,
    color: colors.textPrimary
  }
})
