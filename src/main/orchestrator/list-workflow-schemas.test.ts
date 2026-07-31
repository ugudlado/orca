import { beforeEach, describe, expect, it, vi } from 'vitest'

const execFileMock = vi.fn()
const readdirMock = vi.fn()

vi.mock('node:child_process', () => ({ execFile: execFileMock }))
vi.mock('node:fs/promises', () => ({ readdir: readdirMock }))

const { listOrchestratorWorkflowSchemas } = await import('./list-workflow-schemas')

function direntFile(name: string): { name: string; isFile: () => boolean } {
  return { name, isFile: () => true }
}

function direntDir(name: string): { name: string; isFile: () => boolean } {
  return { name, isFile: () => false }
}

describe('listOrchestratorWorkflowSchemas', () => {
  beforeEach(() => {
    execFileMock.mockReset()
    readdirMock.mockReset()
    execFileMock.mockImplementation((_cmd, _args, _opts, cb) => {
      cb(null, { stdout: '/pack/config\n', stderr: '' })
    })
  })

  it('lists .yaml filenames sorted, without the extension', async () => {
    readdirMock.mockResolvedValue([
      direntFile('feature.yaml'),
      direntFile('bugfix.yaml'),
      direntFile('autopilot.yaml'),
      direntDir('nested')
    ])
    const result = await listOrchestratorWorkflowSchemas('/repo')
    expect(result).toEqual(['autopilot', 'bugfix', 'feature'])
    expect(readdirMock).toHaveBeenCalledWith('/pack/config/workflows', { withFileTypes: true })
  })

  it('drops non-.yaml files and filenames outside the safe charset', async () => {
    readdirMock.mockResolvedValue([
      direntFile('feature.yaml'),
      direntFile('README.md'),
      direntFile('weird name; rm -rf.yaml')
    ])
    const result = await listOrchestratorWorkflowSchemas('/repo')
    expect(result).toEqual(['feature'])
  })

  it('propagates when the CLI is missing so the caller can fall back', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, cb) => {
      cb(new Error('spawn orchestrator ENOENT'), null)
    })
    await expect(listOrchestratorWorkflowSchemas('/repo')).rejects.toThrow('ENOENT')
  })
})
