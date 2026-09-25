# CSSの配置

## 共通スタイル

`src/app/globals.css` は共通CSSの入口です。言語別レイアウトとglobal-not-foundから読み込みます。

| ファイル | 役割 |
| --- | --- |
| `theme.css` | 色・サイズの変数、ライト／ダークテーマ、box-sizing |
| `shared-controls.css` | 共通ボタン、認証・ダッシュボードのスタイル |
| `shell.css` | ページ背景、ヘッダー、ナビゲーション、mainの幅 |
| `content.css` | トップのヒーロー・カード、共通見出し・セクション・フッター |
| `responsive.css` | サイト共通の狭い画面向け上書き |

## ツール固有のスタイル：CSS Modules

まず共通の `ToolLayout` を使い、ツール固有の見た目だけをCSS Modulesに置きます。

| 共通部品・CSS | 役割 |
| --- | --- |
| `components/tool-layout.tsx` | main・見出し・本文の配置。通常は縦積み、`layout="centered"` は中央寄せ、`layout="spacious"` はゲーム向けの余白 |
| `components/tool-controls.module.css` | ラベル、切り替えボタン、数値入力、結果・記録表示、ゲームボタン |
| `components/text-converter.module.css` | Base64・URL変換共通の入力欄と変換結果 |

既存のツールと同じスタイルがあれば共通CSSを利用し、独自のCSSファイルは必要な場合だけ追加します。

```tsx
import ToolLayout from "./tool-layout";
import controls from "./tool-controls.module.css";

<ToolLayout title="ツール名">
  <p className={controls.label}>結果</p>
</ToolLayout>
```

- 新しいツールはコンポーネントと同じ場所に `.module.css` を作ります。`globals.css`への追加は不要です。
- クラスはビルド時に固有名へ変換され、他ツールとの名前の衝突を防ぎます。
- 条件付きクラスやDOM検索にも `styles` の値を使います。文字列で元のクラス名を組み立てないでください。
- 色などの共通値は `theme.css` のCSS変数を使います。
- 共通クラスに固有の状態を足す場合はCSS Modulesの `composes` も利用できます。例：計算練習の数値入力、反応速度テストのボタン。
- ツール固有のメディアクエリも各モジュール内に置きます。
- `auth-link` など共通クラスはグローバルのまま使います。
- 数式表示のスタイルは `math-tex.module.css` に置き、KaTeX自身のCSSと分けています。

CSS Modulesはクラス名を分離しますが、`h1`・`button`などのグローバルな要素セレクターは引き続き適用されます。共通ルールを変更した場合は、ツール画面とライト／ダーク両テーマも確認してください。
