export type DeploymentRecord = {
    sha: string
    state: string | null
}

// Newest first. A deployment counts only when its newest status is success, never a workflow
// conclusion: a skipped deploy job still concludes success.
export const pickLastDeployed = (deployments: DeploymentRecord[]): string | null =>
    deployments.find(({ state }) => state === 'success')?.sha ?? null
