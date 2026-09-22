@AGENTS.md

## 進行中の計画

- **数学問題集(LLM生成+D1保存)、公開URLは`/math`**: 承認済みの計画が`docs/plans/problemset.md`にある(ファイル名は計画時の仮称`problemset`のまま)。Phase 2(vinext統一の技術検証)まで完了、Phase 3(LLM生成・検証パイプライン)以降は未着手。再開する際はまずこのファイルを読むこと。
  - 以前あった手続き生成の算数ドリル(`/math`)は2026年9月にアーカイブし、公開ルートから外した(`docs/archive/math-drill-v1/`)。跡地の`/math`にはこの新しい問題集が入る。
  - `math-tex.tsx`/`math-tex.module.css`(KaTeX表示部品)はアーカイブせず`src/components/`に残してあり、新しい問題集で再利用する想定。
- **本番デプロイ**: `docs/plans/production-deploy.md`に実装内容がある。実装済み、**初回の実デプロイ(`Run workflow`)と動作確認はまだ**。開発環境のCD(`.github/workflows/app.yml`の`deploy-dev`、`https://dev.paibot.app`)、本番のCD(`.github/workflows/app-production.yml`、`workflow_dispatch`のみ、タグ自動作成)ともに実装済み。
  - `wrangler.jsonc`に`env.production`追加済み。**ビルド時に`CLOUDFLARE_ENV=production`を渡さないと、`vinext build`は`env.production`を無視してdev設定を出力する**(ハマったポイント、詳細は`docs/plans/production-deploy.md`)。
  - **Clerk本番への移行は手動(Terraformでは管理しない)**: Clerk用のTerraformプロバイダはコミュニティ製のみ(`buildwithdeck/clerk`が有力だが開発者2人・v0.x、しかも設定管理にはベータのPlatform APIとその強い権限のキーが必要)で見送った。代わりにClerk公式CLIを使う: `clerk auth login` → `clerk link` → `clerk deploy`(本番インスタンス作成・CNAME案内・Google/Apple本番認証情報の入力・DNS/SSL検証までを案内)。実施済み。本番のGoogleログインには自分専用のGoogle OAuthクライアントが必要で、`paibot-app-prod`(`docs/infra/gcp.md`)に作成済み。
  - Clerkが要求するDNSレコード(カスタムドメイン+メールDKIM)は`infra/dns.tf`でTerraform管理にした(手動でCloudflareダッシュボードに入れる方式は不採用)。
  - `clerk config pull`で設定を取り出し、`config/clerk/development.json`・`production.json`として保存済み。設定を変えたら`pull`し直すこと。

## インフラ(アカウント管理まわりのドキュメント)

- **Cloudflare**: 実際に本番運用中。アカウント自体の管理状況(2つのアカウントが存在する点に注意、メンバー、Access等)は`docs/infra/cloudflare.md`。リソース管理の詳細は次節および`infra/README.md`。
- **AWS/GCP**: まだ用途未定(2026年9月〜account作成のみ)。AWS OrganizationとIAM Identity Centerを作成済み(`docs/infra/aws.md`)。GCP Organization(`paibot.co.jp`)配下に`paibot-app-dev`プロジェクトを作成済み(`docs/infra/gcp.md`)。paibotのインフラはCloudflare/Terraformのみで、AWS/GCPはまだ何にも使っていない。

## インフラ(Terraform / Cloudflare)

