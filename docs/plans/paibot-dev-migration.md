# paibot.dev への集約と paibot.app の廃止

サイトのドメインを`paibot.dev`に集約する。アプリは`app.paibot.dev`、ドキュメントは将来`doc.paibot.dev`のように、用途ごとのサブドメインに分ける。`paibot.app`は動作確認後に廃止し、それまでは`paibot.dev`(hub)へ301転送する(Workerが同じパス・クエリで返す。`www.paibot.app`はTerraformのRedirect Rule)。既存のユーザー・URLは引き継ぎを考えない(ログインは新しいClerk本番インスタンスで作り直す)。

このブランチ(`app/domain-on-split`)は、ホスト分けのPR(#106)の上に、ドメインの変更(旧`app/paibot-io`)を載せたもの。**コードと設定の準備だけ**。マージ・デプロイの前に、下の「手作業」を済ませること(済む前にマージすると、devのデプロイが失敗する)。

## ホスト名

1つのWorkerが全サイトを出し、ホスト名で出し分ける(`src/lib/sites.ts`)。

| 本番 | 開発 | 中身 |
| --- | --- | --- |
| `paibot.dev` | `dev.paibot.dev` | hub(各サイトの入口) |
| `app.paibot.dev` | `app-dev.paibot.dev` | 日常・ゲーム・便利ツールと、その一覧(お気に入りつき) |
| `learn.paibot.dev` | `learn-dev.paibot.dev` | 数学ドリル(今後 英語・IT) |
| `tools.paibot.dev` | `tools-dev.paibot.dev` | 開発者向けツール(ネットワーク・開発)。のちに監視 |
| `doc.paibot.dev` | - | 技術・解説記事。別の静的サイト。まだ作らない |
| `www.paibot.dev` | - | `paibot.dev`へ301(TerraformのRedirect Rule) |
| `paibot.app`, `www.paibot.app` | - | `paibot.dev`(hub)へ301。hubがページの持ち主のサイトへ、さらに301で送る。廃止まで |

サイトは、ページの種類ではなく、**誰向けか**で分ける: `app`は一般の人、`learn`は学ぶ人、`tools`は開発者・運用担当、`doc`は開発者向けの記事。迷うツールは、「開発者でない人も検索して使うか」で決める(使うなら`app`)。ツール単位のサブドメインは作らない。

開発の`app-dev`のように`-dev`を付けるのは、`dev.app.paibot.dev`のような2階層が無料のUniversal SSLの対象外のため。ローカルでは`localhost`がhub、`app.localhost`・`learn.localhost`・`tools.localhost`が各サイト(`*.localhost`はブラウザが自動で解決する)。

## 手作業(この順で)

1. **`paibot.dev`をCloudflareに追加する**(アカウント: Admin@paibot.co.jp)。未取得なら取得し、ゾーンが`active`になるまで待つ。
2. **APIトークンの権限を足す**。
   - `CLOUDFLARE_API_TOKEN`(devのWranglerデプロイ): `paibot.dev`ゾーンの Workers Routes:Edit(カスタムドメインの作成に必要)。
   - `CLOUDFLARE_API_TOKEN_PRODUCTION`: 同じく`paibot.dev`ゾーンの Workers Routes:Edit。`paibot.app`ゾーンの権限は廃止までそのまま。
   - `CLOUDFLARE_API_TOKEN_TERRAFORM`: `paibot.dev`ゾーンの DNS:Edit、Zone Rulesets(Redirect Rule)の編集。
3. **新しいClerk本番インスタンスを作る**(**Organizationsはオフにする**: オンだとサインアップ直後のセッションが保留(pending)になり、サーバーは未ログイン扱いにする。開発インスタンスで実際にこれで認証のe2eが落ちた)(対話式なので手元で): `npx clerk deploy`でドメインに**親ドメイン`paibot.dev`**を指定する(全サイトでログインを共有するため)。出力されるBINDゾーンのCNAME 5件を`infra/dns.tf`の`clerk_dns_records_dev`に写す。
4. **Google OAuthのリダイレクトURI**に、そのインスタンスのコールバック(`clerk deploy`が示す値を使う。例: `https://clerk.paibot.dev/v1/oauth_callback`)を足す(GCPの`paibot-app-prod`プロジェクト。同意画面は1つなので、承認済みドメインに`paibot.dev`を足し、OAuthクライアントを1つ追加する。`docs/infra/gcp.md`)。
5. **キーを入れ替える**: `clerk env pull --instance prod`で取り、GitHubの`PROD_CLERK_PUBLISHABLE_KEY`/`PROD_CLERK_SECRET_KEY`を更新。`config/clerk/production.json`は`clerk config pull --instance prod`で取り直す。devのClerkは共有の開発用なのでそのまま。
6. **Terraformを適用する**(`infra/`)。`paibot.dev`の転送ルールとDNS、Clerk用DNSができる。
7. **このPRをマージする**。mainのdevデプロイが`app-dev.paibot.dev`を作る。Cloudflare Accessは`paibot-app-dev`のWorker単位なのでそのまま効く。`app-dev.paibot.dev`のスモークテストが通ることを確認する。
8. **本番をデプロイする**(`App (production)`をmanual dispatch)。`https://app.paibot.dev`が200、ログイン(Google)が通る、`https://paibot.app/ja/math`が`https://paibot.dev/ja/math`を経て`https://learn.paibot.dev/ja/math`へ301で着くことを確認する。
9. **Search Console**に`app.paibot.dev`を登録してサイトマップを送り、`paibot.app`から「アドレス変更」を出す(移転先はhubの`paibot.dev`)。

## 廃止(`app.paibot.dev`での動作確認が済んでから)

- 転送は少なくとも半年〜1年は残す(被リンクと検索結果のURLを生かすため)。
- そのあと、`wrangler.jsonc`の本番`routes`から`paibot.app`を外し、`src/lib/legacy-host.ts`と`workers/app.ts`の転送、`infra/`の旧ゾーン関連(`legacy_domain`、旧Clerk用DNS、`www_redirect`)を削除する。
- 旧Clerk本番インスタンスを削除し、`paibot.app`ドメインを更新せず期限切れにする(または手放す)。

## ロールバック

`App (production)`はタグ・SHAを指定して再デプロイできる。`paibot.app`側の本番インスタンス・DNSは廃止まで残すので、移行中に問題が出たら、旧タグでデプロイし直し、Clerkのキーを元に戻す。
