const assert = require('assert/strict');
const fs = require('fs').promises;
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function writeSkill(directory, description, extraFiles = {}) {
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(
    path.join(directory, 'SKILL.md'),
    `---\nname: ${path.basename(directory)}\ndescription: ${description}\n---\n`,
    'utf8'
  );
  for (const [relativePath, content] of Object.entries(extraFiles)) {
    const filePath = path.join(directory, relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');
  }
}

async function waitForServer(baseUrl, child) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Server exited with code ${child.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/api/skills`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Timed out waiting for test server');
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-hub-scan-test-'));
  const fakeHome = path.join(fixtureRoot, 'home');
  const hubRoot = path.join(fixtureRoot, 'hub');
  const codexSkills = path.join(fakeHome, '.codex', 'skills');
  const sharedAgentSkills = path.join(fakeHome, '.agents', 'skills');
  const codexProvidedSkills = path.join(fakeHome, '.codex', 'vendor_imports', 'skills');
  const claudeSkills = path.join(fakeHome, '.claude', 'skills');
  const externalTarget = path.join(fixtureRoot, 'external', 'external-link');
  const projectRoot = path.join(fixtureRoot, 'project');
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let child;

  try {
    await writeSkill(path.join(codexSkills, 'alpha'), 'shared alpha', { 'assets/data.txt': 'alpha-data' });
    await writeSkill(path.join(claudeSkills, 'alpha'), 'shared alpha', { 'assets/data.txt': 'alpha-data' });
    await writeSkill(path.join(codexSkills, '.system', 'system-one'), 'system skill');
    await writeSkill(path.join(hubRoot, 'skills', 'system-one'), 'system skill');
    await writeSkill(path.join(codexProvidedSkills, 'skills', '.curated', 'provided-one'), 'provided skill');
    await writeSkill(path.join(hubRoot, 'skills', 'provided-one'), 'provided skill');
    await writeSkill(path.join(hubRoot, 'skills', 'conflict'), 'hub version');
    await writeSkill(path.join(hubRoot, 'skills', 'shared-skill'), 'shared codex skill');
    await writeSkill(path.join(hubRoot, 'skills', 'connect-me'), 'connect through canonical codex path');
    await writeSkill(path.join(codexSkills, 'conflict'), 'local version');
    await writeSkill(externalTarget, 'external linked skill');
    await fs.mkdir(codexSkills, { recursive: true });
    await fs.symlink(externalTarget, path.join(codexSkills, 'external-link'), process.platform === 'win32' ? 'junction' : 'dir');
    await fs.mkdir(sharedAgentSkills, { recursive: true });
    await fs.symlink(
      path.join(hubRoot, 'skills', 'shared-skill'),
      path.join(sharedAgentSkills, 'shared-skill'),
      process.platform === 'win32' ? 'junction' : 'dir'
    );
    await fs.writeFile(
      path.join(hubRoot, 'registry.json'),
      JSON.stringify({
        skills: {
          'system-one': {
            sources: [{ path: path.join(codexSkills, '.system', 'system-one'), client: 'codex' }],
          },
          'provided-one': {
            sources: [{ path: path.join(codexProvidedSkills, 'skills', '.curated', 'provided-one'), client: 'codex' }],
          },
        },
      }),
      'utf8'
    );
    await fs.mkdir(path.join(hubRoot, 'projects'), { recursive: true });
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(
      path.join(hubRoot, 'projects', 'project-manifest.json'),
      JSON.stringify({ projects: { Demo: { path: projectRoot, skills: ['alpha'] } } }),
      'utf8'
    );

    child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        PORT: String(port),
        HUB_ROOT: hubRoot,
        HOME: fakeHome,
        USERPROFILE: fakeHome,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    await waitForServer(baseUrl, child);

    const initialOnboarding = await requestJson(`${baseUrl}/api/onboarding`);
    assert.equal(initialOnboarding.completed, false);

    const scan = await requestJson(`${baseUrl}/api/onboarding/adopt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acknowledged: true }),
    });
    assert.equal(scan.adopted.length, 2, 'both client copies should be adopted as links');
    assert.equal(scan.systemSkills.length, 2, 'system and vendor-provided skills should only be counted');
    assert.equal(scan.removedSystemCopies.length, 2, 'unchanged legacy system copies should be removed from the Hub');
    assert.equal(scan.conflicts.length, 1, 'same-name/different-content should remain a conflict');
    assert.equal(scan.externalLinks.length, 1, 'external links should not be taken over');
    assert.equal(scan.failures.length, 0, JSON.stringify(scan.failures));
    assert(scan.alreadyManaged.some(skill => skill.name === 'shared-skill' && skill.location === 'codex-shared'));

    assert.equal((await fs.lstat(path.join(codexSkills, 'alpha'))).isSymbolicLink(), true);
    assert.equal((await fs.lstat(path.join(claudeSkills, 'alpha'))).isSymbolicLink(), true);
    assert.equal(
      path.resolve(await fs.realpath(path.join(codexSkills, 'alpha'))).toLowerCase(),
      path.resolve(path.join(hubRoot, 'skills', 'alpha')).toLowerCase()
    );
    assert.equal(await fs.readFile(path.join(hubRoot, 'skills', 'alpha', 'assets', 'data.txt'), 'utf8'), 'alpha-data');
    assert.equal((await fs.lstat(path.join(codexSkills, '.system', 'system-one'))).isSymbolicLink(), false);
    await assert.rejects(fs.lstat(path.join(hubRoot, 'skills', 'system-one')));
    await assert.rejects(fs.lstat(path.join(hubRoot, 'skills', 'provided-one')));
    assert.equal(
      (await fs.lstat(path.join(codexProvidedSkills, 'skills', '.curated', 'provided-one'))).isSymbolicLink(),
      false,
      'Codex-provided skills must remain untouched'
    );
    assert.equal((await fs.lstat(path.join(codexSkills, 'conflict'))).isSymbolicLink(), false);
    assert.equal((await fs.lstat(path.join(projectRoot, '.claude', 'skills', 'alpha'))).isSymbolicLink(), true);
    assert.equal((await requestJson(`${baseUrl}/api/onboarding`)).completed, true);

    const skills = await requestJson(`${baseUrl}/api/skills`);
    const alpha = skills.skills.find(skill => skill.name === 'alpha');
    assert(alpha, 'adopted skill should be listed by the Hub');
    assert.equal(alpha.clientLinks.codex.status, 'managed');
    assert.equal(alpha.clientLinks.claude.status, 'managed');
    const sharedSkill = skills.skills.find(skill => skill.name === 'shared-skill');
    assert.equal(sharedSkill.clientLinks.codex.status, 'managed');
    assert.equal(sharedSkill.clientLinks.codex.location, 'codex-shared');

    await requestJson(`${baseUrl}/api/skills/connect-me/clients/codex`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });
    assert.equal((await fs.lstat(path.join(sharedAgentSkills, 'connect-me'))).isSymbolicLink(), true);
    await assert.rejects(fs.lstat(path.join(codexSkills, 'connect-me')));

    await fs.unlink(path.join(sharedAgentSkills, 'connect-me'));
    const restore = await requestJson(`${baseUrl}/api/onboarding/adopt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acknowledged: true }),
    });
    assert(restore.restoredLinks.some(link => link.name === 'connect-me' && link.client === 'codex'));
    assert.equal((await fs.lstat(path.join(sharedAgentSkills, 'connect-me'))).isSymbolicLink(), true);

    await requestJson(`${baseUrl}/api/skills/alpha/clients/claude`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });
    await assert.rejects(fs.lstat(path.join(claudeSkills, 'alpha')));

    await requestJson(`${baseUrl}/api/skills/alpha/clients/claude`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });
    assert.equal((await fs.lstat(path.join(claudeSkills, 'alpha'))).isSymbolicLink(), true);

    console.log('scan-installed integration test passed');
    if (stderr) process.stderr.write(stderr);
  } finally {
    if (child && child.exitCode === null) {
      child.kill();
      await new Promise(resolve => child.once('exit', resolve));
    }
    await fs.rm(fixtureRoot, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
