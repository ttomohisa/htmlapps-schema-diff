'use strict';
// Run against the official generated files in the unprivileged PR build job.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const buildSelector = '.build-section details';


async function prepareApp(page, width, label) {
  assert.equal(await page.locator('#mobileCompareBar').isVisible(),false,label+': empty comparison action remains hidden');
  assert.equal(await page.locator('#pageIntro').isVisible(),true,label+': introduction is visible before selecting a file');
  assert.equal(await page.locator('main h1.sr-only').count(),1,label+': the app heading stays accessible');
  await page.locator('#beforeInput').setInputFiles({name:'before.csv',mimeType:'text/csv',buffer:Buffer.from('id,name\n1,Kitty\n')});
  await page.locator('#pageIntro').waitFor({state:'hidden'});
  assert.equal(await page.locator('#pageIntro').getAttribute('hidden'),'',
    label+': introductory text and privacy badge hide after the first selected file');
  await page.locator('#afterInput').setInputFiles({name:'after.csv',mimeType:'text/csv',buffer:Buffer.from('id,name,score\n1,Kitty,3\n')});
  await page.waitForFunction(()=>!document.querySelector('#compareButton').disabled);
  assert.equal(await page.locator('#pageIntro').isVisible(),false,label+': introduction remains hidden when both files are loaded');
  assert.equal(await page.locator('#mobileCompareBar').isVisible(),width<=820,label+': ready comparison action preserved');
}
async function smoke(page, results, file) {
  if (await page.locator('#mobileCompareButton').isVisible()) await page.locator('#mobileCompareButton').click();
  await page.locator('#reportToolbar').waitFor();
  assert.equal(await page.locator('#mobileCompareBar').isVisible(),false,'finished comparison action hidden');
  const downloadPromise=page.waitForEvent('download');await page.locator('#saveJsonButton').click();const download=await downloadPromise;
  assert.equal(download.suggestedFilename(),'before-to-after-schema-diff.json');
  const target=path.join(results,file.includes('self-extract')?'synthetic-loader.json':'synthetic-readable.json');await download.saveAs(target);
  const report=JSON.parse(fs.readFileSync(target,'utf8'));assert.equal(report.summary.added,1);assert.ok(report.fields.some(field=>field.path==='score'));
  console.log('PASS synthetic CSV comparison and JSON report export '+file);
}

