# PAIBOT.app

Next.js App Router + TypeScript + Clerk + next-intl。日本語・英語のURLを分け、公開ページを各言語でサーバー描画します。

## 開発

Node.js 20.9以上（LTS推奨）を使用します。

```sh
npm ci
npm run dev
```

`npm run dev`・`npm run build`・`npm start` は [vinext](https://vinext.dev/)(Next.js on Cloudflare Workersアダプター)を通して動きます。
`import { env } from "cloudflare:workers"` でD1などのCloudflareバインディングにアクセスするコードがあるため、素のNext.js(`next dev`/`next build`)では型チェック・ビルドの時点で失敗します。
バインディングを使わない範囲だけ素のNext.jsで素早く確認したい場合は `npm run dev:next` / `npm run build:next` / `npm run start:next` を使ってください(型は通っても、Cloudflare固有の機能は動きません)。

`.env.example` を参考に `.env.local` にClerkの開発用キーを設定してください。
既存のファイルやキーを上書きする必要はありません。

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: `pk_test_…`
- `CLERK_SECRET_KEY`: `sk_test_…`（サーバー専用）
- `SITE_URL`: 正規URLの親ドメイン。既定値は `https://paibot.app`
- `SITE_INDEXABLE`: 本番公開時だけ `true`。未設定・`false` はnoindex

ログイン方式（メール・Googleなど）はClerk Dashboardで設定します。

## URLと言語

| 日本語 | 英語 | 公開範囲 |
| --- | --- | --- |
| `/ja` | `/en` | 公開トップページ |
| `/ja/sign-in` | `/en/sign-in` | ログイン（noindex） |
| `/ja/sign-up` | `/en/sign-up` | 新規登録（noindex） |
| `/ja/dashboard` | `/en/dashboard` | 認証必須（noindex） |

`/`・`/sign-in`・`/dashboard` など言語なしURLは日本語URLへリダイレクトします。
URLが言語の基準です。Cookie・ブラウザ言語・以前のlocalStorageの言語設定では上書きしません。
言語メニューは同じページの別言語URLへのリンクです。
テーマのlocalStorage設定は従来どおり引き継ぎます。

`messages/ja.json`・`messages/en.json` で翻訳を管理します。
Client Componentは `useTranslations`、Server Componentは `getTranslations` を使用します。
`src/i18n/types.d.ts` で翻訳キーを型チェックします。
内部リンクには `src/i18n/navigation.ts` の `Link` を使うと現在の言語を維持できます。

## SEO

公開トップページには翻訳したtitle・description、自己参照canonical、日英とx-defaultのhreflang、
Open Graph・Twitterメタデータを設定します。x-defaultは日本語版を指します。
JavaScript実行前のHTMLに言語と翻訳本文が含まれます。

`/sitemap.xml` は実在する公開ページだけを掲載します。ツールを追加する際は
`src/lib/seo.ts` の `publicPaths` にパスを追加し、ページの `generateMetadata` から
`publicMetadata` を使って各言語のURL・文言を設定してください。

**本番公開時には、CloudflareのWorker環境変数として `SITE_URL=https://paibot.app` と `SITE_INDEXABLE=true` を設定してください。**
ローカルの `.env` を変えてビルドし直すだけではデプロイ先のWorkerには反映されません
(`wrangler secret put` または `wrangler.jsonc` の `vars` で設定します)。
開発・ステージングでは `SITE_INDEXABLE` を未設定のままにし、robots.txtでクロールを拒否、ページにnoindexを付けます。
Clerkも本番用インスタンス・本番キーへ切り替えてください。
noindexはアクセス制御ではありません。

## Clerk

ClerkのUIもURLの言語・選択したテーマに連動します。
ログイン・登録後の既定遷移先は同じ言語のdashboard、ログアウト後は同じ言語のトップです。
ProviderとProxyで言語別URLを設定するため、以前の `NEXT_PUBLIC_CLERK_SIGN_IN_URL` など4つの
URL環境変数は不要です。残っていてもアプリ側の指定が優先されます。

`src/proxy.ts` はClerkとnext-intlを組み合わせ、API・`/__clerk` 通信を言語リライトから除外します。
認証チェックは `src/app/[locale]/dashboard/page.tsx` の `auth()` + `redirect()` で行います
(`auth.protect()` はCloudflare Workers(vinext)環境でリダイレクトが正しく発火せず404になるため使っていません)。
会員用ページ・API・Server Actionsを追加するときは各処理内で認証と所有者・権限を確認してください。
パスの配下に配置しただけでは保護されません。

## 検証

```sh
npm run build
npm run typecheck
npm run check:i18n
npm run check:browser
```

`check:i18n` は `npm run build` (vinextビルド) 済みの成果物を `wrangler dev --config dist/server/wrangler.json` で
一時的に `127.0.0.1:3197` で起動し(`SITE_INDEXABLE` は `--var` でCloudflareの変数として渡します。ホストの`process.env`はWorkerランタイムに直接は引き継がれません)、
翻訳HTML・canonical/hreflang・認証リダイレクト・404・サイトマップ・本番/ステージングrobotsを検証します。
有効なClerk開発キーが必要です。アカウント作成・ログイン・キーの出力は行いません。
実行前に `npm run build` で `dist/server` を最新化しておいてください。

`check:browser` は実際のブラウザ(Playwright)で `npm run dev`(ポート3001)に対して行う検証で、
全ツールページがエラーなく表示できるか、テーマ切り替えが効いて永続化されるか、言語切り替え・リダイレクトを
繰り返してもJSエラーが出ないかを確認します。実行前に `npm run dev` でdevサーバーを起動しておいてください。
初回のみ `npx playwright install chromium` でブラウザ本体の取得が必要です。

ブラウザでは言語リンク、テーマ、Clerkログイン・登録・ログアウトの操作を確認してください。
`npm start` は `npm run build` の成果物を `wrangler dev` でローカルのWorkerとして起動し、`npm run preview` はビルドと起動をまとめて実行します。

## Cloudflareへの公開

Cloudflare公式のNext.js on Workersアダプター [vinext](https://vinext.dev/) を使ってCloudflare Workersへデプロイします。

```sh
npm ci                  # devDependencies込みでインストール(patch-packageのpostinstallに必要)
npm run build          # ビルド(vinext build)
npm start               # ローカルでWorkerとして起動して確認(wrangler dev)
npm run deploy:vinext  # 実際にデプロイ
```

`npm run build`の前は必ず`npm ci`(devDependencies込み)を使ってください。`--omit=dev`で入れると`patch-package`(`@clerk/nextjs`のvinext dev互換パッチ、詳細はCLAUDE.md)の`postinstall`が実行されません。`npm run deploy:vinext`自体はビルド済みの`dist/`をアップロードするだけなので、その段階では`node_modules`もdevDependenciesも不要です。

デプロイには `wrangler login` でのCloudflareアカウント認証が必要です。
`.env.local` の値(Clerkの鍵など)は自動では引き継がれないため、初回は
`wrangler secret put <name> --config dist/server/wrangler.json` で個別に登録してください。

本番公開前に必要な対応:
- `SITE_URL=https://paibot.app`、`SITE_INDEXABLE=true` をWorkerの環境変数として設定
- Clerkの本番インスタンス・本番キーへの切り替え
- カスタムドメイン(`paibot.app`)とDNSの設定
- 現時点のデプロイ先はCloudflare既定の `*.workers.dev` URL(開発確認用)。第三者に見られたくない間はCloudflare Access等でのアクセス制限を検討してください。
- 本番Clerkキーを使うがまだ`paibot.app`では公開しないステージング環境では、`SITE_URL`をそのステージング環境の実際のオリジンに設定してください。`src/proxy.ts`はClerkの本番キー使用時に`SITE_URL`のオリジンだけをログインに許可するため、`https://paibot.app`のままだとステージングでログインできなくなります。

以前の静的ビルド `out/` は公開しないでください。
