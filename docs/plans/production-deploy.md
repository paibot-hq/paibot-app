> **2026年10月: `paibot.dev`への移行は取りやめ、サイトは`paibot.app`のまま、サブドメインなしの1サイトにした。** 経緯は`docs/plans/domain.md`。

# 本番デプロイの設計(2026年9月実装)

開発環境(`paibot-app-dev`)へのCD設定と合わせて話した内容。開発環境のCD(`.github/workflows/app.yml`の`deploy-dev`)、本番側(`.github/workflows/app-production.yml`)ともに実装済み。

## タグの命名規則

日付ベース。semver(`vX.Y.Z`)は「他のものがバージョン番号に依存して互換性を判断する」場面で意味を持つ仕組みで、paibot.appは単一デプロイのWebアプリで外部の依存者がいないため恩恵が薄いと判断し、見送った。

```
release-2026-09-17
release-2026-09-17-2   # 同日2回目以降は末尾に連番
```

## トリガーとフロー(`workflow_dispatch`一本化)

`push: tags:`は使わない。理由は次節。

- **新規リリース**: Actions→`App (production)`→`Run workflow`を`ref`未入力のまま実行。ワークフロー内で現在のデフォルトブランチから日付ベースのタグを自動計算・作成・pushし、そのままビルド・デプロイ・GitHub Release作成まで行う
- **ロールバック/再デプロイ**: `ref`に既存タグ名かコミットSHAを指定して実行。新しいタグは打たず、指定されたrefをそのままデプロイするだけ(GitHub Releaseも作らない)

### なぜタグpushトリガー+承認ゲートをやめたか

当初案は「`release-*`タグpushで自動デプロイ、ただし`environment: production`の承認ゲートで人間の承認待ちにする」だった。しかし**GitHub Environmentsの「承認者必須」(Required reviewers)は、Organization(`paibot-hq`)の現在のプラン(Free)だとプライベートリポジトリでは使えない**(Team/Enterprise限定機能)。`infra-apply`環境で先に判明していた制限と同じ。

承認ゲートが機能しない以上、「タグをpushしたら勝手にデプロイされる」のは事故のもとでしかない。代わりに`workflow_dispatch`を手動実行すること自体を確認ステップとして扱う(`infra-apply.yml`と同じ考え方)。タグは「デプロイした結果の記録」として自動生成する側に回した。

`environment: production`ブロック自体はワークフローに残してある。承認ゲートとしては機能しなくても、GitHub Environmentは将来Environment単位のsecretを使う余地を残しておける(現状はまだ`PROD_CLERK_PUBLISHABLE_KEY`等はリポジトリ全体のsecretのまま。Environment secretへの移行は未実施 — 値をチャット越しに扱わずに移行する方法を検討中)。

## 実際のワークフロー(`.github/workflows/app-production.yml`)

草案から変わった主なポイント:

1. `on: push: tags` を削除し `workflow_dispatch` のみに
2. `ref`未指定時にタグを自動計算・作成・pushするステップを追加
3. ビルド時に`CLOUDFLARE_ENV=production`を渡す(次節参照)
4. デプロイコマンドから`--env production`フラグを外す(次節参照)

