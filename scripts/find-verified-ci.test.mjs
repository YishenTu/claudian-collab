import assert from 'node:assert/strict';
import test from 'node:test';
import findVerifiedCi from './find-verified-ci.cjs';

const repo = { owner: 'owner', repo: 'plugin' };
const sha = 'a'.repeat(40);
const run = {
  id: 123, head_sha: sha, head_branch: 'main', event: 'push',
  status: 'completed', conclusion: 'success',
};
const artifact = { name: `claudian-collab-${sha}`, expired: false, size_in_bytes: 100 };

function client(runs, artifacts = { 123: [artifact] }) {
  const calls = [];
  const actions = { listWorkflowRuns: 'runs', listWorkflowRunArtifacts: 'artifacts' };
  return {
    calls,
    rest: { actions },
    async paginate(endpoint, params) {
      calls.push({ endpoint, params });
      assert.equal(params.owner, repo.owner);
      assert.equal(params.repo, repo.repo);
      return endpoint === 'runs' ? runs : artifacts[params.run_id] ?? [];
    },
  };
}

test('reuses the exact commit from successful main push CI with retained assets', async () => {
  const github = client([run]);
  assert.equal(await findVerifiedCi({ github, repo, sha }), '123');
  assert.deepEqual(github.calls[0], {
    endpoint: 'runs',
    params: {
      ...repo, workflow_id: 'ci.yml', head_sha: sha, branch: 'main',
      event: 'push', status: 'success', per_page: 100,
    },
  });
});

for (const change of [
  { head_sha: 'b'.repeat(40) }, { head_branch: 'feature' }, { event: 'pull_request' },
  { event: 'workflow_dispatch' }, { status: 'in_progress' },
  { conclusion: 'failure' }, { conclusion: 'cancelled' }, { conclusion: 'skipped' },
]) {
  test(`requires fresh verification for an ineligible run: ${JSON.stringify(change)}`, async () => {
    const github = client([{ ...run, ...change }]);
    assert.equal(await findVerifiedCi({ github, repo, sha }), '');
    assert.equal(github.calls.length, 1);
  });
}

for (const artifacts of [
  [], [{ ...artifact, expired: true }], [{ ...artifact, size_in_bytes: 0 }],
  [{ ...artifact, name: 'claudian-collab-other-commit' }],
]) {
  test(`requires fresh verification when assets are unusable: ${JSON.stringify(artifacts)}`, async () => {
    assert.equal(await findVerifiedCi({ github: client([run], { 123: artifacts }), repo, sha }), '');
  });
}

test('requires fresh verification when no successful CI exists', async () => {
  assert.equal(await findVerifiedCi({ github: client([]), repo, sha }), '');
});

test('checks other successful runs when the first no longer has its artifact', async () => {
  const github = client([{ ...run, id: 456 }, run]);
  assert.equal(await findVerifiedCi({ github, repo, sha }), '123');
});

test('API errors cannot authorize publication', async () => {
  const github = client([run]);
  github.paginate = async () => { throw new Error('API unavailable'); };
  await assert.rejects(findVerifiedCi({ github, repo, sha }), /API unavailable/);
});
