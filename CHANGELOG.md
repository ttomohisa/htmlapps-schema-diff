# Changelog

## 1.0.3 - 2026-10-09

- Normalize the canonical icon brand green to #16624f while preserving the supplied artwork and exact 25% corner radius.
- Rebuild matching header, favicon, download alias, and self-extract artifacts.

## v1.0.2 - 2026-10-09

- Apply the supplied redesigned icon to the canonical SVG asset, app header, and embedded favicons across standalone releases.
- Preserve the original SVG artwork and viewBox; add regression checks for asset and release icon parity.

## v1.0.1 - 2026-10-06

- Standardize EN / JA header targets with localized accessible names and titles. Preserve the existing local-processing badge and Help localization.
- Synchronize canonical metadata and standalone header versions at v1.0.1.
- Add source, readable, root-download, and decompressed self-extract header regressions without changing data processing or responsive visibility.

- Add a Japanese / English Renamed display filter that intersects field-path search while preserving full Markdown / JSON exports and existing unique-Field-ID matching.
- Fix Parquet logical INTEGER normalization to preserve all eight signed / unsigned widths instead of reading attributes from the type-name string; keep conservative cross-format differences.
- Add synthetic Parquet metadata fixtures and native parser, localized rendering, full-export, and integer normalization regressions across all generated variants.

- Preserve every CSV / TSV column with deterministic collision-free header names, reserving explicit suffix names before generated names. Literal prototype-like names also retain their preview values.
- Disable and guard Before / After swap while schema or preview reads are pending; reopening a pending preview reuses its read. Completed swaps, error recovery, replacement guards, and reversed comparisons remain available.
- Add native-File parser, preview, report, format-fixture, and lifecycle regressions to repository verification, plus tracked download alias and self-extract parity checks.

## [1.0.0] - 2026-09-08 - Formal release

- Promoted the validated v0.9.0 release candidate to the formal v1.0.0 release without expanding the supported-format scope.
- Removed the release-development “Current comparison scope / 現在確認する差分” section from the public UI.
- Re-ran the full Parquet, CSV, TSV, JSONL, NDJSON, cross-format, Compatibility Engine, Field-ID matching, preview, filtering, reporting, language, and responsive-layout regression suite.
- Re-verified dictionary-encoded Decimal preview handling and true zero-row Parquet behavior.
- Re-verified CSP runtime-network blocking, embedded favicon/icon consistency, standalone output, and self-extract byte-for-byte restoration.
- Updated versioned build metadata, reports, screenshots, and release documentation to v1.0.0.

## [0.9.0] - 2026-09-08 - Release candidate and full regression

- Promoted Schema Diff to the v0.9.0 release-candidate milestone without expanding the supported-format scope.
- Re-ran end-to-end regression across Parquet, CSV, TSV, JSONL, NDJSON, cross-format normalization, Compatibility Engine, Field-ID rename matching, previews, search/filters, reports, language switching, and responsive layouts.
- Re-verified the dictionary-encoded Parquet Decimal preview regression introduced in v0.8.3.
- Re-verified true zero-row Parquet handling and 12-row primary Parquet fixtures introduced in v0.8.2.
- Re-verified runtime-network blocking, CSP, embedded favicon/icon consistency, standalone output, and self-extract byte-for-byte restoration.
- Rewrote README.md and README.ja.md to follow the Browser Kitty repository style used by html-pdf-organizer while keeping Schema Diff claims implementation-specific and factual.
- Kept order-only change classification and broader Parquet preview codec support outside the release-candidate scope.

## [0.8.3] - 2026-09-08 - Parquet dictionary Decimal preview fix

- Fixed first-row Parquet preview failures such as `Cannot convert 0.0000 to a BigInt` for dictionary-encoded DECIMAL columns.
- Kept dictionary-page values in their raw physical representation and applied logical-type conversion once when materializing data-page values.
- Added defensive idempotency for already-converted Decimal, Date, and Timestamp preview values.
- Added `decimal-dictionary.parquet`, a dedicated regression fixture containing `0.0000`, `12.3400`, and `-0.5000`.
- Preserved schema comparison behavior, lazy preview loading, fully local processing, and zero runtime network access.