```yaml
name: App (production)

on:
  workflow_dispatch:
    inputs:
      ref:
        description: "再デプロイ/ロールバック時のみ指定(タグ名かコミットSHA)。空なら現在のデフォルトブランチから新規リリースする"
        required: false

concurrency:
  group: app-production-deploy
  cancel-in-progress: false

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v7
        with:
          ref: ${{ inputs.ref || github.sha }}
          fetch-depth: 0

      - name: Determine release tag (new releases only)
        id: tag
        if: ${{ inputs.ref == '' }}
        run: |
          base="release-$(date -u +%Y-%m-%d)"
          tag="$base"
          n=1
          while git rev-parse -q --verify "refs/tags/$tag" >/dev/null; do
            n=$((n + 1))
            tag="${base}-${n}"
          done
          echo "tag=$tag" >> "$GITHUB_OUTPUT"

      - name: Create and push release tag
        if: ${{ inputs.ref == '' }}
        run: |
          git tag "${{ steps.tag.outputs.tag }}"
          git push origin "${{ steps.tag.outputs.tag }}"

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Set up .env.local (production Clerk keys)
        run: |
          cat <<EOF > .env.local
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${{ secrets.PROD_CLERK_PUBLISHABLE_KEY }}
          CLERK_SECRET_KEY=${{ secrets.PROD_CLERK_SECRET_KEY }}
          SITE_URL=https://paibot.app
          SITE_INDEXABLE=true
          EOF

      - name: Build (production env)
        env:
          CLOUDFLARE_ENV: production
        run: npm run build

      - name: Deploy to Cloudflare Workers (production)
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN_PRODUCTION }}
        run: npx wrangler deploy --config dist/server/wrangler.json

      - name: Create GitHub Release
        if: ${{ inputs.ref == '' }}
        run: gh release create "${{ steps.tag.outputs.tag }}" --generate-notes
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## `wrangler.jsonc`の`env.production`と、ハマった`CLOUDFLARE_ENV`の罠

`wrangler.jsonc`に以下を追加した。`routes`(と`name`)は環境間で継承されないため、devと重複していても明示的に書く必要がある。

```jsonc
"env": {
  "production": {
    "name": "paibot-app",
    "routes": [
      { "pattern": "paibot.app", "custom_domain": true }
    ]
  }
}
```

これだけでは不十分だった。素の`npm run build`(=`vinext build`)は**`env.production`の存在に関係なく常にトップレベル(dev)設定を`dist/server/wrangler.json`に出力する**。実際に試して確認した。

原因は`vinext build`が内部で使っている`@cloudflare/vite-plugin`の仕様で、`process.env.CLOUDFLARE_ENV`を見て、ビルド時点でその環境向けにwrangler設定をマージしてから`dist/server/wrangler.json`に書き出す、という一段階の変換が入っているため。つまり**`--env production`はwrangler deployの引数ではなく、ビルド時点で必要**:

```sh
CLOUDFLARE_ENV=production npm run build   # これで dist/server/wrangler.json の name/routes が本番用になる
npx wrangler deploy --config dist/server/wrangler.json   # --env production は付けない
```

`CLOUDFLARE_ENV=production`でビルドした後の`dist/server/wrangler.json`は、`env.production`の内容が**トップレベルにフラット化された状態**で出力される(=`env`セクション自体はもう残らない)。そのため`wrangler deploy`に`--env production`を追加で渡すと、「`No environment found in configuration with name "production"`」という警告が出る(実害は無い、devの設定にフォールバックすることはない。upload sizeが同一であることを実測確認済み)が、ログが紛らわしいので付けない方針にした。

`vinext-cloudflare deploy --env production`(`package.json`の`deploy:vinext`スクリプトの本体)を使えば、この`CLOUDFLARE_ENV`の伝播を内部でよしなにやってくれる。ただし内部実装ではビルドとデプロイの両方を1コマンドで行う設計で、既存のdevワークフロー(`npm run build`→`npx wrangler deploy`を別ステップに分けてログを見やすくするスタイル)との一貫性を優先し、今回は素のwrangler + 明示的な`CLOUDFLARE_ENV`の組み合わせを採用した。

## 重大な誤解だったポイント: `.env.local`はデプロイ後のWorkerには効かない

上の`CLOUDFLARE_ENV`の節とは別の、もっと根本的な問題があった。初回デプロイ後、`https://paibot.app`が`[vinext] Middleware error: ... throwMissingSecretKeyError`で全ページ500になった。

CIの`.env.local`ステップ(`CLERK_SECRET_KEY=${{ secrets.PROD_CLERK_SECRET_KEY }}`)は、ビルド成果物に値を「焼き込む」ものだと元の計画(このファイルの旧版、および以前のCLAUDE.md)では想定していた。だが実際に`dist/server/`の中身を調べたところ、`.env.local`の値が書き込まれる先は`dist/server/.dev.vars`だけで、これは**ローカルの`wrangler dev`/`npm start`専用のファイル**であり、実際にデプロイされる`index.js`バンドルにも、Cloudflare側のWorker実行環境にも一切反映されない。`grep`で確認済み(`sk_live_`などの値はバンドル内に存在しない)。

