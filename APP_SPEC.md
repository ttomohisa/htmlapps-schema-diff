# Schema Diff - Product Specification

## Status

- Current version: `v1.0.1`
- Release status: formal release
- Supported in v1.0.1: Apache Parquet, CSV, TSV, JSONL, NDJSON
- Processing: fully local in the browser
- Release artifacts: `dist/index.html` and `dist/index.self-extract.html`

## Product goal

Schema Diff compares a Before schema and an After schema without uploading either file. It is intentionally focused on schema changes rather than row-data differences.

Parquet uses a schema explicitly declared in file metadata. CSV / TSV and JSONL / NDJSON use inferred schemas derived from observed rows or objects. The UI and compatibility logic must keep declared and inferred sources distinct.

## v1.0.1 scope — Header consistency

- Use EN in Japanese UI and JA in English UI, with localized target-language accessible names and titles.
- Preserve 完全ローカル処理 / Fully local processing, localized Help labels/titles, responsive visibility, comparison and export behavior.
- Synchronize canonical metadata, header, build manifest, report version, and generated artifacts at v1.0.1.

## v1.0.0 scope — Formal release

### Included

- Promote the validated v0.9.0 release candidate to the formal `v1.0.0` release without expanding the supported-format scope.
- Preserve Parquet, CSV, TSV, JSONL, and NDJSON schema comparison, cross-format normalization, Compatibility Engine, Field-ID rename matching, first-10-row previews, search, filters, and report export behavior.
- Remove the release-development “Current comparison scope / 現在確認する差分” UI section from the public application surface.
- Re-run the complete RC regression suite after the version bump, including dictionary-encoded Decimal preview and zero-row Parquet handling.
- Re-verify Japanese / English, desktop / mobile, runtime-network blocking, CSP, favicon/icon consistency, standalone output, and self-extract byte-for-byte restoration.
- Update release documentation, screenshots, manifests, report version, and visible version badge to `v1.0.0`.

### Deferred

- Order-only change classification.
- Additional Parquet preview codec coverage beyond the currently supported compact preview path.
- Additional schema formats such as Arrow IPC, Avro, ORC, JSON Schema, SQL CREATE TABLE, and dbt schema.yml.


## v0.9.0 scope — Release Candidate

### Included

- Preserve all v0.8.3 schema comparison, Compatibility Engine, preview, filtering, report/export, and responsive behavior.
- Freeze the supported-format scope for the release candidate: Apache Parquet, CSV, TSV, JSONL, and NDJSON.
- Run end-to-end regression for declared Parquet schemas, inferred delimited/JSON-lines schemas, and cross-format normalized comparisons.
- Re-run Field-ID rename, duplicate-ID protection, Decimal precision/scale, nested STRUCT/LIST/MAP, nullability, and compatibility-impact cases.
- Re-run CSV / TSV delimiter, quoting, header, sampling, malformed-input, and recovery cases.
- Re-run JSONL / NDJSON nested, array, null/missing, BOM/CRLF, chunk-boundary, malformed-input, and recovery cases.
- Re-run first-10-row previews for CSV / TSV / JSONL / NDJSON and Parquet, including Gzip and dictionary-encoded Decimal regression fixtures.
- Re-run Before / After swap, identical-schema, search, filters, clipboard copy, Markdown export, JSON export, and no-match states.
- Re-run Japanese / English, desktop, 390 px and 320 px mobile layouts, long file names, long field paths, preview overflow containment, and help-dialog fit.
- Verify release artifacts contain no runtime external-script dependency, keep CSP `connect-src 'none'`, preserve embedded favicon/icon consistency, and restore the self-extract payload byte-for-byte to the readable HTML.
- Rewrite README / README.ja.md using the established Browser Kitty repository structure: demo/use, features, quick start, usage, Pages publishing, development/build, privacy, limitations, third-party code, contribution, and license.
- Keep the release candidate on Semantic Versioning `0.9.0`; the next milestone is the formal `v1.0.0` release.

### Deferred

- Formal public-release version bump and release notes: v1.0.0.
- Order-only change classification remains outside the v0.9.0 scope.
- Additional Parquet preview codec coverage remains future work and does not block schema comparison.


## v0.8.0 scope

### Included