## [0.8.2] - 2026-09-08 - Parquet preview zero-row fix

- Fixed Parquet preview logic so inconsistent/missing row-count hints no longer produce a misleading empty preview when decoded rows exist.
- Changed positive-row Parquet preview failures to surface as preview errors instead of “No data rows”.
- Added a clearer schema-only message for genuinely empty Parquet files.
- Rebuilt the main `before.parquet` / `after.parquet` fixtures with 12 actual rows while preserving the 2 MB metadata-read regression padding.
- Verified the Parquet preview parser against Apache `alltypes_plain.parquet` and the existing GZIP preview fixture; the external Apache fixture is not bundled.

## [0.8.1] - 2026-09-08 - First-row data previews

- Added an independent, collapsible first-10-row preview to both Before and After file cards.
- Kept previews lazy so schema comparison does not read row data until a preview is explicitly opened.
- Reused the existing streaming CSV / TSV and JSONL / NDJSON readers for preview data.
- Extended the compact Parquet path with on-demand row-group/page decoding while keeping initial schema extraction metadata-only.
- Added Parquet preview handling for Uncompressed, Snappy, Gzip, LZ4, and LZ4_RAW, with browser-native Brotli / Zstandard attempted when available and a clear per-preview error otherwise.
- Cached preview results for the selected file and cleared them when the file is replaced.
- Added preview loading, empty, error/retry, and completed states with Japanese / English labels.
- Contained wide preview tables inside the file card so desktop and mobile pages do not gain horizontal overflow.
- While a phone preview is open, temporarily replace the fixed bottom Compare action with the normal in-flow action so the fixed bar cannot cover preview rows.
- Added a real 240-row / 9-column Gzip Parquet regression fixture for first-row preview coverage.
- Verified Before/After simultaneous previews, identical-schema comparison, CSV/JSONL preview regression, and 375 px mobile overflow containment in headless Chrome.
- Preserved fully local processing, CSP runtime-network blocking, the existing comparison engine, and report/export behavior.

## [0.8.0] - 2026-09-08 - UI / UX finish

- Added contextual empty/loading/error/ready result states so the next action is clear before comparison.
- Added comparison-readiness messaging that explains whether Before, After, loading completion, or file replacement is still required.
- Compactly redesigned loaded-file cards with a schema/file SVG, two-line long-file-name handling, and a clear Replace file action.
- Added a fixed bottom Compare schemas action on mobile when both files are ready, with safe-area padding and no duplicate primary action in the workspace.
- Restored the in-workspace compare action after a comparison so users can intentionally run the same comparison again without changing files.
- Raised key mobile action targets to at least 44 px and kept 320 px / 390 px layouts free of horizontal scrolling.
- Added desktop sticky report controls for long result sets while keeping the toolbar static on mobile.
- Moved toast feedback above the mobile bottom action when that action is active.
- Added reduced-motion handling for loading indicators and result scrolling.
- Updated the help/scope copy, Japanese/English UI, screenshots, and release documentation for v0.8.0.
- Preserved v0.7.0 report/export behavior, v0.6.0 cross-format comparison, prior inference/Parquet behavior, and zero-runtime-network processing.

## [0.7.0] - 2026-09-08 - Report and result operations

- Added field-path search across current, Before, and After paths, including rename rows.
- Added display filters for all fields, changed fields, added, removed, type changes, Potentially breaking, and Review.
- Added explicit no-match state and visible/total field counts without mutating the stored comparison result.
- Added Copy result using the same human-readable Markdown representation as Markdown export.
- Added Markdown report download with source details, full summary, compatibility counts, and changed fields.
- Added machine-readable JSON report download with schema version, source metadata, full summary, all compared fields, stable change codes, compatibility level/reasonCode, and simplified Before/After type information.
- Kept screen filters separate from exports so copy/Markdown/JSON always contain the full comparison.
- Added safe report filenames derived from the Before/After source filenames.
- Changed Before/After swap so an existing comparison is recomputed immediately instead of being cleared.
- Preserved the previous no-difference result UX while keeping report export available for identical schemas.
- Added desktop/mobile report-control layout, Japanese/English labels, and help text describing export behavior.
- Preserved v0.6.0 cross-format normalization, v0.5.0 JSONL behavior, prior CSV/TSV and Parquet behavior, single-HTML output, and zero-runtime-network processing.

