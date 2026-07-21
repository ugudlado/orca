import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import { getForkPushWarning } from '../../../src/shared/new-workspace/fork-push-warning'
import type { ComposerHostedBase } from './composer-source-base-resolve'
import type { ComposerBaseState } from './mobile-composer-source-types'

export const MOBILE_COMPOSER_EMPTY_BASE: ComposerBaseState = {}

export function useMobileComposerBaseResolve(args: {
  resolveTokenRef: MutableRefObject<number>
  onError?: (message: string) => void
  setBase: Dispatch<SetStateAction<ComposerBaseState>>
  setForkPushWarning: Dispatch<SetStateAction<string | null>>
  setResolvingBase: Dispatch<SetStateAction<boolean>>
}) {
  const { resolveTokenRef, onError, setBase, setForkPushWarning, setResolvingBase } = args
  return useCallback(
    (token: number, resolve: Promise<ComposerHostedBase>) => {
      setResolvingBase(true)
      void resolve
        .then((result) => {
          if (resolveTokenRef.current !== token) {
            return
          }
          setBase({
            baseBranch: result.baseBranch,
            compareBaseRef: result.compareBaseRef,
            pushTarget: result.pushTarget,
            branchNameOverride: result.branchNameOverride
          })
          setForkPushWarning(getForkPushWarning(result))
        })
        .catch((error: unknown) => {
          if (resolveTokenRef.current !== token) {
            return
          }
          setBase(MOBILE_COMPOSER_EMPTY_BASE)
          onError?.(error instanceof Error ? error.message : 'Failed to resolve base branch.')
        })
        .finally(() => {
          if (resolveTokenRef.current === token) {
            setResolvingBase(false)
          }
        })
    },
    [onError, resolveTokenRef, setBase, setForkPushWarning, setResolvingBase]
  )
}
