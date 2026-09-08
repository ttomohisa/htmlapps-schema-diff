from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1] / "test-data"
ROOT.mkdir(exist_ok=True)

before = [
    {"id": 1, "name": "Alice", "active": True, "profile": {"email": "a@example.com", "age": 30}, "tags": ["a", "b"], "items": [{"sku": "A1", "qty": 2}], "score": 1.5, "note": None},
    {"id": 2, "name": "Bob", "active": False, "profile": {"email": "b@example.com"}, "tags": [], "items": [{"sku": "B1", "qty": 1}, {"sku": "B2", "qty": 3}], "score": 2, "optional": "x"},
    {"id": 3, "name": "Cara", "active": True, "profile": None, "tags": ["c"], "items": [], "score": 3.25, "note": "ok"},
]
after = [
    {"id": 1, "name": "Alice", "active": True, "profile": {"email": "a@example.com", "age": "30", "country": "JP"}, "tags": [1, 2], "items": [{"sku": "A1", "qty": 2, "price": 100.5}], "score": 1.5, "note": "set"},
    {"id": 2, "name": "Bob", "active": False, "profile": {"email": "b@example.com", "age": "40"}, "tags": [3], "items": [{"sku": "B1", "qty": 1, "price": 20}], "score": 2.0, "note": "set"},
    {"id": 3, "name": "Cara", "active": True, "profile": {"email": "c@example.com", "country": "US"}, "tags": [], "items": [{"sku": "C1", "qty": 1}], "score": 3.25, "note": "set"},
]

def write_lines(name, rows, newline="\n", bom=False, final_newline=True):
    text = newline.join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) for row in rows)
    if final_newline:
        text += newline
    if bom:
        text = "\ufeff" + text
    (ROOT / name).write_bytes(text.encode("utf-8"))

for name, rows in [("before.jsonl", before), ("after.jsonl", after), ("before.ndjson", before), ("after.ndjson", after)]:
    write_lines(name, rows)

write_lines("bom-crlf.jsonl", before[:2], newline="\r\n", bom=True)
write_lines("final-no-newline.jsonl", before[:2], final_newline=False)
(ROOT / "broken.jsonl").write_text('{"id":1}\n{"id":2\n', encoding="utf-8")
(ROOT / "nonobject.jsonl").write_text('{"id":1}\n[1,2,3]\n', encoding="utf-8")
(ROOT / "blank-lines.jsonl").write_text('\n' + json.dumps(before[0], separators=(",", ":")) + '\n\n' + json.dumps(before[1], separators=(",", ":")) + '\n', encoding="utf-8")
write_lines("chunk-boundary.jsonl", [{"id": 1, "payload": "あ" * 60_000}, {"id": 2, "payload": "ok"}])

# 50,000 objects: "value" stays numeric through row 25,000 then becomes STRING.
# The default 20,000-object sample should therefore stop before the late type change.
with (ROOT / "large-inference.jsonl").open("w", encoding="utf-8", newline="\n") as handle:
    for index in range(50_000):
        value = index if index < 25_000 else f"x{index}"
        row = {"id": index, "value": value, "nested": {"flag": bool(index % 2)}}
        handle.write(json.dumps(row, separators=(",", ":")) + "\n")

print("Generated JSONL / NDJSON regression fixtures in", ROOT)


# Cross-format fixtures aligned with cross-nested.parquet and cross-temporal.parquet.

write_lines('cross-flat.jsonl', [
    {'customer_id':1,'name':'Alice','amount':12.5},
    {'customer_id':2,'name':'Bob','amount':20.25},
    {'customer_id':3,'name':'Cara','amount':30.75},
])
write_lines('cross-nested.jsonl', [
    {'profile': {'email':'a@example.com','age':30}, 'tags':['a','b'], 'active':True, 'score':1.5},
    {'profile': {'email':'b@example.com','age':40}, 'tags':['c'], 'active':False, 'score':2.25},
])
write_lines('cross-nested-changed.jsonl', [
    {'profile': {'email':'a@example.com','age':'30','country':'JP'}, 'tags':[1,2], 'active':True, 'score':1.5},
    {'profile': {'email':'b@example.com','age':'40','country':'US'}, 'tags':[3], 'active':False, 'score':2.25},
])
write_lines('cross-temporal.jsonl', [
    {'event_date':'2026-01-01', 'event_at':'2026-01-01T12:30:00Z', 'amount':10.5},
    {'event_date':'2026-01-02', 'event_at':'2026-01-02T08:15:00Z', 'amount':20.25},
])