## [0.6.0] - 2026-09-08 - Cross-format schema diff

- Enabled comparison across Parquet, CSV, TSV, JSONL, and NDJSON format groups.
- Added normalized type signatures so format-specific representations such as Parquet STRING/BYTE_ARRAY and inferred STRING compare as equivalent.
- Normalized Parquet DOUBLE to FLOAT64, DATE/TIMESTAMP logical forms to DATE/TIMESTAMP, signed/unsigned integer logical types, and STRUCT/LIST/MAP structure kinds.
- Preserved original format-specific type details in result cells and added normalized-type detail during cross-format comparison.
- Kept JSON strings as STRING; date-like JSON text is not silently reinterpreted as DATE/TIMESTAMP.
- Kept Decimal distinct from inferred FLOAT64 and JSON STRUCT distinct from Parquet MAP.
- Added conservative mixed declared/inferred nullability handling: no observed NULL never implies Required, while a declared Required field conflicting with observed NULL/missing is surfaced for review.
- Prevented inferred schemas from causing false Field ID changes and kept Field-ID rename matching limited to declared Parquet pairs.
- Fixed CSV <-> JSONL false nullability changes caused by absent missing-field metadata on delimited inputs.
- Added Parquet <-> CSV, Parquet <-> JSONL, CSV <-> JSONL, nested, temporal, and changed cross-format regression fixtures.
- Preserved v0.5.0 JSONL behavior, prior CSV/TSV and Parquet behavior, template-aligned responsive UI, single-HTML output, and zero-runtime-network processing.

## [0.5.0] - 2026-09-08 - JSONL / NDJSON schema inference

- Added JSONL and NDJSON input and schema inference.
- Added 128 KB streaming line reads with UTF-8 BOM, CRLF / LF, chunk-boundary, blank-line, and final-line handling.
- Added nested object and array paths such as `profile.email`, `tags[]`, and `items[].sku`.
- Added `STRUCT` / `LIST` parent nodes for inferred JSON structure.
- Added separate tracking for explicit `null` and missing fields.
- Kept JSON strings as STRING instead of coercing numeric-looking text.
- Added JSONL <-> NDJSON comparison while intentionally blocking cross-group comparison until v0.6.0.
- Added invalid-JSON and non-object-root rejection and recovery regression cases.
- Extended inferred-schema nullability comparison so changes in observed null/missing status are shown as Review.
- Verified 20,000-object sampling stops early on a 50,000-line fixture and All rows reads the complete file.
- Preserved v0.4.0 CSV / TSV and v0.3.0 Parquet behavior, responsive template-aligned UI, single-HTML output, and zero-runtime-network processing.

## [0.4.0] - 2026-09-08 - CSV / TSV schema inference

- Added CSV and TSV input alongside Parquet.
- Added chunked RFC 4180-oriented parsing with quoted fields, quoted newlines, escaped quotes, CRLF / LF / CR, and UTF-8 BOM handling.
- Added CSV delimiter detection, TSV tab handling, header auto-detection, and manual header override.
- Added 20,000 / 100,000 / all-row inference sample settings.
- Added inferred NULL, BOOLEAN, INT32, INT64, FLOAT64, DATE, TIMESTAMP, and STRING types with numeric widening.
- Kept inferred nullability distinct from Parquet Required / Optional constraints.
- Added conservative Review compatibility guidance for all inferred-schema changes.
- Added CSV <-> TSV comparison while intentionally blocking declared Parquet <-> inferred CSV / TSV until v0.6.0.
- Added column-count warnings, broken-quote handling, and CSV / TSV regression fixtures including a late-type-change sampling fixture.
- Preserved v0.3.0 Parquet behavior, template-aligned responsive UI, single-HTML output, and zero-runtime-network processing.

