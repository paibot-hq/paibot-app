import type { Locale } from '../i18n/routing';
import { CONTACT_EMAIL, SELLER, SUPPORTER_PLAN } from '../lib/plans.ts';

// The Japanese text is authoritative; English and Chinese are reference
// translations (each document says so). Record<Locale, ...> makes a missing
// translation a type error rather than a blank page.

export interface LegalSection { heading: string; paragraphs?: string[]; items?: string[]; links?: { label: string; href: string }[] }
export interface LegalDocument { title: string; description: string; updated: string; notice?: string; sections: LegalSection[] }
export interface CommerceDocument { title: string; description: string; updated: string; notice?: string; rows: [label: string, value: string][] }

const price = { ja: `月額${SUPPORTER_PLAN.priceYen}円（税込）`, en: `¥${SUPPORTER_PLAN.priceYen} per month (tax included)`, zh: `每月${SUPPORTER_PLAN.priceYen}日元（含税）` };
const updated = { ja: '2026年9月28日 制定', en: 'Established September 28, 2026', zh: '2026年9月28日制定' };
// Privacy disclosures follow the services actually loaded by the app; other documents keep their own dates.
const privacyUpdated = { ja: '2026年9月28日 制定、2026年11月2日 改定', en: 'Established September 28, 2026; revised November 2, 2026', zh: '2026年9月28日制定，2026年11月2日修订' };
const referenceNotice = {
  en: 'This is a reference translation. If it differs from the Japanese version, the Japanese version prevails.',
  zh: '本文为参考译文。如与日文版有出入，以日文版为准。',
};
const onRequest = { ja: '請求があった場合には遅滞なく開示いたします。', en: 'Disclosed without delay upon request.', zh: '如有请求，将及时披露。' };

export const commerce: Record<Locale, CommerceDocument> = {
  ja: {
    title: '特定商取引法に基づく表記',
    description: 'PAIBOT.app の有料プランに関する、特定商取引法に基づく表記です。',
    updated: updated.ja,
    rows: [
      ['販売事業者', SELLER.ja],
      ['運営統括責任者', onRequest.ja],
      ['所在地', onRequest.ja],
      ['電話番号', onRequest.ja],
      ['メールアドレス', CONTACT_EMAIL],
      ['販売価格', `サポータープラン: ${price.ja}。各プランの内容はプランのページに表示しています。`],
      ['商品代金以外の必要料金', 'インターネット接続料金・通信料金はお客様のご負担となります。'],
      ['支払方法', 'クレジットカード決済（決済代行: Stripe）'],
      ['支払時期', 'お申し込み時に初回分をお支払いいただき、以後は毎月、お申し込み日と同じ日に自動で更新・決済されます。'],
      ['提供時期', '決済完了後、直ちにご利用いただけます。'],
      ['解約・キャンセル', 'いつでも解約できます。解約後も、お支払い済みの期間の終了までご利用いただけ、次回以降の請求は行われません。'],
      ['返品・返金', 'デジタルサービスの性質上、お支払い済みの料金の返金はいたしません。ただし、当社の責めに帰すべき事由によりサービスを提供できなかった場合はこの限りではありません。'],
      ['動作環境', '最新版の主要なウェブブラウザ（Chrome、Safari、Edge、Firefox）'],
    ],
  },
  en: {
    title: 'Notice under the Specified Commercial Transactions Act',
    description: 'Disclosures for PAIBOT.app paid plans required by Japan\'s Act on Specified Commercial Transactions.',
    updated: updated.en,
    notice: referenceNotice.en,
    rows: [
      ['Seller', SELLER.en],
      ['Responsible person', onRequest.en],
      ['Address', onRequest.en],
      ['Phone', onRequest.en],
      ['Email', CONTACT_EMAIL],
      ['Price', `Supporter plan: ${price.en}. Each plan is described on its plan page.`],
      ['Other charges', 'Internet connection and data charges are paid by the customer.'],
      ['Payment method', 'Credit card (processed by Stripe)'],
      ['Payment timing', 'The first payment is made when you sign up; the plan then renews and is charged automatically every month on the same day.'],
      ['Delivery', 'Available immediately after payment.'],
      ['Cancellation', 'You can cancel at any time. You keep access until the end of the period already paid for, and you are not charged again.'],
      ['Refunds', 'As a digital service, payments already made are not refunded, except where we fail to provide the service for reasons attributable to us.'],
      ['Requirements', 'A current version of a major web browser (Chrome, Safari, Edge or Firefox)'],
    ],
  },
  zh: {
    title: '基于日本特定商业交易法的标示',
    description: 'PAIBOT.app 付费方案依据日本《特定商业交易法》所作的标示。',
    updated: updated.zh,
    notice: referenceNotice.zh,
    rows: [
      ['销售者', SELLER.zh],
      ['运营负责人', onRequest.zh],
      ['地址', onRequest.zh],
      ['电话号码', onRequest.zh],
      ['电子邮箱', CONTACT_EMAIL],
      ['销售价格', `支持者方案：${price.zh}。各方案的内容请见方案页面。`],
      ['其他费用', '网络连接费和通信费由用户承担。'],
      ['支付方式', '信用卡支付（支付服务：Stripe）'],
      ['支付时间', '申请时支付首期费用，之后每月在与申请日相同的日期自动续订并扣款。'],
      ['提供时间', '支付完成后即可使用。'],
      ['解约', '可随时解约。解约后，在已付费期间结束前仍可使用，之后不再扣款。'],
      ['退款', '由于数字服务的性质，已支付的费用不予退还。但因本公司原因无法提供服务的情况除外。'],
      ['使用环境', '最新版本的主流浏览器（Chrome、Safari、Edge、Firefox）'],
    ],
  },
};

