import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const workflow = readFileSync(join(__dirname, '..', '..', '..', '.github', 'workflows', 'deploy.yml'), 'utf8')
    .replace(/\r\n/g, '\n')

const [, afterJobs] = workflow.split('\njobs:\n')
const [classifyJob, deployJob] = afterJobs.split('\n  deploy:\n')

describe('deploy workflow guards', () => {
    it('has a classify job before the deploy job', () => {
        expect(classifyJob).toContain('  classify:')
        expect(deployJob).toBeDefined()
    })

    it('never lets a classify failure through', () => {
        expect(classifyJob).not.toMatch(/continue-on-error:/)
    })

    it('deploys only when hold is exactly the string false or the owner cleared it', () => {
        expect(deployJob).toContain('needs: classify')
        expect(deployJob).toContain("needs.classify.outputs.hold == 'false' || needs.classify.outputs.cleared == 'true'")
    })

    it('takes the rules from the last deployed sha, not the release', () => {
        expect(classifyJob).toContain('worktree add "$GITHUB_WORKSPACE/last"')
        expect(classifyJob).toMatch(/working-directory: last[\s\S]*cli\.ts/)
    })

    it('uses no pull_request_target trigger', () => {
        expect(workflow).not.toMatch(/^\s*pull_request_target:/m)
    })
})
