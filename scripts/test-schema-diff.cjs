// Execute the shipped parser/diff functions without a browser or third-party test dependency.
// DOM sinks are stubbed only for lifecycle tests; File/Blob reads remain native.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { File, Blob } = require('node:buffer');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(process.env.SCHEMA_DIFF_HTML || path.join(root, 'src/index.template.html'), 'utf8');
function section(start, end) {
  const from = html.indexOf(start), to = html.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `Source section exists: ${start}`);
  return html.slice(from, to);
}
const plain = value => JSON.parse(JSON.stringify(value));
function runtime() {
  const elements = new Map();
  const ctx = vm.createContext({
    console: { warn() {} }, File, Blob, TextDecoder, TextEncoder,
    Response, DecompressionStream, setTimeout, clearTimeout,
    ArrayBuffer, Uint8Array, DataView,
    APP_CONFIG: { version: '1.0.0' }, language: 'en',
    state: { before: null, after: null }, generation: { before: 0, after: 0 },
    inferenceSettings: { sampleRows: 20000, headerMode: 'yes' },
    lastDiff: null, reportView: { query: '', filter: 'all' },
    document: { body: { classList: { toggle() {} } } },
    $: selector => {
      if (!elements.has(selector)) elements.set(selector, {
        disabled: false, addEventListener(type, callback) { this[type] = callback; }
      });
      return elements.get(selector);
    },
    renderSide() {}, showToast() {},
    renderResults(diff) { ctx.lastDiff = diff; }
  });
  vm.runInContext(section('    const translations=', '    const $=') +
    section('    function detectLanguage()', '    function showToast(') +
    section('    const ParquetTypes=', '    function dropMarkup()') +
    html.split('\n').find(line => line.includes('function escapeHtml(')) +
    section('    function comparable()', '    let lastDiff=') +
    section('    function fieldPathText(', '    function fieldPathCell(') +
    section('    function impactKey(', '    function impactBadge(') +
    section('    function rowMatchesView(', '    function renderVisibleRows(') +
    section('    function markdownEscape(', '    function downloadText(') +
    html.split('\n').find(line => line.includes("$('#swapButton').addEventListener")), ctx);
  ctx.elements = elements;
  ctx.swap = () => elements.get('#swapButton').click();
  ctx.fixture = name => new File([fs.readFileSync(path.join(root, 'test-data', name))], name);
  return ctx;
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((ok, no) => { resolve = ok; reject = no; });
  return { promise, resolve, reject };
}
const csv = (text, name = 'sample.csv') => new File([text], name);
const ready = (name = 'ready.csv') => ({ file: csv('id\n1\n', name), schema: { format: 'csv', source: 'inferred', fields: [], metadata: {}, tracker: {} }, preview: { open: false, loading: false } });