async function main() {
  const results = path.resolve(__dirname, '..', 'test-results', 'mobile-help');
  fs.mkdirSync(results, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const file of ['dist/index.html', 'dist/index.self-extract.html', 'schema-diff.html']) {
      for (const language of ['ja', 'en']) {
        for (const [width, height] of [[1360, 900], [821, 568], [820, 568], [360, 640], [320, 568], [393, 252]]) {
          const context = await browser.newContext({ viewport: { width, height }, locale: language, reducedMotion: 'reduce' });
          const page = await context.newPage();
          const errors = [], requests = [];
          page.on('pageerror', error => errors.push(error.message));
          page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
          page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
          const label = `${file} ${language} ${width}x${height}`;
          try {
            await page.goto(pathToFileURL(path.resolve(__dirname, '..', file)).href);
            await page.locator('#helpButton').waitFor();
            if (await page.locator('html').getAttribute('lang') !== language) await page.locator('#languageButton').click();
            assert.equal(await page.locator('[data-i18n="localBadge"]').textContent(), language === 'en' ? 'Fully local processing' : '完全ローカル処理', label);
            if (width <= 820) {
              assert.equal(await page.locator('.local-badge').isVisible(), false, label + ': badge hidden on mobile');
            } else {
              assert.ok(await page.locator('.local-badge').evaluate(el => {
                const box = el.getBoundingClientRect();
                const range = document.createRange();
                range.selectNodeContents(el.querySelector('[data-i18n="localBadge"]'));
                return box.left >= 0 && box.right <= innerWidth && el.scrollWidth <= el.clientWidth + 1
                  && [...range.getClientRects()].every(rect => rect.left >= box.left - 1 && rect.right <= box.right + 1 && rect.top >= box.top - 1 && rect.bottom <= box.bottom + 1);
              }), label + ': badge text fits');
            }
            assert.equal(await page.locator('.page-intro h1').count(), 0, label + ': intro has no visible heading');
            assert.equal(await page.locator('.side-label').count(), 0, label + ': no OLD/NEW labels');
            assert.match(await page.locator('.page-intro [data-i18n="lead"]').innerText(), language === 'ja' ? /2つのファイルのスキーマ/ : /two file schemas/i, label + ': short hero copy');
            assert.equal(await page.locator('[data-i18n="workspaceBody"]').count(), 0, label + ': removed duplicated file instructions');
            if (width > 520) assert.equal(await page.locator('.brand-meta').innerText(), language === 'ja'
              ? 'Parquet / CSV / TSV / JSONL スキーマ比較'
              : 'Parquet / CSV / TSV / JSONL schema comparison', label + ': header metadata');
            assert.equal(await page.locator('.inference-settings').evaluate(el => getComputedStyle(el).borderTopWidth), '0px', label + ': borderless inference settings');
            assert.match(await page.locator('#beforeContent .drop-icon path').first().getAttribute('d'), /^M12 3v12/, label + ': drop arrow points downward');
            assert.equal(await page.locator('main #buildVersion').count(), 0, label);
            assert.equal(await page.locator('footer').isVisible(), width > 820, label);
            await prepareApp(page, width, label);
            for (const side of ['before','after']) {
              const actions = page.locator('#' + side + 'Content .file-action-link');
              assert.equal(await actions.count(),2,label+': '+side+' has two text-link actions');
              const styles = await actions.evaluateAll(nodes => nodes.map(node => {
                const css = getComputedStyle(node);
                return { tag:node.tagName, border:css.borderTopWidth,
                  background:css.backgroundColor, decoration:css.textDecorationLine,
                  minHeight:Number.parseFloat(css.minHeight), width:node.getBoundingClientRect().width };
              }));
              for (const style of styles) {
                assert.equal(style.tag,'BUTTON',label+': link style retains keyboard button semantics');
                assert.equal(style.border,'0px',label+': no button outline around file actions');
                assert.equal(style.background,'rgba(0, 0, 0, 0)',label+': transparent file action');
                assert.ok(style.decoration.includes('underline'),label+': underlined file action');
                assert.ok(style.minHeight >= (width<=520?44:38),label+': file action tap height');
                assert.ok(style.width>0 && style.width < width/1.5,label+': file action is text width, not full card');
              }
            }
            if(file === 'dist/index.html' && language === 'ja' && width === 360) {
              const previewButton = page.locator('#beforeContent [data-preview-toggle]');
              await previewButton.click();
              await page.locator('#beforePreview').waitFor({state:'visible'});
              assert.equal(await previewButton.getAttribute('aria-expanded'),'true',label+': preview opens with link-style action');
              await previewButton.click();
              await page.locator('#beforePreview').waitFor({state:'detached'});
              const chooserPromise = page.waitForEvent('filechooser');
              await page.locator('#beforeContent [data-choose]').click();
              const chooser = await chooserPromise;
              await chooser.setFiles({name:'before.csv',mimeType:'text/csv',buffer:Buffer.from('id,name\n1,Kitty\n')});
              await page.waitForFunction(() => !document.querySelector('#compareButton').disabled);
              assert.equal(await page.locator('#pageIntro').isVisible(),false,label+': intro remains hidden after file replacement');
            }
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label + ': page width');

            await page.locator('#helpButton').click();
            const body = page.locator('#helpDialog .dialog-body');
            assert.ok(await body.evaluate(el => el.lastElementChild.contains(document.querySelector('#buildVersion'))), label + ': build is final body child');
            assert.equal(await page.locator(buildSelector).count(), 1, label);
            assert.equal(await page.locator(buildSelector).isVisible(), true, label);
            for (const id of ['buildVersion', 'builtAt']) assert.equal(await page.locator('#' + id).count(), 1, label);

            if (await page.locator(buildSelector).getAttribute('open') === null) {
              const summary = page.locator(buildSelector).locator('summary');
              await summary.focus();
              await page.keyboard.press('Enter');
              assert.equal(await page.locator(buildSelector).getAttribute('open'), '', label);
              assert.notEqual(await page.locator('#buildVersion').innerText(), '—', label);
              assert.notEqual(await page.locator('#builtAt').innerText(), '—', label);
              assert.match(await page.locator('#builtAt').innerText(), /\d{4}/, label + ': populated build timestamp');
            }
            await body.evaluate(el => { el.scrollTop = el.scrollHeight; });
            const finalItem = page.locator('.build-section .build-item:last-child strong');
            const finalBox = await finalItem.boundingBox(), bodyBox = await body.boundingBox();
            console.log('GEOMETRY ' + label + ' ' + JSON.stringify({ finalBox, bodyBox, viewportHeight: height }));
            assert.ok(finalBox && bodyBox && finalBox.y >= 0 && finalBox.y + finalBox.height <= height && finalBox.y >= bodyBox.y - 1 && finalBox.y + finalBox.height <= bodyBox.y + bodyBox.height + 1, label + ': final Help item reachable');
            assert.ok(await body.evaluate(el => el.scrollWidth <= el.clientWidth + 1), label + ': Help width');
            const headerBox = await page.locator('#helpDialog .dialog-header').boundingBox();
            assert.ok(headerBox && headerBox.x >= 0 && headerBox.x + headerBox.width <= width && headerBox.y >= 0 && headerBox.y + headerBox.height <= height, label + ': header visible');
            if (file === 'dist/index.html' && [1360, 320].includes(width)) {
              await page.screenshot({ path: path.join(results, `help-${language}-${width}.png`) });
            }
            const dialogBox = await page.locator('#helpDialog').boundingBox();
            assert.ok(finalBox.y >= dialogBox.y - 1 && finalBox.y + finalBox.height <= dialogBox.y + dialogBox.height + 1, label + ': final item inside dialog');
            assert.ok(dialogBox.y > 1, label + ': top coordinate is genuine backdrop');
            const beforeScroll = await page.evaluate(() => scrollY);
            await page.mouse.move(2, 1);
            await page.mouse.wheel(0, 400);
            await page.waitForTimeout(100);
            assert.equal(await page.evaluate(() => scrollY), beforeScroll, label + ': background locked');
            await page.keyboard.press('Escape');
            assert.equal(await page.locator('#helpDialog').isVisible(), false, label + ': Escape');
            await page.locator('#helpButton').click();
            await page.locator('#closeHelpButton').click();
            assert.equal(await page.locator('#helpDialog').isVisible(), false, label + ': reopen and Close');
            await page.locator('#helpButton').click();
            await page.mouse.click(2, 1);
            assert.equal(await page.locator('#helpDialog').isVisible(), false, label + ': backdrop');
            if (file !== 'schema-diff.html' && language === 'ja' && width === 360) await smoke(page, results, file);
            if ([1360, 821, 820, 360, 320].includes(width)) {
              if (!(await page.locator('#reportToolbar').isVisible())) {
                await page.locator(width <= 820 ? '#mobileCompareButton' : '#compareButton').click();
                await page.locator('#reportToolbar').waitFor();
              }
              const geometry = await page.evaluate(() => {
                const inspect = selector => {
                  const area = document.querySelector(selector);
                  const rect = area.getBoundingClientRect();
                  const cards = [...area.children].map(node => {
                    const r = node.getBoundingClientRect(), css = getComputedStyle(node);
                    const value = node.querySelector('.summary-value, .impact-value').getBoundingClientRect();
                    return {
                      left: r.left, right: r.right, top: r.top, bottom: r.bottom,
                      valueOffset: value.left - r.left,
                      borderLeft: css.borderLeftWidth,
                      borderTop: css.borderTopWidth,
                      radius: css.borderRadius,
                      background: css.backgroundColor
                    };
                  });
                  return { left: rect.left, right: rect.right, cards };
                };
                const results = document.querySelector('.results').getBoundingClientRect();
                return {
                  summary: inspect('.summary'), impact: inspect('.impact-summary'),
                  resultsLeft: results.left, resultsRight: results.right,
                  pageWidth: document.documentElement.scrollWidth
                };
              });
              const cols = width <= 620 ? 2 : 4;
              for (const [kind, area] of Object.entries({ summary: geometry.summary, impact: geometry.impact })) {
                assert.equal(area.cards.length, 4, label + ': ' + kind + ' retains four metrics');
                assert.equal(new Set(area.cards.map(c => Math.round(c.top))).size, width <= 620 ? 2 : 1, label + ': ' + kind + ' row count');
                assert.ok(area.left >= geometry.resultsLeft + 10 && area.right <= geometry.resultsRight - 10, label + ': ' + kind + ' readable edge insets');
                assert.ok(area.right >= geometry.resultsRight - 32, label + ': ' + kind + ' spans the result width');
                for (let k = 0; k < area.cards.length; k++) {
                  const card = area.cards[k], first = k % cols === 0;
                  assert.ok(card.left >= area.left - 1 && card.right <= area.right + 1, label + ': ' + kind + ' within grid');
                  assert.ok(card.left >= 0 && card.right <= width + 1, label + ': ' + kind + ' within screen');
                  assert.ok(card.bottom - card.top >= 70, label + ': ' + kind + ' text has breathing room');
                  assert.equal(card.background, 'rgba(0, 0, 0, 0)', label + ': ' + kind + ' no inner card background');
                  assert.equal(card.borderTop, '0px', label + ': ' + kind + ' no individual card frame');
                  assert.equal(card.radius, '0px', label + ': ' + kind + ' no nested rounded rectangles');
                  assert.equal(card.borderLeft, first ? '0px' : '1px', label + ': ' + kind + ' separators only between columns');
                  if (!first) assert.ok(card.valueOffset >= 17, label + ': ' + kind + ' inner padding at divider');
                }
              }
              if (width <= 620) {
                const gap = geometry.summary.cards[2].top - geometry.summary.cards[0].bottom;
                assert.ok(gap >= 20, label + ': mobile metric row separation');
              }
              assert.ok(geometry.impact.cards[0].top - geometry.summary.cards.at(-1).bottom >= 15, label + ': two metric groups separated');
              assert.ok(geometry.pageWidth <= width, label + ': no page-level horizontal overflow');
              if (file === 'dist/index.html' && [1360, 360].includes(width)) {
                await page.evaluate(() => window.scrollTo(0, 0));
                await page.screenshot({path:path.join(results, `results-flat-${language}-${width}.png`), fullPage:true});
              }
              // The user's report includes the no-difference state: keep it readable as well.
              if (file === 'dist/index.html' && language === 'ja' && [1360, 360].includes(width)) {
                await page.locator('#afterInput').setInputFiles({
                  name:'identical.csv',mimeType:'text/csv',
                  buffer:Buffer.from('id,name\n1,Kitty\n')
                });
                await page.waitForFunction(() => !document.querySelector('#compareButton').disabled);
                await page.locator(width <= 820 ? '#mobileCompareButton' : '#compareButton').click();
                assert.equal(await page.locator('.impact-card').count(), 0, label + ': no irrelevant impact metrics on identical schemas');
                assert.equal(await page.locator('.summary-card').count(), 4, label + ': unchanged summary metrics retained');
                assert.match(await page.locator('#resultsSub').innerText(), /2フィールドを比較しました/, label + ': unique comparison summary');
                assert.match(await page.locator('.empty-state h3').innerText(), /スキーマに差分はありません/, label + ': no-diff state intact');
                await page.evaluate(() => window.scrollTo(0, 0));
                await page.screenshot({path:path.join(results, `results-same-${language}-${width}.png`), fullPage:true});
              }
            }
            assert.deepEqual(errors, [], label + ': console errors');
            assert.deepEqual(requests, [], label + ': external runtime requests');
            console.log('PASS ' + label);
          } catch (error) {
            await page.screenshot({ path: path.join(results, `failure-${file.replace(/[^a-z0-9]/gi, '-')}-${language}-${width}x${height}.png`) }).catch(() => {});
            throw error;
          } finally {
            await context.close();
          }
        }
      }
    }
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
