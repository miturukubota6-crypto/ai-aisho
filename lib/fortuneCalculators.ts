// lib/fortuneCalculators.ts
// 各占術の事前計算関数。Claudeには解釈だけをさせる。

const STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const BRANCH_ANIMALS = ["ねずみ","うし","とら","うさぎ","たつ","へび","うま","ひつじ","さる","とり","いぬ","いのしし"];

// ────────────────────────────────────────────
// 西洋占星術：太陽星座
// ────────────────────────────────────────────
export function getSunSign(birth: Date): string {
  const m = birth.getMonth() + 1;
  const d = birth.getDate();
  if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return "牡羊座♈";
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
  return "魚座♓";
}

// ────────────────────────────────────────────
// 九星気学：本命星
// 節分（概ね2/4）前は前年扱い
// ────────────────────────────────────────────
export function getKyusei(birth: Date): string {
  let year = birth.getFullYear();
  const m = birth.getMonth() + 1;
  const d = birth.getDate();
  if (m < 2 || (m === 2 && d < 4)) year--;

  // 年の各桁を一桁になるまで合算
  let sum = year.toString().split("").reduce((a, c) => a + parseInt(c), 0);
  while (sum > 9) {
    sum = sum.toString().split("").reduce((a, c) => a + parseInt(c), 0);
  }
  let kyusei = 10 - sum;
  if (kyusei <= 0) kyusei += 9;
  if (kyusei > 9) kyusei -= 9;

  const stars = ["","一白水星","二黒土星","三碧木星","四緑木星","五黄土星",
                 "六白金星","七赤金星","八白土星","九紫火星"];
  return stars[kyusei];
}

// ────────────────────────────────────────────
// 四柱推命：年柱（干支）
// 簡易版：節分（2/4）前は前年扱い
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
// 簡易版：節入り日は概ね毎月4〜8日なので6日で固定
// ────────────────────────────────────────────
export function getMonthPillar(birth: Date): string {
  let year = birth.getFullYear();
  let month = birth.getMonth() + 1; // 1-12
  const day = birth.getDate();

  // 節入り日前は前月扱い（簡易: 6日を境界とする）
  if (day < 6) month--;
  if (month <= 0) { month = 12; year--; }

  // 月干支の計算（年干支の干から月干を算出）
  const yearStemIdx = ((year - 4) % 10 + 10) % 10;
  // 月干の開始インデックス（甲年・己年→甲子月スタート）
  const monthStemStart = (yearStemIdx % 5) * 2;
  const monthStemIdx = (monthStemStart + (month - 1)) % 10;
  const monthBranchIdx = (month + 1) % 12; // 寅月（3番）から始まる

  return `${STEMS[monthStemIdx]}${BRANCHES[monthBranchIdx]}`;
}

// ────────────────────────────────────────────
// 数秘術：ライフパスナンバー
// 誕生日の全数字を合算（11, 22, 33はマスターナンバーとして保持）
// ────────────────────────────────────────────
export function getLifePathNumber(birth: Date): number {
  const dateStr = `${birth.getFullYear()}${String(birth.getMonth() + 1).padStart(2,"0")}${String(birth.getDate()).padStart(2,"0")}`;
  let sum = dateStr.split("").reduce((a, c) => a + parseInt(c), 0);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = sum.toString().split("").reduce((a, c) => a + parseInt(c), 0);
  }
  return sum;
}

// ────────────────────────────────────────────
// カバラ数秘術：名前の魂の数（ソウルナンバー）
// ────────────────────────────────────────────
export function getSoulNumber(name: string): number {
  // ひらがな母音に対応する数値（カバラ的割り当て）
  const vowelMap: Record<string, number> = {
    "あ":1,"い":9,"う":3,"え":5,"お":6,
    "a":1,"e":5,"i":9,"o":6,"u":3,
  };
  const nums = name.split("").map(c => vowelMap[c.toLowerCase()] ?? 0).filter(n => n > 0);

  let sum = nums.length > 0
    ? nums.reduce((a, n) => a + n, 0)
    : name.split("").reduce((a, c) => a + (c.charCodeAt(0) % 9 || 9), 0);

  while (sum > 9 && sum !== 11 && sum !== 22) {
    sum = sum.toString().split("").reduce((a, c) => a + parseInt(c), 0);
  }
  return sum;
}

// ────────────────────────────────────────────
// 運命数（誕生日のみ使用）
// ────────────────────────────────────────────
export function getDestinyNumber(birth: Date): number {
  const day = birth.getDate();
  let sum = day.toString().split("").reduce((a, c) => a + parseInt(c), 0);
  while (sum > 9) {
    sum = sum.toString().split("").reduce((a, c) => a + parseInt(c), 0);
  }
  return sum;
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
