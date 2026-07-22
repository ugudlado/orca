import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type {
  BacklogAssignable,
  BacklogTask,
  BacklogTaskComment,
  BacklogTaskUpdate
} from '../../../shared/types'
import { useMountedRef } from '@/hooks/useMountedRef'
import { translate } from '@/i18n/i18n'

type UseBacklogTaskDetailEditorArgs = {
  selectedTask: BacklogTask | null
  projectId?: string | null
  availableStatuses: readonly string[]
  onTaskUpdated: (task: BacklogTask) => void
  updateTask: (
    projectId: string,
    taskId: string,
    updates: BacklogTaskUpdate
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  listAssignables: (projectId: string) => Promise<BacklogAssignable[]>
  listComments: (projectId: string, taskId: string) => Promise<BacklogTaskComment[]>
}

export function useBacklogTaskDetailEditor({
  selectedTask,
  projectId,
  availableStatuses,
  onTaskUpdated,
  updateTask,
  listAssignables,
  listComments
}: UseBacklogTaskDetailEditorArgs) {
  const mountedRef = useMountedRef()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState('')
  const [assigneeName, setAssigneeName] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [assignables, setAssignables] = useState<BacklogAssignable[]>([])
  const [assignablesLoading, setAssignablesLoading] = useState(false)
  const [assignablesError, setAssignablesError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [comments, setComments] = useState<BacklogTaskComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState<string | null>(null)

  const resolveProjectId = selectedTask ? projectId?.trim() || selectedTask.projectId : null

  useEffect(() => {
    if (!selectedTask) {
      return
    }
    // Why: hydrate only on task switch so status/assignee autosaves don't wipe in-progress title/body edits.
    setTitle(selectedTask.title)
    setBody(selectedTask.body)
    setStatus(selectedTask.status)
    setAssigneeName(selectedTask.assignee?.name ?? null)
    setDueDate(selectedTask.dueDate ?? '')
    setIsEditing(false)
    setCommentsOpen(false)
    setComments([])
    setCommentsError(null)
  }, [selectedTask?.id])

  const hydrateFromTask = useCallback((task: BacklogTask): void => {
    setTitle(task.title)
    setBody(task.body)
    setStatus(task.status)
    setAssigneeName(task.assignee?.name ?? null)
    setDueDate(task.dueDate ?? '')
  }, [])

  const handleStartEdit = (): void => {
    if (!selectedTask) {
      return
    }
    hydrateFromTask(selectedTask)
    setIsEditing(true)
  }

  const handleCancelEdit = (): void => {
    if (selectedTask) {
      hydrateFromTask(selectedTask)
    }
    setIsEditing(false)
  }

  useEffect(() => {
    if (!resolveProjectId) {
      setAssignables([])
      setAssignablesError(null)
      return
    }
    let cancelled = false
    setAssignablesLoading(true)
    setAssignablesError(null)
    void listAssignables(resolveProjectId)
      .then((loaded) => {
        if (!cancelled && mountedRef.current) {
          setAssignables(loaded)
          setAssignablesError(null)
        }
      })
      .catch((error) => {
        if (!cancelled && mountedRef.current) {
          setAssignables([])
          setAssignablesError(error instanceof Error ? error.message : 'Failed to load assignees')
        }
      })
      .finally(() => {
        if (!cancelled && mountedRef.current) {
          setAssignablesLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [listAssignables, mountedRef, resolveProjectId])

  const statusOptions = useMemo(() => {
    const options: string[] = []
    const seen = new Set<string>()
    for (const entry of availableStatuses) {
      const trimmed = entry.trim()
      if (!trimmed) {
        continue
      }
      const key = trimmed.toLowerCase()
      if (seen.has(key)) {
        continue
      }
      seen.add(key)
      options.push(trimmed)
    }
    // Why: keep a legacy/custom task status selectable even if removed from project config.
    const current = status.trim()
    if (current && !seen.has(current.toLowerCase())) {
      options.push(current)
    }
    return options
  }, [availableStatuses, status])

  const assigneeOptions = useMemo(() => {
    const list = [...assignables]
    if (
      assigneeName &&
      !list.some((entry) => entry.name.trim().toLowerCase() === assigneeName.trim().toLowerCase())
    ) {
      list.unshift({ id: assigneeName, name: assigneeName, kind: 'user' })
    }
    return list
  }, [assigneeName, assignables])

  const dirty = useMemo(() => {
    if (!selectedTask) {
      return false
    }
    return (
      title.trim() !== selectedTask.title.trim() ||
      body !== selectedTask.body ||
      status.trim() !== selectedTask.status.trim() ||
      (assigneeName ?? null) !== (selectedTask.assignee?.name ?? null) ||
      dueDate !== (selectedTask.dueDate ?? '')
    )
  }, [assigneeName, body, dueDate, selectedTask, status, title])

  const applyLocalPatch = useCallback(
    (task: BacklogTask, updates: BacklogTaskUpdate, assigneeLabel: string | null): BacklogTask => {
      return {
        ...task,
        ...(updates.title !== undefined ? { title: updates.title } : {}),
        ...(updates.description !== undefined ? { body: updates.description } : {}),
        ...(updates.status !== undefined ? { status: updates.status } : {}),
        ...(updates.dueDate !== undefined ? { dueDate: updates.dueDate ?? undefined } : {}),
        ...(updates.assignee !== undefined
          ? {
              assignee:
                updates.assignee === null
                  ? null
                  : { id: updates.assignee, name: assigneeLabel ?? updates.assignee }
            }
          : {})
      }
    },
    []
  )

  const persist = useCallback(
    async (updates: BacklogTaskUpdate, assigneeLabel: string | null): Promise<boolean> => {
      if (!selectedTask) {
        return false
      }
      setSaving(true)
      try {
        const result = await updateTask(selectedTask.projectId, selectedTask.id, updates)
        if (!mountedRef.current) {
          return false
        }
        if (!result.ok) {
          toast.error(result.error)
          return false
        }
        onTaskUpdated(applyLocalPatch(selectedTask, updates, assigneeLabel))
        return true
      } finally {
        if (mountedRef.current) {
          setSaving(false)
        }
      }
    },
    [applyLocalPatch, mountedRef, onTaskUpdated, selectedTask, updateTask]
  )

  const handleSave = async (): Promise<void> => {
    if (!selectedTask || !dirty || saving) {
      return
    }
    const nextTitle = title.trim()
    if (!nextTitle) {
      toast.error(
        translate('auto.components.task.page.backlog.title_required', 'Title is required.')
      )
      return
    }
    const updates: BacklogTaskUpdate = {}
    if (nextTitle !== selectedTask.title.trim()) {
      updates.title = nextTitle
    }
    if (body !== selectedTask.body) {
      updates.description = body
    }
    if (status.trim() !== selectedTask.status.trim()) {
      updates.status = status.trim()
    }
    if ((assigneeName ?? null) !== (selectedTask.assignee?.name ?? null)) {
      updates.assignee = assigneeName
    }
    if (dueDate !== (selectedTask.dueDate ?? '')) {
      updates.dueDate = dueDate || null
    }
    const ok = await persist(updates, assigneeName)
    if (ok) {
      setIsEditing(false)
    }
  }

  const handleOpenComments = useCallback((): void => {
    if (!selectedTask || !resolveProjectId) {
      return
    }
    setCommentsOpen(true)
    if (comments.length > 0 || commentsLoading) {
      return
    }
    setCommentsLoading(true)
    setCommentsError(null)
    void listComments(resolveProjectId, selectedTask.id)
      .then((loaded) => {
        if (mountedRef.current) {
          setComments(loaded)
        }
      })
      .catch((error) => {
        if (mountedRef.current) {
          setCommentsError(error instanceof Error ? error.message : 'Failed to load comments')
        }
      })
      .finally(() => {
        if (mountedRef.current) {
          setCommentsLoading(false)
        }
      })
  }, [comments.length, commentsLoading, listComments, mountedRef, resolveProjectId, selectedTask])

  return {
    title,
    setTitle,
    body,
    setBody,
    status,
    setStatus,
    assigneeName,
    setAssigneeName,
    dueDate,
    setDueDate,
    assigneeOptions,
    assignablesLoading,
    assignablesError,
    saving,
    isEditing,
    commentsOpen,
    comments,
    commentsLoading,
    commentsError,
    statusOptions,
    dirty,
    handleStartEdit,
    handleCancelEdit,
    handleSave,
    handleOpenComments
  }
}