- Preserve all v0.7.0 schema comparison, Compatibility Engine, filtering, and report-export behavior.
- Make pending result states contextual: no files, missing Before, missing After, loading, file error, and ready to compare.
- Add a clear comparison-readiness message beside the primary action.
- Compact loaded-file cards while keeping format/source, rows or sampled rows, field count, and bytes-read information visible.
- Wrap very long file names safely without horizontal overflow and expose the full value through the title attribute.
- Use a visible loading spinner and distinct error/ready state styling without relying on color alone.
- On viewports up to 820 px, expose a fixed bottom Compare schemas action when both files are ready and no comparison is currently displayed.
- Hide the duplicate in-workspace compare button while the mobile bottom action is active, then restore it after comparison for deliberate re-runs.
- Add safe-area bottom padding while the mobile action is visible and move toast feedback above that action.
- Keep touch targets at least 44 px for key mobile actions.
- Keep the report search/filter toolbar sticky under the app header on desktop, but static on small screens to avoid consuming excessive mobile viewport height.
- Respect reduced-motion preference for loading indicators and result scrolling.
- Preserve no-horizontal-scroll behavior at 320 px / 390 px, including long file names and nested field paths.
- Keep help dialog within the mobile viewport and preserve Japanese / English behavior.
- Preserve fully local processing, runtime network blocking, single HTML, and self-extract artifacts.

### Deferred

- Release-candidate regression and final packaging hardening: v0.9.0.
- Order-only change classification remains outside the v0.8.0 scope.


## v0.7.0 scope

### Included

- Before / After Parquet, CSV, TSV, JSONL, and NDJSON file inputs
- File picker and drag & drop
- Metadata-only Parquet reading
- Parquet nested `STRUCT`, `LIST`, and `MAP` traversal
- Normalized Parquet field paths such as `customer.email`, `tags[]`, and `attributes{key}`
- Parquet Physical / Logical Type, repetition, Decimal, and Field ID comparison
- Field-ID-first matching and rename detection when an ID is unique on both sides
- Parquet compatibility-impact guidance
- CSV delimiter detection and TSV tab parsing
- CSV / TSV header auto-detection with manual yes/no override
- CSV / TSV row sampling: 20,000 by default, 100,000, or all rows
- CSV / TSV inferred types: NULL, BOOLEAN, INT32, INT64, FLOAT64, DATE, TIMESTAMP, STRING
- CSV / TSV observed-NULL tracking without treating a no-NULL sample as a Required constraint
- Incremental CSV / TSV chunk reading; no unconditional complete-file text conversion
- Quoted fields, quoted newlines, escaped quotes, CRLF / LF, and UTF-8 BOM handling
- Column-count mismatch warning
- JSONL / NDJSON incremental line parsing with one object per non-empty line
- JSONL nested object / array paths using `a.b`, `items[]`, and `items[].field` notation
- Explicit-null and missing-field tracking for JSONL / NDJSON
- JSON intrinsic type inference without converting numeric-looking strings
- Conservative `Review` impact for inferred-schema changes
- CSV <-> CSV, TSV <-> TSV, and CSV <-> TSV comparison
- JSONL <-> JSONL, NDJSON <-> NDJSON, and JSONL <-> NDJSON comparison
- Cross-format Parquet <-> CSV / TSV, Parquet <-> JSONL / NDJSON, and delimited-text <-> JSONL / NDJSON comparison using normalized types
- Original format-specific type details remain visible while cross-format equality uses normalized type signatures
- Comparison summary
- Desktop table and mobile card layouts
- Before / After swap
- If a comparison is already visible, Before / After swap automatically recomputes the reversed comparison
- Field-path search
- Display filters: all, changed, added, removed, type change, Potentially breaking, Review
- Copy full result as Markdown
- Save full Markdown report
- Save machine-readable JSON report
- Japanese / English UI
- Help dialog
- Fully local processing
- Direct `file://` use
- Single HTML release artifacts

### Deferred

- UI / UX release hardening and final interaction polish: v0.8.0
- Order-only change classification remains outside the v0.7.0 scope


## Result filtering and report export contract

Search and filters are view state only. They must never mutate the stored comparison result. Copy / Markdown / JSON export always use the complete `lastDiff` result before view filtering.

Supported display filters:

- all fields
- changed only
- added
- removed
- renamed (rows whose existing `changes` includes `renamed`)
- type changes
- `impact.level = breaking`
- `impact.level = review`

The Renamed / 名前変更 filter includes combined rename/type/nullability changes and intersects with the current field search. It does not infer new renames; only unique Field IDs on both declared Parquet sides can identify a rename.

Field search matches normalized `path`, `beforePath`, or `afterPath`, including rename rows. No-match state must be explicit and must not replace the underlying comparison.