**実際にdevの`https://dev.paibot.app`を動かしていたのは、`.env.local`ではなく、`wrangler secret put`で個別に設定された、そのWorker固有のCloudflare Workers Secret(暗号化された実行時バインディング)だった。** これはどこにもドキュメント化されておらず、CI/コードのどこを見ても分からない、手動でその場限りで設定されていたもの(`wrangler secret list --name paibot-app-dev`で存在を確認)。本番Worker(`paibot-app`)には当然何も設定されておらず、初回デプロイで露呈した。

対処として、本番Workerにも同じ2つをSecretとして設定した:

```sh
export CLOUDFLARE_ACCOUNT_ID=b041431380f52e0bf2bb47b174e95b6a
echo "<production secret key>" | npx wrangler secret put CLERK_SECRET_KEY --name paibot-app
echo "<production publishable key>" | npx wrangler secret put NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY --name paibot-app
```

**`.env.local`ステップは無意味というわけではない**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`はNext.js/Viteの規約上、ビルド時にクライアントバンドルへ静的にインライン化される(ブラウザ側で使われるため、サーバー側の実行時バインディングとは別に必要)。なので、CIの`.env.local`ステップはクライアントバンドル用に必要だが、**サーバー側で使う`CLERK_SECRET_KEY`にとっては何の役にも立っておらず**、`wrangler secret put`による実行時Secretだけが効いている。

その後、`app.yml`(dev)・`app-production.yml`(production)双方に「Set Worker secrets」ステップを追加し、デプロイのたびにGitHub Secretsから`wrangler secret put`で流し込むようにした。冪等なので毎回実行しても無害で、これで「手動で一度設定したっきり、どこにも記録が無い」状態は解消された。Terraform管理(`cloudflare_workers_secret`等)は採用しなかった。Terraform stateには`sensitive`指定でも値が平文で残るため、秘密情報をstateに持ち込むアンチパターンを避けた。

### 続編: `SITE_INDEXABLE`/`SITE_URL`も同じ罠を踏んでいた(2026年9月)

`CLERK_SECRET_KEY`の件を直した後も、CIの`.env.local`には`SITE_INDEXABLE`/`SITE_URL`を書き続けていた(secretではなく非機密のvarなので、当時は「Secretとvarで扱いが違う」ことに気づいていなかった)。結果、**本番は初回デプロイからずっと`noindex`(`<meta name="robots">`・`X-Robots-Tag`ヘッダー・`robots.txt`の3箇所すべてで検索エンジンにインデックスを拒否)のまま公開されていた**。原因はまったく同じで、`SITE_INDEXABLE`/`SITE_URL`もCloudflare Workersの実行時varとしてしか読まれず(`scripts/check-i18n.mjs`が`wrangler dev --var`で個別に上書きして検証していたことからも分かる通り、これ自体は以前から把握していた設計だったが、本番ワークフローの`.env.local`側には反映されていなかった)、`.env.local`経由の値はビルド・デプロイ後のWorkerには一切届いていなかった。

`SITE_URL`は本番ではフォールバック値(`https://paibot.app`)とたまたま一致していたため実害が表面化しなかったが、`SITE_INDEXABLE`はフォールバックが`false`のため、本番が丸ごと検索エンジンから見えない状態になっていた。

対処: `wrangler.jsonc`のトップレベル(dev)と`env.production`それぞれに`vars`ブロックを追加し、`SITE_INDEXABLE`/`SITE_URL`を明示的に宣言(`vars`は`name`/`routes`と同じく環境間で継承されないため、両方に書く)。CIの`.env.local`からは両方の行を削除し、コメントで「ここに書いても効かない」ことを明記した。`scripts/check-i18n.mjs`の本番相当シミュレーション(`withServer(true, ...)`)にも`--var SITE_URL:https://paibot.app`を追加(devビルドの実際の値が`https://dev.paibot.app`に変わったことでテストの前提とズレていたため)。

**教訓**: SecretだけでなくvarもCloudflare Workersでは同じ原則(`.env.local`はデプロイ後のWorkerに効かない)が適用される。今後このアプリで環境変数を増やす時は、「secretかvarか」に関わらず、まず`wrangler.jsonc`の`vars`(非機密)か`wrangler secret put`(機密)のどちらかで実際にWorkerへ渡す設計にすること。

## Clerk本番インスタンス

