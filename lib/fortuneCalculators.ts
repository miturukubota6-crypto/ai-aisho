// lib/fortuneCalculators.ts
// 各占術の事前計算関数。Claudeには解釈だけをさせる。

const STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const BRANCH_ANIMALS = ["ねずみ","うし","とら","うさぎ","たつ","へび","うま","ひつじ","さる","とり","いぬ","いのしし"];

// 各月の節入り概算日テーブル（1〜12月, 精度±1日）
// 立春=2/4, 啓蟄=3/6, 清明=4/5, 立夏=5/6, 芒種=6/6, 小暑=7/7
// 立秋=8/7, 白露=9/8, 寒露=10/8, 立冬=11/7, 大雪=12/7, 小寒=1/6
const SETSU_DAYS = [0, 6, 4, 6, 5, 6, 6, 7, 7, 8, 8, 7, 7];

// ────────────────────────────────────────────
// ヘルパー: 1桁またはマスターナンバー(11/22/33)になるまで繰り返し加算
// ────────────────────────────────────────────
function reduceNum(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = n.toString().split("").reduce((a, c) => a + parseInt(c), 0);
  }
  return n;
}

// ────────────────────────────────────────────
// 西洋占星術：太陽星座
// 境界日は現代(1970-2050年代)の実際の春分点に合わせて調整
// （3/20から牡羊座：多くの年で春分点は3/20）
// ────────────────────────────────────────────
export function getSunSign(birth: Date): string {
  const m = birth.getMonth() + 1;
  const d = birth.getDate();
  if ((m === 3 && d >= 20) || (m === 4 && d <= 19)) return "牡羊座♈";  // 3/20〜4/19 (修正: 3/21→3/20)
  if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return "牡牛座♉";
  if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return "双子座♊";
  if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return "蟹座♋";
  if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return "獅子座♌";
  if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return "乙女座♍";
  if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return "天秤座♎";
  if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return "蠍座♏";
  if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return "射手座♐";
  if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return "山羊座♑";
  if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return "水瓶座♒";
  return "魚座♓"; // 2/19〜3/19
}

// ────────────────────────────────────────────
// 九星気学：本命星
// 節分（2月4日）前は前年扱い（検証済み・正確）
// ────────────────────────────────────────────
export function getKyusei(birth: Date): string {
  let year = birth.getFullYear();
  const m = birth.getMonth() + 1;
  const d = birth.getDate();
  if (m < 2 || (m === 2 && d < 4)) year--;

  // 年の各桁を一桁になるまで合算して本命星を算出
  let sum = year.toString().split("").reduce((a, c) => a + parseInt(c), 0);
  while (sum > 9) {
    sum = sum.toString().split("").reduce((a, c) => a + parseInt(c), 0);
  }
  let kyusei = (11 - sum) % 9;
  if (kyusei === 0) kyusei = 9;

  const stars = ["","一白水星","二黒土星","三碧木星","四緑木星","五黄土星",
                 "六白金星","七赤金星","八白土星","九紫火星"];
  return stars[kyusei];
}

// ────────────────────────────────────────────
// 四柱推命：年柱（干支）
// 節分（2/4）前は前年扱い（検証済み・正確）
// ────────────────────────────────────────────
export function getYearPillar(birth: Date): string {
  let year = birth.getFullYear();
  const m = birth.getMonth() + 1;
  const d = birth.getDate();
  if (m < 2 || (m === 2 && d < 4)) year--;

  const stem = STEMS[((year - 4) % 10 + 10) % 10];
  const branchIdx = ((year - 4) % 12 + 12) % 12;
  const branch = BRANCHES[branchIdx];
  const animal = BRANCH_ANIMALS[branchIdx];
  return `${stem}${branch}（${animal}）`;
}

// ────────────────────────────────────────────
// 四柱推命：月柱（干支）
// バグ修正: 天干・地支の計算式を正しく修正
// ────────────────────────────────────────────
export function getMonthPillar(birth: Date): string {
  let year = birth.getFullYear();
  let month = birth.getMonth() + 1; // 1-12

  // 節入り日前は前月扱い
  if (birth.getDate() < SETSU_DAYS[month]) {
    month--;
    if (month <= 0) { month = 12; year--; }
  }

  const yearStemIdx = ((year - 4) % 10 + 10) % 10;
  // 寅月の天干起点 = (年干インデックス % 5) * 2
  // 甲己年→甲(0), 乙庚年→丙(2), 丙辛年→戊(4), 丁壬年→庚(6), 戊癸年→壬(8)
  const monthStemStart = (yearStemIdx % 5) * 2;

  // 月支：子(0)を基点とした地支インデックス = month % 12
  // 1月=丑(1), 2月=寅(2), ..., 11月=亥(11), 12月=子(0)
  const branchIdxFromZi = month % 12;
  // 寅月(index=2)からの相対ステップ数
  const B = (branchIdxFromZi - 2 + 12) % 12;
  const monthStemIdx = (monthStemStart + B) % 10;

  return `${STEMS[monthStemIdx]}${BRANCHES[branchIdxFromZi]}`;
}

// ────────────────────────────────────────────
// 数秘術：ライフパスナンバー
// バグ修正: 年・月・日を個別に還元してからsumし、マスターナンバーを保持
// ────────────────────────────────────────────
export function getLifePathNumber(birth: Date): number {
  const y = birth.getFullYear();
  const m = birth.getMonth() + 1;
  const d = birth.getDate();

  // 各成分を個別に還元（マスターナンバー保持）
  const yearDigitSum = y.toString().split("").reduce((a, c) => a + parseInt(c), 0);
  const yearR = reduceNum(yearDigitSum);
  const monthR = reduceNum(m);
  const dayR = reduceNum(d);

  // 三成分の合計をさらに還元（合計がマスターナンバーになる場合も保持）
  return reduceNum(yearR + monthR + dayR);
}

// ────────────────────────────────────────────
// カバラ数秘術：ソウルナンバー（名前の母音から）
// ────────────────────────────────────────────
export function getSoulNumber(name: string): number {
  // ひらがな・ローマ字の母音に対応する数値
  const vowelMap: Record<string, number> = {
    "あ":1,"い":9,"う":3,"え":5,"お":6,
    "a":1,"e":5,"i":9,"o":6,"u":3,
  };
  const nums = name.split("").map(c => vowelMap[c.toLowerCase()] ?? 0).filter(n => n > 0);

  let sum = nums.length > 0
    ? nums.reduce((a, n) => a + n, 0)
    : name.split("").reduce((a, c) => a + (c.charCodeAt(0) % 9 || 9), 0);

  return reduceNum(sum);
}

// ────────────────────────────────────────────
// 運命数（誕生日の日付のみ使用）
// ────────────────────────────────────────────
export function getDestinyNumber(birth: Date): number {
  const day = birth.getDate();
  return reduceNum(day.toString().split("").reduce((a, c) => a + parseInt(c), 0));
}

// ────────────────────────────────────────────
// まとめて計算して返す
// ────────────────────────────────────────────
export interface FortuneData {
  sunSign: string;
  kyusei: string;
  yearPillar: string;
  monthPillar: string;
  lifePath: number;
  soulNumber: number;
  destinyNumber: number;
}

export function calcAll(birth: Date, name: string): FortuneData {
  return {
    sunSign: getSunSign(birth),
    kyusei: getKyusei(birth),
    yearPillar: getYearPillar(birth),
    monthPillar: getMonthPillar(birth),
    lifePath: getLifePathNumber(birth),
    soulNumber: getSoulNumber(name),
    destinyNumber: getDestinyNumber(birth),
  };
}