const headerCases = [
  [['value', 'value', 'value_2'], ['value', 'value_3', 'value_2']],
  [['value_2', 'value', 'value'], ['value_2', 'value', 'value_3']],
  [['value', 'value', 'value'], ['value', 'value_2', 'value_3']],
  [['value', 'value_2', 'value', 'value_3'], ['value', 'value_2', 'value_4', 'value_3']],
  [['column_2', '', 'column_2_2'], ['column_2', 'column_2_3', 'column_2_2']],
  [['', 'column_1'], ['column_1_2', 'column_1']],
  [[' value ', 'value', ' value_2 '], ['value', 'value_3', 'value_2']],
  [['__proto__', 'constructor', 'toString'], ['__proto__', 'constructor', 'toString']],
  [['名前', '名前', '名前_2'], ['名前', '名前_3', '名前_2']]
];
test('empty header allocator creates nonempty names without changing blank-line parsing', () => {
  const c = runtime();
  assert.deepEqual(plain(c.uniqueHeaders(['', '', ''], 3)), ['column_1', 'column_2', 'column_3']);
});
for (const format of ['csv', 'tsv']) for (const [names, expected] of headerCases) {
  test(`${format}: preserve columns for ${JSON.stringify(names)}`, async () => {
    const c = runtime(), delimiter = format === 'tsv' ? '\t' : ',';
    const values = names.map((_, i) => i === 1 ? 'alpha' : String(i + 1));
    const file = csv(`${names.join(delimiter)}\n${values.join(delimiter)}\n`, `headers.${format}`);
    const before = await c.readSchema(file), after = await c.readSchema(file);
    assert.deepEqual(plain(before.fields.map(f => f.path)), expected);
    const preview = await c.readFilePreview({ file, schema: before });
    assert.deepEqual(plain(preview.columns), expected);
    assert.deepEqual(expected.map(name => preview.rows[0][name]), values);
    const diff = c.diffSchemas(before, after);
    assert.equal(diff.summary.fields, names.length);
    assert.equal(diff.summary.changed, 0);
    c.state.before = { file, schema: before }; c.state.after = { file, schema: after };
    assert.equal(c.buildJsonReport(diff).fields.length, names.length);
    assert.match(c.buildMarkdownReport(diff), /No schema differences/);
  });
}
test('duplicate headers retain a real type change in the second column', async () => {
  const c = runtime(), before = await c.readSchema(csv('value,value,value_2\n1,alpha,42\n'));
  const after = await c.readSchema(csv('value,value,value_2\n1,2,42\n'));
  const diff = c.diffSchemas(before, after);
  assert.equal(diff.summary.added, 0); assert.equal(diff.summary.removed, 0);
  assert.equal(diff.summary.modified, 1);
  const changed = diff.rows.filter(row => row.changes.length);
  assert.equal(changed[0].path, 'value_3');
  assert.deepEqual(plain(changed[0].changes), ['type']);
  assert.equal(changed[0].impact.level, 'review');
  assert.match(c.buildMarkdownReport(diff), /value_3/);
});
test('headerless data and wider data rows keep all columns', async () => {
  const c = runtime(); c.inferenceSettings.headerMode = 'no';
  const schema = await c.readSchema(csv('1,alpha,42\n'));
  assert.deepEqual(plain(schema.fields.map(f => f.path)), ['column_1', 'column_2', 'column_3']);
  c.inferenceSettings.headerMode = 'yes';
  const wider = await c.readSchema(csv('column_2\n1,alpha\n'));
  assert.deepEqual(plain(wider.fields.map(f => f.path)), ['column_2', 'column_2_2']);
  assert.equal(wider.metadata.column_mismatch, 1);
});

