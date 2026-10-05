const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { gunzipSync } = require('node:zlib');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const readable = fs.readFileSync(path.join(root, 'dist/index.html'));
const alias = fs.readFileSync(path.join(root, 'schema-diff.html'));
const wrapper = fs.readFileSync(path.join(root, 'dist/index.self-extract.html'), 'utf8');
const normalize = value => value.toString('utf8').replace(/\r\n/g, '\n').replace(/"generatedAtUtc":"[^"]+"/, '"generatedAtUtc":"BUILD_TIME"');
assert.equal(normalize(alias), normalize(readable), 'Rebuild and copy dist/index.html to schema-diff.html; only build time may differ.');
const payload = wrapper.match(/<script id="self-extract-payload" type="application\/octet-stream">([A-Za-z0-9+/=\s]+)<\/script>/);
assert.ok(payload, 'Self-extract payload exists');
const restored = gunzipSync(Buffer.from(payload[1], 'base64'));
assert.deepEqual(restored, readable, 'Self-extract restores the exact readable HTML');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-diff-release-'));
try {
  const restoredPath = path.join(temp, 'restored.html'); fs.writeFileSync(restoredPath, restored);
  for (const html of [path.join(root, 'dist/index.html'), path.join(root, 'schema-diff.html'), restoredPath]) {
    console.log(`Testing runtime: ${html}`);
    const result = spawnSync(process.execPath, ['--test', path.join(__dirname, 'test-schema-diff.cjs')], {
      env: { ...process.env, SCHEMA_DIFF_HTML: html }, stdio: 'inherit'
    });
    assert.equal(result.status, 0, `Runtime tests passed: ${html}`);
  }
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
console.log('Release alias parity and all three generated runtimes passed.');