Markdown export is the human-readable report format. It contains source file/format/source-kind information, the full comparison summary, compatibility counts, and changed fields with Before / After type details, impact text, and diff kinds. Copy uses this same Markdown representation.

JSON export uses `schemaVersion = 1` and contains:

- app name / version and generation time
- Before / After file name, size, format, schema source, row/sample information, and bytes read
- cross-format flag
- full summary
- every compared row, including unchanged rows
- stable change codes and match mode
- compatibility `level` and stable `reasonCode`
- localized `label` / `reason` for human inspection
- simplified Before / After field information including original and normalized types

Export filenames derive from the Before / After source filenames. Unsafe path/filename characters must be removed and long stems truncated. Generated report files are local Blob downloads and require no network access.

Swap is disabled and its action is guarded while either side has an in-flight schema or preview read, even if the preview is closed. Reopening a pending preview reuses that read. Success or failure restores availability; source replacement invalidates obsolete completions. A cancelled file picker preserves the current source.

When Before / After are swapped after an existing comparison, the app recomputes the diff immediately instead of returning to the empty result state.

## Declared vs inferred schema contract

### Parquet

- `source = declared`
- Nullability/repetition is read from Parquet metadata.
- Field IDs and logical types are file-defined metadata.
- Compatibility rules may use known widening/narrowing and repetition changes as guidance.

### CSV / TSV

- `source = inferred`
- Types come from observed values only.
- An empty value is an observed NULL candidate.
- No observed NULL does **not** imply a NOT NULL / Required constraint.
- A detected type change may reflect different sample data instead of a data-contract change.
- Changed inferred fields therefore default to `Review` in v0.7.0.

### JSONL / NDJSON

- `source = inferred`
- Each non-empty line must contain a JSON object.
- Object properties are flattened to dot-separated paths; arrays add `[]` to the path.
- Parent objects and arrays remain represented as `STRUCT` / `LIST`.
- JSON strings remain STRING; booleans and numbers use their intrinsic JSON value types.
- Explicit `null` and missing fields are tracked separately.
- No observed null/missing condition implies an explicit Required constraint.
- Changed inferred fields default to `Review`.

## CSV / TSV parser contract

The CSV / TSV path continues to use the small built-in RFC 4180-oriented streaming parser introduced in v0.4.0 rather than adding a runtime or npm parser dependency.

The parser must handle:

- comma and tab delimiters; CSV auto-detection also considers semicolon and pipe
- quoted fields
- delimiters inside quoted fields
- newlines inside quoted fields
- doubled-quote escaping
- CRLF, LF, and CR line endings
- UTF-8 BOM at the first field
- chunk boundaries inside quoted fields and UTF-8 multibyte text

The reader operates on `File.slice()` chunks and yields between chunks. For a finite sample limit it should stop once enough complete data rows have been observed.

## JSONL / NDJSON parser contract

The reader uses `File.slice()` plus streaming `TextDecoder` processing in 128 KB chunks. It preserves partial lines across chunk boundaries and handles UTF-8 BOM and CRLF / LF input. Blank lines are ignored.

A malformed JSON line or a root value that is not an object is a file-level error. The parser does not silently skip malformed records.

Nested inference rules:

- object -> `STRUCT`, with children at `parent.child`
- array -> `LIST`, with elements at `parent[]`
- object array child -> `parent[].child`
- null -> explicit `observedNull`
- property absent in a sampled object -> `observedMissing`
- empty array -> the `parent[]` element path is absent for that object

The reader stops after the selected 20,000 / 100,000 sample limit unless All rows is selected.

## CSV / TSV inference rules

Per-value classification:

1. Empty trimmed value -> `NULL`
2. `true` / `false` -> `BOOLEAN`
3. Signed integer within INT32 range -> `INT32`
4. Other integer -> `INT64`
5. Finite decimal / exponent number -> `FLOAT64`
6. ISO-like `YYYY-MM-DD` -> `DATE`
7. ISO-like date-time -> `TIMESTAMP`
8. Otherwise -> `STRING`

Column merging:

- NULL does not replace a non-NULL type but marks `observedNull = true`.
- INT32 + INT64 -> INT64.
- Integer + FLOAT64 -> FLOAT64.
- Incompatible mixed types -> STRING.

Header names must be non-empty and unique in the normalized schema. Blank or duplicate names receive deterministic generated/suffixed names. Reserve all normalized, nonempty explicit header names before assigning generated names or suffixes, even if the explicit name occurs later. Preserve every column and its preview value, including literal names such as `__proto__`. Identical inputs must compare with zero changes; real changes must retain their own unique field identity.