for (const side of ['before', 'after']) {
  test(`swap waits for ${side} schema and preserves async ownership`, async () => {
    const c = runtime(), pending = deferred(), other = side === 'before' ? 'after' : 'before';
    c.state[other] = ready(); c.readSchema = () => pending.promise;
    const file = csv('id\n1\n'), loading = c.setFile(side, file), token = c.generation[side];
    const entry = c.state[side];
    assert.equal(c.elements.get('#swapButton').disabled, true);
    c.swap(); assert.equal(c.state[side], entry); assert.equal(c.generation[side], token);
    pending.resolve(ready().schema); await loading;
    assert.equal(c.state[side].file, file); assert.ok(c.state[side].schema);
    assert.equal(c.elements.get('#swapButton').disabled, false);
    c.swap(); assert.equal(c.state[other].file, file);
  });
  test(`swap waits for closed/reopened ${side} preview until it settles`, async () => {
    const c = runtime(), pending = deferred(); let reads = 0;
    c.state[side] = ready(); c.readFilePreview = () => { reads++; return pending.promise; };
    const entry = c.state[side], loading = c.togglePreview(side);
    assert.equal(c.elements.get('#swapButton').disabled, true);
    await c.togglePreview(side); assert.equal(entry.preview.open, false);
    c.swap(); assert.equal(c.state[side], entry);
    const reopening = c.togglePreview(side); assert.equal(entry.preview.open, true);
    const retrying = c.togglePreview(side, { retry: true });
    assert.equal(reads, 1, 'reopening or retrying a pending preview reuses its read');
    pending.resolve({ columns: ['id'], rows: [{ id: '1' }] }); await Promise.all([loading, reopening, retrying]);
    assert.equal(c.elements.get('#swapButton').disabled, false);
    c.swap(); assert.ok(c.state[side === 'before' ? 'after' : 'before'].preview.data);
  });
}
test('two schema loads settle independently before swap becomes available', async () => {
  const c = runtime(), a = deferred(), b = deferred();
  c.readSchema = file => file.name === 'a.csv' ? a.promise : b.promise;
  const first = c.setFile('before', csv('a', 'a.csv')), second = c.setFile('after', csv('b', 'b.csv'));
  a.resolve(ready().schema); await first; assert.equal(c.elements.get('#swapButton').disabled, true);
  b.resolve(ready().schema); await second; assert.equal(c.elements.get('#swapButton').disabled, false);
  c.swap(); assert.equal(c.state.before.file.name, 'b.csv'); assert.equal(c.state.after.file.name, 'a.csv');
});
test('preview failure permits swap and retry on the new side', async () => {
  const c = runtime(), pending = deferred(); c.state.before = ready(); c.readFilePreview = () => pending.promise;
  const loading = c.togglePreview('before'); pending.reject(new Error('test preview failure')); await loading;
  assert.equal(c.elements.get('#swapButton').disabled, false); c.swap();
  assert.match(c.state.after.preview.error, /test preview failure/);
  const retry = deferred(); c.readFilePreview = () => retry.promise;
  const retrying = c.togglePreview('after', { retry: true }); c.swap(); assert.ok(c.state.after);
  retry.resolve({ columns: ['id'], rows: [{ id: '2' }] }); await retrying;
  assert.equal(c.state.after.preview.rows, undefined); assert.equal(c.state.after.preview.data.rows[0].id, '2');
  assert.equal(c.state.after.preview.error, null); assert.equal(c.elements.get('#swapButton').disabled, false);
});
for (const outcome of ['resolve', 'reject']) test(`replacement rejects stale schema/preview ${outcome}`, async () => {
  const c = runtime(), old = deferred(), newer = deferred(); c.readSchema = () => old.promise;
  const first = c.setFile('before', csv('old', 'old.csv')); c.readSchema = () => newer.promise;
  const second = c.setFile('before', csv('new', 'new.csv')); newer.resolve(ready().schema); await second;
  old[outcome](outcome === 'resolve' ? ready().schema : new Error('obsolete')); await first;
  assert.equal(c.state.before.file.name, 'new.csv'); assert.ok(c.state.before.schema);
  const preview = deferred(); c.readFilePreview = () => preview.promise;
  const previewing = c.togglePreview('before'); const entry = c.state.before;
  c.readSchema = async () => ready().schema; await c.setFile('before', csv('third', 'third.csv'));
  c.swap(); preview[outcome](outcome === 'resolve' ? { rows: [{ obsolete: true }] } : new Error('obsolete'));
  await previewing; assert.equal(c.state.after.file.name, 'third.csv');
  assert.equal(c.state.after.preview.data, null); assert.notEqual(c.state.after, entry);
});
test('empty, error, cancelled picker and completed comparison swaps recover', async () => {
  const c = runtime(); c.updateButtons(); assert.equal(c.elements.get('#swapButton').disabled, true);
  c.swap(); assert.equal(c.generation.before, 0);
  c.readSchema = async () => { throw new Error('broken'); };
  await c.setFile('before', csv('broken')); assert.ok(c.state.before.error);
  await c.setFile('before', undefined); assert.ok(c.state.before.error);
  c.swap(); assert.ok(c.state.after.error);
  c.readSchema = async () => ready().schema;
  await c.setFile('before', csv('first', 'first.csv')); await c.setFile('after', csv('second', 'second.csv'));
  c.lastDiff = c.diffSchemas(c.state.before.schema, c.state.after.schema);
  c.swap(); assert.ok(c.lastDiff); assert.equal(c.state.before.file.name, 'second.csv');
});

