# 本番デプロイの設計(2026年9月に合意、未実装)

開発環境(`paibot-app-dev`)へのCD設定と合わせて話した内容。開発環境CDのCloudflare APIトークン待ちで、本番側はまだ着手していない。

## タグの命名規則

日付ベース。semver(`vX.Y.Z`)は「他のものがバージョン番号に依存して互換性を判断する」場面で意味を持つ仕組みで、paibot.appは単一デプロイのWebアプリで外部の依存者がいないため恩恵が薄いと判断し、見送った。

```
release-2026-09-17
release-2026-09-17-2   # 同日2回目以降は末尾に連番
```

## トリガーとフロー

- リリース: `git tag release-2026-09-17 && git push origin release-2026-09-17` → タグpushで本番デプロイが自動的に走る
- ロールバック/再デプロイ: `workflow_dispatch`で既存タグ名(または任意のref)を指定して手動実行。新しくタグを打ち直さなくていい
- `environment: production`(GitHub Environments)を使い、承認者が居ないと実際のデプロイジョブが進まないようにする。タグpushで自動発火した場合でもこの承認ゲートは効く

## ワークフロー案

```yaml
name: Deploy (production)

on:
  push:
    tags:
      - "release-*"
  workflow_dispatch:
    inputs:
      ref:
        description: "再デプロイ/ロールバック用に、タグまたはコミットを指定"
        required: true

concurrency:
  group: deploy-production
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v7
        with:
          ref: ${{ inputs.ref || github.ref }}

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Set up .env.local (本番Clerkキー)
        run: |
          cat <<EOF > .env.local
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${{ secrets.PROD_CLERK_PUBLISHABLE_KEY }}
          CLERK_SECRET_KEY=${{ secrets.PROD_CLERK_SECRET_KEY }}
          SITE_URL=https://paibot.app
          SITE_INDEXABLE=true
          EOF

      - run: npm run build

      - name: Deploy to Cloudflare Workers(production環境)
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN_PRODUCTION }}
        run: npx wrangler deploy --config dist/server/wrangler.json --env production

      - name: Create GitHub Release
        run: gh release create ${{ github.ref_name }} --generate-notes
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

`gh release create --generate-notes`は前回タグからのコミット/PRを自動でまとめる。追加の秘密情報は不要(`GITHUB_TOKEN`はActions実行時に自動供給される)。

## まだ揃っていない前提条件

- `wrangler.jsonc`に`env.production`ブロック(本番用Worker名・ルート設定)がまだ無い
- Clerkの本番インスタンス・本番キーがまだ無い
- `paibot.app`ドメインのCloudflareへの追加・カスタムドメイン設定がまだ
- GitHub Secrets: `PROD_CLERK_PUBLISHABLE_KEY` / `PROD_CLERK_SECRET_KEY` / `CLOUDFLARE_API_TOKEN_PRODUCTION` がまだ無い
- GitHubのSettings→EnvironmentsでProduction環境の承認者設定がまだ

## 検討事項として残っていること

- Clerkの秘密鍵を`vinext build`のビルド時に`.env.local`経由で成果物へ焼き込む今の方式(開発環境も同様)を、本番の秘密鍵でもそのまま踏襲していいか。Cloudflare Workersの`wrangler secret put`によるランタイムシークレットの方が焼き込み方式より一般的には好まれるが、現状の仕組み(vinext buildが`.env.local`を読む)と相性を要検討。

## 前提: 先に開発環境のCDを完了させる

本番の話をする前に、開発環境(`paibot-app-dev`)へのCDをまず動かす。CloudflareのAPIトークン(「Edit Cloudflare Workers」テンプレートで作成)待ちの状態。