- `infra/`にTerraformの最小構成がある(詳細・手順・注意点は`infra/README.md`)。stateはR2の専用バケット`paibot-app-terraform-state`(Terraform外で手動作成、`terraform destroy`に巻き込まれない)。今の管理対象は`paibot.app`ゾーンの読み取り参照と、dev Worker(`paibot-app-dev`)を守るCloudflare Access(`infra/access.tf`、`sanofc@gmail.com`のみ許可)。リソースは必要になってから追加する方針。
- **TerraformとWranglerの境界**: Worker本体・バインディング・ルート(カスタムドメイン含む、例: `dev.paibot.app`)は`wrangler.jsonc`。Terraformはそれ以外のアカウントレベルのリソース(将来のDNS単体、D1、R2、Accessなど)。同じ対象を両方で管理しない。
- ワークフロー: `App`(アプリの検証+dev自動デプロイ)、`Infra Plan`(PR・手動実行でplan)、`Infra Apply`(手動実行でapply)。
- トークンは用途ごとに分離: `CLOUDFLARE_API_TOKEN`(Wranglerのdevデプロイ)、`CLOUDFLARE_API_TOKEN_TERRAFORM`(現状は「Access: アプリとポリシー→編集」と、ゾーン`paibot.app`のDNS→読み取り。DNSレコードを管理し始めたら「DNS→編集」に変える。「ゾーン編集」は付けない)、`TF_STATE_R2_*`(state用バケットだけに限定したS3互換キー)。
- **`wrangler r2 bucket create`などが`wrangler.jsonc`へのバインディング追加を提案してくることがある。stateバケットをWorkerにバインドしてはいけないので、応じない(応じてしまったら`git checkout wrangler.jsonc`で戻す)。**
- 未実施: `infra-apply`環境の承認者設定(GitHubのプラン制限で使えない可能性あり)。消えると困るリソースを管理し始める時点で、planに削除・作り直しが含まれたらapplyを失敗させるガードを入れる。

## 新しいツールページを追加するときの構成

各ツール(ip/wc/arith/age など)は同じパターンで追加している。

- ルート: `src/app/[locale]/<slug>/page.tsx`(`generateMetadata`でSEOメタデータを設定し、`components/`のクライアントコンポーネントを呼び出すだけ)
- 実体: `src/components/<name>.tsx`(クライアントコンポーネント)
- スタイル: `src/components/<name>.module.css`をコンポーネントと同じ場所に追加(CSS Modulesなのでクラス名は自動でユニーク化される)。共通のCSS変数(`--accent`/`--muted`/`--line`/`--surface`/`--radius`/`--error`/`--success`など)は`src/styles/theme.css`で定義。詳細と既存の共通部品(`ToolLayout`など)は`src/styles/README.md`を参照
- 翻訳: `messages/ja.json`・`messages/en.json`の`App`名前空間に翻訳キーを追加(型は`src/i18n/types.d.ts`がja.jsonから自動推論するので、キーを追加するだけでよい)
- 公開設定: `src/lib/seo.ts`の`publicPaths`にパスを追加(サイトマップ・robotsに反映される)
- トップページ: `src/components/home.tsx`の`app-grid`にカードを追加

## 動作確認

- `npm run check:i18n`: ビルド成果物(`dist/server`)を`wrangler dev`で起動し、fetchだけで検証するブラックボックステスト(翻訳HTML・canonical/hreflang・認証リダイレクト・404・サイトマップ・robots)。事前に`npm run build`が必要。
- `npm run check:browser`: 実際のブラウザ(Playwright、devDependencyとして常設)で`npm run dev`(ポート3001)に対して行う検証。全ツールページがJS/コンソールエラーなしで表示できるか、テーマ切り替えが効いてlocalStorageに永続化されるか、言語切り替え・リダイレクトを繰り返しても"No intl context found"が再発しないか、をチェックする。事前にdevサーバーが起動している必要がある(初回のみ`npx playwright install chromium`でブラウザ本体が必要)。
- 上記2つでカバーしていない一時的な確認(新しいUIの見た目をスクリーンショットで見る、等)は、その場限りのPlaywrightスクリプトをスクラッチパッド配下に書いて使い捨てる。恒久的に使う価値がある検証だと分かったら`scripts/check-browser.mjs`に追記する。
- **devサーバーのポートに注意**: ユーザー自身が別途devサーバーを立てていることがある。動作確認後の後片付けで在り物のポートを無差別killすると、ユーザーのセッションを巻き込んで落としてしまう。確認用には別ポートを使うか、自分が起動したPIDだけをkillすること

## ビルドツール(2026年9月〜、vinextに統一済み)

