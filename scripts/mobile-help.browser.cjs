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
  await page.locator('#saveJsonButton').click();
  await page.locator('#filenameDialog').waitFor({state:'visible'});
  assert.equal(await page.locator('#filenameExtension').innerText(),'.json');
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#filenameSave').click();
  const download=await downloadPromise;
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
            if (file === 'dist/index.html' && language === 'ja' && width === 393 && height === 252) {
              await page.locator('#mobileCompareButton').click();
              await page.locator('#saveJsonButton').click();
              const dialog=page.locator('#filenameDialog');
              await dialog.waitFor({state:'visible'});
              const rect=await dialog.boundingBox();
              assert.ok(rect && rect.y>=-1 && rect.y+rect.height<=height+1,label+': short-screen filename dialog stays in viewport');
              const state=await dialog.evaluate(el=>({
                clientHeight:el.clientHeight,scrollHeight:el.scrollHeight,overflow:getComputedStyle(el).overflowY
              }));
              assert.ok(['auto','scroll'].includes(state.overflow),label+': filename dialog can scroll if needed');
              assert.ok(state.clientHeight<=height-20,label+': filename dialog respects short viewport');
              await page.locator('#filenameCancel').click();
              assert.equal(await dialog.isVisible(),false,label+': Cancel closes without exporting');
            }
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
                const overview = document.querySelector('.result-overview');
                const impact = document.querySelector('.impact-overview');
                const results = document.querySelector('.results');
                const metricBoxes = [...overview.querySelectorAll('.result-overview-item')].map(item => {
                  const r = item.getBoundingClientRect(), css = getComputedStyle(item);
                  return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,
                    background:css.backgroundColor,border:css.borderTopWidth,
                    numberSize:parseFloat(getComputedStyle(item.querySelector('strong')).fontSize)};
                });
                const rect = el => {
                  const r = el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};
                };
                return { metrics:metricBoxes, overview:rect(overview), impact:impact?rect(impact):null,
                  impactItems:impact?[...impact.querySelectorAll('.impact-overview-item')].map(item => ({
                    text:item.innerText,cls:item.className
                  })):[],
                  results:rect(results),pageWidth:document.documentElement.scrollWidth };
              });
              assert.equal(geometry.metrics.length,4,label+': all four comparison counts remain available');
              const maxOverviewHeight = width <= 620 ? 115 : 70;
              assert.ok(geometry.overview.bottom - geometry.overview.top < maxOverviewHeight,
                label+': comparison counts are compact');
              assert.ok(geometry.overview.left >= geometry.results.left - 1
                && geometry.overview.right <= geometry.results.right + 1,
                label+': comparison metrics fit inside result container');
              for (const metric of geometry.metrics) {
                assert.ok(metric.left >= 0 && metric.right <= width + 1,label+': metric remains inside viewport');
                assert.equal(metric.background,'rgba(0, 0, 0, 0)',label+': metrics are not boxed');
                assert.equal(metric.border,'0px',label+': no nested cards');
                assert.ok(metric.numberSize <= 18,label+': metric numbers stay compact');
              }
              if (width > 620) assert.equal(new Set(geometry.metrics.map(m => Math.round(m.top))).size,
                1,label+': desktop counts fit on one line');
              assert.ok(geometry.impact && geometry.impact.bottom - geometry.impact.top < (width<=620?195:125),
                label+': compatibility information occupies at most a compact row or two');
              assert.equal(geometry.impactItems.length,2,
                label+': zero-valued compatible and info categories are hidden');
              assert.ok(geometry.impactItems.some(x => x.cls.includes('is-review') && /1/.test(x.text)),
                label+': review count is prominent');
              assert.ok(geometry.impactItems.some(x => x.cls.includes('is-zero') && /0/.test(x.text)),
                label+': zero breaking possibility remains as secondary context');
              assert.ok(geometry.pageWidth <= width,label+': no horizontal page overflow');
              assert.match(await page.locator('.impact-overview-note').innerText(),
                language==='ja'? /推定スキーマを含む比較/ : /inferred schema/i,
                label+': review explanation distinguishes inferred schemas');
              if (file === 'dist/index.html' && [1360, 360].includes(width)) {
                const added=page.locator('[data-summary-filter="added"]');
                assert.equal(await added.count(),1,label+': added count is a button');
                await added.click();
                assert.equal(await page.locator('#diffFilter').inputValue(),'added',label+': summary count applies the filter');
                assert.match(await page.locator('#visibleCount').innerText(),/1\s*\/\s*3/,label+': one added field is displayed');
                await page.locator('[data-summary-filter="review"]').click();
                assert.equal(await page.locator('#diffFilter').inputValue(),'review',label+': impact count filters review rows');
                await page.locator('[data-summary-filter="all"]').click();
                assert.equal(await page.locator('#diffFilter').inputValue(),'all',label+': total count restores all fields');
              }
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
                assert.equal(await page.locator('.impact-overview').count(), 0, label + ': no compatibility summary on identical schemas');
                assert.equal(await page.locator('.result-overview-item').count(), 4, label + ': unchanged summary metrics retained');
                assert.match(await page.locator('#resultsSub').innerText(), /2フィールドを比較しました/, label + ': unique comparison summary');
                assert.match(await page.locator('.empty-state h3').innerText(), /スキーマに差分はありません/, label + ': no-diff state intact');
                await page.evaluate(() => window.scrollTo(0, 0));
                await page.screenshot({path:path.join(results, `results-same-${language}-${width}.png`), fullPage:true});
              }
              if (file === 'dist/index.html' && language === 'ja' && [1360, 360].includes(width)) {
                await page.locator('#beforeInput').setInputFiles({
                  name:'old.csv',mimeType:'text/csv',
                  buffer:Buffer.from('customer_id,display_name\n1,A\n')
                });
                await page.locator('#afterInput').setInputFiles({
                  name:'new.csv',mimeType:'text/csv',
                  buffer:Buffer.from('customerId,display_name\n1,A\n')
                });
                await page.waitForFunction(() => !document.querySelector('#compareButton').disabled);
                await page.locator(width<=820 ? '#mobileCompareButton' : '#compareButton').click();
                await page.locator('#reportToolbar').waitFor();
                const candidate=page.locator('[data-rename-from="customer_id"][data-rename-to="customerId"]');
                assert.equal(await candidate.count(),1,label+': rename is proposed but not automatic');
                assert.equal(await page.locator('.result-overview-item').count(),4,label+': unchanged summary is retained');
                assert.match(await page.locator('#resultsSub').innerText(),/2フィールドに変更/,label+': automatic diff remains intact');
                await candidate.click();
                assert.equal(await page.locator('#diffFilter').inputValue(),'renamed',label+': confirmed rename is displayed');
                assert.match(await page.locator('#resultsSub').innerText(),/1フィールドに変更/,label+': confirmed pair is one modified field');
                assert.equal(await page.locator('[data-rename-undo="customer_id"]').count(),1,label+': explicit undo is provided');
                await page.locator('#saveJsonButton').click();
                await page.locator('#filenameDialog').waitFor({state:'visible'});
                await page.locator('#filenameInput').fill('my-schema-review.json');
                const exportEvent=page.waitForEvent('download');
                await page.locator('#filenameSave').click();
                const output=await exportEvent, dest=path.join(results,`manual-rename-${width}.json`);
                assert.equal(output.suggestedFilename(),'my-schema-review.json',label+': user-edited download filename');
                await output.saveAs(dest);
                const report=JSON.parse(fs.readFileSync(dest,'utf8'));
                assert.equal(report.summary.renamed,1,label+': report includes manual pairing');
                assert.equal(report.automaticSummary.changed,2,label+': original automatic result preserved');
                assert.equal(report.manuallyConfirmedRenames[0].beforePath,'customer_id',label+': confirmed pair is labeled');
                await page.locator('#languageButton').click();
                assert.equal(await page.locator('[data-rename-undo="customer_id"]').count(),1,label+': confirmation survives language change');
                await page.locator('#languageButton').click();
                await page.locator('[data-rename-undo="customer_id"]').click();
                assert.match(await page.locator('#resultsSub').innerText(),/2フィールドに変更/,label+': Undo restores automatic result');
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