## [0.3.0] - 2026-09-08 - Compatibility Engine and Field-ID rename matching

- Added Field-ID-first matching when a Field ID is unique on both Before and After schemas.
- Added rename detection for field-path changes that preserve a unique Field ID.
- Added duplicate-Field-ID protection so ambiguous IDs never trigger rename inference.
- Added compatibility-impact guidance with Potentially breaking, Review, Likely compatible, and Info levels.
- Added rule handling for field removal/addition, nullability changes, known integer/float widening and narrowing, Decimal precision/scale changes, timestamp semantic changes, structural changes, and Field ID changes.
- Added short reasons beside each impact judgement while retaining the raw diff kinds.
- Added compatibility and duplicate-Field-ID regression fixtures.
- Preserved the v0.2.0 nested-schema behavior, metadata-only Parquet reads, template-aligned desktop/mobile UI, single-HTML build, and zero-runtime-network contract.

## [0.2.0] - 2026-09-07 - Complete Parquet schema comparison

- Added nested `STRUCT`, `LIST`, and `MAP` traversal with normalized field paths.
- Added separate comparison of Physical / Logical Types and `REQUIRED` / `OPTIONAL` / `REPEATED`.
- Added Decimal precision / scale display and diff detection.
- Added Field ID display and diff detection without enabling rename inference yet.
- Added structural-change detection and richer desktop/mobile schema detail cells.
- Added nested Parquet regression fixtures while preserving metadata-only 512 KB footer reads for the test files.
- Kept the v0.1.x simple schema comparison behavior, template-aligned UI, single-HTML output, and zero-runtime-network contract.

## [0.1.1] - 2026-09-07 - Template-aligned UI

- Re-aligned colors, spacing, typography, cards, buttons, header, footer, help dialog, and responsive behavior with the current htmlapps-template.
- Replaced the app icon and favicon with a template-tone schema comparison icon.
- Kept the Parquet metadata comparison behavior unchanged.
- Refreshed Japanese, English, and mobile screenshots.

## [0.1.0] - 2026-09-07 - Schema Diff MVP

- Replaced the starter application with Schema Diff.
- Added Before / After Apache Parquet inputs with file picker and drag & drop.
- Added metadata-only Parquet schema reading based on a pinned hyparquet 1.30.0 subset.
- Added top-level Added / Removed / Type Changed / Unchanged comparison.
- Added Japanese / English UI, responsive desktop/mobile result layouts, help, and Before / After swap.
- Kept fully local processing, `connect-src 'none'`, and single-HTML readable/self-extract release artifacts.
- Added regression fixtures that demonstrate footer-only reads on files larger than the 512 KB metadata window.

## Template history

## 1.3.0 - Build preflight, canonical app icon, and mobile help hardening - 2026-09-06

- Added `scripts/check-powershell-syntax.ps1` and run it before local / CI builds to catch parser errors before repository checks.
- The preflight also rejects BOM-less PowerShell source containing non-ASCII bytes, preventing Windows PowerShell 5.1 mojibake from turning localized strings into syntax failures.
- Added `assets/favicon.svg` as the canonical icon source. The readable build now embeds the exact same SVG payload for both the browser favicon and upper-left application brand icon, and verification rejects drift between them.
- Reworked the help dialog into a viewport-bounded flex layout with a dedicated scroll body and safe-area-aware bottom padding so long Japanese / English help remains reachable on smartphones.
- Documented `Set-StrictMode` collection normalization (`@(...)` before `.Count`) and expanded release / offline checks for the new guardrails.
- Kept canonical favicon/header-icon verification mandatory for real standalone builds while allowing explicitly marked synthetic verifier fixtures to omit product chrome.

## 1.2.2 - WebRTC DataChannel-ready connection gate - 2026-09-01

