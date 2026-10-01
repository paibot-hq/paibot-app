# paibot.io への移行と paibot.app の廃止

`paibot.app`から`paibot.io`へサイトを移し、動作を確認してから`paibot.app`を廃止する。旧ドメインは当面`paibot.io`へ301転送する(Workerが同じパス・クエリで返す。`www.paibot.app`はTerraformのRedirect Rule)。既存のユーザー・URLは引き継ぎを考えない(ログインは新しいClerk本番インスタンスで作り直す)。

このブランチ(`app/paibot-io`)は**コードと設定の準備だけ**。マージ・デプロイの前に、下の「手作業」を済ませること(済む前にマージすると、devのデプロイが失敗する)。

## 変更したもの

| 場所 | 内容 |
| --- | --- |
| `wrangler.jsonc` | dev: `dev.paibot.io`。本番: `paibot.io`(正)と`paibot.app`(転送だけ)のカスタムドメイン、`SITE_URL=https://paibot.io` |
| `workers/app.ts`, `src/lib/legacy-host.ts` | `paibot.app`・`www.paibot.app`への要求を、`SITE_URL`の同じパスへ301。単体テストあり |
| `src/lib/seo*.ts`, `src/root.tsx` | 正規URLの既定値を`https://paibot.io`に |
| `infra/` | 既定ゾーンを`paibot.io`に。旧ゾーン(`legacy_domain`)のClerk用DNSと`www`転送は旧ゾーンのまま、転送先だけ`paibot.io`へ。`paibot.io`のゾーンに`www`・Redirect Rule・Clerk用DNS(空)を追加 |
| `.github/workflows/`, `tests/e2e/` | スモークテスト・環境チェックのURLを`dev.paibot.io`/`paibot.io`に |

## 手作業(この順で)

1. **Cloudflareに`paibot.io`のゾーンを追加する**(アカウント: Admin@paibot.co.jp)。レジストラでネームサーバーをCloudflareのものに変え、ゾーンが`active`になるまで待つ。
2. **APIトークンの権限を足す**。
   - `CLOUDFLARE_API_TOKEN`(devのWranglerデプロイ): `paibot.io`ゾーンの Workers Routes:Edit(カスタムドメインの作成に必要)。
   - `CLOUDFLARE_API_TOKEN_PRODUCTION`: 同じく`paibot.io`ゾーンの Workers Routes:Edit。`paibot.app`ゾーンの権限は廃止までそのまま。
   - `CLOUDFLARE_API_TOKEN_TERRAFORM`: `paibot.io`ゾーンの DNS:Edit、Zone Rulesets(Redirect Rule)の編集。
3. **新しいClerk本番インスタンスを作る**(対話式なので手元で): `npx clerk deploy`でドメインに`paibot.io`を指定する。出力されるBINDゾーンのCNAME 5件を`infra/dns.tf`の`clerk_dns_records_io`に写す。
4. **Google OAuthのリダイレクトURI**に`https://clerk.paibot.io/v1/oauth_callback`を足す(GCPの`paibot-app-prod`プロジェクト。`docs/infra/gcp.md`)。
5. **キーを入れ替える**: `clerk env pull --instance prod`で取り、GitHubの`PROD_CLERK_PUBLISHABLE_KEY`/`PROD_CLERK_SECRET_KEY`を更新。`config/clerk/production.json`は`clerk config pull --instance prod`で取り直す。devのClerkは共有の開発用なのでそのまま。
6. **Terraformを適用する**(`infra/`)。`paibot.io`の`www`と転送ルール、Clerk用DNSができる。
7. **このPRをマージする**。mainのdevデプロイが`dev.paibot.io`を作る。Cloudflare Accessは`paibot-app-dev`のWorker単位なのでそのまま効く。`dev.paibot.io`のスモークテストが通ることを確認する。
8. **本番をデプロイする**(`App (production)`をmanual dispatch)。`https://paibot.io`が200、ログイン(Google)が通る、`https://paibot.app/ja`が`https://paibot.io/ja`へ301になることを確認する。

## 廃止(paibot.io での動作確認が済んでから)

- `wrangler.jsonc`の本番`routes`から`paibot.app`を外し、`src/lib/legacy-host.ts`と`workers/app.ts`の転送、`infra/`の旧ゾーン関連(`legacy_domain`、旧Clerk用DNS、`www_redirect`)を削除する。
- 旧Clerk本番インスタンスを削除する。
- `paibot.app`ドメインを更新せず期限切れにする(または手放す)。

## ロールバック

`App (production)`はタグ・SHAを指定して再デプロイできる。`paibot.app`側の本番インスタンス・DNSは廃止まで残すので、移行中に問題が出たら、旧タグでデプロイし直し、Clerkのキーを元に戻す。
