# infra/ — CloudflareリソースのTerraform管理

意図的に最小限にしたTerraform構成です。何か触る前に、特に「まだやっていないこと」の節を読んでください。

## TerraformとWranglerの管理範囲

- **Wrangler**(`wrangler.jsonc`、`npm run build`/`deploy:vinext`、CIの`deploy-dev`ジョブ)が引き続き管理するもの: Worker本体、バインディング設定、vars、`compatibility_date`/フラグ、assets。ここでは一切触らない。
- **Terraform**が管理するもの: Wranglerでは管理しないアカウントレベルのCloudflareリソース。今はDNSゾーン(読み取り専用の参照のみ)、今後必要になり次第D1/R2/KV/Accessなど。
- **同じ対象を両方で二重管理しない。** TerraformがWorkerからバインドする必要のあるもの(D1データベース、R2バケットなど)を作ったら、`terraform output`でIDを取得し、それを**手で**`wrangler.jsonc`のバインディング設定に転記して、普通のレビュー可能な変更として反映する。この転記を自動化するスクリプトは作っていない — この規模で「コピペを自動化する」ことのリスク(意図しない場所に書き込む等)の方が、手間を省くメリットより大きいと判断した。**`dist/`配下のファイルは絶対に手で編集しない** — `vinext build`のたびに毎回生成し直される成果物なので。

## 現在の管理範囲(意図的に小さい)

今Terraformが管理しているのは、既存の`paibot.app`ゾーンへの**読み取り専用のデータソース参照**(`infra/data.tf`)だけです。このゾーンはTerraformが作ったものではなく(Cloudflare APIで確認済み、ステータス`active`)、`resource`ブロックを持たないので、Terraformが削除・再作成を提案することは原理的にありません。それ以外はまだ何も作っていません。理由は下の「まだやっていないこと」を参照。

リソースは実際に必要になってから追加してください。実績作りのために先回りして作らないこと。

## ⚠️ まだやっていないこと・詰まっていること

- **このCloudflareアカウントではR2がまだ有効化されていません。** `npx wrangler r2 bucket list`(`app/`ディレクトリで実行。`wrangler`はグローバルインストールしていないので、単体では動かず`npx`経由が必要)を実行すると`Please enable R2 through the Cloudflare Dashboard [code: 10042]`で失敗します。R2の有効化(課金への同意を含む)はダッシュボードでの手動操作で、ここからは実行できません。**これによってstate保存用バケット自体が作れない**ため、下記のブートストラップ手順はまだ何一つ実行できません。
- state用バケット、そのR2用APIトークン(S3互換のアクセスキー/シークレット)、Terraform専用のCloudflare APIトークン、下記のGitHub Secrets/Variablesは、いずれもまだ存在しません。
- `terraform plan`/`apply`はまだ一度も実行していません。ローカルで確認できたのは`terraform fmt`と`terraform validate`だけです(どちらもbackend・認証情報が無くても実行できるコマンド)。
- `use_lockfile`(`versions.tf`参照)の前提となる「R2がPutObjectの条件付き書き込みをサポートしている」という話は、Cloudflare公式のS3 API互換性ドキュメント(https://developers.cloudflare.com/r2/api/s3/api/ — PutObjectの行にIf-Match/If-Modified-Since/If-None-Match/If-Unmodified-Sinceがすべて対応と明記)で確認したものです。**実際に本物のバケットに対して同時apply(競合)を起こして実証したわけではありません。** 「Cloudflareの公開ドキュメント上は対応しているはず」という段階であって、実証済みとは扱わないでください。
- R2には**ネイティブなオブジェクトバージョニング機能がありません**(推測ではなく確認済み。よく要望されているが、この時点ではまだ実装されていない機能)。下記のバックアップ方式は、このバージョニング機能に頼らない、単純なオブジェクトコピーによるものです。

## 認証情報の置き場所

Cloudflareの認証情報には**性質の異なる2種類**が関わります。混同しないでください。

| 認証情報 | 用途 | 発行元 | GitHub上の名前 |
| --- | --- | --- | --- |
| Cloudflare APIトークン(Terraform専用) | `cloudflare`プロバイダ自体の認証(ゾーン/DNS/D1/R2バケット等の管理) | Cloudflareダッシュボード→マイプロフィール→APIトークン→カスタムトークン作成(最初はZone:Readだけで十分。DNS:Edit/D1:Edit/R2:Edit/Access:Editは、実際にそのリソースを追加するタイミングで足す) | `CLOUDFLARE_API_TOKEN_TERRAFORM`(secret) |
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

- `terraform fmt -check -recursive`: 成功
- `terraform init -backend=false` + `terraform validate`: 成功
- 認証付きの`plan`/`apply`: 未実施(R2が有効化されていないため、上記参照)