- Application `onConnected` now waits for both PeerConnection `connected` and the designated readiness DataChannel `open`.
- Added `readyChannelLabel` / `requireReadyChannelOpen` for custom DataChannel layouts.
- Added repository regression checks for the readiness contract.
- Updated bilingual WebRTC/component/template guidance.

## 1.2.1 - Dependency update check collection fix - 2026-08-31

- Fixed dependency collection normalization in `check-dependency-updates.ps1`, `sync-dependency-lock.ps1`, and `update-dependency.ps1`; an empty `dependencies.json` now remains a zero-length array under `Set-StrictMode` instead of becoming `$null`.
- Added repository regression coverage for both zero dependencies and a single disabled dependency without making npm network requests.

## 1.2.0 - Dependency lifecycle and Issue-based update monitoring - 2026-08-29

- Added committed `dependencies.lock.json` tarball SHA-256 locking and build-time mismatch rejection.
- Added `patch` / `minor` / `major` / `manual` dependency update policies without allowing scheduled jobs to change source automatically.
- Added local PowerShell commands to check updates, synchronize lock entries, and apply a reviewed update with asset validation, standalone build verification, and config/lock rollback on failure.
- Added a weekly GitHub Actions workflow that creates or refreshes one dependency maintenance Issue, closes it when no tracked updates remain, and never creates an automatic dependency pull request.
- Added bilingual dependency lifecycle documentation and updated security, architecture, contributor, README, and LLM guidance.

## 1.1.0 - Reusable fully serverless WebRTC QR pairing - 2026-08-29

- Added `components/webrtc-qr-pairing.html`, a reusable host/joining-device pairing UI and controller based on the connection flow hardened in Wireless Sensor v1.0.0.
- Added manual QR/copy signaling with `iceServers: []`, complete ICE gathering before QR generation, candidate diagnostics, stale-attempt cleanup, and delayed joining-side Answer creation.
- Added low-resolution camera handling, native `BarcodeDetector` with embedded `jsQR` fallback, chunked QR transfer, and pre-connect Answer regeneration.
- Added `examples/dependencies.webrtc-qr.json` with pinned `qrcode-generator` and `jsqr` assets for the standalone build pipeline.
- Added bilingual WebRTC pairing documentation, custom DataChannel hooks, protocol-prefix customization, privacy wording, limitations, and real-device release tests.
- Updated template guidance so future apps reuse the canonical WebRTC pairing component instead of rebuilding manual signaling from scratch.

## 1.0 - Smartphone bottom-tab page switching - 2026-08-24

- Extended `components/mobile-bottom-bar.html` with a canonical mobile page-tab mode using `data-mobile-page-target`.
- Added `.app-mobile-page` / `.is-mobile-active` behavior: smartphones show only the selected page while desktop keeps every section in normal document flow.
- Added `showPage()` / `currentPage()` APIs so app workflows can switch tabs programmatically.
- Kept the existing section-scroll (`data-mobile-target`) and workflow-action (`data-mobile-action`) modes for backward compatibility.
- Updated LLM/product guidance to prefer bottom-tab page switching for long smartphone tools that naturally divide into 3-5 groups.

## 1.0 - Browser-Kitty UX and asset pipeline hardening - 2026-08-20

- Removed the second Base64 layer around the complete embedded asset bundle; asset payloads are now Base64-encoded exactly once.
- Added per-asset `none` / `gzip` / `auto` compression, async decompression APIs, and per-asset original/stored byte metadata.
- Added `build-size-report.json` plus configurable warning-only readable/self-extract size budgets.
- Added reusable Toast + Undo, compact popover menu, preset + custom numeric setting, and async source-generation/state components.
- Updated starter export UX with a user-editable output filename, fixed extension handling, invalid-character sanitization, and fallback naming.
- Added template rules for source-change invalidation, stale async result rejection, explicit heavy-processing phases, mobile preview/control proximity, portrait media geometry/orientation, and compact advanced settings.
- Added finished-app README guidance and repository checks for the new components and asset-bundle contract.


