import { spawnSync } from 'child_process'
import path from 'path'

const toPosix = (relative: string) => path
    .resolve(__dirname, relative)
    .split(path.sep)
    .join('/')

const redeployPath = toPosix('../../../scripts/deploy/ec2-redeploy.sh')
const bootPath = toPosix('../../../scripts/deploy/boot-stack.sh')
const rulesPath = toPosix('../../../scripts/deploy/pulse-network-rules.sh')

const runBash = (
    script: string,
    env: Record<string, string> = {},
    input?: string
) => spawnSync('bash', ['-c', script], {
    input,
    encoding: 'utf8',
    env: { ...process.env, ...env }
})

const runRedeploy = (fn: string, input?: string, env: Record<string, string> = {}) => runBash(
    `source "${redeployPath}" test-tag; ${fn}`,
    { REDEPLOY_SOURCE_ONLY: '1', ...env },
    input
)

const runBoot = (stubs: string, fn: string) => runBash(
    `${stubs}; source "${bootPath}"; ${fn}`,
    { BOOT_SOURCE_ONLY: '1' }
)

const hasFlock = runBash('command -v flock').status === 0

describe('ec2-redeploy.sh deploy helpers', () => {
    describe('select_images_to_prune', () => {
        const repo = '1.dkr.ecr.eu-central-1.amazonaws.com/pulse-server-app'
        const lines = [
            `${repo}:runner-6`,
            `${repo}:migrate-6`,
            `${repo}:runner-5`,
            `${repo}:migrate-5`,
            `${repo}:runner-4`,
            `${repo}:migrate-4`,
            '1.dkr.ecr.eu-central-1.amazonaws.com/pulse-client-app:v9',
            `${repo}:<none>`
        ].join('\n')

        it('keeps the newest images and lists the older ones of this repository only', () => {
            const result = runRedeploy(`select_images_to_prune "${repo}" 4`, lines)

            expect(result.status).toBe(0)
            expect(result.stdout.trim().split('\n')).toEqual([
                `${repo}:runner-4`,
                `${repo}:migrate-4`
            ])
        })

        it('never lists an image of another repository', () => {
            const result = runRedeploy(`select_images_to_prune "${repo}" 0`, lines)

            expect(result.stdout).not.toContain('pulse-client-app')
        })

        it('lists nothing when there are fewer images than the keep count', () => {
            const result = runRedeploy(`select_images_to_prune "${repo}" 10`, lines)

            expect(result.status).toBe(0)
            expect(result.stdout.trim()).toBe('')
        })
    })

    describe('last good tag', () => {
        it('names the Parameter Store entry per service', () => {
            const result = runRedeploy('last_good_param_name server')

            expect(result.stdout).toBe('/pulse/last-good/server')
        })

        it('writes the tag with an overwrite', () => {
            // the helper discards stdout, so the stub reports on stderr
            const result = runRedeploy('aws() { echo "aws $*" >&2; }; write_last_good server abc123')

            expect(result.status).toBe(0)
            expect(result.stderr).toContain('ssm put-parameter')
            expect(result.stderr).toContain('--name /pulse/last-good/server')
            expect(result.stderr).toContain('--value abc123')
            expect(result.stderr).toContain('--overwrite')
        })
    })

    describe('graceful_stop', () => {
        it('gives the container the grace period', () => {
            const result = runRedeploy('log=$(mktemp); docker() { echo "docker $*" >> "$log"; }; graceful_stop pulse-app-prev 45; cat "$log"')

            expect(result.stdout.trim()).toBe('docker stop -t 45 pulse-app-prev')
        })

        it('defaults to 30 seconds', () => {
            const result = runRedeploy('log=$(mktemp); docker() { echo "docker $*" >> "$log"; }; graceful_stop pulse-app-prev; cat "$log"')

            expect(result.stdout.trim()).toBe('docker stop -t 30 pulse-app-prev')
        })
    })

    describe('ensure_networks', () => {
        const stub = (existing: string) => `log=$(mktemp); docker() { echo "docker $*" >> "$log"; if [ "$1 $2" = "network inspect" ]; then case " ${existing} " in *" $3 "*) return 0;; esac; return 1; fi; }; ensure_networks; cat "$log"`

        it('creates both networks with fixed subnets when missing', () => {
            const result = runRedeploy(stub(''))

            expect(result.stdout).toContain('docker network create --subnet 172.30.0.0/24 --ip-range 172.30.0.128/25 pulse_edge')
            expect(result.stdout).toContain('docker network create --internal --subnet 172.30.1.0/24 pulse_internal')
        })

        it('creates nothing when both exist', () => {
            const result = runRedeploy(stub('pulse_edge pulse_internal'))

            expect(result.stdout).not.toContain('network create')
        })

        it('creates only the missing one', () => {
            const result = runRedeploy(stub('pulse_edge'))

            expect(result.stdout).toContain('network create --internal')
            expect(result.stdout).not.toContain('--ip-range')
        })
    })

    describe('container_health_check', () => {
        const run = (stub: string) => runRedeploy(`sleep() { :; }; log=$(mktemp); docker() { echo "docker $*" >> "$log"; ${stub}; }; if container_health_check pulse-app-candidate; then echo "status 0"; else echo "status 1"; fi; cat "$log"`)

        it('checks status then ready inside the container', () => {
            const result = run('return 0')

            expect(result.stdout).toContain('status 0')
            expect(result.stdout).toContain('docker exec pulse-app-candidate curl -sf --max-time 5 http://127.0.0.1:8080/api/status')
            expect(result.stdout).toContain('docker exec pulse-app-candidate curl -sf --max-time 10 http://127.0.0.1:8080/api/ready')
        })

        it('fails after 60 tries when the container never answers', () => {
            const result = run('return 1')

            expect(result.stdout).toContain('status 1')
            expect(result.stdout.match(/api\/status/g)).toHaveLength(60)
        })

        it('does not call ready while status fails', () => {
            const result = run('return 1')

            expect(result.stdout).not.toContain('api/ready')
        })
    })

    describe('run_app_container', () => {
        it('starts on pulse_edge at the fixed address, then joins pulse_internal', () => {
            const result = runRedeploy('RUN_ARGS=(--cap-drop ALL); log=$(mktemp); docker() { echo "docker $*" >> "$log"; }; run_app_container pulse-app 172.30.0.10 --network-alias server --restart=unless-stopped -p 80:8080; cat "$log"')
            const lines = result.stdout.trim().split('\n')

            expect(lines[0]).toBe(
                'docker run -d --name pulse-app --network pulse_edge --ip 172.30.0.10 --cap-drop ALL --network-alias server --restart=unless-stopped -p 80:8080 110015905368.dkr.ecr.eu-central-1.amazonaws.com/pulse-server-app:runner-test-tag'
            )
            expect(lines[1]).toBe('docker network connect pulse_internal pulse-app')
        })
    })

    describe('attach_alias', () => {
        it('reconnects with the same address and the alias', () => {
            const result = runRedeploy('log=$(mktemp); docker() { echo "docker $*" >> "$log"; }; attach_alias pulse-app-candidate 172.30.0.11 server; cat "$log"')

            expect(result.stdout.trim().split('\n')).toEqual([
                'docker network disconnect pulse_edge pulse-app-candidate',
                'docker network connect --ip 172.30.0.11 --alias server pulse_edge pulse-app-candidate'
            ])
        })
    })

    describe('swap_server', () => {
        const fakeDocker = toPosix('./fixtures/fake-docker.sh')
        const swap = (seed: string, unhealthy = '') => runRedeploy(
            `source "${fakeDocker}"; RUN_ARGS=(--cap-drop ALL); ${seed}; if swap_server 2>/dev/null; then echo "swap 0"; else echo "swap 1"; fi; for c in pulse-app pulse-app-prev pulse-app-candidate; do echo "$c=$(fake_state $c)"; done; fake_log`,
            undefined,
            { FAKE_UNHEALTHY: unhealthy }
        )
        const oldServing = 'fake_seed pulse-app "running old"'

        it('swaps with the candidate as a bridge and leaves only the new container', () => {
            const out = swap(oldServing).stdout
            const at = (text: string) => out.indexOf(text)

            expect(out).toContain('swap 0')
            expect(out).toContain('pulse-app=running new')
            expect(out).toContain('pulse-app-prev=absent')
            expect(out).toContain('pulse-app-candidate=absent')
            expect(at('--name pulse-app-candidate --network pulse_edge --ip 172.30.0.11')).toBeLessThan(at('docker network connect --ip 172.30.0.11 --alias server pulse_edge pulse-app-candidate'))
            expect(at('docker network connect --ip 172.30.0.11 --alias server')).toBeLessThan(at('docker rename pulse-app pulse-app-prev'))
            expect(at('docker rename pulse-app pulse-app-prev')).toBeLessThan(at('--name pulse-app --network pulse_edge --ip 172.30.0.10'))
            expect(out).toContain('--restart=unless-stopped --network-alias server -p 80:8080')
            expect(out).toContain('-e WORKERS_ENABLED=false')
            expect(out).toContain('docker update --restart=no pulse-app-prev')
        })

        it('leaves production untouched when the candidate is unhealthy', () => {
            const out = swap(oldServing, 'pulse-app-candidate').stdout

            expect(out).toContain('swap 1')
            expect(out).toContain('pulse-app=running old')
            expect(out).toContain('pulse-app-candidate=absent')
            expect(out).not.toContain('docker rename')
        })

        it('rolls back to the previous container when the new one is unhealthy', () => {
            const out = swap(oldServing, 'pulse-app').stdout

            expect(out).toContain('swap 1')
            expect(out).toContain('pulse-app=running old')
            expect(out).toContain('pulse-app-prev=absent')
            expect(out).toContain('pulse-app-candidate=absent')
            expect(out).toContain('docker update --restart=unless-stopped pulse-app')
        })

        it('keeps the candidate serving when the new container fails and there is no previous one', () => {
            const out = swap('fake_seed pulse-app-candidate "running new"', 'pulse-app').stdout

            expect(out).toContain('swap 1')
            expect(out).toContain('pulse-app-candidate=running new')
            expect(out).not.toContain('--name pulse-app-candidate --network')
        })

        it('does not remove a running candidate when pulse-app is down', () => {
            const out = swap('fake_seed pulse-app-candidate "running new"').stdout

            expect(out).toContain('swap 0')
            expect(out).toContain('pulse-app=running new')
            expect(out).toContain('pulse-app-candidate=absent')
            expect(out).not.toContain('docker rm -f pulse-app-candidate\ndocker run')
        })
    })

    describe('recover_interrupted_run', () => {
        const fakeDocker = toPosix('./fixtures/fake-docker.sh')
        const recover = (seed: string) => runRedeploy(
            `source "${fakeDocker}"; ${seed}; recover_interrupted_run 2>/dev/null; for c in pulse-app pulse-app-prev; do echo "$c=$(fake_state $c)"; done`
        ).stdout

        it('restores the previous container when pulse-app is gone', () => {
            const out = recover('fake_seed pulse-app-prev "stopped old"')

            expect(out).toContain('pulse-app=running old')
            expect(out).toContain('pulse-app-prev=absent')
        })

        it('restores it when pulse-app exists but is stopped', () => {
            const out = recover('fake_seed pulse-app "stopped new"; fake_seed pulse-app-prev "stopped old"')

            expect(out).toContain('pulse-app=running old')
        })

        it('does nothing while pulse-app is running', () => {
            const out = recover('fake_seed pulse-app "running new"; fake_seed pulse-app-prev "stopped old"')

            expect(out).toContain('pulse-app=running new')
            expect(out).toContain('pulse-app-prev=stopped old')
        })
    })

    describe('acquire_deploy_lock', () => {
        const lockFile = path.join(
            process.env.TMPDIR ?? process.env.TEMP ?? '/tmp',
            `pulse-deploy-test-${process.pid}.lock`
        ).split(path.sep).join('/');

        (hasFlock ? it : it.skip)('makes a second deploy give up while the first holds the lock', () => {
            const result = runRedeploy(
                `(acquire_deploy_lock; sleep 3) & sleep 1; acquire_deploy_lock; echo "second status $?"; wait`,
                undefined,
                { DEPLOY_LOCK_FILE: lockFile, DEPLOY_LOCK_WAIT_SECONDS: '1' }
            )

            expect(result.stderr).toContain('giving up')
        })
    })
})

