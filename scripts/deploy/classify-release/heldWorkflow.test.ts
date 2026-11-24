import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const workflow = readFileSync(join(__dirname, '..', '..', '..', '.github', 'workflows', 'held-release-check.yml'), 'utf8')
    .replace(/\r\n/g, '\n')

describe('held release check workflow', () => {
    it('is named exactly like the required status check', () => {
        expect(workflow).toMatch(/^ {4}name: Held release check$/m)
    })

    it('runs on pull requests to main and re-runs when labels change', () => {
        expect(workflow).toContain('branches: [main]')
        expect(workflow).toContain('types: [opened, reopened, synchronize, labeled, unlabeled]')
    })

    it('uses no pull_request_target trigger and has no step that may continue on error', () => {
        expect(workflow).not.toMatch(/^\s*pull_request_target:/m)
        expect(workflow).not.toMatch(/continue-on-error:/)
    })

    it('takes its tools from the base branch when it has them', () => {
        expect(workflow).toContain('ref: ${{ github.event.pull_request.base.sha }}')
        expect(workflow).toContain('if [ -f base/scripts/deploy/classify-release/held-check-cli.ts ]')
    })
})
