# ドメインと、サイトの形

**サイトは`paibot.app`の1つ。サブドメインは使わない。** 開発環境だけ`dev.paibot.app`。トップ画面は検索(アプリと数学の単元・学習項目)だけ。

## 経緯

2026年10月、`paibot.dev`に集約して`app.`・`learn.`・`tools.`・`doc.`のサブドメインに分ける構成を試した(hubの表紙、サイト間の転送、親ドメインで共有するCookie、Clerkの親ドメイン運用)。1つのWorker・1つのリポジトリで動かしており、分ける利益(障害の切り分け、別々のデプロイ)はなく、費用(DNS、証明書、Clerkの許可、サイトマップ、転送、ローカル開発、テスト)が大きかったため、数日で取りやめた。`paibot.app`から`paibot.dev`への転送は、設けない(`paibot.dev`は廃止)。

## 今の形

| 環境 | ホスト | Worker | Clerk |
| --- | --- | --- | --- |
| 本番 | `paibot.app` | `paibot-app` | 旧`paibot.app`の本番インスタンス(`clerk.paibot.app`) |
| 開発 | `dev.paibot.app`(Cloudflare Accessで保護) | `paibot-app-dev` | 開発用インスタンス |

- `www.paibot.app`は`paibot.app`へ301(`infra/redirects.tf`)。
- トップ(`/ja`など)が検索。古い一覧・カテゴリのURL(`/apps`、`/daily`、`/game`、`/utility`、`/study`、`/dev`、`/network`)はトップへ301。
- ホストによる出し分けのコード(`src/lib/sites.ts`、`legacy-host.ts`、各サイトの表紙)は削除した。

## `paibot.dev`から戻す手作業(この順で)

1. **Clerkのキーを旧インスタンスのものに戻す**: GitHubの`PROD_CLERK_PUBLISHABLE_KEY`・`PROD_CLERK_SECRET_KEY`を、旧`paibot.app`の本番インスタンス(`pk_live_`の値が`clerk.paibot.app`を指すもの)のキーにする。Workerのシークレットは、本番デプロイ時にワークフローが同期する。確認は、デプロイ後に配信されたキーを`pk_live_`のあとのBase64で見る(`clerk.paibot.app`のはず)。
2. **このPRをマージ**し、devのデプロイが`dev.paibot.app`で動くことを確認する。
3. **`Infra Plan`を確認して`Infra Apply`**: `paibot.dev`ゾーンのDNS(Clerk用のCNAME 5つ、Search ConsoleのTXT、`www`)とRedirect Ruleが削除され、`paibot.app`側が元の形に戻る。`paibot.dev`のゾーンを先にCloudflareから外した場合は、そのリソースの削除が失敗するので、先にApplyする。
4. **`App (production)`を実行**: 本番が`paibot.app`で配信される。`paibot.dev`のカスタムドメイン(`paibot.dev`、`app.`、`learn.`、`tools.`)は、Wranglerの設定から外れるが、**Cloudflareのダッシュボード(Workers > paibot-app > Settings > Domains)に残っていないか確認し、残っていれば手で外す**。
5. **Search Console**: `paibot.dev`のドメインプロパティは削除する(サイトマップの送信も不要)。`paibot.app`のプロパティで、トップのサイトマップ(`https://paibot.app/sitemap.xml`)を再送信する。
6. **Clerk(新しい`paibot.dev`の本番インスタンス)を削除**し、GCPのOAuthクライアントに足した`https://clerk.paibot.dev/v1/oauth_callback`を外す。`paibot.dev`ドメイン自体は更新しない。
