// Keep the public README instructions aligned with the app and its release workflow.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const config=JSON.parse(read('app.config.json')),v=config.version;
const ja=read('README.ja.md'),en=read('README.md'),spec=read('APP_SPEC.md');
const notes=read('THIRD_PARTY_NOTICES.md'),source=read('src/index.template.html');
const release=read('.github/workflows/release.yml'),changes=read('CHANGELOG.md');
assert.match(v,/^\d+\.\d+\.\d+$/);
assert.ok(en.includes('Version: v'+v),'English README version');
assert.ok(ja.includes('バージョン: v'+v),'Japanese README version');
assert.ok(spec.includes('Current version: '+String.fromCharCode(96)+'v'+v+String.fromCharCode(96)),'Product spec version');
assert.ok(changes.includes('## v'+v+' - '),'Changelog version');
assert.ok(!spec.includes('Release status: formal release'),'Do not claim unpublished candidate is released');
assert.ok(release.includes('push:')&&release.includes('branches: [main]'),'Release trigger');
assert.ok(release.includes("github.event_name != 'pull_request'"),'No publishing on pull requests');
for(const [name,doc] of [['EN',en],['JA',ja]]){
  assert.ok(doc.includes('schema-diff.html'),'Tracked offline HTML documented: '+name);
  assert.ok(doc.includes('dist/index.html')&&/(build|generated|生成)/i.test(doc),'Build-only dist documented: '+name);
  assert.ok(!doc.includes('[![Schema Diff screenshot]')&&!doc.includes('[![Schema Diffの画面]'),'Do not present old screenshot as current: '+name);
  for(const match of doc.matchAll(/\]\(([^)]+)\)/g)){
    const destination=match[1].trim().split('#')[0];
    if(!destination||/^(https?:|mailto:|data:)/i.test(destination))continue;
    assert.ok(fs.existsSync(path.resolve(root,destination)),'Missing '+name+' README link: '+destination);
  }
}
assert.ok(en.includes('confirmed by the user')&&ja.includes('ユーザーが明示的に確認'),'Manual rename instructions');
assert.ok(en.includes('Modified fields')&&ja.includes('変更（追加・削除以外）'),'Modified filter documented');
assert.ok(en.includes('Likely compatible changes')&&ja.includes('互換性ありの可能性'),'Compatibility filter documented');
assert.ok(en.includes('complete compressed column chunks')&&ja.includes('圧縮された列チャンク全体'),'Parquet memory limits documented');
assert.ok(notes.includes('full compressed Parquet column chunks'),'Third-party notice accurate');
assert.ok(en.includes('suggested filename')&&ja.includes('ファイル名を確認・編集'),'Editable export filename documented in both languages');
assert.ok(spec.includes('Editable report filenames'),'Filename specification is tracked');
assert.ok(source.includes('filenameDialogTitle')&&source.includes('cleanExportBase'),'Editable name dialog is implemented');
assert.ok(source.includes('ten displayed rows')&&source.includes('10行より多くのデータ'),'Both Help languages mention read limits');
console.log('[OK] Release docs and local links are consistent with v'+v);
