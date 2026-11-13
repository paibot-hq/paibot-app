ツール・検索・ファイル操作は使わない。次の数学本文を、指摘された箇所だけ修正する。
本文全体を書き直さず、最小限の JSON Patch を返す。指摘と無関係な文章・数値・図・例題を変更しない。
内容が変わる修正は ja/en/zh の3言語をそろえる。特定言語の誤訳だけならその言語だけを直す。

本文データの仕様（以下は編集対象の仕様であって、回答の形式ではない）:
{{rules}}

学習項目:
{{item}}

指摘:
{{feedback}}

現在の本文:
{{lesson}}

回答は必ず次の JSON のみ。コードフェンスは付けない。
{"edits":[{"op":"replace","path":"/sections/1/paragraphs/0/ja","value":"修正した段落全体"}]}
- op は replace（既存の値を置換）、add（新しいフィールド・配列要素を追加）、remove（削除）のみ。
- path は JSON Pointer。対象は /sections、/examples、/mistakes 以下のみ。配列の位置は0始まり。
- replace/add は value 必須。配列の末尾への add は /- を使う。ない親の下に直接追加せず、必要な親フィールドを add する。
- 複数の配列要素を remove する場合は、大きい位置から順に削除する。無関係な要素まで置き換えない。
- reviewedAt のような公開情報は操作しない。修正が不要なら edits は空配列にする。
- 式の欄には機械用の + - * / : ^ を使う。÷ や ×、TeX を入れない。□を使う式は x のまま、style: "box" を付ける。
- mistakes の wrong は数学的に成り立たない等式、right は同じ左辺で成り立つ等式にする。場面には合わなくても算術として正しい「2*6 = 12」を wrong にしてはいけない。wrong/right の式を変える場合は note の3言語も示した誤りと一致させる。
- 上記は計算例の書式。証明・合同条件の判断・論理などを式の文法に押し込めない。必要なら例題全体を kind: "reason", prompt, reasoning, note の形式に置き換える（question・steps は削除）。推論の誤りを表す mistakes も kind: "reason" と3言語の wrong/right/note に置き換えられる。文章の推論は独立したレビュー役が検証する。
- 単なる計算の誤りを隠したり検算を回避したりするために reason に変えてはいけない。計算例は正しい式に直す。reason は、その項目が本当に証明・論理・概念の判断を扱う場合に使う。
- reason に置き換えたら、古い question・steps は必ず remove する。mistakes の wrong/right を文章にしたら kind: "reason" も付ける。
- solve の各行は元の方程式と完全に同じ解集合が必要。図形の長さとして正の平方根だけを求める例は、条件を prompt に書き、kind: "value", question: "sqrt(16)", steps: ["sqrt(16) = 4"] のように正の平方根の計算として表せる。無条件の x^2=16 の解を x=4 だけにしない。
- style の値は times / box / ratio / mixed のみ。行列の表示には style を付けず、式に [[1,2],[3,4]] のような行列を書く。
