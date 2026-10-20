// The words of the typing game: each is its display form and its reading in hiragana (what is typed). Everyday words in
// three lengths; the game draws from the short ones at first and the long ones later.

export type Word = { text: string; kana: string };

const W = (text: string, kana: string): Word => ({ text, kana });

export const SHORT: readonly Word[] = [
  W("桜", "さくら"), W("空", "そら"), W("海", "うみ"), W("山", "やま"), W("花", "はな"), W("星", "ほし"), W("月", "つき"), W("雪", "ゆき"),
  W("雨", "あめ"), W("風", "かぜ"), W("猫", "ねこ"), W("犬", "いぬ"), W("鳥", "とり"), W("魚", "さかな"), W("本", "ほん"), W("音", "おと"),
  W("光", "ひかり"), W("夢", "ゆめ"), W("朝", "あさ"), W("夜", "よる"), W("春", "はる"), W("夏", "なつ"), W("秋", "あき"), W("冬", "ふゆ"),
  W("友達", "ともだち"), W("先生", "せんせい"), W("学校", "がっこう"), W("電車", "でんしゃ"), W("時計", "とけい"), W("財布", "さいふ"),
];

export const MEDIUM: readonly Word[] = [
  W("新幹線", "しんかんせん"), W("自動販売機", "じどうはんばいき"), W("ひまわり", "ひまわり"), W("花火大会", "はなびたいかい"), W("夏休み", "なつやすみ"),
  W("遊園地", "ゆうえんち"), W("図書館", "としょかん"), W("美術館", "びじゅつかん"), W("水族館", "すいぞくかん"), W("動物園", "どうぶつえん"),
  W("ラーメン", "らーめん"), W("カレーライス", "かれーらいす"), W("ハンバーグ", "はんばーぐ"), W("オムライス", "おむらいす"), W("チョコレート", "ちょこれーと"),
  W("コーヒー", "こーひー"), W("パソコン", "ぱそこん"), W("スマートフォン", "すまーとふぉん"), W("キーボード", "きーぼーど"), W("インターネット", "いんたーねっと"),
  W("北海道", "ほっかいどう"), W("沖縄", "おきなわ"), W("富士山", "ふじさん"), W("東京タワー", "とうきょうたわー"), W("満員電車", "まんいんでんしゃ"),
  W("朝ごはん", "あさごはん"), W("お弁当", "おべんとう"), W("日曜日", "にちようび"), W("誕生日", "たんじょうび"), W("宿題", "しゅくだい"),
  W("ありがとう", "ありがとう"), W("おはよう", "おはよう"), W("こんにちは", "こんにちは"), W("おやすみなさい", "おやすみなさい"), W("いただきます", "いただきます"),
];

export const LONG: readonly Word[] = [
  W("吾輩は猫である", "わがはいはねこである"), W("春はあけぼの", "はるはあけぼの"), W("犬も歩けば棒に当たる", "いぬもあるけばぼうにあたる"),
  W("七転び八起き", "ななころびやおき"), W("急がば回れ", "いそがばまわれ"), W("猿も木から落ちる", "さるもきからおちる"), W("花より団子", "はなよりだんご"),
  W("石の上にも三年", "いしのうえにもさんねん"), W("早起きは三文の徳", "はやおきはさんもんのとく"), W("案ずるより産むが易し", "あんずるよりうむがやすし"),
  W("明日は明日の風が吹く", "あしたはあしたのかぜがふく"), W("今日もいい天気ですね", "きょうもいいてんきですね"), W("タイピングが上手になりたい", "たいぴんぐがじょうずになりたい"),
  W("おいしいご飯を食べに行こう", "おいしいごはんをたべにいこう"), W("週末は友達と映画を見る", "しゅうまつはともだちとえいがをみる"),
];

// The words for a stage of the game: 0 the shortest, 1 with the medium ones, 2 with the long ones too.
export function pool(stage: number): Word[] {
  return stage <= 0 ? [...SHORT] : stage === 1 ? [...SHORT, ...MEDIUM] : [...MEDIUM, ...LONG];
}

// ---- English ----

export const EN_SHORT: readonly Word[] = [
  "apple", "river", "light", "music", "cloud", "green", "happy", "table", "water", "stone", "dream", "night", "smile", "train", "bread", "ocean",
  "house", "plant", "story", "chair", "quick", "brave", "sunny", "paper", "heart", "world", "tiger", "lemon", "piano", "magic", "garden", "window",
].map(w => W(w, w));

export const EN_MEDIUM: readonly Word[] = [
  "keyboard", "mountain", "elephant", "sunshine", "umbrella", "notebook", "airplane", "chocolate", "adventure", "butterfly", "telescope", "waterfall",
  "friendship", "treasure", "lightning", "orchestra", "fireworks", "dinosaur", "pineapple", "backpack", "rainbow", "universe", "hurricane", "bookshelf",
  "strawberry", "motorcycle", "skateboard", "lighthouse", "snowflake", "playground",
].map(w => W(w, w));

export const EN_LONG: readonly Word[] = [
  "practice makes perfect", "a piece of cake", "better late than never", "the early bird catches the worm", "actions speak louder than words",
  "every cloud has a silver lining", "where there is a will there is a way", "all that glitters is not gold", "the quick brown fox jumps over the lazy dog",
  "a journey of a thousand miles begins with a single step", "do not count your chickens before they hatch", "when in rome do as the romans do",
  "slow and steady wins the race", "honesty is the best policy", "time flies when you are having fun",
].map(w => W(w, w));

export type Mode = "ja" | "en";
export const MODES: readonly Mode[] = ["ja", "en"];

// The words for a stage of the game in a mode: 0 the shortest, 1 with the medium ones, 2 the medium and long ones.
export function poolFor(mode: Mode, stage: number): Word[] {
  if (mode === "ja") return pool(stage);
  return stage <= 0 ? [...EN_SHORT] : stage === 1 ? [...EN_SHORT, ...EN_MEDIUM] : [...EN_MEDIUM, ...EN_LONG];
}