test('existing Parquet/CSV/TSV/JSON-lines fixtures remain comparable and previewable', async () => {
  const c = runtime(); c.inferenceSettings.headerMode = 'auto';
  for (const format of ['parquet', 'csv', 'tsv', 'jsonl', 'ndjson']) {
    const file = c.fixture(`before.${format}`), schema = await c.readSchema(file);
    assert.ok(schema.fields.length, format); assert.equal(c.diffSchemas(schema, schema).summary.changed, 0);
    const after = await c.readSchema(c.fixture(`after.${format}`));
    assert.ok(c.diffSchemas(schema, after).summary.changed > 0, format);
    const preview = await c.readFilePreview({ file, schema }); assert.ok(preview.rows.length > 0, format);
    assert.ok(preview.rows.length <= 10, format);
    if (format === 'parquet') assert.ok(schema.tracker.bytes < file.size / 2, 'metadata only');
  }
});
test('existing nested, compatibility, duplicate-ID and Decimal fixtures retain behavior', async () => {
  const c = runtime();
  for (const prefix of ['nested', 'compat', 'duplicate-id']) {
    const before = await c.readSchema(c.fixture(`${prefix}-before.parquet`));
    const after = await c.readSchema(c.fixture(`${prefix}-after.parquet`));
    assert.ok(c.diffSchemas(before, after).summary.changed > 0, prefix);
    assert.equal(c.diffSchemas(before, before).summary.changed, 0, prefix);
  }
  const file = c.fixture('decimal-dictionary.parquet'), schema = await c.readSchema(file);
  const preview = await c.readFilePreview({ file, schema });
  assert.equal(preview.rows.length, 10);
  assert.deepEqual(plain(preview.rows.slice(0, 3).map(row => Object.values(row)[0])), ['0.0000', '12.3400', '-0.5000']);
});
test('JSON-lines BOM, blank lines and chunk boundaries remain valid; malformed files fail', async () => {
  const c = runtime();
  for (const name of ['blank-lines.jsonl', 'bom-crlf.jsonl', 'chunk-boundary.jsonl', 'final-no-newline.jsonl']) {
    const schema = await c.readSchema(c.fixture(name)); assert.ok(schema.fields.length, name);
  }
  for (const name of ['broken.csv', 'broken.jsonl', 'nonobject.jsonl']) await assert.rejects(c.readSchema(c.fixture(name)));
  await assert.rejects(c.readSchema(csv('', 'empty.jsonl')));
  const empty = await c.readSchema(csv('')); assert.equal(empty.fields.length, 0);
});
test('quoted CSV values, delimiters and mismatch warnings keep existing behavior', async () => {
  const c = runtime(), file = c.fixture('before.csv'), schema = await c.readSchema(file);
  const preview = await c.readFilePreview({ file, schema });
  assert.equal(preview.rows[0].notes, 'hello, world');
  assert.equal(preview.rows[1].notes, 'line1\nline2');
  assert.equal(preview.rows[2].notes, 'quote "inside"');
  assert.equal((await c.readSchema(c.fixture('semicolon.csv'))).metadata.delimiter, ';');
  assert.equal((await c.readSchema(c.fixture('mismatch.csv'))).metadata.column_mismatch, 2);
});
test('finite sampling stops early and full sampling sees late CSV/JSONL types', async () => {
  for (const format of ['csv', 'jsonl']) {
    const c = runtime(), file = c.fixture(`large-inference.${format}`);
    const sampled = await c.readSchema(file);
    assert.equal(sampled.metadata.sampled_rows, 20000);
    assert.equal(sampled.fields.find(f => f.path === 'value').type, 'INT32');
    assert.ok(sampled.tracker.bytes < file.size);
    c.inferenceSettings.sampleRows = 'all'; const full = await c.readSchema(file);
    assert.equal(full.metadata.sampled_rows, 50000);
    assert.equal(full.fields.find(f => f.path === 'value').type, 'STRING');
  }
});
test('cross-format flat and nested normalization remains conservative', async () => {
  const c = runtime();
  for (const [left, right] of [
    ['before.parquet', 'cross-equivalent.csv'], ['cross-equivalent.csv', 'cross-flat.jsonl'],
    ['cross-nested.parquet', 'cross-nested.jsonl']
  ]) {
    const diff = c.diffSchemas(await c.readSchema(c.fixture(left)), await c.readSchema(c.fixture(right)));
    assert.equal(diff.summary.changed, 0, `${left} vs ${right}`);
  }
  const diff = c.diffSchemas(await c.readSchema(c.fixture('cross-temporal.parquet')), await c.readSchema(c.fixture('cross-temporal.jsonl')));
  assert.ok(diff.rows.some(row => row.path === 'event_date' && row.changes.includes('type')));
  assert.ok(diff.rows.filter(row => row.changes.length).every(row => row.impact.level === 'review'));
});
test('JA/EN full reports stay complete under search and filters', async () => {
  const c = runtime(), before = await c.readSchema(csv('value,value,value_2\n1,alpha,42\n'));
  const after = await c.readSchema(csv('value,value,value_2\n1,2,42\n'));
  const diff = c.diffSchemas(before, after), original = JSON.stringify(diff);
  c.state.before = { file: csv('', 'before.csv'), schema: before }; c.state.after = { file: csv('', 'after.csv'), schema: after };
  for (const language of ['ja', 'en']) {
    c.language = language;
    for (const filter of ['all', 'changed', 'added', 'removed', 'renamed', 'type', 'breaking', 'review']) {
      c.reportView.filter = filter; c.reportView.query = 'no-match';
      assert.equal(diff.rows.filter(c.rowMatchesView).length, 0);
      const json = c.buildJsonReport(diff), markdown = c.buildMarkdownReport(diff);
      assert.equal(json.schemaVersion, 1); assert.equal(json.fields.length, 3); assert.equal(json.summary.modified, 1);
      assert.match(markdown, /value_3/); assert.match(markdown, /STRING/);
    }
  }
  assert.equal(JSON.stringify(diff), original);
  assert.equal(c.outputFilename('json'), 'before-to-after-schema-diff.json');
});