## Format comparison contract in v0.7.0

All supported format pairs are comparable:

- Parquet <-> Parquet
- CSV <-> CSV / TSV
- JSONL <-> JSONL / NDJSON
- Parquet <-> CSV / TSV
- Parquet <-> JSONL / NDJSON
- CSV / TSV <-> JSONL / NDJSON

Field matching still uses normalized field paths. Unique Field-ID rename matching is used only when both sides are declared Parquet schemas; inferred formats do not invent Field IDs.

## Cross-format normalization contract

Cross-format comparison separates **display/original type** from **normalized type**. Original Parquet physical/logical details remain visible in the result, but type equality across different formats uses the normalized signature.

Core normalized mappings include:

- Parquet UTF8 / STRING logical type -> `STRING`
- Parquet `INT32` / `INT64` -> `INT32` / `INT64`
- Parquet logical signed/unsigned integers -> matching `INT8`, `INT16`, `INT32`, `INT64`, `UINT8`, `UINT16`, `UINT32`, or `UINT64`, using the decoded logical type object’s `bitWidth` and `isSigned` attributes. Equivalent legacy converted types keep the same normalized mapping.
- Parquet `FLOAT` / `DOUBLE` -> `FLOAT32` / `FLOAT64`
- Parquet DATE -> `DATE`
- Parquet TIMESTAMP variants -> `TIMESTAMP`
- Parquet TIME variants -> `TIME`
- Parquet Decimal -> `DECIMAL`
- nested Parquet / JSON object -> `STRUCT`
- list / array -> `LIST`
- Parquet MAP remains `MAP`
- inferred CSV / TSV / JSONL primitive and structure types use their existing inferred type as the normalized type

Normalization is intentionally conservative:

- JSON strings are still `STRING`; a JSON string that looks like a date or timestamp is not reinterpreted as `DATE` / `TIMESTAMP`.
- Decimal is not treated as equivalent to inferred `FLOAT64` because precision/scale semantics are not available from CSV / JSON numbers.
- JSON objects are `STRUCT`, not automatically `MAP`.
- Unsigned Parquet integer semantics are not erased merely because observed text values happen to fit a signed inferred type.

Nullability/requiredness is also conservative across declared and inferred sources. No observed NULL in an inferred file never proves `Required`. A mixed declared/inferred comparison only reports a nullability conflict when the declared side is `REQUIRED` and the inferred side actually observes NULL or missing values.

## Parquet matching contract

Field matching is directional from Before to After.

1. If a Field ID exists and is unique on both sides, the matching Field ID is used first.
2. Otherwise, the normalized field path is used.
3. Similar names alone are never treated as a rename.
4. Duplicate Field IDs are excluded from rename matching and fall back to field-path matching.

A field-path change matched by the same unique Field ID is reported as `Renamed`, not as an unrelated Removed + Added pair.

## Compatibility guidance

The Compatibility Engine is guidance, not a guarantee.

For declared Parquet schemas:

- **Potentially breaking**: field removal, Required field addition, Optional -> Required, structural changes, known numeric narrowing, Decimal precision decrease.
- **Review**: Field-ID rename, Field ID change, Decimal scale change, timestamp semantic changes, and type changes without a known widening/narrowing rule.
- **Likely compatible**: Optional field addition, Required -> Optional, known integer/float widening, Decimal precision increase without a scale change.
- **Info**: low-impact informational changes when implemented.

For inferred CSV / TSV / JSONL / NDJSON schemas, any detected change is `Review` in v0.7.0 because the schema is inferred from observed data. The same conservative rule applies to a cross-format row whenever either side is inferred.

## Parquet implementation

The metadata/schema path and compact preview path are adapted from hyparquet 1.30.0 (MIT), upstream commit `f01340277ec2d4ad2e96a7629c30d04fb54a9e15`.

The app reads the Parquet footer using a `File.slice()` backed AsyncBuffer-style adapter. Schema extraction must not call `file.arrayBuffer()` on the complete file.

Initial schema loading remains metadata-only. Row-group/page data is read only after the user explicitly opens the first-10-row preview. The compact preview path handles Uncompressed, Snappy, Gzip, LZ4, and LZ4_RAW directly; browser-native Brotli / Zstandard decompression may be used when available. Unsupported preview codecs must fail only the preview and must not block schema comparison.

## Privacy and network contract