Clerk公式CLI(`npx clerk deploy`、対話式で人間の操作が必須)で作成した。

- ドメイン: `paibot.app`(Frontend APIは`clerk.paibot.app`、Account Portalは`accounts.paibot.app`)
- DNSレコード5件(`clerk`/`accounts`/`clkmail`/`clk._domainkey`/`clk2._domainkey`)は、`clerk deploy`が出力したBINDゾーンファイルの内容を転記する形で**Terraform管理**にした(`infra/dns.tf`)。手動でCloudflareダッシュボードに入れる方式は選ばなかった(手順の再現性・レビュー可能性のため)。すべて`proxied = false`(Clerk自身がTLS終端するため)
- 本番Google OAuthクライアントは`paibot-app-prod`という新規GCPプロジェクト(`docs/infra/gcp.md`参照、`paibot-app-dev`とは別)に作成。リダイレクトURIは`https://clerk.paibot.app/v1/oauth_callback`(Clerkの「Walk me through creating them」フローで確認した正確な値)
- `clerk config pull --instance prod`で設定を取得し`config/clerk/production.json`として保存済み(開発用の`development.json`も同時に整備)。秘密値はCLIが自動でREDACTED済み、コミット前に目視確認もした
- 本番キーは`clerk env pull --instance prod`で取得し、`PROD_CLERK_PUBLISHABLE_KEY`/`PROD_CLERK_SECRET_KEY`としてGitHub Secretsに登録済み

## Cloudflare本番デプロイ用トークン

`CLOUDFLARE_API_TOKEN_PRODUCTION`として新規発行・登録済み。既存の`CLOUDFLARE_API_TOKEN`(dev用)がCloudflareのテンプレート("Edit Cloudflare Workers")をそのまま使っていて権限が広すぎた(Containers/Pages/R2/KV/Agentsなど、paibotが使っていないものまでEdit権限)ため、本番用は個別権限で絞って作成した。

- Account: Workers Scripts:Edit, Workers Observability:Edit, Account Settings:Read(対象アカウントは`Admin@paibot.co.jp's Account`のみ)
- Zone: Workers Routes:Edit(対象ゾーンは`paibot.app`のみ)

devのトークンを同様に絞り直すかは別途検討(未実施)。

## 秘密鍵の管理方式(解決済み)

以前この節は「`.env.local`経由の焼き込み方式を踏襲する」という未検証の前提で書かれていたが、上の「重大な誤解だったポイント」の通り誤りだった。実際に効いているのは`wrangler secret put`によるCloudflare Workers Secret(ランタイムバインディング)で、`.env.local`は(`NEXT_PUBLIC_*`のクライアントバンドル埋め込みを除いて)デプロイ後のWorkerには影響しない。今後この構成を変える場合は、まずこの実態を踏まえること。

## 追記(2026年9月): 決まったこと

- devのカスタムドメイン`dev.paibot.app`は`wrangler.jsonc`の`routes`(`custom_domain: true`)で紐付け済み。本番の`paibot.app`も同じ方式(`env.production`側に別途`routes`を定義、実装済み)。ドメインはWorkerの属性なのでTerraformでは管理しない
- Clerkの本番移行は手動(公式CLIの`clerk deploy`を使う)。詳細は上記
- 本番のGoogleログインには、Google Cloud Consoleで自分専用のOAuthクライアントを作る必要がある(開発インスタンスはClerkの共有認証情報)。作成先は`paibot-app-prod`(`docs/infra/gcp.md`)
- タグの打ち方: ワークフローが自動で行う(`git tag release-YYYY-MM-DD && git push origin release-YYYY-MM-DD`相当)。手で打つのは基本不要

## 残っているタスク

- 初回デプロイ実施済み。`https://paibot.app`が200で表示されることを確認済み(`/ja`へのリダイレクト含む)。本番Googleログインも実際にログインが通ることを手動確認済み
- `PROD_CLERK_PUBLISHABLE_KEY`/`PROD_CLERK_SECRET_KEY`/`CLOUDFLARE_API_TOKEN_PRODUCTION`は現状リポジトリ全体のsecret。Environment(`production`)単位のsecretへの移行は未実施
- devの`CLOUDFLARE_API_TOKEN`(テンプレートのまま権限が広い)を絞り直すかどうか未検討