function enableResultControls(c) {
  // Real renderers and event callbacks; only DOM sinks / clipboard / downloads are stubbed.
  vm.runInContext(section('    function pill(', '    function markdownEscape(') +
    section("    $('#fieldSearch').addEventListener", '    async function reloadInferred('), c);
}
const snapshot = value => JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v);
async function renameComparison(c) {
  const beforeFile = c.fixture('rename-filter-before.parquet'), afterFile = c.fixture('rename-filter-after.parquet');
  const before = await c.readSchema(beforeFile), after = await c.readSchema(afterFile);
  c.state.before = { file: beforeFile, schema: before }; c.state.after = { file: afterFile, schema: after };
  return c.diffSchemas(before, after);
}

test('Renamed filter has Japanese / English labels and help in the native select', () => {
  const select = html.match(/<select[^>]*id="diffFilter"[^>]*>([\s\S]*?)<\/select>/)[1];
  assert.match(select, /<option value="renamed" data-i18n="filterRenamed">名前変更<\/option>/);
  const c = runtime();
  for (const [language, label] of [['ja', '名前変更'], ['en', 'Renamed']]) {
    c.language = language; assert.equal(c.t('filterRenamed'), label);
    assert.match(c.t('helpRenamed'), /Field ID/);
  }
  assert.match(section('<!-- APP:HELP:BEGIN', '<!-- APP:HELP:END'), /data-i18n="helpRenamed"/);
});