export const terms: Record<Locale, LegalDocument> = {
  ja: {
    title: '利用規約',
    description: 'PAIBOT.app の利用規約です。',
    updated: updated.ja,
    sections: [
      { heading: '第1条（適用）', paragraphs: [`この規約は、${SELLER.ja}（以下「当社」）が提供するウェブサービス「PAIBOT.app」（以下「本サービス」）の利用に関する条件を定めるものです。利用者は、本規約に同意したうえで本サービスを利用するものとします。`] },
      { heading: '第2条（アカウント）', paragraphs: ['本サービスの一部の機能を利用するには、アカウントの登録が必要です。利用者は、登録情報を正確に保ち、自己の責任でアカウントを管理するものとします。'] },
      { heading: '第3条（有料プラン）', items: [
        '有料プランの内容と料金は、各プランのページに表示するとおりとします。',
        '有料プランは、解約されない限り、毎月自動的に更新され、登録されたお支払い方法により料金が請求されます。',
        '利用者は、いつでも有料プランを解約できます。解約した場合も、お支払い済みの期間の終了まで有料プランを利用でき、次回以降の請求は行われません。',
        'デジタルサービスの性質上、お支払い済みの料金は返金いたしません。ただし、当社の責めに帰すべき事由により本サービスを提供できなかった場合はこの限りではありません。',
        '当社は、有料プランの内容または料金を変更することがあります。料金を変更する場合は、事前に本サービス上で告知し、変更後の最初の更新日から適用します。',
      ] },
      { heading: '第4条（未成年の利用者）', paragraphs: ['未成年の利用者が有料プランに申し込む場合は、親権者などの法定代理人の同意を得たうえで申し込むものとします。'] },
      { heading: '第5条（禁止事項）', items: [
        '法令または公序良俗に違反する行為',
        '本サービスの運営を妨げる行為、または不正なアクセス',
        '他の利用者または第三者の権利を侵害する行為',
        '本サービスの内容を、当社の許可なく複製・転載・販売する行為',
      ] },
      { heading: '第6条（本サービスの内容と免責）', paragraphs: [
        '本サービスの問題・解答・解説は、正確性の確認に努めていますが、その完全性・正確性を保証するものではありません。誤りを見つけた場合は、お問い合わせ先までお知らせください。',
        '当社は、本サービスの内容の変更、または提供の中断・終了を行うことがあります。当社の故意または重過失による場合を除き、これにより利用者に生じた損害について責任を負いません。',
      ] },
      { heading: '第7条（知的財産）', paragraphs: ['本サービスに含まれる文章・問題・画像・プログラムなどに関する権利は、当社または正当な権利者に帰属します。'] },
      { heading: '第8条（規約の変更）', paragraphs: ['当社は、必要に応じて本規約を変更できます。変更後の規約は、本サービス上に掲載した時点から効力を生じます。重要な変更は、事前に本サービス上で告知します。'] },
      { heading: '第9条（準拠法・管轄）', paragraphs: ['本規約は日本法に準拠します。本サービスに関して紛争が生じた場合は、当社の本店所在地を管轄する地方裁判所を第一審の専属的合意管轄裁判所とします。'] },
      { heading: '第10条（お問い合わせ）', paragraphs: [`本規約に関するお問い合わせは、${CONTACT_EMAIL} までお願いします。`] },
    ],
  },
  en: {
    title: 'Terms of Service',
    description: 'Terms of Service for PAIBOT.app.',
    updated: updated.en,
    notice: referenceNotice.en,
    sections: [
      { heading: 'Article 1 (Scope)', paragraphs: [`These terms set out the conditions for using PAIBOT.app (the "Service"), provided by ${SELLER.en} ("we"). By using the Service you agree to these terms.`] },
      { heading: 'Article 2 (Accounts)', paragraphs: ['Some features require an account. Keep your account details accurate and manage your account at your own responsibility.'] },
      { heading: 'Article 3 (Paid plans)', items: [
        'The contents and prices of paid plans are as shown on each plan page.',
        'Paid plans renew automatically every month until cancelled, and are charged to your registered payment method.',
        'You can cancel a paid plan at any time. You keep the plan until the end of the period already paid for, and you are not charged again.',
        'As a digital service, payments already made are not refunded, except where we fail to provide the Service for reasons attributable to us.',
        'We may change the contents or prices of paid plans. Price changes are announced on the Service in advance and apply from the first renewal after the change.',
      ] },
      { heading: 'Article 4 (Minors)', paragraphs: ['Minors must obtain the consent of a parent or other legal guardian before signing up for a paid plan.'] },
      { heading: 'Article 5 (Prohibited conduct)', items: [
        'Anything that violates laws or public order and morals',
        'Interfering with the operation of the Service, or unauthorized access',
        'Infringing the rights of other users or third parties',
        'Copying, republishing or selling the Service\'s contents without our permission',
      ] },
      { heading: 'Article 6 (Contents and disclaimer)', paragraphs: [
        'We work to check the accuracy of the Service\'s problems, answers and explanations, but do not guarantee that they are complete or accurate. Please report any errors to the contact address below.',
        'We may change the Service, or suspend or end it. Except in cases of our intent or gross negligence, we are not liable for any resulting loss.',
      ] },
      { heading: 'Article 7 (Intellectual property)', paragraphs: ['Rights in the text, problems, images and software of the Service belong to us or their rightful owners.'] },
      { heading: 'Article 8 (Changes to these terms)', paragraphs: ['We may change these terms as needed. Changed terms take effect once published on the Service; significant changes are announced in advance.'] },
      { heading: 'Article 9 (Governing law and jurisdiction)', paragraphs: ['These terms are governed by the laws of Japan. The district court with jurisdiction over our head office has exclusive jurisdiction in the first instance over any dispute about the Service.'] },
      { heading: 'Article 10 (Contact)', paragraphs: [`For questions about these terms, contact ${CONTACT_EMAIL}.`] },
    ],
  },
  zh: {
    title: '使用条款',
    description: 'PAIBOT.app 的使用条款。',
    updated: updated.zh,
    notice: referenceNotice.zh,
    sections: [
      { heading: '第1条（适用）', paragraphs: [`本条款规定了使用由${SELLER.zh}（以下称"本公司"）提供的网络服务"PAIBOT.app"（以下称"本服务"）的条件。用户同意本条款后方可使用本服务。`] },
      { heading: '第2条（账户）', paragraphs: ['使用本服务的部分功能需要注册账户。用户应保持注册信息准确，并自行负责管理账户。'] },
      { heading: '第3条（付费方案）', items: [
        '付费方案的内容和价格以各方案页面的显示为准。',
        '付费方案在解约前每月自动续订，并通过已登记的支付方式收费。',
        '用户可随时解约付费方案。解约后，在已付费期间结束前仍可使用，之后不再收费。',
        '由于数字服务的性质，已支付的费用不予退还。但因本公司原因无法提供本服务的情况除外。',
        '本公司可能变更付费方案的内容或价格。变更价格时，将事先在本服务上公告，并自变更后的首个续订日起适用。',
      ] },
      { heading: '第4条（未成年用户）', paragraphs: ['未成年用户申请付费方案时，须事先取得父母等法定代理人的同意。'] },
      { heading: '第5条（禁止事项）', items: [
        '违反法律法规或公序良俗的行为',
        '妨碍本服务运营的行为或非法访问',
        '侵害其他用户或第三方权利的行为',
        '未经本公司许可复制、转载或销售本服务内容的行为',
      ] },
      { heading: '第6条（服务内容与免责）', paragraphs: [
        '本公司努力确认本服务中题目、答案和解析的准确性，但不保证其完整或准确。如发现错误，请联系下方的联系方式。',
        '本公司可能变更本服务的内容，或中断、终止提供本服务。除本公司故意或重大过失的情况外，本公司对由此给用户造成的损失不承担责任。',
      ] },
      { heading: '第7条（知识产权）', paragraphs: ['本服务中的文字、题目、图片和程序等相关权利归本公司或合法权利人所有。'] },
      { heading: '第8条（条款的变更）', paragraphs: ['本公司可根据需要变更本条款。变更后的条款自在本服务上发布时生效，重要变更将事先公告。'] },
      { heading: '第9条（准据法与管辖）', paragraphs: ['本条款适用日本法律。因本服务产生的纠纷，以本公司总部所在地的地方法院为第一审专属管辖法院。'] },
      { heading: '第10条（联系方式）', paragraphs: [`关于本条款的咨询，请联系 ${CONTACT_EMAIL}。`] },
    ],
  },
};

