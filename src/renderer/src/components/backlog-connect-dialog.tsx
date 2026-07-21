import { useId, useLayoutEffect, useState } from 'react'
import { LoaderCircle, Lock } from 'lucide-react'
import { useAppStore } from '@/store'
import { useMountedRef } from '@/hooks/useMountedRef'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { hasRemoteProviderRuntime } from '@/lib/provider-runtime-context'
import { translate } from '@/i18n/i18n'

type BacklogConnectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnected?: () => void
  overlayClassName?: string
  contentClassName?: string
}

type ConnectState = 'idle' | 'connecting' | 'error'

const DEFAULT_BACKLOG_SERVER_URL = 'http://localhost:6420'

export function BacklogConnectDialog({
  open,
  onOpenChange,
  onConnected,
  overlayClassName,
  contentClassName
}: BacklogConnectDialogProps): React.JSX.Element {
  const connectBacklog = useAppStore((s) => s.connectBacklog)
  const settings = useAppStore((s) => s.settings)
  const mountedRef = useMountedRef()
  const serverUrlId = useId()
  const tokenId = useId()
  const errorId = useId()

  const [serverUrl, setServerUrl] = useState('')
  const [token, setToken] = useState('')
  const [connectState, setConnectState] = useState<ConnectState>('idle')
  const [connectError, setConnectError] = useState<string | null>(null)

  useLayoutEffect(() => {
    if (!open) {
      return
    }
    const defaultUrl = settings?.backlogServerUrl?.trim() || DEFAULT_BACKLOG_SERVER_URL
    setServerUrl(defaultUrl)
    setToken('')
    setConnectState('idle')
    setConnectError(null)
  }, [open, settings?.backlogServerUrl])

  const canSubmit =
    Boolean(serverUrl.trim()) && Boolean(token.trim()) && connectState !== 'connecting'
  const credentialStorageCopy = hasRemoteProviderRuntime(settings)
    ? 'Your token is sent to the selected remote runtime and stored there with runtime-supported encryption.'
    : 'Your token is stored locally and encrypted when local runtime storage supports it.'

  const clearErrorOnEdit = (): void => {
    if (connectState === 'error') {
      setConnectState('idle')
      setConnectError(null)
    }
  }

  const handleOpenChange = (nextOpen: boolean): void => {
    if (connectState !== 'connecting') {
      onOpenChange(nextOpen)
    }
  }

  const handleConnect = async (): Promise<void> => {
    const trimmedServerUrl = serverUrl.trim()
    const trimmedToken = token.trim()
    if (!trimmedServerUrl || !trimmedToken || connectState === 'connecting') {
      return
    }
    setConnectState('connecting')
    setConnectError(null)
    try {
      const result = await connectBacklog({
        serverUrl: trimmedServerUrl,
        token: trimmedToken
      })
      if (!mountedRef.current) {
        return
      }
      if (result.ok) {
        setToken('')
        setConnectState('idle')
        onOpenChange(false)
        onConnected?.()
        return
      }
      setConnectState('error')
      setConnectError(result.error)
    } catch (error) {
      if (mountedRef.current) {
        setConnectState('error')
        setConnectError(error instanceof Error ? error.message : 'Connection failed')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        overlayClassName={overlayClassName}
        className={cn('sm:max-w-md', contentClassName)}
      >
        <DialogHeader className="gap-3">
          <DialogTitle className="leading-tight">
            {translate('auto.components.backlog.connect.dialog.title', 'Connect Backlog server')}
          </DialogTitle>
          <DialogDescription>
            {translate(
              'auto.components.backlog.connect.dialog.description',
              'Use your Backlog server URL and an API token to browse tasks.'
            )}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void handleConnect()
          }}
        >
          <div className="flex flex-col gap-3">
            <div className="space-y-2">
              <Label htmlFor={serverUrlId} className="text-xs">
                {translate('auto.components.backlog.connect.dialog.server_url', 'Server URL')}
              </Label>
              <Input
                id={serverUrlId}
                autoFocus
                placeholder={DEFAULT_BACKLOG_SERVER_URL}
                value={serverUrl}
                onChange={(event) => {
                  setServerUrl(event.target.value)
                  clearErrorOnEdit()
                }}
                disabled={connectState === 'connecting'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={tokenId} className="text-xs">
                {translate('auto.components.backlog.connect.dialog.token', 'API token')}
              </Label>
              <Input
                id={tokenId}
                type="password"
                placeholder={translate(
                  'auto.components.backlog.connect.dialog.token_placeholder',
                  'Backlog API token'
                )}
                value={token}
                onChange={(event) => {
                  setToken(event.target.value)
                  clearErrorOnEdit()
                }}
                disabled={connectState === 'connecting'}
                aria-invalid={connectState === 'error'}
                aria-describedby={connectState === 'error' ? errorId : undefined}
              />
            </div>
            {connectState === 'error' && connectError ? (
              <p id={errorId} className="text-xs text-destructive">
                {connectError}
              </p>
            ) : null}
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
              <Lock className="size-3 shrink-0" />
              {credentialStorageCopy}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={connectState === 'connecting'}
            >
              {translate('auto.components.backlog.connect.dialog.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {connectState === 'connecting' ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  {translate('auto.components.backlog.connect.dialog.verifying', 'Verifying…')}
                </>
              ) : (
                translate('auto.components.backlog.connect.dialog.connect', 'Connect')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
