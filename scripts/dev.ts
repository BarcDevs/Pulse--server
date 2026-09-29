/**
 * Runs the dev server and the DB keepalive ping loop together, so keepalive
 * starts/stops with the dev session rather than running unattended.
 */
import { spawn } from 'child_process'

const procs = [
    spawn(
        'npm',
        ['run', 'start:dev'],
        { stdio: 'inherit', shell: true }
    ),
    spawn(
        'npm',
        ['run', 'db:keepalive'],
        { stdio: 'inherit', shell: true }
    )
]

const shutdown = (): void => {
    for (const proc of procs) {
        if (!proc.killed) proc.kill()
    }
    // eslint-disable-next-line no-process-exit
    process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

for (const proc of procs) {
    proc.on('exit', (code) => {
        if (code !== 0) shutdown()
    })
}