test('Renamed intersects old/new path search and includes combined changes only', async () => {
  const c = runtime(), diff = await renameComparison(c), original = snapshot(diff);
  assert.equal(diff.summary.fields, 4); assert.equal(diff.summary.renamed, 1);
  const renamed = diff.rows.find(row => row.changes.includes('renamed'));
  assert.deepEqual(plain(renamed.changes).sort(), ['nullability', 'renamed', 'type']);
  c.reportView.filter = 'renamed';
  assert.deepEqual(plain(diff.rows.filter(c.rowMatchesView).map(row => row.afterPath)), ['new_name']);
  for (const query of ['old_name', 'new_name', '  OLD_NAME  ', 'NEW_NAME']) {
    c.reportView.query = query; assert.equal(diff.rows.filter(c.rowMatchesView).length, 1, query);
  }
  for (const query of ['stable', 'added', 'removed', 'no-match']) {
    c.reportView.query = query; assert.equal(diff.rows.filter(c.rowMatchesView).length, 0, query);
  }
  c.reportView.query = ''; c.reportView.filter = 'changed'; assert.equal(diff.rows.filter(c.rowMatchesView).length, 3);
  c.reportView.filter = 'type'; assert.equal(diff.rows.filter(c.rowMatchesView).length, 1);
  c.reportView.filter = 'all'; assert.equal(diff.rows.filter(c.rowMatchesView).length, 4);
  assert.equal(snapshot(diff), original);
});

test('Renamed never guesses from duplicate IDs, missing IDs or inferred paths', async () => {
  const c = runtime(); c.reportView.filter = 'renamed';
  for (const [before, after] of [
    [await c.readSchema(c.fixture('duplicate-id-before.parquet')), await c.readSchema(c.fixture('duplicate-id-after.parquet'))],
    [await c.readSchema(c.fixture('before.parquet')), await c.readSchema(c.fixture('after.parquet'))],
    [await c.readSchema(csv('old_name\n1\n')), await c.readSchema(csv('new_name\n1\n'))],
    [await c.readSchema(c.fixture('rename-filter-before.parquet')), await c.readSchema(csv('new_name,stable,added\n1,1,1\n'))]
  ]) {
    const diff = c.diffSchemas(before, after);
    assert.equal(diff.summary.renamed, 0); assert.equal(diff.rows.filter(c.rowMatchesView).length, 0);
    assert.ok(diff.rows.some(row => row.changes.includes('added')));
    assert.ok(diff.rows.some(row => row.changes.includes('removed')));
  }
});

