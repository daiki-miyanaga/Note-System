# 開発フロー / コントリビュートガイド

## ブランチ運用
- `main` は常にデプロイ可能な安定ブランチ。
- 作業は必ずトピックブランチで行います。
  - `feature/<topic>` 新機能
  - `fix/<topic>` 不具合修正
  - `docs/<topic>` ドキュメントのみ
  - `chore/<topic>` 整備や微修正

## PR ルール
- `main` へ直接 push せず、必ず PR を作成します。
- タイトルは Conventional Commits/日本語のいずれかに準拠（例: `fix(yousei-notebook): 税込計算へ統一`）。
- テンプレート（pull_request_template.md）を埋め、影響範囲/テスト手順を明記。
- 少なくとも1名のレビュー承認（CODEOWNERSにより自動アサイン）。

## 仕様整合
- 表示/UIは日本語、データキーは lowerCamelCase。
- 税込表示が基本（内部は `priceEx`+`taxRate` を保持）。
- CSVはUTF-8(BOM)/RFC4180、列は設計ドキュメント_final.mdに準拠。
- 保存キーは `wns.v1.day.<storeId>.<date>`。

## テスト方針（簡易）
- 入力→再計算→保存→再読込で値が保持されること。
- 100行規模での入力応答(<100ms)と再描画(<300ms)を目安に確認。