describe('boot-stack.sh', () => {
    it('starts no compose profile when the parameter is absent', () => {
        const result = runBoot('aws() { return 255; }', 'boot_profiles')

        expect(result.status).toBe(0)
        expect(result.stdout).toBe('')
    })

    it('treats the literal None as no profile', () => {
        const result = runBoot('aws() { echo None; }', 'boot_profiles')

        expect(result.stdout).toBe('')
    })

    it('returns the profiles without spaces', () => {
        const result = runBoot('aws() { echo "tunnel, broker"; }', 'boot_profiles')

        expect(result.stdout).toBe('tunnel,broker')
    })

    it('boots the last good server tag', () => {
        const result = runBoot('aws() { echo abc123; }', 'server_boot_tag')

        expect(result.stdout).toBe('abc123')
    })

    it('falls back to latest when no tag is recorded', () => {
        const result = runBoot('aws() { return 255; }', 'server_boot_tag')

        expect(result.stdout).toBe('latest')
    })

    it('does nothing with no profiles', () => {
        const result = runBoot('docker() { echo "docker $*"; }', 'start_infrastructure ""')

        expect(result.status).toBe(0)
        expect(result.stdout).toContain('starting no compose containers')
        expect(result.stdout).not.toContain('docker compose')
    })

    it('creates the networks before compose starts', () => {
        const result = runBoot(
            'aws() { echo token-value; }; docker() { echo "docker $*" >&2; if [ "$1 $2" = "network inspect" ]; then return 1; fi; }',
            'start_infrastructure "broker"'
        )
        const out = result.stderr

        expect(out).toContain('network create --subnet 172.30.0.0/24 --ip-range 172.30.0.128/25 pulse_edge')
        expect(out).toContain('network create --internal --subnet 172.30.1.0/24 pulse_internal')
        expect(out.indexOf('pulse_internal')).toBeLessThan(out.indexOf('docker compose'))
    })

    it('starts compose with the named profiles', () => {
        const result = runBoot(
            'aws() { echo token-value; }; docker() { echo "docker $* profiles=${COMPOSE_PROFILES:-}"; }',
            'start_infrastructure "tunnel,broker"'
        )

        expect(result.stdout).toContain('compose -f /opt/pulse/compose/docker-compose.yml up -d')
        expect(result.stdout).toContain('profiles=tunnel,broker')
    })
})

