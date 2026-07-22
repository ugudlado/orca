import { z } from 'zod'
import { defineMethod, type RpcMethod } from '../core'
import { OptionalPlainString, OptionalString, requiredString } from '../schemas'

const Connect = z.object({
  serverUrl: requiredString('Server URL is required'),
  token: requiredString('Token is required')
})

const ListTasks = z.object({
  projectId: requiredString('Project ID is required'),
  filter: z
    .object({
      status: OptionalPlainString,
      assignee: OptionalPlainString
    })
    .optional()
})

const TaskId = z.object({
  projectId: requiredString('Project ID is required'),
  taskId: requiredString('Task ID is required')
})

const TaskUpdate = z.object({
  projectId: requiredString('Project ID is required'),
  taskId: requiredString('Task ID is required'),
  updates: z.object({
    title: OptionalString,
    description: OptionalString,
    status: OptionalString,
    assignee: z.union([z.string(), z.null()]).optional(),
    // Why: every other Backlog field is display-only in Orca — editing stays in Backlog's own UI.
    dueDate: z.union([z.string(), z.null()]).optional()
  })
})

const ProjectId = z.object({
  projectId: requiredString('Project ID is required')
})

const EnsureProjectAgentToken = z.object({
  projectId: requiredString('Project ID is required'),
  agentName: requiredString('Agent name is required'),
  agentId: OptionalString
})

const RevokeProjectAgentToken = z.object({
  projectId: requiredString('Project ID is required'),
  agentId: requiredString('Agent ID is required'),
  hashPrefix: OptionalPlainString
})

export const BACKLOG_METHODS: RpcMethod[] = [
  defineMethod({
    name: 'backlog.status',
    params: null,
    handler: async (_params, { runtime }) => runtime.backlogStatus()
  }),
  defineMethod({
    name: 'backlog.connect',
    params: Connect,
    handler: async (params, { runtime }) =>
      runtime.backlogConnect({
        serverUrl: params.serverUrl.trim(),
        token: params.token.trim()
      })
  }),
  defineMethod({
    name: 'backlog.disconnect',
    params: null,
    handler: async (_params, { runtime }) => runtime.backlogDisconnect()
  }),
  defineMethod({
    name: 'backlog.listProjects',
    params: null,
    handler: async (_params, { runtime }) => runtime.backlogListProjects()
  }),
  defineMethod({
    name: 'backlog.listTasks',
    params: ListTasks,
    handler: async (params, { runtime }) =>
      runtime.backlogListTasks(params.projectId.trim(), params.filter)
  }),
  defineMethod({
    name: 'backlog.getTask',
    params: TaskId,
    handler: async (params, { runtime }) =>
      runtime.backlogGetTask(params.projectId.trim(), params.taskId.trim())
  }),
  defineMethod({
    name: 'backlog.listProjectAssignables',
    params: ProjectId,
    handler: async (params, { runtime }) =>
      runtime.backlogListProjectAssignables(params.projectId.trim())
  }),
  defineMethod({
    name: 'backlog.listProjectStatuses',
    params: ProjectId,
    handler: async (params, { runtime }) =>
      runtime.backlogListProjectStatuses(params.projectId.trim())
  }),
  defineMethod({
    name: 'backlog.updateTask',
    params: TaskUpdate,
    handler: async (params, { runtime }) =>
      runtime.backlogUpdateTask(params.projectId.trim(), params.taskId.trim(), params.updates)
  }),
  defineMethod({
    name: 'backlog.listTaskComments',
    params: TaskId,
    handler: async (params, { runtime }) =>
      runtime.backlogListTaskComments(params.projectId.trim(), params.taskId.trim())
  }),
  defineMethod({
    name: 'backlog.ensureProjectAgentToken',
    params: EnsureProjectAgentToken,
    handler: async (params, { runtime }) =>
      runtime.backlogEnsureProjectAgentToken({
        projectId: params.projectId.trim(),
        agentName: params.agentName.trim(),
        agentId: params.agentId
      })
  }),
  defineMethod({
    name: 'backlog.revokeProjectAgentToken',
    params: RevokeProjectAgentToken,
    handler: async (params, { runtime }) =>
      runtime.backlogRevokeProjectAgentToken({
        projectId: params.projectId.trim(),
        agentId: params.agentId.trim(),
        hashPrefix: params.hashPrefix?.trim() ?? ''
      })
  })
]
