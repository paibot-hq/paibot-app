# Cloudflareアカウント管理

AWS(`docs/infra/aws.md`)・GCP(`docs/infra/gcp.md`)と違い、Cloudflareは既にpaibotの実インフラ(Worker/DNS等、`infra/README.md`参照)で本番運用中。ここでは「アカウントそのもの」の管理状況だけを記録する(リソース管理の詳細は`infra/README.md`)。

## アカウントが2つ存在する(混同注意)

`wrangler whoami`で見えるように、`sanofc@gmail.com`のログインには**2つの別アカウント**が紐づいている。

| アカウント名 | アカウントID | 用途 |
| --- | --- | --- |
| `Admin@paibot.co.jp's Account` | `b041431380f52e0bf2bb47b174e95b6a` | **paibotの実インフラ**。`paibot-app-dev` Worker、`paibot.app`ゾーン、Terraformが管理するAccess等はすべてこちら。`infra/README.md`の`CLOUDFLARE_ACCOUNT_ID`と同じ値。 |
| `Sanofc@gmail.com's Account` | `1e1c11bd55447a8839a8d9aed278b390` | `sanofc@gmail.com`個人のCloudflareアカウント。paibotとは無関係。`~/.aws/config`の`[profile R2]`(`endpoint_url`にこのIDが含まれる)はこちら側。 |

Wrangler/Terraformのコマンドを実行する際、意図せず個人アカウント側を触らないよう、`account_id`(Terraformは`variables.tf`、Wranglerは`wrangler.jsonc`)が正しい方(`b041...`)を指しているか都度確認すること。

## メンバー管理

- `admin@paibot.co.jp`がアカウントオーナー。
- `sanofc@gmail.com`が`Admin@paibot.co.jp's Account`にメンバーとして追加済み(`wrangler login`でOAuthログインし、Worker操作等ができることを確認済み)。**いつ・どの権限ロールで追加したかは未記録**。Cloudflareダッシュボード→Manage Account→Membersで確認・整理すること。
- ローカルCLI認証: `wrangler login`(OAuthトークン、`~/Library/Preferences/.wrangler/config/default.toml`に保存)。AWSのSSOセッションやGCPの`gcloud auth login`と同様、ブラウザ認証。

## Worker単位のアクセス制御(別レイヤー)

上記はCloudflareアカウントへの管理者ログインの話。それとは別に、`paibot-app-dev` Workerの**閲覧アクセス**はCloudflare Access(`infra/access.tf`)で`sanofc@gmail.com`のみに制限されている(セッション24時間)。アカウントメンバーシップとAccessポリシーは独立した設定なので、片方を変えてももう片方には影響しない。

## 認証情報(APIトークン)の詳細

`infra/README.md`の「認証情報の置き場所」節を参照。Terraform用(`CLOUDFLARE_API_TOKEN_TERRAFORM`)とWrangler/deploy-dev用(`CLOUDFLARE_API_TOKEN`)を意図的に分離済み。

## 使う場面が具体化したら検討すること

- 複数人でアカウントを触るようになったら、Membersのロール(Administrator/Super Administrator/カスタムロール等)を最小権限で見直す。
- 個人アカウント(`Sanofc@gmail.com's Account`)側のR2利用が増えてきたら、それも別途ドキュメント化するか検討する。
