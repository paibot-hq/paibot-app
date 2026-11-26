# paibot-app を公開する

目的は透明性。今のリポジトリ(`paibot-hq/paibot-app`)をそのまま Public にする。履歴は書き換えない。

## 決めたこと(2026-11-13)

- 既存の履歴と PR に残る作者の本名とメールアドレスは、そのまま公開してよい。本名は GitHub のプロフィールと公開済みの
  ほかのリポジトリにすでに出ている。
- 過去の版に残るアカウント ID や会社のメールアドレスも、履歴を書き換えないので公開される。今のファイルからは外す。
- ライセンスはコードが MIT、コンテンツ(問題・文章・画像・文書)が CC BY-NC 4.0、名前とロゴは対象外(`LICENSING.md`)。
- Astro への移行はしない(公開とは別の話)。

## 済んだこと

- PR #244: Terraform の plan ファイルを Actions の artifact にしない、Infra Apply を main だけから、開発依存の脆弱性の更新、
  Claude の実行記録は private の間だけ、fork からの PR は秘密値の要らないジョブだけ、学習履歴の e2e。
- この PR: `LICENSE`、`LICENSING.md`、`SECURITY.md`、README の冒頭。運用メモ(`docs/infra/`)をリポジトリの外へ移し、
  ほかの文書からメールアドレスとアカウント ID を外した。リポジトリ直下のスクリーンショット(`tabs-*.png`)を削除。

## 残り

1. `infra/access.tf` の許可メールアドレスを Terraform 変数(GitHub の Variables の `DEV_ACCESS_EMAILS`)に移す。インフラの
   変更なので別 PR にする。先に Variables を登録し、plan が「変更なし」になることを確かめてからマージする。
2. 公開直前の検査: 今のファイルと全履歴の Gitleaks、メールアドレスと ID の検索。
3. GitHub の設定(所有者が行う):
   - `infra-apply` Environment: 承認者と、main だけのブランチ制限(`infra/README.md`「`infra-apply`環境の設定」)。
     private の間に付けられなければ公開直後に。
   - main のルールセット: force push と削除の禁止、PR 必須(管理者は迂回可)。
   - 残っている artifact の削除(Claude の実行記録)。
   - fork からの PR: 初めての貢献者は承認が必要。`pull_request_target` は使わない。
   - Secret scanning と push protection、Dependabot alerts、Private vulnerability reporting(`SECURITY.md` が案内する)を有効に。
   - Public に切り替える。
4. 公開後:
   - 最初の Infra Apply で、R2 経由の plan の受け渡しを確かめる。
   - R2 の `paibot-app/plans/` に数日の期限(ライフサイクルルール)を付ける。
   - fork からの PR で、`static` と `sympy` だけが動くことを確かめる。
   - (任意)サイトに、作り方とリポジトリへのリンクを載せる。

## 公開してから気をつけること

- ログ、ステップサマリー、artifact は誰でも読める。`Infra Plan` / `Infra Apply` のサマリーには `terraform show` の出力
  (sensitive 以外の属性)が出る。
- `breaches-update.yml` は公開後、Claude の実行記録を残さない。調べるときは手元で同じプロンプトを動かす。
- 課金(Stripe)を入れるときは、秘密値を Workers Secrets に置き、Webhook の署名検証、金額と権利の判定をサーバーで行う。
  ブラウザだけで動く機能は有料にしても守れない。
