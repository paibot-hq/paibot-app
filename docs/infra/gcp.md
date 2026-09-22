# GCP Organization(2026年9月〜)

paibotの現在のインフラ(`infra/README.md`参照)はCloudflare/Terraformのみで、GCPをリソースホスティングとして使ってはいない。ただし`paibot-app-prod`は、Clerk本番インスタンスの本番Google OAuthクライアント置き場という具体的な用途で使う(`docs/plans/production-deploy.md`参照)。`paibot-app-dev`は引き続き「今後使う可能性がある」ため確保してあるだけで用途未定。AWS版は`docs/infra/aws.md`。

## 構成

- **Organization**: `paibot.co.jp`(ID `996974845717`、Cloud Identity Customer ID `C03mob2c4`)。`admin@paibot.co.jp`がOrganization管理者。
- **プロジェクト**:
  - `paibot-app-dev`(プロジェクト番号 `310761273368`)。用途未定。
  - `paibot-app-prod`(プロジェクト番号 `614262061030`)。本番Google OAuthクライアント(Clerk本番インスタンス用)を置く。
- **IAM**: `sanofc@gmail.com`が両プロジェクトの`roles/owner`。

## AWSとの違い(はまったポイント)

AWSはIAM Identity Center経由の外部フェデレーションをそのまま許容する設計だったが、GCPは組織外プリンシパル(`paibot.co.jp`ドメイン外、今回で言う`sanofc@gmail.com`のようなgmail.comアカウント)への権限付与にかなり強い制限がかかる。2段階でエラーになった。

1. **`ORG_MUST_INVITE_EXTERNAL_OWNERS`**: 組織外プリンシパルに`roles/owner`をCLI/APIから直接付与できない。Cloud Consoleから「アクセス権を付与」→招待メール送信→本人が承諾、という手動フローが必須。
2. **組織ポリシー「ドメインで制限された共有」(`constraints/iam.allowedPolicyMemberDomains`)**: Organization全体のデフォルトで有効になっていて、許可ドメイン外のプリンシパルを一律ブロックする。個別メールアドレスの許可リストという機能は無いため、**`paibot-app-dev`プロジェクト単位でポリシーを上書き(Allow All)**して回避した。Organization全体のデフォルトはそのまま(制限あり)。

検討したが見送った代替案: `sanofc@gmail.com`の代わりに`paibot.co.jp`ドメインの正式なWorkspaceユーザー(例: `you@paibot.co.jp`)を発行し、それを日常作業アカウントにする方法。組織ポリシーを毎プロジェクト削らずに済むが、Workspaceのシート・ログインアカウントが増えるコストがある。今回は「組織には入らない」(gmail.comのまま、プロジェクト単位のポリシー上書き)を選択した。

## ローカルCLI設定(`gcloud`)

`gcloud config configurations`でAWSプロファイルと同様の切り替えができる。`paibot-app-dev`・`paibot-app-prod`それぞれに同じパターンで作成済み。

```sh
gcloud config configurations create paibot-app-prod
gcloud config set account sanofc@gmail.com --configuration=paibot-app-prod
gcloud config set project paibot-app-prod --configuration=paibot-app-prod
```

使うとき: `gcloud config configurations activate paibot-app-prod`、または個別コマンドに`--account`/`--project`を都度指定。

**注意**: `gcloud auth login <account>`は、その時点でアクティブなconfigurationの`account`プロパティも一緒に上書きする。複数configurationを使い分けている場合、ログイン前にどれがアクティブか確認すること(意図せず別のconfigurationのアカウントが上書きされたことが実際にあった)。

## ハマったポイント: Cloud ConsoleのIAM「アクセスを許可」ボタンに注意

`admin@paibot.co.jp`用のURLを、ブラウザで別アカウント(`sanofc@gmail.com`)にログインしたまま開いた際、「追加のアクセス権が必要です」という画面が出た。そこで「アクセスを許可」を押すと、**`roles/resourcemanager.projectMover`のような、本来意図しないロールがそのアカウント自身に自己付与されてしまった**(承認フローを介さず即座に反映された)。Cloud ConsoleのIAMトラブルシューティングUIが「今ログイン中のアカウントに欠けている権限」を検出して自己付与を提案してくるだけで、目的の操作(Owner付与など)とは無関係な場合があるので、このボタンは安易に押さない方がよい。押してしまった場合は、目的の権限付与が終わった後に`gcloud projects remove-iam-policy-binding`で忘れずに外すこと。

管理系のURLを開く前に、**ブラウザのログインアカウントが`admin@paibot.co.jp`になっているか毎回確認する**のが一番の予防策。

## 使う場面が具体化したら検討すること

- 複数人でアクセスする必要が出たら、都度「組織ポリシー上書き+招待」を繰り返すのはスケールしない。その時点で`paibot.co.jp`ドメインの正式ユーザー発行(上記の見送った代替案)を再検討する。
- CI(GitHub Actions)から触る必要が出たら、Workload Identity連携(長期キー不要)を検討する。AWSのOIDC連携と同じ発想。
- 利用するGCPサービス・目的が決まったら、`docs/plans/`配下に具体的な計画ドキュメントを作り、`CLAUDE.md`の「進行中の計画」に追記する。