`npm run dev`・`npm run build`・`npm start` は素のNext.jsではなく[vinext](https://vinext.dev/)(Next.js on Cloudflare Workersアダプター)経由で動く(`dev`はvinext devでポート3001、`build`はvinext build→`dist/`、`start`は`wrangler dev --config dist/server/wrangler.json`)。

- 理由: D1などCloudflareバインディングに`import { env } from "cloudflare:workers"`でアクセスするコードを含むため。この特殊モジュールは素のNext.js(`next build`/`next dev`/`tsc`)では解決できず、型定義を足すだけでも直らない(Next.jsがビルド時にルートを実際にrequireしてページ設定を集める段階で失敗する。実測済み)。
- 素のNext.jsコマンドは`dev:next`/`build:next`/`start:next`として残してある(Cloudflareバインディングを使わない範囲の素早い確認用。D1関連のファイルが存在すると型チェック・ビルドが落ちる)。
- `npm run typecheck`(`tsc --noEmit`)は`.next/types/validator.ts`(Next.jsのtyped routes機能が生成)に依存しており、これは`vinext build`では生成されない。stale/未生成だと`AppRoutes`等のエラーが出るので、その場合は一度`npx next build`(`build:next`と同義)を走らせて`.next`を再生成してから`typecheck`を実行する。
- `wrangler dev`は`process.env`をそのまま引き継がない。実行時に値を渡したい場合(`check-i18n.mjs`の`SITE_INDEXABLE`切り替えなど)は`--var KEY:VALUE`を使う(`env: {...process.env, KEY: ...}`のような従来のNode的な渡し方は効かない)。`--var`が実際にリクエストごとに動的反映されること(ビルド時に焼き込まれるわけではないこと)は実測で確認済み。
- Cloudflareの各種HTML出力(hreflangの`<link>`の属性順序など)は素のNext.jsと完全一致するとは限らない。`scripts/check-i18n.mjs`のアサーションは属性の順序・大文字小文字に依存しない形にしてある。
- `npm run dev`(vinext dev)で、稀に「No intl context found」(`useLocale()`などがコンテキストを見つけられない)エラーが出ることがあった。原因はvinext本体のバグではなく、vinextのRSCエントリ経由で読み込まれる`next-intl`/`use-intl`と、Viteがクライアント用にprebundleした同じパッケージが、モジュールグラフ上で別インスタンスとして二重に読み込まれることがあるため(いわゆる二重モジュール問題)。`React.createContext`はモジュールインスタンスごとに別物になるので、片方が作ったProviderのコンテキストをもう片方の`useContext`が見つけられなくなる。
  - 対処: `src/components/intl-provider.tsx`という専用の`"use client"`ラッパーコンポーネントを作り、`next-intl`の`NextIntlClientProvider`をこの1箇所経由でだけ import・re-exportする形にして、`src/app/[locale]/layout.tsx`からはこの`IntlProvider`を使う。こうすることで両方の経路が同じモジュールインスタンスを解決するようになる。
  - この修正は`npm run check:browser`の「repeated locale switching and redirects keep intl context intact」チェックで回帰確認している。再発したらまずこのテストで検知できる。
  - 教訓: エラーのスタックトレースがサードパーティ内部(`vinext/dist/shims/*`など)で止まっていても、原因がそこにあるとは限らない。「発生箇所」と「原因」がずれるケースとして二重モジュール問題は疑ってよい。
- **`npm run dev`(vinext dev)でClerkが壊れる問題は`patch-package`で解消済み**(2026年9月)。以前は`/ja/sign-in`の表示・未ログイン状態での`/ja/dashboard`アクセスの両方で`ReferenceError: require is not defined`が発生していたが、`@clerk/nextjs@7.9.2`本体に`patches/@clerk+nextjs+7.9.2.patch`を当てることで、標準の`auth()`・`<SignIn>`ともにvinext dev上で正常動作する。`npm install`のたびに`postinstall`(`patch-package`)で自動的に再適用される。
  - 原因はvinext本体ではなく、`@clerk/nextjs`の「ESM」ビルド内に生のCJS `require()`呼び出しが複数残っていたこと(Clerk公式の未マージPR [clerk/javascript#7954](https://github.com/clerk/javascript/pull/7954)が同じ問題を報告・修正している。参照: [cloudflare/vinext#73](https://github.com/cloudflare/vinext/issues/73))。vinext devのRSC環境はworkerdサンドボックス内で動くため、グローバルな`require`関数が存在せず、これらの呼び出しが即座に失敗する。`wrangler dev`・production buildでは(webpack/esbuildが`require()`を解決してしまうため)発生しない、vinext dev限定の問題だった。
  - パッチした3箇所(いずれも`node_modules/@clerk/nextjs/dist/esm/`配下):
    1. `app-router/server/auth.js`: `auth()`/`auth.protect()`冒頭の`require("server-only")`を、`typeof require === "function"`を確認してから呼ぶ`assertServerOnly()`(新規ファイル`app-router/server/assertServerOnly.js`)に置き換え。
    2. `client-boundary/hooks/usePathnameWithoutCatchAll.js`: フック本体内の条件付き`require("next/navigation")`を、ファイル先頭での静的`import { useParams, usePathname } from "next/navigation"`に置き換え(Reactのフックはループ・条件分岐の外で呼ぶ必要があるため、フックの先頭に移動)。
    3. `runtime/node/safe-node-apis.js`: `require("node:fs")`/`require("node:path")`+`module.exports`を、静的`import`+`export default`に置き換え。**この3つ目が実質的な決め手だった**。`server/fs/utils.js`が`#safe-node-apis`という条件付きサブパスインポート経由でこのファイルをトップレベルで静的import しており、`keyless-node.js`(Clerkの自動キー発行=keylessモード用で、`<SignIn>`のレンダリング経路から到達する)がそれを更に静的importしているため、`try/catch`で囲まれておらず、`<SignIn>`をレンダリングするだけで無条件に実行されていた。
  - 診断の経緯: 最初は`usePathnameWithoutCatchAll.js`の`require()`が`/sign-in`のクラッシュ原因だと推測して2箇所だけパッチしたが、直らなかった。`vite.config.ts`の`define`で一時的にグローバルな`require`識別子を「呼ばれた引数を例外メッセージに含めて投げる」関数に差し替える診断コードを仕込み、実際に渡されている引数(`"node:fs"`)を特定してから`safe-node-apis.js`が真因だと判明した。**エラーのスタックトレースがサードパーティ内部で止まって発生箇所を特定できない場合、`define`でグローバル識別子を診断用の関数に差し替えると、実際の呼び出し引数を確認できる。**
  - パッチ後、標準の`auth()`が動くことを実測確認したため、以前入れていた`src/lib/auth.ts`の`getAuthUser()`ワークアラウンド(`@clerk/backend`の`verifyToken()`で自前検証する回避策)は削除し、`dashboard/page.tsx`は`@clerk/nextjs/server`の`auth()`を直接使う形に戻した。`@clerk/backend`への直接依存、`vite.config.ts`の`VINEXT_DEV_WORKAROUND`関連の`define`・`optimizeDeps.include`もすべて削除済み。
  - **上記パッチだけでは`/sign-in`のウィジェットが実際には使えなかった**。require()エラーは消えたが、代わりにブラウザ側で`useSession can only be used within the <ClerkProvider />`という別のエラーが出てフォームが表示できなかった(`npm ls @clerk/shared`で確認した限りパッケージは1バージョンのみで、npm的な重複ではない)。原因は、`providers.tsx`(`"use client"`、`ClerkProvider`をラップ)経由の解決と、`sign-in/page.tsx`(Server Component)から直接`@clerk/nextjs`の`<SignIn>`をimportした場合の解決とで、vinext devが`@clerk/shared/react`を別々のモジュールインスタンスとして扱ってしまうため。これも「No intl context found」と同種の二重モジュール問題で、対処も同じ: `src/components/sign-in-widget.tsx`・`sign-up-widget.tsx`という専用の`"use client"`ラッパーを作り、ページ側はこれ経由でのみ`<SignIn>`/`<SignUp>`を使う。
  - **パッチ運用中は`@clerk/nextjs`のバージョンをキャレット無しで完全固定している**(`"7.9.2"`、`^7.9.2`ではない)。`patch-package`はパッチ内容がテキストとして適用できてしまえば別バージョンにも警告だけで適用を続行することがあり、「バージョンが変われば対象が見つからず必ず気づける」というのは正確ではない(誤ったバージョンに中身のズレたパッチが"成功"扱いで当たってしまう恐れがある)。バージョンを固定した上で、`npm install`ではなく`package-lock.json`に厳密に従う`npm ci`を使うこと。
  - **`postinstall`は`patch-package --error-on-fail --error-on-warn`にしてある**(素の`patch-package`ではない)。`--error-on-fail`はパッチ適用失敗時に、`--error-on-warn`はfuzzy match等の警告時にも`npm install`/`npm ci`自体を非ゼロ終了させる。パッチ対象ファイルの中身を意図的に壊してから`npx patch-package --error-on-fail --error-on-warn`を実行し、`exit code: 1`できちんと失敗することを確認済み。
  - **`npm ci --omit=dev`でビルドしないこと**: `patch-package`は`devDependencies`なので、devDependency抜きでインストールすると`postinstall`が動かず`@clerk/nextjs`が未パッチのまま`vinext build`が走る(実害としては、パッチ無しでも本番ビルド自体はこれまで実際に動いていたので即座に壊れるわけではないが、パッチ適用済みという前提が崩れる)。**`npm run build`(=`vinext build`)を実行する前は必ず`npm ci`(devDependencies込み)を使うこと**。Cloudflare Workersへの実際のデプロイ(`wrangler deploy`/`deploy:vinext`)は、ビルド済みの`dist/`だけをアップロードする段階なので、そこでは`node_modules`もdevDependenciesも不要。
  - **`@clerk/nextjs`をアップデートしたら、このパッチがまだ必要か確認すること**: バージョンを上げる際は`package.json`のピン止めを新バージョンに変更し、`npm install`→`npx patch-package @clerk/nextjs`で作り直す。アップデート後は`npm run dev`で`/ja/sign-in`と`/ja/dashboard`(未ログイン状態でのリダイレクト)を一度手動確認し、問題なければ`patches/`ごとパッチファイルを削除し、この節も削除する。`sign-in-widget.tsx`/`sign-up-widget.tsx`のラッパーが引き続き必要かも同時に確認する(不要なら直接`@clerk/nextjs`からimportする形に戻してよい)。
  - `npm run check:i18n`(本番/`wrangler dev`経路)と`npm run check:browser`(vinext dev経路、`/sign-in`のメールアドレス入力欄が実際に表示されることまで確認)の両方で、`/sign-in`・`/dashboard`のリダイレクトが回帰確認されている。ただし自動化されているのはここまでで、実際のログイン完了→dashboard表示→ログアウト→再アクセス拒否までの一連の流れは、本番相当環境での手動確認が必要(未実施、実施する場合は実際にテストアカウントでのログインが必要になるため事前に確認すること)。
  - **OpenNext(`@opennextjs/cloudflare`)への乗り換えは検討済みで見送った**(2026年9月)。理由: このプロジェクトはNext.js 16の`proxy.ts`(Node.js middlewareとして強制コンパイルされる)を使っているが、OpenNext側のNode.js middleware対応は2026年8月25日にマージされたばかりで、直後から「何もしないハンドラでも約4.6MBにバンドルされる」等の未解決の重大バグ(opennextjs-cloudflare issue #1373, #1376)が出ている。乗り換えても同種の「若いアダプターの穴」を別の場所で踏むだけになる可能性が高いと判断した。詳細・再検討の条件は`docs/plans/opennext-investigation.md`を参照。
