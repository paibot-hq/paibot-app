# infra/ — CloudflareリソースのTerraform管理

意図的に最小限にしたTerraform構成です。何か触る前に、特に「まだやっていないこと」の節を読んでください。

## TerraformとWranglerの管理範囲

- **Wrangler**(`wrangler.jsonc`、`npm run build`/`deploy:vinext`、CIの`deploy-dev`ジョブ)が引き続き管理するもの: Worker本体、バインディング設定、vars、`compatibility_date`/フラグ、assets。ここでは一切触らない。
- **Terraform**が管理するもの: Wranglerでは管理しないアカウントレベルのCloudflareリソース。今はDNSゾーン(読み取り専用の参照)とdev WorkerのCloudflare Access、今後必要になり次第D1/R2/KVなど。
- **同じ対象を両方で二重管理しない。** TerraformがWorkerからバインドする必要のあるもの(D1データベース、R2バケットなど)を作ったら、`terraform output`でIDを取得し、それを**手で**`wrangler.jsonc`のバインディング設定に転記して、普通のレビュー可能な変更として反映する。この転記を自動化するスクリプトは作っていない — この規模で「コピペを自動化する」ことのリスク(意図しない場所に書き込む等)の方が、手間を省くメリットより大きいと判断した。**`dist/`配下のファイルは絶対に手で編集しない** — `vinext build`のたびに毎回生成し直される成果物なので。

## 現在の管理範囲(意図的に小さい)

1. **`paibot.app`ゾーンの読み取り専用データソース参照**(`infra/data.tf`)。このゾーンはTerraformが作ったものではなく(Cloudflare APIで確認済み、ステータス`active`)、`resource`ブロックを持たないので、Terraformが削除・再作成を提案することは原理的にありません。
2. **devのWorker(`paibot-app-dev`)を守るCloudflare Accessアプリケーション**(`infra/access.tf`)。`sanofc@gmail.com`のログインと、GitHub Actions用のService Tokenの両方を許可。この2つは**別々のポリシー**にしてある(`sanofc@gmail.com`用は`decision = "allow"`、Service Token用は`decision = "non_identity"`、ダッシュボード上の表示名は「Service Auth」)。1つの`allow`ポリシーの`include`にemailとservice_tokenを両方並べる書き方は誤り — service tokenにはそもそも検証できるアイデンティティが無いため、`allow`ポリシーはservice tokenだけのリクエストでもIdPログイン画面へのリダイレクトを止めない(実際のトラフィックで確認済み: 最初はこの誤った書き方でapplyし、`smoke-test-dev`のリクエストがCloudflareのログイン画面に静かにリダイレクトされ続ける不具合が発生した)。セッションは24時間。
   - 対象は`destinations`の`type = "worker"`(Worker単位)なので、カスタムドメイン(`dev.paibot.app`)・workers.dev・プレビューURLのすべてに掛かる。
   - Accessを`wrangler.jsonc`ではなくTerraformで持つ理由: Wranglerの`access`ブロックは`wrangler dev`でのID模擬用で、本番のAccess設定はできないため。
   - `worker_id`はWorkerの内部ID(名前ではない)。Workerを削除して作り直すと変わるので、その場合は`access.tf`の値を更新すること。取得方法は`access.tf`のコメントを参照。
   - `paibot-app-dev`のworkers.devは無効(APIで`enabled: false`を確認)。外からの入口は`dev.paibot.app`だけ。
   - **Service Token(`cloudflare_zero_trust_access_service_token.ci`)**: `.github/workflows/app.yml`の`smoke-test-dev`ジョブ(`deploy-dev`後、`https://dev.paibot.app`に対して`check:browser`をPlaywrightで実行する緩いスモークテスト)がAccessのログイン画面にリダイレクトされずに済むようにするためのもの。有効期限は`duration = "8760h"`(約1年、`forever`ではなく期限切れ前提)。`client_id`/`client_secret`は`infra/outputs.tf`の`ci_access_client_id`/`ci_access_client_secret`(いずれも`sensitive = true`)から`terraform output -raw <name>`で取得し、GitHub Secretsの`CF_ACCESS_CLIENT_ID`/`CF_ACCESS_CLIENT_SECRET`に登録する(CIのログには出力されない)。ローテーション時は再applyで新しい`client_secret`が発行されるので、同じ手順でSecretsを更新する。