for (const language of ['ja', 'en']) test(`${language}: Renamed UI renders counts, empty state, swap and full exports`, async () => {
  const c = runtime(); c.language = language; enableResultControls(c);
  const diff = await renameComparison(c), original = snapshot(diff), downloads = [];
  c.copyText = async text => { c.copied = text; return true; };
  c.downloadText = (filename, text, mime) => downloads.push({ filename, text, mime });
  c.renderResults(diff);
  const filter = value => c.elements.get('#diffFilter').change({ target: { value } });
  const search = value => c.elements.get('#fieldSearch').input({ target: { value } });
  filter('renamed');
  assert.equal(c.elements.get('#visibleCount').textContent, c.t('visibleCount', { visible: '1', total: '4' }));
  let rendered = c.elements.get('#resultRows').innerHTML;
  assert.equal((rendered.match(/old_name → new_name/g) || []).length, 2, 'desktop and mobile output');
  assert.doesNotMatch(rendered, /stable|>added<|>removed</);
  search('no-match'); assert.match(c.elements.get('#resultRows').innerHTML, /filter-empty/);
  assert.equal(c.elements.get('#visibleCount').textContent, c.t('visibleCount', { visible: '0', total: '4' }));
  await c.elements.get('#copyResultButton').click();
  c.elements.get('#saveMarkdownButton').click(); c.elements.get('#saveJsonButton').click();
  assert.equal(c.copied, c.buildMarkdownReport(diff)); assert.equal(downloads[0].text, c.copied);
  for (const field of ['old_name', 'new_name', 'added', 'removed']) assert.ok(c.copied.includes(field), field);
  const json = JSON.parse(downloads[1].text);
  assert.equal(json.schemaVersion, 1); assert.equal(json.fields.length, 4);
  assert.deepEqual(json.summary, plain(diff.summary)); assert.ok(json.fields.some(row => row.path === 'stable'));
  assert.equal(snapshot(diff), original);
  search('old_name'); c.swap();
  assert.equal(c.reportView.filter, 'renamed');
  assert.equal(c.lastDiff.rows.find(row => row.changes.includes('renamed')).afterPath, 'old_name');
  assert.match(c.elements.get('#resultRows').innerHTML, /new_name → old_name/);
  filter('all'); search(''); assert.equal(c.lastDiff.rows.filter(c.rowMatchesView).length, 4);
  c.renderResults(c.diffSchemas(c.state.before.schema, c.state.before.schema));
  assert.equal(c.reportView.filter, 'all'); assert.equal(c.reportView.query, '');
  assert.equal(c.elements.get('#diffFilter').disabled, true);
  c.resetResults(); assert.equal(c.elements.get('#reportToolbar').hidden, true);
});

for (const bits of [8, 16, 32, 64]) for (const signed of [true, false]) {
  const name = `${signed ? 'int' : 'uint'}${bits}`;
  test(`logical ${name} retains decoded width/sign and matches converted normalization`, async () => {
    const c = runtime(), logical = await c.readSchema(c.fixture('integer-logical.parquet'));
    const converted = await c.readSchema(c.fixture('integer-converted.parquet'));
    const field = logical.fields.find(f => f.path === name), legacy = converted.fields.find(f => f.path === name);
    assert.deepEqual(plain(field.raw.logical_type), { type: 'INTEGER', bitWidth: bits, isSigned: signed });
    assert.ok(field.type.includes(name.toUpperCase()));
    assert.equal(field.normalizedType, name.toUpperCase());
    assert.equal(field.normalizedType, legacy.normalizedType);
    assert.equal(c.diffSchemas(logical, logical).summary.changed, 0);
  });
}

for (const format of ['csv', 'tsv', 'jsonl', 'ndjson']) test(`${format}: integer normalization fixes equivalence and preserves conservative differences`, async () => {
  const c = runtime(), declared = await c.readSchema(c.fixture('integer-logical.parquet'));
  const values = Object.fromEntries(declared.fields.map(f => [f.path, f.path.endsWith('64') ? 2147483648 : 1]));
  const delimiter = format === 'tsv' ? '\t' : ',';
  const text = ['jsonl', 'ndjson'].includes(format) ? `${JSON.stringify(values)}\n` : `${Object.keys(values).join(delimiter)}\n${Object.values(values).join(delimiter)}\n`;
  const inferred = await c.readSchema(csv(text, `integers.${format}`));
  for (const [before, after] of [[declared, inferred], [inferred, declared]]) {
    const diff = c.diffSchemas(before, after);
    assert.equal(diff.summary.changed, 6);
    for (const row of diff.rows) {
      if (['int32', 'int64'].includes(row.path)) {
        assert.deepEqual(plain(row.changes), []); assert.equal(row.impact.level, 'none');
      } else {
        assert.deepEqual(plain(row.changes), ['type']); assert.equal(row.impact.level, 'review');
        assert.equal(row.impact.reason, 'reasonInferred');
      }
    }
    assert.equal(c.buildJsonReport(diff).schemaVersion, 1);
  }
});
