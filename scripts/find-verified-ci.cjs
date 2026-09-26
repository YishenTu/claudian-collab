// Only main push CI can supply release assets; PR and manual runs are not release evidence.
module.exports = async function findVerifiedCi({ github, repo, sha }) {
  const runs = await github.paginate(github.rest.actions.listWorkflowRuns, {
    ...repo, workflow_id: 'ci.yml', head_sha: sha, branch: 'main',
    event: 'push', status: 'success', per_page: 100,
  });
  for (const run of runs) {
    if (run.head_sha !== sha || run.head_branch !== 'main' || run.event !== 'push'
      || run.status !== 'completed' || run.conclusion !== 'success') continue;
    const artifacts = await github.paginate(github.rest.actions.listWorkflowRunArtifacts, {
      ...repo, run_id: run.id, per_page: 100,
    });
    if (artifacts.some(artifact => artifact.name === `claudian-collab-${sha}`
      && !artifact.expired && artifact.size_in_bytes > 0)) return String(run.id);
  }
  return '';
};