## 1.0 - Reusable mobile bottom navigation / action bar - 2026-08-19

- Added `components/mobile-bottom-bar.html` as the canonical fixed smartphone navigation / workflow action pattern.
- Added safe-area-aware 3-5 item layout, icon + label controls, native disabled states, section scrolling, active-section tracking, and application action hooks.
- Documented when to use a bottom bar versus an in-flow primary button, including the pattern of enabling Save / Share only after a valid result exists.
- Updated LLM guidance, product UX guidance, bilingual README files, and repository checks so future apps discover and reuse the component instead of rebuilding it ad hoc.

## 1.0 - Portable PowerShell build verification - 2026-08-17

- Removed the builder's dependency on `Get-FileHash` and now calculate file SHA-256 hashes through the .NET cryptography API.
- Replaced `::new()` constructor syntax in self-extract build/verification scripts with older-compatible construction syntax.
- Changed standalone placeholder verification to reject only the real build placeholders instead of every `__UPPERCASE__` runtime identifier.
- Added repository regression guards so future template changes cannot reintroduce `Get-FileHash`, `::new()`, or the generic placeholder false positive.

## 1.0 - Self-extract loader robustness - 2026-08-17

- Made `scripts/build-self-extract.ps1` ASCII-only so Windows PowerShell 5.1 cannot corrupt Japanese loader text when the script is stored as BOM-less UTF-8.
- Encoded non-ASCII loader copy and application titles into ASCII-safe HTML character references / JavaScript Unicode escapes.
- Inherited the embedded favicon from the normal standalone HTML into `dist/index.self-extract.html`.
- Added regression checks for ASCII-only loader output, embedded favicon presence and exact favicon inheritance, and the existing byte-for-byte gzip payload restoration.
- Added a repository guard that rejects non-ASCII text in the self-extract builder source.

## 1.0 - Reusable mobile confirmation component - 2026-08-15

- Added `components/confirm-dialog.html`, a dependency-free Promise-based confirmation dialog.
- Added centered desktop and safe-area-aware smartphone bottom-sheet presentations.
- Added destructive-action styling, backdrop/Esc cancellation, keyboard focus handling, and focus restoration.
- Integrated the confirmation component into the starter Clear action as the recommended pattern.
- Added bilingual reusable-component documentation and updated LLM guidance to prefer it over `window.confirm()`.

## 1.0 - Self-extracting build - 2026-08-05

- Added `dist/index.self-extract.html`, generated by gzip-compressing the normal standalone HTML.
- Added native browser restoration with `DecompressionStream`, no runtime dependency, and no network access.
- Added byte-for-byte payload verification, size/hash manifest, CI artifact upload, and documentation.
- Kept `dist/index.html` as the default GitHub Pages entry point.

## 1.0 - Pages setup fix - 2026-08-05

- Prevented the first GitHub Actions run from failing when GitHub Pages has not been enabled yet.
- Added a Pages preflight check and a clear workflow summary with the one-time setup steps.
- Kept the generated standalone HTML available as a normal Actions artifact even when deployment is skipped.

## 1.0 - 2026-08-05

- Promoted the template to version 1.0.
- Removed the filled backgrounds and borders from the header language and help controls.
- Kept the compact bilingual help dialog and the PDF Organizer-inspired light interface.
- Added LLM guidance requiring help content to stay synchronized with application behavior.

All notable changes to this template are documented here.

## 0.3.0 - 2026-08-05

- Added a compact upper-right help button modeled after PDF Organizer.
- Added a bilingual native dialog for usage, privacy, limitations, and offline notes.

## [0.1.0] - 2026-08-04

### Added

- Generic single-HTML builder with exact npm package and asset embedding.
- SHA-256 dependency manifest.
- Runtime no-network Content Security Policy.
- Responsive bilingual starter interface with local persistence and export.
- GitHub Actions for build validation and GitHub Pages deployment.
- LLM implementation contract, product specification, architecture, and workflow guides.
