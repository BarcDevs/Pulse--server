import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const toPosix = (relative: string) => path
    .resolve(__dirname, relative)
    .split(path.sep)
    .join('/')

const alarmsPath = toPosix('../../../scripts/deploy/monitoring/create-alarms.sh')
const agentPath = toPosix('../../../scripts/deploy/monitoring/cloudwatch-agent.json')
const daemonPath = toPosix('../../../scripts/deploy/docker-daemon.json')

const runAlarms = (args: string[] = [], env: Record<string, string> = {}) => spawnSync('bash', [alarmsPath, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env }
})

describe('monitoring files', () => {
    describe('cloudwatch-agent.json', () => {
        const agent = JSON.parse(fs.readFileSync(agentPath, 'utf8'))

        it('reports memory and disk used percent for the server group', () => {
            expect(agent.metrics.metrics_collected.mem.measurement).toEqual(['mem_used_percent'])
            expect(agent.metrics.metrics_collected.disk.measurement).toEqual(['used_percent'])
            expect(agent.metrics.aggregation_dimensions).toEqual([['AutoScalingGroupName']])
        })

        it('keeps to the two metrics the cost table counts', () => {
            const collected = agent.metrics.metrics_collected
            const measurements = Object.values<{ measurement: string[] }>(collected)
                .flatMap(entry => entry.measurement)

            expect(measurements).toHaveLength(2)
        })
    })

    describe('docker-daemon.json', () => {
        it('rotates container logs', () => {
            const daemon = JSON.parse(fs.readFileSync(daemonPath, 'utf8'))

            expect(daemon['log-driver']).toBe('json-file')
            expect(daemon['log-opts']).toEqual({ 'max-size': '10m', 'max-file': '3' })
        })
    })

    describe('create-alarms.sh', () => {
        it('prints the nine CloudWatch alarms and creates nothing by default', () => {
            const result = runAlarms()
            const commands = result.stdout.split('\n').filter(line => line.startsWith('aws cloudwatch put-metric-alarm'))

            expect(result.status).toBe(0)
            expect(commands).toHaveLength(9)
            expect(result.stdout).toContain('Dry run: nothing was created')
        })

        it('uses the approved starting thresholds', () => {
            const out = runAlarms().stdout

            expect(out).toMatch(/--alarm-name pulse-app-memory-high .*--evaluation-periods 5 --threshold 85 --comparison-operator GreaterThanThreshold/)
            expect(out).toMatch(/--alarm-name pulse-db-freeable-memory-low .*--threshold 157286400 /)
            expect(out).toMatch(/--alarm-name pulse-db-connections-high .*--threshold 63 /)
            expect(out).toMatch(/--alarm-name pulse-db-storage-low .*--threshold 4294967296 /)
            expect(out).toMatch(/--alarm-name pulse-queue-depth-high .*--evaluation-periods 10 --threshold 200 /)
            expect(out).toMatch(/--alarm-name pulse-dead-letter-not-empty .*--threshold 0 /)
        })

        it('sends every alarm to the pulse-alerts topic', () => {
            const commands = runAlarms().stdout.split('\n').filter(line => line.startsWith('aws cloudwatch'))

            commands.forEach(command => expect(command).toContain('--alarm-actions arn:aws:sns:eu-central-1:110015905368:pulse-alerts'))
        })

        it('does not apply without an instance id', () => {
            const result = runAlarms(['--apply'])

            expect(result.status).toBe(1)
            expect(result.stderr).toContain('INSTANCE_ID is required')
        })

        it('names the instance in the app box credit alarm', () => {
            const out = runAlarms([], { INSTANCE_ID: 'i-0abc' }).stdout

            expect(out).toContain('--dimensions Name=InstanceId,Value=i-0abc')
        })
    })
})
