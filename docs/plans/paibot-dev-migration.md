# paibot.dev への集約と paibot.app の廃止

サイトのドメインを`paibot.dev`に集約する。アプリは`app.paibot.dev`、ドキュメントは将来`doc.paibot.dev`のように、用途ごとのサブドメインに分ける。`paibot.app`は動作確認後に廃止し、それまでは`app.paibot.dev`へ301転送する(Workerが同じパス・クエリで返す。`www.paibot.app`はTerraformのRedirect Rule)。既存のユーザー・URLは引き継ぎを考えない(ログインは新しいClerk本番インスタンスで作り直す)。

このブランチ(`app/paibot-io`。名前は`paibot.io`案の名残)は**コードと設定の準備だけ**。マージ・デプロイの前に、下の「手作業」を済ませること(済む前にマージすると、devのデプロイが失敗する)。

## ホスト名

| ホスト | 役割 |
| --- | --- |
| `app.paibot.dev` | 本番のアプリ(正規URL) |
| `app-dev.paibot.dev` | 開発環境(Cloudflare Access付き)。`dev.app.paibot.dev`のように2階層にしないのは、無料のUniversal SSLが`*.paibot.dev`の1階層だけを覆うため |
| `paibot.dev`, `www.paibot.dev` | いまは`app.paibot.dev`へ301(Terraformの Redirect Rule)。ハブのページを作るときに差し替える |
| `doc.paibot.dev` | ドキュメント用に予約。まだ作らない |
| `paibot.app`, `www.paibot.app` | `app.paibot.dev`へ301。廃止まで |

## 変更したもの

| 場所 | 内容 |
| --- | --- |
| `wrangler.jsonc` | dev: `app-dev.paibot.dev`。本番: `app.paibot.dev`(正)と`paibot.app`(転送だけ)のカスタムドメイン、`SITE_URL=https://app.paibot.dev` |
| `workers/app.ts`, `src/lib/legacy-host.ts` | `paibot.app`・`www.paibot.app`への要求を、`SITE_URL`の同じパスへ301。単体テストあり |
| `src/lib/seo*.ts`, `src/root.tsx` | 正規URLの既定値を`https://app.paibot.dev`に |
| `infra/` | 既定ゾーンを`paibot.dev`に。旧ゾーン(`legacy_domain`)のClerk用DNSと`www`転送は旧ゾーンのまま、転送先だけ`app.paibot.dev`へ。`paibot.dev`のゾーンに、裸ドメインと`www`の転送・Clerk用DNS(空)を追加 |
| `.github/workflows/`, `tests/e2e/` | スモークテスト・環境チェックのURLを`app-dev.paibot.dev`/`app.paibot.dev`に |

## 手作業(この順で)

1. **`paibot.dev`をCloudflareに追加する**(アカウント: Admin@paibot.co.jp)。未取得なら取得し、ゾーンが`active`になるまで待つ。
2. **APIトークンの権限を足す**。
   - `CLOUDFLARE_API_TOKEN`(devのWranglerデプロイ): `paibot.dev`ゾーンの Workers Routes:Edit(カスタムドメインの作成に必要)。
   - `CLOUDFLARE_API_TOKEN_PRODUCTION`: 同じく`paibot.dev`ゾーンの Workers Routes:Edit。`paibot.app`ゾーンの権限は廃止までそのまま。
   - `CLOUDFLARE_API_TOKEN_TERRAFORM`: `paibot.dev`ゾーンの DNS:Edit、Zone Rulesets(Redirect Rule)の編集。
3. **新しいClerk本番インスタンスを作る**(対話式なので手元で): `npx clerk deploy`でドメインに`app.paibot.dev`を指定する。出力されるBINDゾーンのCNAME 5件を`infra/dns.tf`の`clerk_dns_records_dev`に写す。
4. **Google OAuthのリダイレクトURI**に、そのインスタンスのコールバック(`https://clerk.app.paibot.dev/v1/oauth_callback`。`clerk deploy`が示す値を使う)を足す(GCPの`paibot-app-prod`プロジェクト。`docs/infra/gcp.md`)。
5. **キーを入れ替える**: `clerk env pull --instance prod`で取り、GitHubの`PROD_CLERK_PUBLISHABLE_KEY`/`PROD_CLERK_SECRET_KEY`を更新。`config/clerk/production.json`は`clerk config pull --instance prod`で取り直す。devのClerkは共有の開発用なのでそのまま。
6. **Terraformを適用する**(`infra/`)。`paibot.dev`の転送ルールとDNS、Clerk用DNSができる。
7. **このPRをマージする**。mainのdevデプロイが`app-dev.paibot.dev`を作る。Cloudflare Accessは`paibot-app-dev`のWorker単位なのでそのまま効く。`app-dev.paibot.dev`のスモークテストが通ることを確認する。
8. **本番をデプロイする**(`App (production)`をmanual dispatch)。`https://app.paibot.dev`が200、ログイン(Google)が通る、`https://paibot.app/ja`が`https://app.paibot.dev/ja`へ301になることを確認する。
9. **Search Console**に`app.paibot.dev`を登録してサイトマップを送り、`paibot.app`から「アドレス変更」を出す。

## 廃止(`app.paibot.dev`での動作確認が済んでから)

- 転送は少なくとも半年〜1年は残す(被リンクと検索結果のURLを生かすため)。
- そのあと、`wrangler.jsonc`の本番`routes`から`paibot.app`を外し、`src/lib/legacy-host.ts`と`workers/app.ts`の転送、`infra/`の旧ゾーン関連(`legacy_domain`、旧Clerk用DNS、`www_redirect`)を削除する。
- 旧Clerk本番インスタンスを削除し、`paibot.app`ドメインを更新せず期限切れにする(または手放す)。

## ロールバック

`App (production)`はタグ・SHAを指定して再デプロイできる。`paibot.app`側の本番インスタンス・DNSは廃止まで残すので、移行中に問題が出たら、旧タグでデプロイし直し、Clerkのキーを元に戻す。