- User files are not uploaded.
- Runtime `fetch`, XHR, WebSocket, EventSource, analytics, telemetry, external fonts, and CDN imports are not required.
- CSP keeps `connect-src 'none'`.
- The release HTML must work with no network access.

## UI requirements

- Follow the current `htmlapps-template` visual tokens and spacing.
- Brand color: `#16624F`.
- Canonical favicon and top-left app icon use the same SVG.
- 320px and wider supported.
- No horizontal page scrolling on mobile.
- Long file names and field paths wrap or truncate safely.
- Nested fields remain understandable on smartphones.
- Drop zones are keyboard operable.
- Status changes use `aria-live`.
- Change type is never communicated by color alone.


### Parquet preview zero-row handling

- Treat a Parquet file as empty only when its metadata and row-group hints both indicate zero rows.
- If row-count hints are absent or inconsistent but decoded column data is present, derive the preview row count from decoded rows instead of showing an empty state.
- If row data cannot be matched or decoded, show a preview error rather than the misleading “no data rows” message.
- The primary `before.parquet` / `after.parquet` fixtures include 12 real rows so the preview path is covered by ordinary regression data.

## Acceptance criteria for v1.0.0

1. `app.config.json`, the visible version badge, build manifest, report version, screenshots, and release documentation identify the app as v1.0.0.
2. The public UI no longer contains the “現在確認する差分 / Current comparison scope” section or its release-development cards.
3. Before / After Parquet comparison detects the primary fixture's INT32→INT64 type change, removed `amount`, and added `country` while preserving unchanged fields.
4. Nested STRUCT / LIST / MAP, Decimal precision/scale, nullability, Field ID, unique-ID rename, and duplicate-ID ambiguity regressions remain correct.
5. Dictionary-encoded Decimal preview values such as `0.0000`, `12.3400`, and `-0.5000` render without BigInt conversion errors.
6. True zero-row Parquet files remain distinguishable from preview decode errors; non-empty primary fixtures render exactly 10 preview rows.
7. CSV / TSV delimiter, quoting, header, NULL observation, sampling, malformed-input recovery, and first-row preview paths remain functional.
8. JSONL / NDJSON nested objects/arrays, explicit null vs missing, BOM/CRLF, chunk-boundary, malformed-input recovery, sampling, and preview paths remain functional.
9. Cross-format comparisons preserve conservative normalized-type rules across Parquet, delimited text, and JSON Lines formats.
10. Search, no-match state, filters, Before / After swap, Markdown copy/download, and JSON download operate without mutating the stored full comparison result.
11. Japanese / English switching remains functional; desktop, 390 px, and 320 px layouts have no page-level horizontal overflow; wide previews scroll only inside their preview container.
12. JavaScript emits no unexpected page errors during covered regression scenarios and no HTTP(S) runtime request is made by the app.
13. `dist/index.html` contains no unresolved build placeholders or external runtime script references, embeds the canonical favicon/icon, and keeps CSP `connect-src 'none'`.
14. `dist/index.self-extract.html` restores `dist/index.html` byte-for-byte and performs no runtime network request during unpacking.
15. README.md and README.ja.md retain the Browser Kitty repository-style structure and describe only behavior implemented in v1.0.0.

## Acceptance criteria for v0.9.0

1. `app.config.json`, the visible version badge, build manifest, report version, and release documentation identify the app as v0.9.0.
2. Before / After Parquet comparison detects the primary fixture's INT32→INT64 type change, removed `amount`, and added `country` while preserving unchanged fields.
3. Nested STRUCT / LIST / MAP, Decimal precision/scale, nullability, Field ID, unique-ID rename, and duplicate-ID ambiguity regressions remain correct.
4. Dictionary-encoded Decimal preview values such as `0.0000`, `12.3400`, and `-0.5000` render without BigInt conversion errors.
5. True zero-row Parquet files remain distinguishable from preview decode errors; non-empty primary fixtures render exactly 10 preview rows.
6. CSV / TSV delimiter, quoting, header, NULL observation, 20k/100k/all sampling, malformed-input recovery, and first-row preview paths remain functional.
7. JSONL / NDJSON nested objects/arrays, explicit null vs missing, BOM/CRLF, chunk-boundary, malformed-input recovery, sampling, and preview paths remain functional.
8. Parquet↔CSV/TSV, Parquet↔JSONL/NDJSON, and delimited-text↔JSONL/NDJSON cross-format comparisons preserve conservative normalized-type rules; equivalent nested fixtures compare without differences.
9. Search, no-match state, all result filters, Before / After swap, Markdown copy, Markdown download, and JSON download operate without mutating the stored full comparison result.
10. Japanese / English switching remains functional and user-visible technical/privacy wording stays factual.
11. Desktop, 390 px, and 320 px layouts have no page-level horizontal overflow; wide previews scroll only inside their preview container, and the help dialog fits/scrolls within the mobile viewport.
12. JavaScript emits no unexpected page errors during the covered regression scenarios and no HTTP(S) runtime request is made by the app.
13. `dist/index.html` contains no unresolved build placeholders or external runtime script references, embeds the canonical favicon/icon, and keeps CSP `connect-src 'none'`.
14. `dist/index.self-extract.html` restores `dist/index.html` byte-for-byte and also performs no runtime network request during unpacking.
15. README.md and README.ja.md follow the Browser Kitty repository-style structure used by html-pdf-organizer while describing only Schema Diff behavior that is actually implemented.

