// Static CSS/markup contracts plus the actual Help event handlers in a DOM adapter.
// Native scrolling, Escape, focus restoration, and viewport fit require browser QA.
// Removing either modal-only ancestor lock must fail the corresponding contract.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { gunzipSync } = require('node:zlib');
const root = path.resolve(__dirname, '..');
const artifacts = process.argv.slice(2);

for (const artifact of artifacts.length ? artifacts : [process.env.SCHEMA_DIFF_HTML || path.join(root, 'src/index.template.html')]) {
  let html = fs.readFileSync(artifact, 'utf8');
  const payload = html.match(/<script id="self-extract-payload"[^>]*>([A-Za-z0-9+/=\s]+)<\/script>/);
  if (payload) html = gunzipSync(Buffer.from(payload[1], 'base64')).toString('utf8');
  const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1].replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(css, 'The actual application stylesheet exists');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const rule = selector => rules.find(([, selectors]) => selectors.split(',').map(s => s.trim()).includes(selector))?.[2];
  const help = html.match(/<dialog id="helpDialog"[^>]*>[\s\S]*?<\/dialog>/)?.[0];
  assert.ok(help, 'The native Help dialog exists');
  const dictionary = html.match(/const translations\s*=\s*(\{[\s\S]*?\n\s*\}{2});/)?.[1];
  assert.ok(dictionary, 'The actual translation dictionary exists');
  const translations = vm.runInNewContext(`(${dictionary})`);

  for (const ancestor of ['html', 'body']) {
    test(`${artifact}: ${ancestor} locks page scrolling only while a native modal is open`, () => {
      assert.match(rule(`${ancestor}:has(dialog:modal)`) || '', /(?:^|;)\s*overflow\s*:\s*hidden\s*(?:;|$)/,
        `Missing modal-only ${ancestor} overflow lock`);
      assert.doesNotMatch(rule(ancestor) || '', /(?:^|;)\s*overflow(?:-y)?\s*:\s*(?:hidden|clip)\s*(?:;|$)/,
        'Normal page scrolling must remain available after dismissal');
      assert.equal(rule(`${ancestor}:has(dialog[open])`), undefined, 'Non-modal dialogs must not lock the page');
    });
  }

  test(`${artifact}: preserve the bounded Help shell and independently scrolling body`, () => {
    assert.match(rule('#helpDialog[open]'), /display:\s*flex/);
    assert.match(rule('#helpDialog[open]'), /flex-direction:\s*column/);
    assert.match(rule('#helpDialog[open]'), /max-height:\s*calc\(100dvh[^;]+env\(safe-area-inset-bottom\)/);
    assert.match(rule('.dialog-header'), /flex:\s*0 0 auto/);
    const body = rule('.dialog-body');
    for (const expression of [/min-height:\s*0/, /flex:\s*1 1 auto/, /overflow:\s*auto/, /overscroll-behavior:\s*contain/, /env\(safe-area-inset-bottom\)/]) assert.match(body, expression);
    assert.match(help, /<div class="dialog-header">[\s\S]*?id="closeHelpButton"[\s\S]*?<div class="dialog-body">/);
    assert.match(help, /data-i18n="helpOffline"[^>]*>[^<]+<\/p><!-- APP:HELP:END -->/);
  });

  for (const language of ['ja', 'en']) {
    test(`${artifact}: ${language} Help explains background locking and dismissal`, () => {
      assert.match(help, /data-i18n="helpScroll"/);
      const text = translations[language].helpScroll || '';
      assert.match(text, language === 'ja' ? /背景.*スクロール/ : /background.*scroll/i);
      assert.match(text, language === 'ja' ? /閉じる.*Esc.*外側/ : /Close.*Esc.*outside/i);
    });
  }

  test(`${artifact}: preserve the existing local-processing shield and bilingual badge`, () => {
    const badge = html.match(/<div class="local-badge">[\s\S]*?<\/div>/)?.[0];
    assert.ok(badge);
    assert.match(badge, /<svg[^>]*aria-hidden="true"/);
    assert.match(badge, /d="M12 3 5 6v5c0 4\.6 2\.8 8 7 10 4\.2-2 7-5\.4 7-10V6z"/);
    assert.match(badge, /d="m9 12 2 2 4-5"/);
    assert.equal(translations.ja.localBadge, '完全ローカル処理');
    assert.equal(translations.en.localBadge, 'Fully local processing');
  });

  test(`${artifact}: actual Help handlers retain close, backdrop, inside-click and repeated-open routes`, () => {
    const handlers = html.split(/\r?\n/).find(line => line.includes("const help=$('#helpDialog')"));
    assert.ok(handlers, 'Locate the production Help handlers');
    const nodes = new Map();
    for (const id of ['#helpDialog', '#helpButton', '#closeHelpButton']) {
      nodes.set(id, { open: false, handlers: {}, addEventListener(type, callback) { this.handlers[type] = callback; }, showModal() { this.open = true; }, close() { this.open = false; }, getBoundingClientRect() { return { left: 10, right: 200, top: 10, bottom: 180 }; } });
    }
    vm.runInNewContext(handlers, { $: id => nodes.get(id) });
    const dialog = nodes.get('#helpDialog'), open = () => nodes.get('#helpButton').handlers.click();
    open(); assert.equal(dialog.open, true);
    dialog.handlers.click({ clientX: 50, clientY: 50 }); assert.equal(dialog.open, true);
    nodes.get('#closeHelpButton').handlers.click(); assert.equal(dialog.open, false);
    for (const point of [{ clientX: 0, clientY: 50 }, { clientX: 210, clientY: 50 }, { clientX: 50, clientY: 0 }, { clientX: 50, clientY: 190 }]) {
      open(); assert.equal(dialog.open, true);
      dialog.handlers.click(point); assert.equal(dialog.open, false);
    }
    assert.equal(dialog.handlers.cancel, undefined, 'Keep native Escape cancellation unmodified');
  });

  test(`${artifact}: preserve the local-only runtime boundary`, () => {
    assert.match(html, /connect-src 'none'/);
    assert.doesNotMatch(html, /<script\b[^>]*\bsrc=["']https?:/i);
  });
}
