# AWS Organization / IAM Identity Center(2026年9月〜、まだ用途未定)

paibotの現在のインフラ(`infra/README.md`参照)はCloudflare/Terraformのみで、AWSは一切使っていない。以下はあくまで「今後使う可能性がある」ため作成したアカウント周りの記録。

## 構成

- **Organization管理アカウント**: `admin@paibot.co.jp`。課金・アカウント作成用で、日常作業には使わない。
- **メンバーアカウント**: `paibot-app-dev`(アカウントID `126517272863`)。オーナーのメールアドレスは`sanofc@gmail.com`。
- **IAM Identity Center**: 有効化済み。
  - SSO start URL: `https://paibot.awsapps.com/start`
  - リージョン: `ap-northeast-1`
- **ユーザー**: 現状`sanofc@gmail.com`のみ。`paibot-app-dev`アカウントに`AdministratorAccess`権限セットで割り当て済み。

## ローカルCLI設定(`~/.aws/config`)

```
[sso-session paibot]
sso_start_url = https://paibot.awsapps.com/start
sso_region = ap-northeast-1
sso_registration_scopes = sso:account:access

[profile paibot-app-dev-admin]
sso_session = paibot
sso_account_id = 126517272863
sso_role_name = AdministratorAccess
region = ap-northeast-1
```

このファイル自体は非機密情報(接続先の指定のみ)。誰がログインできるかはIAM Identity Center側のユーザー登録・アカウント/ロール割り当てで決まり、`~/.aws/config`の内容を知っているだけではアクセスできない。

- トークン切れたら再ログイン: `aws sso login --sso-session paibot`
- 使うとき: `aws --profile paibot-app-dev-admin <command>`

## 使う場面が具体化したら検討すること

- CI(GitHub Actions)からAWSを触る必要が出たら、SSOはブラウザ認証前提なのでそのままは使えない。OIDC連携(推奨、長期キー不要)か、用途限定の専用IAMユーザー+アクセスキーをSecretsに登録する方式を検討する(Cloudflare側の`CLOUDFLARE_API_TOKEN_TERRAFORM`のようなトークン分離の考え方を踏襲)。
- 複数人でアクセスする必要が出たら、IAM Identity Centerでユーザー追加・グループ単位での権限割り当てを検討する(個人ごとに手でアサインするのではなく)。
- `sanofc@gmail.com`ユーザーへのMFA設定はまだ。実際に本番相当のリソースを置く前には設定した方がよい。
- 利用するAWSサービス・目的が決まったら、`docs/plans/`配下に具体的な計画ドキュメントを作り、`CLAUDE.md`の「進行中の計画」に追記する。
