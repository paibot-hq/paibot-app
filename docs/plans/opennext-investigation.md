# OpenNext移行の検討結果:今は移行しない

> 元はプランモードの一時ファイル(`~/.claude/plans/foamy-tickling-origami.md`)にあった調査結果。プロジェクト外の絶対パスを参照していたため、`docs/plans/`配下に移動して恒久化した(2026年9月)。

## Context

`npm run dev`(vinext dev)でClerkの`auth()`がServer Componentで動かない問題(`require is not defined`)を受けて、より枯れたアダプターである`@opennextjs/cloudflare`(OpenNext for Cloudflare)へ乗り換えるべきか検討した。OpenNextは実際のNext.js本体をそのままビルドして使うため、vinextのようなゼロからの再実装に起因する互換性ギャップが原理的に起きにくいという仮説のもと、実際に移行可能か調査した。

## 調査結果:移行しない方がよい、決定的な理由が見つかった

このプロジェクトはNext.js 16系(`^16.3.5`)を使っており、Next.js 16では`middleware.ts`が廃止され`proxy.ts`に一本化された(`src/proxy.ts`)。**Next.js 16のProxyは常にNode.jsランタイムでコンパイルされる仕様であり、Edgeランタイムを選ぶことができない**(Next.js公式のビルドエラーメッセージ:「Proxy always runs on Node.js runtime」)。

`@opennextjs/cloudflare`は、このNode.js Middleware(=Next.js 16のProxy)への対応を**2026年8月25日にマージしたばかり**(PR #1309)で、現行の最新版(`1.20.6`, 2026-09-02リリース)でようやく「ビルドが通る」段階になった、非常に新しい機能。

その直後から、まさにこの機能に対する重大なバグが複数報告されている:

- [Issue #1373](https://github.com/opennextjs/opennextjs-cloudflare/issues/1373)(未解決、2026-08-31): 「proxy.ts(Node.js middleware)が、何もしないハンドラでも約4.6MBにバンドルされる」
- [Issue #1376](https://github.com/opennextjs/opennextjs-cloudflare/issues/1376)(未解決、2026-09-01): 未使用の`@vercel/og`がバンドルに混入し、無料プランの3MiB上限を超える

#1373には、Next.js **16.3.1**(うちとほぼ同じバージョン)でこのアダプターを本番運用している別の開発者から、具体的で説得力のあるコメントが付いている:

> 10MiB(gzip)のハード上限と、8.7MiBでビルドを落とすCI guardを運用している。挙動が変わらないハンドラが356KB→4.6MBに膨れるのは、後で最適化すればいい程度の話ではなく、残りの余裕のほとんどを、フレームワークが強制する単なるリネームのために失うということだ。**この理由で、うちはまだ`middleware.ts`→`proxy.ts`のリネームをしていない。**

つまり、うちの`src/proxy.ts`(Clerk + next-intlを両方使う、まさにこのプロジェクトの認証・多言語ルーティングの心臓部)をOpenNextでビルドすると、同じ壁にぶつかる可能性が高い。バンドルサイズだけで無料プランの上限を超えるか、有料プランでも残り予算の大半を食う。

## 結論・推奨

**今はOpenNextへ移行しない。** 「OpenNextは枯れている」という判断は全体としては正しいが、Next.js 16の`proxy.ts`対応という、うちの構成に直接関わる部分に限っては、vinextと同じかそれ以上に新しく、未解決の重大バグを抱えている。乗り換えても同じ種類の「若いアダプターの穴を踏む」を別の場所で繰り返すだけになる可能性が高い。

### 当面の対応

> **この節は調査時点(2026年9月中旬)のもので、その後この同じセッションで状況が変わっている。** Clerkの`require is not defined`問題は、後日`patch-package`(`@clerk/nextjs`へのパッチ、詳細はCLAUDE.md)で解消済みなので、「`npm run dev:next`を使う」という回避策はもう不要。ただし本題である「OpenNextのNode.js middleware対応が未成熟」という結論そのものは変わらない。

- ~~Clerkのログイン確認は引き続き`npm run dev:next`(素のNext.js)を使う~~ → `patch-package`で解消済み、`npm run dev`で問題なし
- 本番ビルド(`npm run build` → `check:i18n`)ではこの問題は発生しないことを確認済み
- vinext側(cloudflare/vinext#73)・Clerk側の両方でこの問題への対応が進行中なので、数ヶ月単位で状況を再確認する

### 再検討のタイミング

以下のいずれかが起きたら、OpenNextへの移行を再検討する価値がある:
- `opennextjs-cloudflare` issue #1373 / #1376(バンドルサイズ問題)が解決される
- vinext側で今後別の深刻な互換性問題が見つかり、`patch-package`のような自前対応でも追いつかなくなる

いずれの場合も、再検討時にまず`gh issue view`で両issueの最新状態を確認してから判断する。
