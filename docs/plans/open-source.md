# paibot-app を公開する前に決めること

2026-11-13 時点。公開前の再確認(秘密情報・Clerk・CI のレビュー)で、コードと CI の側で直せることはこの文書を足した PR で直した。
残りは所有者が決めることで、ここにまとめる。**リポジトリを Public にすること、Git 履歴の書き換え、本番インフラの移行は、
それぞれ具体的な変更案を確認してから別の作業として行う。**

## この PR で直したこと

- Terraform の plan ファイルを Actions の artifact にしない(`infra-apply.yml`)。state 用 R2 バケットに置き、apply ジョブで
  SHA-256 を確かめて使い、終わったら消す。手順は `infra/README.md`。
- `Infra Apply` は `main` から実行したときだけ動き、`ref` が `main` に入っていないコミットなら止まる。apply は plan と同じ
  コミットを使う。
- 開発依存の既知脆弱性(vite、wrangler → miniflare → undici)を更新。`npm audit` 0 件。
- `breaches-update.yml` の Claude の実行記録(読んだページ・コマンド出力を含む)は、リポジトリが private の間だけ artifact に残す。
- fork からの PR は秘密値を受け取らないので、`App (development)` では `static` と `sympy` だけ動き、Clerk の鍵がないと
  ページが 500 になる `e2e` と `browser` は飛ばす。
- 学習履歴の e2e(`tests/e2e/math-history.mjs`)の古い要素指定を直した(保存通知に `data-math-save`、カードは `data-playable`)。

## GitHub の設定(所有者が行う)

| 項目 | 今 | 案 |
| --- | --- | --- |
| `infra-apply` Environment | 承認者なし・ブランチ制限なし | 承認者に所有者、`main` のみ。コマンドは `infra/README.md`「`infra-apply`環境の設定」。Team プランの private リポジトリでは承認者を付けられない可能性があり、その場合は公開後に設定する |
| `main` のブランチ保護 / ルールセット | なし | 公開時に、force push・削除の禁止と PR 必須(管理者は迂回可)を入れるか決める |
| fork PR のワークフロー承認 | private のため fork 不可 | 公開後は「初めての貢献者は承認が必要」(GitHub の既定)以上にする。`pull_request_target` は使わない |
| Actions の許可範囲 | すべてのアクションを許可、SHA 固定なし | 公開を機に、GitHub 製と認証済みの作者に絞るか、サードパーティを SHA で固定するか決める |
| artifact とログ | private なので関係者のみ | 公開後はログ・ステップサマリー・artifact が誰でも読める。`Infra Plan` / `Infra Apply` のサマリーには `terraform show` の出力(sensitive 以外の属性)が出る |

## 個人情報

- **コミットの作者**: 履歴のほぼすべてのコミットの作者が本名と個人メールアドレス。公開すると誰でも見える。隠すには
  履歴の書き換え(作者の置き換え)が要る。書き換えると全コミットの SHA が変わり、リリースのタグ、`app-production.yml` で
  ロールバックに使う過去の ref、開いている PR・worktree がすべて影響を受ける。書き換えるか、別リポジトリに新しい履歴で
  出し直すか、このまま出すかを決める。
- **ファイル中のメールアドレス・アカウント情報**: `infra/access.tf`、`infra/README.md`、`docs/architecture.md`、
  `docs/infra/{aws,cloudflare,gcp}.md`、`docs/archive/next-vinext-notes.md`、`docs/plans/problemset.md` に個人と会社の
  メールアドレスがある。`docs/infra/` にはさらに AWS のアカウント ID、GCP の Organization ID と Cloud Identity の顧客 ID、
  個人の Cloudflare アカウント ID がある。案:
  - `infra/access.tf` の許可メールは Terraform 変数(GitHub の Variables から渡す)に移す。これは本番インフラの設定変更なので、
    plan を確認してから別 PR で行う。
  - `docs/infra/` は運用者向けのメモなので、公開リポジトリから外す(非公開の場所に移す)。
  - 現行ファイルから消しても履歴には残る。履歴から消すかは、上のコミット作者と一緒に決める。
- 確認時点で、秘密鍵・トークンのコミットは見つかっていない(Gitleaks、全履歴)。

## ライセンス

- リポジトリに `LICENSE` がなく、`package.json` は `"private": true`。ライセンスがなければ、公開しても他者に利用の権利はない。
- 決めること:
  1. コードのライセンス(例: MIT / Apache-2.0 / AGPL-3.0)。
  2. コード以外を同じライセンスにするか、分けるか。
     - 問題データ(`src/data/math-*.json`、`item-formulas.json`)と解説文: LLM で生成し、SymPy とレビューで確かめたもの。
     - 翻訳・説明文(`messages/*.json`)、記事やページの文章。
     - 画像: `public/goldfish/`(Blender で自前に生成)、アイコン・OG 画像、リポジトリ直下の `tabs-*.png`(スクリーンショット。
       不要なら消す)。
  3. 名前とロゴ(PAIBOT)をライセンスの対象外にするか(商標として扱うか)。
- 依存ライブラリは npm の各パッケージのライセンスに従う。ビルド成果物を配るわけではないので、通常は `NOTICE` を
  まとめる必要はないが、同梱しているもの(`public/linux/NOTICE.md` の v86・xterm.js など)はそのまま残す。

## 第三者のデータ・素材

| データ | 出どころ | 確認すること |
| --- | --- | --- |
| `src/data/govfaq.json`、`public/govfaq-vectors.bin` | 総務省 Govbot FAQ(Excel) | 政府標準利用規約(第2.0版、CC BY 4.0 互換)の対象か、出典表示の書き方。リポジトリで再配布してよいか |
| `src/data/breaches.json` | 報道・各組織の公表を Claude が要約 | 要約と出典リンクのみで、記事本文の転載がないこと |
| Linux 端末のブートイメージ | v86 の配布先から閲覧者が直接取得 | リポジトリに含まれていない(`public/linux/NOTICE.md`) |
| 金魚の質感 | `scripts/goldfish/` で自前に生成 | 第三者の素材を使っていないことを作者が確認 |

ここに挙げた以外の素材の権利関係は、今回は確認していない。

## 運用

- `breaches-update.yml`: 公開後は Claude の実行記録が残らない。調べたいときは、private の fork か手元で同じプロンプトを
  動かすか、記録を非公開ストレージ(R2 など)に送る仕組みを足す。
- 承認されずに終わった `Infra Apply` の plan ファイルは R2 に残る。R2 のライフサイクルルールで `paibot-app/plans/` に
  数日の期限を付けるか決める。
- `CLOUDFLARE_ACCOUNT_ID` などの非機密の ID は README に載っている。公開してよい前提で書かれているが、改めて確認する。