3. **Clerk本番インスタンス用のDNSレコード**(`infra/dns.tf`)。`clerk deploy`が要求するCNAME5件(認証用カスタムドメイン+メール送信用DKIM)。`clerk deploy`実行時に生成されるBINDゾーンファイルの内容をそのまま`cloudflare_dns_record`として転記したもの。すべて`proxied = false`(Clerk自身がTLS終端するため、Cloudflareのプロキシを挟まない)。
4. **devのD1データベース**(`infra/d1.tf`、`cloudflare_d1_database.app_dev`)。お気に入り機能(issue #18)向けにD1を実際に使ってみる最初のトライアルで、機能ごとにデータベースを分けず、アプリ全体で1つを共用する方針(将来`/math`の問題集でも同じDBを使う想定)。今はdevのみ。本番用(`paibot-app`という名前を想定)は、devで検証できてから別途作る。
   - Terraformは`cloudflare_d1_database`リソース(D1データベースの存在)までを管理する。Workerからのバインディング設定自体は`wrangler.jsonc`の`d1_databases`(Wrangler管轄、上の「TerraformとWranglerの管理範囲」参照)なので、`terraform apply`後に`infra/outputs.tf`の`d1_app_dev_database_id`から`database_id`を**手で**転記すること。
5. **`www.paibot.app` → `paibot.app`のリダイレクト**(`infra/dns.tf`の`www`レコード + `infra/redirects.tf`)。`www`はCloudflareにプロキシされたCNAME(`proxied = true`)として登録し、`cloudflare_ruleset`(`http_request_dynamic_redirect`フェーズ、Redirect Rules)でパス・クエリ文字列を保ったまま301リダイレクトする。DNSレコードがプロキシされていないとRedirect Ruleがそもそも評価されない点に注意。

リソースは実際に必要になってから追加してください。実績作りのために先回りして作らないこと。

## ⚠️ まだやっていないこと・注意点

- **本番(`paibot.app`)向けのWorkerにはAccessを付けていない**(`access.tf`の対象は`paibot-app-dev`だけ)。本番公開の設計は`docs/plans/production-deploy.md`。
- **`use_lockfile`の同時実行(競合)は実証していません。** 前提となる「R2がPutObjectの条件付き書き込みをサポートしている」は、Cloudflare公式のS3 API互換性ドキュメント(https://developers.cloudflare.com/r2/api/s3/api/ — PutObjectの行にIf-Match/If-Modified-Since/If-None-Match/If-Unmodified-Sinceがすべて対応と明記)で確認したものです。実際に同時applyを起こして競合を検証したわけではないので、実証済みとは扱わないでください。ロックの取得・解放そのものは、本物のバケットでplan/applyを実行して確認済みです。GitHub Actionsの`concurrency`でも直列化しています。
- R2には**ネイティブなオブジェクトバージョニング機能がありません**(確認済み)。下記のバックアップ方式は、バージョニングに頼らない単純なオブジェクトコピーによるものです。
- `infra-apply`環境の承認者(Required reviewers)は設定していません(GitHubのプラン制限で使えない可能性あり)。今のapplyは、手動実行(`workflow_dispatch`)すること自体が確認の代わりです。
- 消えると困るリソース(DNSレコード、D1など)を管理し始める時点で、planに削除・作り直しが含まれたらapplyを失敗させるガードを入れる。

## 認証情報の置き場所

Cloudflareの認証情報には**性質の異なる2種類**が関わります。混同しないでください。

| 認証情報 | 用途 | 発行元 | GitHub上の名前 |
| --- | --- | --- | --- |
| Cloudflare APIトークン(Terraform専用) | `cloudflare`プロバイダ自体の認証(ゾーン/DNS/D1/R2バケット等の管理) | Cloudflareダッシュボード→マイプロフィール→APIトークン→カスタムトークン作成(現在必要な権限: アカウント→「Access: アプリとポリシー」→編集、ゾーン`paibot.app`→DNS→**編集**〈`infra/dns.tf`のClerk用レコード管理のため、2026年9月に読み取りから編集へ拡張〉。D1/R2/KVを追加するときはそれぞれの権限を、そのタイミングで足す) | `CLOUDFLARE_API_TOKEN_TERRAFORM`(secret) |
| R2用S3互換アクセスキーID/シークレットアクセスキー | **stateバックエンド**の認証(R2に対するS3プロトコルでのアクセス) | R2ダッシュボード→R2 APIトークンの管理→**state用バケットだけに限定**した「Object Read & Write」権限で発行 | `TF_STATE_R2_ACCESS_KEY_ID` / `TF_STATE_R2_SECRET_ACCESS_KEY`(secret) |

既存の`CLOUDFLARE_API_TOKEN`(`deploy-dev`/Wranglerが使っているもの)とは意図的に**別**にしています。Terraformには、実際に管理する範囲だけに絞った専用のトークンを持たせることで、片方の認証情報に問題が起きてももう片方に影響しないようにするためです。

さらに、GitHub Actionsの**リポジトリ変数**(secretではない — どちらの値も非機密情報だが、Terraformの`backend`ブロックはTerraform変数を参照できないため、`-backend-config`で`init`時に別途渡す必要がある)として以下も必要です。

| 変数名 | 値 |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | `b041431380f52e0bf2bb47b174e95b6a`(Admin@paibot.co.jp's Account。非機密、`npx wrangler whoami`でも見える値) |
| `TF_STATE_BUCKET` | state用バケット作成後の名前(案: `paibot-app-terraform-state`) |

## ブートストラップ: state用バケットの作成(一度だけ・手動・通常のapplyフローとは別)

これは意図的に、Terraformの設定にもCIワークフローにも含めていません。理由は2つあります。state用バケットは、それ自身が保存するstateを管理するTerraformでは管理できません(鶏と卵)。さらに、作成をこの手順の外に置いておくことで、`infra/`配下の実際のリソースに対する`terraform destroy`が、このバケットに絶対に触れられないことも保証できます — どこにも`resource`ブロックが無いので、`destroy`から見えようがありません。

1. アカウントでR2を有効化する(Cloudflareダッシュボード。課金が絡む一度きりの操作なので、自動化せずあなた自身の判断で行ってください)
2. バケットを作る(`app/`ディレクトリで実行。名前はR2有効化後に決めてください。`paibot-app-terraform-state`のような分かりやすい名前で問題ありません。R2のバケット名は既にアカウント単位でユニークなので、ランダムな文字列を足す必要はありません):
   ```sh
   cd app && npx wrangler r2 bucket create paibot-app-terraform-state
   ```
3. そのバケットだけに限定したR2 APIトークンを作る(R2ダッシュボード→R2 APIトークンの管理→Object Read & Write、バケット限定)。アクセスキーIDとシークレットアクセスキーはこの時にしか表示されないので、すぐに控えてください。
4. Terraform専用のCloudflare APIトークンを作る(上の表を参照)。
5. 上記4つのsecretと2つのvariableを登録する:
   ```sh
   gh secret set CLOUDFLARE_API_TOKEN_TERRAFORM --repo paibot-hq/paibot-app
   gh secret set TF_STATE_R2_ACCESS_KEY_ID --repo paibot-hq/paibot-app
   gh secret set TF_STATE_R2_SECRET_ACCESS_KEY --repo paibot-hq/paibot-app
   gh variable set CLOUDFLARE_ACCOUNT_ID --repo paibot-hq/paibot-app --body "b041431380f52e0bf2bb47b174e95b6a"
   gh variable set TF_STATE_BUCKET --repo paibot-hq/paibot-app --body "paibot-app-terraform-state"
   ```
6. ローカルで`cd infra`し、ワークフロー(`.github/workflows/infra-plan.yml`参照)と同じ`terraform init -backend-config=...`コマンドを、実際のバケット名・アカウントIDに置き換えて実行する。`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`は、R2トークンの値をシェルにexportしておく。その後一度ローカルで`terraform plan`を実行し、本番のバックエンドに対する最初の`plan`を自分の目で確認してから、CIに任せるようにしてください。

## 日常運用: リソースの追加・変更

1. ブランチを切って`.tf`ファイルを編集、`terraform fmt`、PRを作成。
2. `infra/`を触るPRでは`infra-plan.yml`が`fmt -check`+`validate`を実行(誰のPRでも)、さらに**フォークからのPRを除いて**認証付き`plan`を実行し、その出力がジョブのログ/サマリーに出る。マージ前に必ず読むこと。
3. plan結果に問題なければ`main`にマージ。
4. 実際に反映したくなったら: **Actions → Infra Apply → Run workflow**で、`ref`にデプロイしたいコミット(通常は`main`の最新)を指定して実行する。これはそのコミットに対して改めて`plan`を実行し、plan結果を短期間だけ保存されるartifactとしてアップロードしたうえで、`infra-apply`というGitHub Environmentによる承認ゲートで止まり、レビュアーが承認するまで`apply`ジョブが始まらない。**この承認ゲートを機能させるには、リポジトリのSettings→Environmentsで`infra-apply`環境に必須レビュアーを設定しておく必要があります。** 特に削除・再作成(destroy/replace)が含まれていないか、承認前に必ず確認すること。
5. `apply`ジョブは、手順4で生成した**まさにそのplanファイル**を`terraform apply tfplan`で適用する(その場で改めてplanし直すのではない)。これにより、レビューした内容と実際に適用される内容がずれることがない。
6. plan結果でWorkerがバインドすべき何か(D1データベースなど)ができていたら、`terraform output`から該当IDを`wrangler.jsonc`へ手で転記し、それ自体を別のPRにする。

**planに「既にあったものを削除・再作成する」という提案が出た場合、それを承認せず、まず理由を調べてください。** これは設定が間違っているか、Terraformが認識しているリソースの状態が実際とズレている(ドリット)サインです。そのまま押し切って回避するようなものではありません。

## 既存リソースのインポート

ゾーンはデータソースとして扱っているので、そもそもインポートが不要な設計にしています。今後、既に存在するもの(例: Terraformを書く前に手作業で作ったDNSレコード)をTerraform管理下に置きたくなったら、まず`resource`ブロックを書き、CIで`plan`/`apply`を実行する前にローカルで(上のブートストラップ手順6と同じbackend設定で)`terraform import <resource>.<name> <id>`を実行してください。インポートした結果のplanが「一度削除して作り直す」という内容になっていたら、インポートが正しくできていないサインです。そのまま適用せず、直してから進めてください。

## stateのバックアップと復旧

R2にはネイティブなオブジェクトバージョニング機能が無いため、`infra-apply.yml`の`apply`ジョブは、`terraform apply`を実行する直前に、現在のstateオブジェクトを同じバケット内の`paibot-app/backups/terraform.tfstate.<UTCタイムスタンプ>-<run id>`へコピーしています。これはR2の機能ではなく、単純なオブジェクトコピー(`aws s3api copy-object`をR2のS3エンドポイントに対して実行しているだけ)です。実際に頼る場面が来たら、まず`aws s3 ls ... --endpoint-url ...`で本当に存在するか確認してください。

不具合のあるapplyや誤上書きから復旧する場合:

```sh
aws s3api copy-object --endpoint-url "https://<account_id>.r2.cloudflarestorage.com" \
  --bucket paibot-app-terraform-state \
  --key paibot-app/terraform.tfstate \
  --copy-source "paibot-app-terraform-state/paibot-app/backups/terraform.tfstate.<タイムスタンプ>-<run id>"
```

復旧した後は、他の作業をする前に必ずローカルで`terraform plan`を実行し、復旧したstateが実際のインフラと一致しているか確認してください。

## ロックについて

`versions.tf`で`use_lockfile = true`を設定しています(Terraform 1.11でGAになったS3ネイティブロック機能。DynamoDBは不要 — そもそもR2にはDynamoDB相当のものがない)。**あなた自身がローカルの手元環境から実行するplan/applyも含めて**、すべての実行が同じロックを取得します。実際に2つのapplyが競合するのを防いでいるのはこのロックであって、GitHub Actionsの`concurrency:`設定ではありません(`concurrency:`はCIの無駄な実行を避けるためのもので、あなたのローカル端末での実行までは関知しません)。もし正当な実行が古いロックのせいでブロックされたら(例: 前回のジョブがapply中に強制終了した等)、`.tflock`オブジェクトを直接消すのではなく、他に本当にapplyが実行中でないことを確認したうえで`terraform force-unlock`を検討してください。

## ここまでの検証結果

- `terraform fmt -check -recursive` / `terraform validate`: 成功(PRの`Infra Plan`でも毎回実行)
- 本物のR2バケットに対する`init`/`plan`/`apply`: 成功(stateの保存、ロックの取得・解放を確認)
- `access.tf`: `Infra Apply`で1件作成(`Resources: 1 added, 0 changed, 0 destroyed`)。
  - 未ログインで`https://dev.paibot.app`を開くと、Cloudflare Accessのログイン画面に転送されることを確認。
  - `sanofc@gmail.com`でログインして入れることを、手動で確認。
- 未検証: 同時applyによるロック競合(上記)、`infra-apply`環境の承認者。
