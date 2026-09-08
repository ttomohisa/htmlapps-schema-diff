from pathlib import Path
import csv
root=Path(__file__).resolve().parents[1]/'test-data'
root.mkdir(exist_ok=True)
# CSV with BOM, commas, quoted newlines and escaped quotes.
before_rows=[
 ['id','name','active','amount','created_at','notes'],
 ['1','Alice','true','10.5','2026-01-01','hello, world'],
 ['2','Bob','false','20','2026-01-02','line1\nline2'],
 ['3','','true','30.25','2026-01-03','quote "inside"'],
]
after_rows=[
 ['id','name','active','amount','created_at','country'],
 ['1','Alice','true','10.5','2026-01-01T12:30:00Z','JP'],
 ['5000000000','Bob','false','20','2026-01-02T08:00:00Z','US'],
 ['3','','true','30.25','2026-01-03T09:15:00Z','JP'],
]
for name,rows in [('before.csv',before_rows),('after.csv',after_rows)]:
    with (root/name).open('w',encoding='utf-8-sig',newline='') as f:
        csv.writer(f).writerows(rows)
# TSV normal header.
tsv_before=[['key','score','enabled'],['a','10','true'],['b','20','false'],['c','','true']]
tsv_after=[['key','score','enabled','comment'],['a','10.5','true','ok'],['b','20.25','false','ok'],['c','','true','ok']]
for name,rows in [('before.tsv',tsv_before),('after.tsv',tsv_after)]:
    with (root/name).open('w',encoding='utf-8',newline='') as f:
        csv.writer(f,delimiter='\t',lineterminator='\n').writerows(rows)
# Headerless CSV for manual header override.
with (root/'headerless.csv').open('w',encoding='utf-8',newline='') as f:
    csv.writer(f).writerows([['alpha','Tokyo','10'],['beta','Osaka','20'],['gamma','Kyoto','30']])
# Large CSV: late string after default 20k sample.
with (root/'large-inference.csv').open('w',encoding='utf-8',newline='') as f:
    w=csv.writer(f); w.writerow(['id','value'])
    for i in range(1,50001):
        w.writerow([i, 'late-string' if i==30000 else i*2])
# Small reference CSV for sampling comparison.
(root/'large-reference.csv').write_text('id,value\n1,2\n2,4\n3,6\n',encoding='utf-8')
# Semicolon-delimited CSV to exercise auto-detection.
(root/'semicolon.csv').write_text('id;name;amount\n1;Alice;10.5\n2;Bob;20\n',encoding='utf-8')
# Mismatched columns.
(root/'mismatch.csv').write_text('a,b,c\n1,2,3\n4,5\n6,7,8,9\n',encoding='utf-8')
# Malformed quote.
(root/'broken.csv').write_text('a,b\n1,"unterminated\n2,x\n',encoding='utf-8')

# Cross-format fixtures aligned with test-data/before.parquet.
(root/'cross-equivalent.csv').write_text(
    'customer_id,name,amount\n1,Alice,12.5\n2,Bob,20.25\n3,Cara,30.75\n', encoding='utf-8')
(root/'cross-changed.csv').write_text(
    'customer_id,name,country\n5000000000,Alice,JP\n2,Bob,US\n3,Cara,JP\n', encoding='utf-8')
(root/'cross-temporal.csv').write_text(
    'event_date,event_at,amount\n2026-01-01,2026-01-01T12:30:00Z,10.5\n2026-01-02,2026-01-02T08:15:00Z,20.25\n', encoding='utf-8')

print('wrote delimited fixtures')
