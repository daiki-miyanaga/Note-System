# v0.1.0 – Initial docs-aligned release

Date: 2025-09-08

## Highlights
- Add finalized design document: `設計ドキュメント_final.md` aligned with `仕様書.md`.
- Standardize data keys, tax handling (UI/CSV tax-inclusive), and formulas.
- Define CSV format (UTF-8 BOM, RFC4180 escaping) and storage/versioning.
- Add validation rules, performance targets, and test strategy.

## Changes
- docs: add 設計ドキュメント_final.md (finalized design aligned to spec)
- chore: commit local modifications
- chore: commit remaining changes

## Upgrade Notes
- No breaking storage changes for v1. New localStorage key schema documented (`wns.v1.day.<storeId>.<date>`).

## How to verify
- Open the HTML prototypes and confirm UI matches the final spec.
- Export CSV and verify column order/types and encoding in Excel.
- Confirm local save/load and behavior of recalculation and drawer.