## Acceptance criteria for v0.8.0

1. Existing Parquet, CSV, TSV, JSONL, NDJSON, cross-format, Compatibility Engine, filtering, and export regressions remain green.
2. Empty results guidance changes correctly for no files, one-sided input, loading, error, and ready-to-compare states.
3. A loaded file with a very long name does not create horizontal scrolling at 320 px or 390 px.
4. Both ready schemas show an explicit ready message and enable comparison.
5. On mobile, the fixed bottom compare action appears only when both schemas are ready and no result is displayed.
6. While that mobile action is visible, the in-workspace compare button is hidden to avoid duplicate primary actions.
7. After comparison, the mobile fixed action disappears and result content is not covered by persistent bottom UI.
8. Main mobile action targets are at least 44 px high.
9. Desktop report controls remain available while scrolling long result sets; mobile report controls remain static and compact.
10. Help dialog remains fully inside a 390 x 844 viewport.
11. Reduced-motion users are not forced to see a continuously rotating loading indicator or smooth result scrolling.
12. Runtime HTTP(S) requests remain zero during file processing and comparison.
13. `dist/index.html` remains self-contained and the self-extract build restores it byte-for-byte.
14. Japanese and English UI, Before/After swap, error recovery, identical-schema state, and Markdown/JSON export continue to work.


## Acceptance criteria for v0.7.0

1. All v0.5.0 JSONL / NDJSON behavior, v0.4.0 CSV / TSV behavior, and v0.3.0 Parquet behavior remain correct.
2. Any pair of supported formats can enable **Compare schemas** once both schemas load successfully.
3. Parquet `STRING · BYTE_ARRAY` and inferred `STRING` compare equal across formats through normalized type `STRING`.
4. Parquet `DOUBLE` and inferred `FLOAT64` compare equal across formats; Parquet `FLOAT` remains distinct from `FLOAT64`.
5. Parquet `DATE` / `TIMESTAMP` compare equal with CSV values inferred as DATE / TIMESTAMP.
6. JSON strings that look like dates/timestamps remain STRING and therefore remain different from Parquet DATE / TIMESTAMP.
7. Equivalent nested Parquet STRUCT / LIST paths and JSONL object / array paths compare without false structure/type differences.
8. CSV / TSV <-> JSONL / NDJSON comparison does not create a false nullability difference merely because only JSONL tracks missing fields.
9. A declared Required field versus an inferred field with observed NULL/missing is reported conservatively as Review.
10. Cross-format comparisons do not generate Field ID changes just because an inferred side has no Field IDs.
11. Field-ID rename inference remains limited to declared Parquet <-> Parquet comparison with unique IDs on both sides.
12. Cross-format changed rows involving any inferred side use `Review` compatibility guidance rather than asserted breaking/compatible labels.
13. Cross-format result cells show normalized type information while retaining the original format-specific type display.
14. The results subtitle explicitly states the format direction for normalized cross-format comparisons.
15. Same-format Parquet continues to use detailed physical/logical signatures so v0.7.0 normalization does not weaken prior Parquet diff fidelity.
16. Existing CSV / TSV and JSONL sampling, parser error recovery, nested/missing/null behavior, and large-file early-stop behavior remain correct.
17. Japanese and English labels remain understandable on desktop and mobile.
18. 320px and 390px layouts have no page-level horizontal scrolling and the Help dialog stays within the viewport.
19. Runtime network requests remain zero and CSP keeps `connect-src 'none'`.
20. `dist/index.html` and `dist/index.self-extract.html` remain valid single-file artifacts.
21. No DuckDB-Wasm or other WASM runtime is included.