export const privacy: Record<Locale, LegalDocument> = {
  ja: {
    title: 'プライバシーポリシー',
    description: 'PAIBOT.app における個人情報の取り扱いについて定めたものです。',
    updated: privacyUpdated.ja,
    sections: [
      { heading: '1. 事業者', paragraphs: [`本サービス「PAIBOT.app」は、${SELLER.ja}（以下「当社」）が運営しています。`] },
      { heading: '2. 取得する情報', items: [
        'アカウント情報: ログインに使うメールアドレス、表示名など（アカウントの管理は Clerk を利用しています）',
        '利用者が登録した情報: 生年月日などのプロフィール、日記、お気に入り、設定',
        '利用状況: 数学の解答と成績、アクセスした日時など',
        'お支払いに関する情報: 有料プランの契約状況。クレジットカード番号は決済代行の Stripe が取り扱い、当社は保持しません。',
        '技術的な情報: IPアドレス、ブラウザの種類、Cookie など、サービスの提供と安全確保に必要なもの',
      ] },
      { heading: '3. 利用目的', items: [
        '本サービスの提供、本人確認、アカウントの管理',
        '成績の記録や設定など、利用者ごとの機能の提供',
        '有料プランの提供と料金の請求',
        'お問い合わせへの対応',
        '不正利用の防止とサービスの改善',
      ] },
      { heading: '4. 第三者への提供と外部の事業者', paragraphs: [
        '当社は、法令に基づく場合を除き、本人の同意なく個人情報を第三者に提供しません。',
        '本サービスの提供のため、次の事業者に個人情報の取り扱いを委託しています。いずれも米国の事業者で、各社のプライバシーポリシーに従って情報を取り扱います。',
      ], items: [
        'Clerk, Inc.（アカウントとログインの管理）',
        'Stripe, Inc.（有料プランの決済）',
        'Cloudflare, Inc.（サービスの配信とデータの保存）',
        'TradingView Inc.（「世界の株価」の株価の表示。利用者が「株価を表示する」を押したときだけ、お使いのブラウザが TradingView に直接接続し、IPアドレスやブラウザの情報、Cookie などが同社に送られます。同社のプライバシーポリシーに従って取り扱われます）',
        'Cloudflare, Inc.の Workers AI（「行政FAQ検索」の意味の検索と、回答の作成。利用者が入力した質問の文章と、見つかった FAQ の本文が、ベクトルへの変換と回答の作成のために送られます。氏名やアカウントの情報は送りません。処理のあとは保存しません）',
      ] },
      {
        "heading": "4-2. Cookie・アクセス解析・広告",
        "paragraphs": [
          "本サービスでは、ログインの維持や設定の保存にCookieやブラウザのストレージを利用します。ブラウザの設定で削除・制限できますが、ログインや保存した設定など一部の機能が使えなくなる場合があります。",
          "本番サイトでは、利用状況を把握してサービスを改善するため、Google LLCのGoogle Analyticsを使用しています。Cookieなどの識別子、閲覧したページ、参照元、ブラウザや端末に関する情報などがGoogleに送信され、処理されます。対応するブラウザでは、Googleが提供するオプトアウトアドオンでGoogle Analyticsによるデータの使用を無効にできます。",
          "Google AdSenseによる広告配信は現在停止しています。配信する場合、Googleを含む第三者配信事業者がCookie、ウェブビーコン、IPアドレスなどを使って情報を収集することがあります。Googleとそのパートナーは、本サイトや他のサイトへの過去のアクセス情報に基づいて広告を表示する場合があります。パーソナライズ広告はGoogleの広告設定などで無効にできます。この設定は、アクセス解析の無効化とは異なります。",
          "Googleによるデータの利用、プライバシーポリシー、広告設定、Google Analyticsのオプトアウトについては、以下をご確認ください。"
        ],
        "links": [
          {
            "label": "Googleによるサイト・アプリの情報の利用",
            "href": "https://policies.google.com/technologies/partner-sites"
          },
          {
            "label": "Googleのプライバシーポリシー",
            "href": "https://policies.google.com/privacy"
          },
          {
            "label": "Googleの広告設定",
            "href": "https://adssettings.google.com/"
          },
          {
            "label": "Google Analyticsオプトアウトアドオン",
            "href": "https://tools.google.com/dlpage/gaoptout"
          }
        ]
      },
      { heading: '5. 安全管理', paragraphs: ['当社は、個人情報の漏えい・滅失・毀損を防ぐため、アクセスの制限など必要かつ適切な安全管理措置を講じます。'] },
      { heading: '6. 開示・訂正・削除などの請求', paragraphs: ['本人から個人情報の開示・訂正・利用停止・削除などの請求があった場合は、本人であることを確認したうえで、法令に従って対応します。日記やプロフィールなど、本サービスの画面から削除できる情報もあります。'] },
      { heading: '7. 未成年の利用者', paragraphs: ['未成年の利用者は、保護者の同意を得たうえで本サービスを利用してください。'] },
      { heading: '8. 改定', paragraphs: ['当社は、必要に応じて本ポリシーを改定します。改定後の内容は、本サービス上に掲載した時点から効力を生じます。'] },
      { heading: '9. お問い合わせ', paragraphs: [`個人情報の取り扱いに関するお問い合わせは、${CONTACT_EMAIL} までお願いします。`] },
    ],
  },
  en: {
    title: 'Privacy Policy',
    description: 'How PAIBOT.app handles personal information.',
    updated: privacyUpdated.en,
    notice: referenceNotice.en,
    sections: [
      { heading: '1. Operator', paragraphs: [`PAIBOT.app (the "Service") is operated by ${SELLER.en} ("we").`] },
      { heading: '2. Information we collect', items: [
        'Account information: the email address used to sign in, display name and similar (accounts are managed with Clerk)',
        'Information you register: profile details such as date of birth, diary entries, favorites and settings',
        'Usage: answers and scores in the math problem sets, access times and similar',
        'Payment information: the status of your paid plan. Card numbers are handled by our payment processor Stripe; we do not store them.',
        'Technical information needed to run and secure the Service, such as IP address, browser type and cookies',
      ] },
      { heading: '3. How we use it', items: [
        'To provide the Service, verify identity and manage accounts',
        'To provide per-user features such as score history and settings',
        'To provide paid plans and charge for them',
        'To respond to inquiries',
        'To prevent misuse and improve the Service',
      ] },
      { heading: '4. Third parties and service providers', paragraphs: [
        'Except as required by law, we do not provide personal information to third parties without your consent.',
        'We entrust the handling of personal information to the following providers to run the Service. All are based in the United States and handle information under their own privacy policies.',
      ], items: [
        'Clerk, Inc. (accounts and sign-in)',
        'Stripe, Inc. (payments for paid plans)',
        'Cloudflare, Inc. (delivery of the Service and data storage)',
        'TradingView Inc. (the display of prices on "World Stock Prices"; only when you press "Show stock prices", your browser connects to TradingView directly, and your IP address, browser information, cookies and similar are sent to it and handled under its privacy policy)',
        'Cloudflare, Inc.\'s Workers AI (the search by meaning and the writing of answers in "Government FAQ Search"; the text of the question you write and the text of the FAQ found for it are sent, to be turned into a vector and to write the answer; no name or account information is sent, and nothing is stored after processing)',
      ] },
      {
        "heading": "4-2. Cookies, analytics and advertising",
        "paragraphs": [
          "We use cookies and browser storage to maintain sign-in and remember settings. You can delete or restrict them in your browser, but this may prevent sign-in or remove saved preferences.",
          "The production site uses Google Analytics, provided by Google LLC, to understand usage and improve the Service. Identifiers such as cookies, pages viewed, referral information, and browser and device information are sent to and processed by Google. On supported browsers, Google’s opt-out add-on can disable the use of data by Google Analytics.",
          "Google AdSense ad serving is currently disabled. When ads are served, third-party vendors, including Google, may collect information using cookies, web beacons, IP addresses and similar technologies. Google and its partners may serve ads based on prior visits to this site or other websites. You can opt out of personalized advertising through Google’s Ads Settings. This is separate from opting out of analytics.",
          "The following links explain Google’s data use, privacy policy, ad controls and Google Analytics opt-out."
        ],
        "links": [
          {
            "label": "How Google uses information from sites and apps",
            "href": "https://policies.google.com/technologies/partner-sites"
          },
          {
            "label": "Google Privacy Policy",
            "href": "https://policies.google.com/privacy"
          },
          {
            "label": "Google Ads Settings",
            "href": "https://adssettings.google.com/"
          },
          {
            "label": "Google Analytics opt-out add-on",
            "href": "https://tools.google.com/dlpage/gaoptout"
          }
        ]
      },
      { heading: '5. Security', paragraphs: ['We take necessary and appropriate measures, such as access restrictions, to prevent the leakage, loss or damage of personal information.'] },
      { heading: '6. Requests about your information', paragraphs: ['When you ask us to disclose, correct, stop using or delete your personal information, we respond in accordance with the law after confirming your identity. Some information, such as diary entries and profile details, can also be deleted from the Service itself.'] },
      { heading: '7. Minors', paragraphs: ['Minors should use the Service with the consent of a parent or guardian.'] },
      { heading: '8. Changes', paragraphs: ['We may revise this policy as needed. Revisions take effect once published on the Service.'] },
      { heading: '9. Contact', paragraphs: [`For questions about how we handle personal information, contact ${CONTACT_EMAIL}.`] },
    ],
  },
  zh: {
    title: '隐私政策',
    description: 'PAIBOT.app 关于个人信息处理的规定。',
    updated: privacyUpdated.zh,
    notice: referenceNotice.zh,
    sections: [
      { heading: '1. 运营者', paragraphs: [`本服务"PAIBOT.app"由${SELLER.zh}（以下称"本公司"）运营。`] },
      { heading: '2. 收集的信息', items: [
        '账户信息：登录所用的电子邮箱、显示名称等（账户由 Clerk 管理）',
        '用户登记的信息：出生日期等个人资料、日记、收藏和设置',
        '使用情况：数学题库的作答与成绩、访问时间等',
        '支付相关信息：付费方案的签约状态。信用卡号由支付服务商 Stripe 处理，本公司不予保存。',
        '技术信息：为提供服务和保障安全所需的 IP 地址、浏览器类型、Cookie 等',
      ] },
      { heading: '3. 使用目的', items: [
        '提供本服务、确认身份、管理账户',
        '提供成绩记录、设置等个人化功能',
        '提供付费方案并收取费用',
        '回复咨询',
        '防止不正当使用并改进服务',
      ] },
      { heading: '4. 向第三方提供及外部服务商', paragraphs: [
        '除法律规定的情况外，未经本人同意，本公司不会向第三方提供个人信息。',
        '为提供本服务，本公司委托以下服务商处理个人信息。它们均为美国企业，依照各自的隐私政策处理信息。',
      ], items: [
        'Clerk, Inc.（账户与登录管理）',
        'Stripe, Inc.（付费方案的支付）',
        'Cloudflare, Inc.（服务分发与数据存储）',
        'TradingView Inc.（用于“全球股价”页面的价格显示。仅当你点击“显示股价”时，你的浏览器才会直接连接到 TradingView，IP 地址、浏览器信息和 Cookie 等会发送给该公司，并按其隐私政策处理）',
        'Cloudflare, Inc. 的 Workers AI（用于“行政FAQ检索”的语义检索和回答撰写。会发送你输入的问题文字以及找到的 FAQ 正文，用于转换为向量和撰写回答；不发送姓名或账户信息，处理后不保存）',
      ] },
      {
        "heading": "4-2. Cookie、访问分析与广告",
        "paragraphs": [
          "本服务使用Cookie和浏览器存储来维持登录和保存设置。你可以通过浏览器删除或限制这些数据，但登录、已保存的偏好等功能可能因此受到影响。",
          "正式站点使用Google LLC提供的Google Analytics了解使用情况并改进服务。Cookie等标识符、浏览页面、来源信息以及浏览器和设备信息等会发送给Google并由其处理。在支持的浏览器中，可以使用Google提供的停用插件，停用Google Analytics对数据的使用。",
          "目前已停止投放Google AdSense广告。投放广告时，Google及其他第三方广告服务商可能使用Cookie、网络信标、IP地址等收集信息。Google及其合作伙伴可能根据用户此前访问本站或其他网站的信息展示广告。你可以通过Google广告设置关闭个性化广告。该设置与停用访问分析不同。",
          "有关Google的数据使用、隐私政策、广告设置与Google Analytics停用方式，请参阅以下链接。"
        ],
        "links": [
          {
            "label": "Google如何使用来自网站和应用的信息",
            "href": "https://policies.google.com/technologies/partner-sites"
          },
          {
            "label": "Google隐私政策",
            "href": "https://policies.google.com/privacy"
          },
          {
            "label": "Google广告设置",
            "href": "https://adssettings.google.com/"
          },
          {
            "label": "Google Analytics停用插件",
            "href": "https://tools.google.com/dlpage/gaoptout"
          }
        ]
      },
      { heading: '5. 安全管理', paragraphs: ['本公司采取访问限制等必要且适当的安全管理措施，防止个人信息泄露、丢失或损毁。'] },
      { heading: '6. 查询、更正、删除等请求', paragraphs: ['本人提出查询、更正、停止使用或删除个人信息等请求时，本公司将在确认本人身份后依法处理。日记和个人资料等部分信息也可在本服务的页面上直接删除。'] },
      { heading: '7. 未成年用户', paragraphs: ['未成年用户请在取得监护人同意后使用本服务。'] },
      { heading: '8. 修订', paragraphs: ['本公司可根据需要修订本政策。修订后的内容自在本服务上发布时生效。'] },
      { heading: '9. 联系方式', paragraphs: [`关于个人信息处理的咨询，请联系 ${CONTACT_EMAIL}。`] },
    ],
  },
};
