const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../src/index.template.html'),'utf8');
const originalBuild="<section class=\"section build-section\">\n      <details><summary data-i18n=\"buildInfo\">ビルド情報</summary><div class=\"build-grid\"><div class=\"build-item\"><span data-i18n=\"appVersion\">アプリ版</span><strong id=\"buildVersion\">—</strong></div><div class=\"build-item\"><span data-i18n=\"builtAt\">ビルド日時</span><strong id=\"builtAt\">—</strong></div><div class=\"build-item\"><span data-i18n=\"parquetEngine\">Parquet解析</span><strong>hyparquet 1.30.0 compact subset</strong></div><div class=\"build-item\"><span data-i18n=\"csvEngine\">CSV / TSV解析</span><strong>Built-in RFC 4180 stream parser</strong></div><div class=\"build-item\"><span data-i18n=\"jsonlEngine\">JSONL / NDJSON解析</span><strong>Built-in streaming JSON parser</strong></div><div class=\"build-item\"><span data-i18n=\"runtimeNetwork\">実行時通信</span><strong data-i18n=\"none\">なし</strong></div></div></details>\n    </section>";
test('existing build block is unique and the last Help scroll-body item',()=>{
 const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
 assert.doesNotMatch(main,/id="buildVersion"/);
 const help=html.match(/<dialog id="helpDialog"[^>]*>([\s\S]*?)<\/dialog>/)[1];
 const start=help.indexOf('<div class="dialog-body">');let depth=0,end=-1;
 for(const m of help.slice(start).matchAll(/<div\b[^>]*>|<\/div>/g)){depth+=m[0].startsWith('</')?-1:1;if(depth===0){end=start+m.index;break;}}
 assert.ok(end>start);const body=help.slice(start,end);
 assert.ok(body.includes(originalBuild),'Keep the exact existing metadata block and IDs');
 assert.match(body.slice(body.indexOf(originalBuild)+originalBuild.length),/^\s*(?:<!--[^]*?-->\s*)?$/);
 for(const id of ["buildVersion", "builtAt"])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);
});
test('only the informational footer is hidden at the existing phone breakpoint',()=>{
 const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
 const start=css.search(/@media\s*\(max-width:\s*820px\)\s*\{/);assert.ok(start>=0);
 const open=css.indexOf('{',start);let depth=1,end=open+1;for(;end<css.length&&depth;end++){if(css[end]==='{')depth++;if(css[end]==='}')depth--;}
 assert.match(css.slice(open+1,end-1),/(?:^|})\s*footer\s*\{\s*display:\s*none\s*;?\s*\}/);
});
test('keyboard disclosure clicks do not close Help; genuine backdrop clicks still do',()=>{
 const handler=html.match(/help\.addEventListener\('click',\s*e\s*=>\s*\{(.*?)\}\);/)[1];
 const dialog={closed:0,getBoundingClientRect(){return{left:20,right:300,top:20,bottom:400}},close(){this.closed++}};
 const run=new Function('help','e','closeHelp',handler);
 run(dialog,{target:{},clientX:0,clientY:0},()=>dialog.close());assert.equal(dialog.closed,0);
 run(dialog,{target:dialog,clientX:0,clientY:0},()=>dialog.close());assert.equal(dialog.closed,1);
});