describe('pulse-network-rules.sh', () => {
    const rules = () => runBash(`bash "${rulesPath}" print`).stdout.trim().split('\n')

    it('drops the metadata address from containers except the server containers', () => {
        const lines = rules()

        expect(lines).toContain('rule filter PULSE-IMDS -s 172.30.0.10 -j RETURN')
        expect(lines).toContain('rule filter PULSE-IMDS -s 172.30.0.11 -j RETURN')
        expect(lines).toContain('rule filter PULSE-IMDS -j DROP')
        expect(lines).toContain('hook filter DOCKER-USER -d 169.254.169.254 -j PULSE-IMDS')
    })

    it('puts the allowed returns before the final drop', () => {
        const lines = rules()

        expect(lines.indexOf('rule filter PULSE-IMDS -s 172.30.0.10 -j RETURN'))
            .toBeLessThan(lines.indexOf('rule filter PULSE-IMDS -j DROP'))
    })

    it('blocks host processes of every user except root', () => {
        expect(rules()).toContain(
            'rule filter OUTPUT -d 169.254.169.254 -m owner ! --uid-owner 0 -j DROP'
        )
    })

    it('rejects an unknown mode', () => {
        const result = runBash(`bash "${rulesPath}" delete`)

        expect(result.status).toBe(2)
    })
})
