@AGENTS.md

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
  - **`@clerk/nextjs`をアップデートしたら、このパッチがまだ必要か確認すること**: `npx patch-package @clerk/nextjs`はバージョンが変わると`patches/@clerk+nextjs+<version>.patch`のファイル名がズレるため、`npm install`時に「patch対象が見つからない」という警告が出ればまず気づける。それに加えて、アップデート後は`npm run dev`で`/ja/sign-in`と`/ja/dashboard`(未ログイン状態でのリダイレクト)を一度手動確認し、問題なければ`patches/`ごとパッチファイルを削除し、この節も削除する。`sign-in-widget.tsx`/`sign-up-widget.tsx`のラッパーが引き続き必要かも同時に確認する(不要なら直接`@clerk/nextjs`からimportする形に戻してよい)。
  - `npm run check:i18n`(本番/`wrangler dev`経路)と`npm run check:browser`(vinext dev経路、`/sign-in`のメールアドレス入力欄が実際に表示されることまで確認)の両方で、`/sign-in`・`/dashboard`のリダイレクトが回帰確認されている。
  - **OpenNext(`@opennextjs/cloudflare`)への乗り換えは検討済みで見送った**(2026年9月)。理由: このプロジェクトはNext.js 16の`proxy.ts`(Node.js middlewareとして強制コンパイルされる)を使っているが、OpenNext側のNode.js middleware対応は2026年8月25日にマージされたばかりで、直後から「何もしないハンドラでも約4.6MBにバンドルされる」等の未解決の重大バグ(opennextjs-cloudflare issue #1373, #1376)が出ている。乗り換えても同種の「若いアダプターの穴」を別の場所で踏むだけになる可能性が高いと判断した。再検討の条件は`/Users/sanohiroyuki/.claude/plans/foamy-tickling-origami.md`を参照。
