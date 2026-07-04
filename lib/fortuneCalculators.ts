// lib/fortuneCalculators.ts
// 各占術の事前計算関数。Claudeには解釈だけをさせる。

const STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const BRANCH_ANIMALS = ["ねずみ","うし","とら","うさぎ","たつ","へび","うま","ひつじ","さる","とり","いぬ","いのしし"];

// ────────────────────────────────────────────
// 天文計算ヘルパー：太陽黄経
// 立春・節入り・星座境界は年ごとに日付が変動するため、
// 固定日テーブルではなく太陽の視黄経（精度約0.01°≒時刻で15分）で判定する
// ────────────────────────────────────────────
const DEG = Math.PI / 180;

// JST指定時刻のユリウス日
function jdAtJst(y: number, m: number, d: number, hourJst: number): number {
  return Date.UTC(y, m - 1, d, hourJst - 9) / 86400000 + 2440587.5;
}

// 太陽の視黄経（度, 0〜360）: Astronomical Almanac 低精度式
function solarLongitude(jd: number): number {
  const n = jd - 2451545.0;
  const L = 280.460 + 0.9856474 * n;
  const g = (357.528 + 0.9856003 * n) * DEG;
  const lambda = L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g);
  return ((lambda % 360) + 360) % 360;
}

// 節入り・立春判定に使う太陽黄経
// 時刻既知 → 出生時刻ちょうどの黄経で判定（最も正確）
// 時刻不明 → 誕生日の終わり（24:00 JST）＝節入り当日生まれは「新しい月」とする標準的な運用
function lambdaAtBirth(birth: Date, timeKnown: boolean): number {
  const hour = timeKnown ? birth.getHours() + birth.getMinutes() / 60 : 24;
  return solarLongitude(jdAtJst(birth.getFullYear(), birth.getMonth() + 1, birth.getDate(), hour));
}

// 立春（太陽黄経315°）基準の年（四柱推命・九星の年替わり判定）
// 立春は年により2/3〜2/5で変動するため天文計算で判定する
function risshunAdjustedYear(birth: Date, timeKnown = false): number {
  let year = birth.getFullYear();
  const m = birth.getMonth() + 1;
  if (m <= 2 && lambdaAtBirth(birth, timeKnown) < 315) year--;
  return year;
}

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
// 固定日テーブルではなく誕生日正午（JST）の太陽黄経から判定
// → 境界日（カスプ）も年ごとに正確（春分点0°=牡羊座起点、30°ごと）
// ────────────────────────────────────────────
const SUN_SIGNS = [
  "牡羊座♈","牡牛座♉","双子座♊","蟹座♋","獅子座♌","乙女座♍",
  "天秤座♎","蠍座♏","射手座♐","山羊座♑","水瓶座♒","魚座♓",
];
export function getSunSign(birth: Date, timeKnown = false): string {
  // 時刻不明時は正午と仮定（カスプ日の誤差を最小化）
  const hour = timeKnown ? birth.getHours() + birth.getMinutes() / 60 : 12;
  const lambda = solarLongitude(jdAtJst(birth.getFullYear(), birth.getMonth() + 1, birth.getDate(), hour));
  return SUN_SIGNS[Math.floor(lambda / 30) % 12];
}

// ────────────────────────────────────────────
// 九星気学：本命星
// 立春（年により2/3〜2/5）前は前年扱い（天文計算で判定）
// ────────────────────────────────────────────
export function getKyusei(birth: Date, timeKnown = false): string {
  const year = risshunAdjustedYear(birth, timeKnown);

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
// 立春（年により2/3〜2/5）前は前年扱い（天文計算で判定）
// ────────────────────────────────────────────
export function getYearPillar(birth: Date, timeKnown = false): string {
  const year = risshunAdjustedYear(birth, timeKnown);

  const stem = STEMS[((year - 4) % 10 + 10) % 10];
  const branchIdx = ((year - 4) % 12 + 12) % 12;
  const branch = BRANCHES[branchIdx];
  const animal = BRANCH_ANIMALS[branchIdx];
  return `${stem}${branch}（${animal}）`;
}

// ────────────────────────────────────────────
// 四柱推命：月柱（干支）
// 節入り（立春=315°を起点に太陽黄経30°ごと）で月を確定し、
// 月干は五虎遁で算出：甲己年→丙寅、乙庚年→戊寅、丙辛年→庚寅、丁壬年→壬寅、戊癸年→甲寅
// （旧実装は五虎遁の起点+2を欠いており全月干が2つズレていた）
// ────────────────────────────────────────────
export function getMonthPillar(birth: Date, timeKnown = false): string {
  const lambda = lambdaAtBirth(birth, timeKnown);
  const monthIdx = Math.floor(((((lambda - 315) % 360) + 360) % 360) / 30); // 0=寅月〜11=丑月

  // 年干は立春基準の年を使う（1月〜立春前生まれは前年の年干）
  const year = risshunAdjustedYear(birth, timeKnown);
  const yearStemIdx = ((year - 4) % 10 + 10) % 10;
  const monthStemIdx = ((yearStemIdx % 5) * 2 + 2 + monthIdx) % 10; // +2 が五虎遁の起点（丙）
  const branchIdx = (monthIdx + 2) % 12; // 寅=2 起点

  return `${STEMS[monthStemIdx]}${BRANCHES[branchIdx]}`;
}

// ────────────────────────────────────────────
// 四柱推命：日柱（干支）— 四柱推命の中核「日主」
// ユリウス通日から算出（60日周期・完全に決定的）
// 検証アンカー: 1900-01-01=甲戌 / 2000-01-01=戊午 / 2024-01-01=甲子
// ────────────────────────────────────────────
function dayPillarIndex(birth: Date): number {
  const days = Math.floor(Date.UTC(birth.getFullYear(), birth.getMonth(), birth.getDate()) / 86400000);
  const jdn = days + 2440588; // 1970-01-01 = JDN 2440588
  return ((jdn + 49) % 60 + 60) % 60; // 0 = 甲子
}

export function getDayPillar(birth: Date): string {
  const idx = dayPillarIndex(birth);
  return `${STEMS[idx % 10]}${BRANCHES[idx % 12]}`;
}

// ────────────────────────────────────────────
// 四柱推命：時柱（干支）— 出生時刻が分かる場合のみ算出
// 時支：子=23:00〜0:59 から2時間ごと
// 時干：五鼠遁（甲己日→甲子、乙庚日→丙子、丙辛日→戊子、丁壬日→庚子、戊癸日→壬子）
// ※日替わりは0時とし、23時台は当日の日干のまま子刻として扱う
// ────────────────────────────────────────────
export function getHourPillar(birth: Date): string {
  const minutes = birth.getHours() * 60 + birth.getMinutes();
  const hourBranchIdx = Math.floor((minutes + 60) / 120) % 12; // 子=0
  const dayStemIdx = dayPillarIndex(birth) % 10;
  const hourStemIdx = ((dayStemIdx % 5) * 2 + hourBranchIdx) % 10;
  return `${STEMS[hourStemIdx]}${BRANCHES[hourBranchIdx]}`;
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
// カバラ数秘術：生年月日の全桁を合計して1桁に還元
// 例: 1976-08-31 → 1+9+7+6+0+8+3+1=35 → 3+5=8
// ────────────────────────────────────────────
export function getKabbalahNumber(birth: Date): number {
  const y = birth.getFullYear();
  const m = birth.getMonth() + 1;
  const d = birth.getDate();
  // YYYYMMDD形式で全桁を加算（マスターナンバーは保持しない）
  const digits = `${y}${String(m).padStart(2,"0")}${String(d).padStart(2,"0")}`;
  let sum = digits.split("").reduce((a, c) => a + parseInt(c), 0);
  while (sum > 9) {
    sum = sum.toString().split("").reduce((a, c) => a + parseInt(c), 0);
  }
  return sum;
}

// 旧ソウルナンバー（内部互換用・非推奨）
export function getSoulNumber(name: string): number {
  const vowelMap: Record<string, number> = {
    "あ":1,"い":9,"う":3,"え":5,"お":6,
    "a":1,"e":5,"i":9,"o":6,"u":3,
  };
  const nums = name.split("").map(c => vowelMap[c.toLowerCase()] ?? 0).filter(n => n > 0);
  const sum = nums.length > 0
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

// ════════════════════════════════════════════
// 相性スコア事前計算（全8占術）
// Claudeにスコアを決めさせず、決定論的に算出する
// ════════════════════════════════════════════

// ── 西洋占星術：四元素ベース ──
const SIGN_ELEMENT: Record<string, string> = {
  "牡羊座♈":"火","獅子座♌":"火","射手座♐":"火",
  "牡牛座♉":"地","乙女座♍":"地","山羊座♑":"地",
  "双子座♊":"風","天秤座♎":"風","水瓶座♒":"風",
  "蟹座♋":"水","蠍座♏":"水","魚座♓":"水",
};
function sunSignScore(s1: string, s2: string): number {
  const e1 = SIGN_ELEMENT[s1], e2 = SIGN_ELEMENT[s2];
  if (!e1 || !e2) return 65;
  if (e1 === e2) return 85;
  const good: Record<string,string> = {火:"風",風:"火",地:"水",水:"地"};
  if (good[e1] === e2) return 78;
  return 45; // 火-水 / 地-風 は相性困難
}

// ── 四柱推命：日柱（日主）ベース ──
// 本来の四柱推命の相性は年干ではなく「日干（日主）」で見る。
// 天干: 干合 > 相生 > 比和 > 相剋 ／ 地支: 支合(六合)・三合で加点、冲で減点
const STEM_ELEMENT: Record<string, string> = {
  "甲":"木","乙":"木","丙":"火","丁":"火","戊":"土",
  "己":"土","庚":"金","辛":"金","壬":"水","癸":"水",
};
function fourPillarsScore(dp1: string, dp2: string): number {
  const s1 = STEMS.indexOf(dp1[0]), s2 = STEMS.indexOf(dp2[0]);
  const e1 = STEM_ELEMENT[dp1[0]], e2 = STEM_ELEMENT[dp2[0]];
  if (s1 < 0 || s2 < 0 || !e1 || !e2) return 65;

  const gen: Record<string,string> = {木:"火",火:"土",土:"金",金:"水",水:"木"};
  let score: number;
  if ((s1 + 5) % 10 === s2 || (s2 + 5) % 10 === s1) score = 90; // 干合（甲己・乙庚・丙辛・丁壬・戊癸）
  else if (gen[e1] === e2 || gen[e2] === e1) score = 80;        // 相生
  else if (e1 === e2) score = 70;                                // 比和
  else score = 52;                                               // 相剋

  const b1 = BRANCHES.indexOf(dp1[1]), b2 = BRANCHES.indexOf(dp2[1]);
  if (b1 >= 0 && b2 >= 0) {
    const sum = b1 + b2;
    if (sum === 13 || sum === 1) score += 8;             // 支合（六合）: 子丑・寅亥・卯戌・辰酉・巳申・午未
    else if (b1 !== b2 && b1 % 4 === b2 % 4) score += 6; // 三合（申子辰・亥卯未・寅午戌・巳酉丑）
    else if (b1 === b2) score += 4;                      // 同支
    if (Math.abs(b1 - b2) === 6) score -= 12;            // 冲（対冲）
  }
  return Math.max(30, Math.min(98, score));
}

// ── 数秘術：ライフパス相性 ──
const LP_MATRIX: Record<string, number> = {
  "1-1":65,"1-2":55,"1-3":80,"1-4":60,"1-5":85,"1-6":70,"1-7":65,"1-8":75,"1-9":50,
  "2-2":75,"2-3":60,"2-4":80,"2-5":50,"2-6":85,"2-7":65,"2-8":70,"2-9":75,
  "3-3":70,"3-4":55,"3-5":75,"3-6":65,"3-7":60,"3-8":50,"3-9":88,
  "4-4":80,"4-5":55,"4-6":75,"4-7":70,"4-8":85,"4-9":60,
  "5-5":60,"5-6":65,"5-7":80,"5-8":55,"5-9":70,
  "6-6":85,"6-7":60,"6-8":75,"6-9":88,
  "7-7":75,"7-8":65,"7-9":60,
  "8-8":70,"8-9":65,
  "9-9":80,
};
function lifePathScore(l1: number, l2: number): number {
  const a = l1 > 9 ? (l1 % 9 || 9) : l1;
  const b = l2 > 9 ? (l2 % 9 || 9) : l2;
  const key = a <= b ? `${a}-${b}` : `${b}-${a}`;
  return LP_MATRIX[key] ?? 65;
}

// ── タロット：名前の文字コード合計から決定論的に算出 ──
function tarotScore(name1: string, name2: string): number {
  const h = (s: string) => s.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0);
  const card1 = h(name1) % 22; // 大アルカナ 0-21
  const card2 = h(name2) % 22;
  // 差が 0,7,11,14,21 → 高相性（伝統的に吉の組み合わせ）
  const diff = Math.abs(card1 - card2);
  const scoreMap: Record<number,number> = {0:75,1:60,2:65,3:70,4:55,5:80,6:65,7:85,8:60,9:70,10:55,11:85};
  return scoreMap[diff] ?? scoreMap[22 - diff] ?? 65;
}

// ── 九星気学：九星の関係（同気・相生・相剋） ──
const KYUSEI_IDX: Record<string, number> = {
  "一白水星":1,"二黒土星":2,"三碧木星":3,"四緑木星":4,"五黄土星":5,
  "六白金星":6,"七赤金星":7,"八白土星":8,"九紫火星":9,
};
// 伝統的な九星相性表（行=自分, 列=相手, 値=相性スコア）
const KYUSEI_MATRIX: number[][] = [
  //1   2   3   4   5   6   7   8   9
  [70, 45, 55, 55, 40, 85, 85, 50, 60], // 1
  [45, 70, 50, 50, 80, 60, 60, 85, 75], // 2
  [55, 50, 70, 85, 45, 50, 50, 80, 60], // 3
  [55, 50, 85, 70, 45, 80, 60, 50, 60], // 4
  [40, 80, 45, 45, 70, 50, 50, 80, 55], // 5
  [85, 60, 50, 80, 50, 70, 85, 60, 45], // 6
  [85, 60, 50, 60, 50, 85, 70, 60, 45], // 7
  [50, 85, 80, 50, 80, 60, 60, 70, 50], // 8
  [60, 75, 60, 60, 55, 45, 45, 50, 70], // 9
];
function kyuseiScore(k1: string, k2: string): number {
  const a = KYUSEI_IDX[k1], b = KYUSEI_IDX[k2];
  if (!a || !b) return 65;
  return KYUSEI_MATRIX[a - 1][b - 1];
}

// ── 血液型相性 ──
const BLOOD_MATRIX: Record<string, Record<string, number>> = {
  A:  {A:75, B:50, O:80, AB:70, 不明:65},
  B:  {A:50, B:70, O:75, AB:85, 不明:65},
  O:  {A:80, B:75, O:70, AB:60, 不明:65},
  AB: {A:70, B:85, O:60, AB:80, 不明:65},
  不明:{A:65, B:65, O:65, AB:65, 不明:65},
};
function bloodScore(b1: string, b2: string): number {
  return BLOOD_MATRIX[b1]?.[b2] ?? 65;
}

// ── 姓名判断：名前の画数（文字コード利用）から算出 ──
function nameReadingScore(name1: string, name2: string): number {
  const strokes = (s: string) => s.split("").reduce((a, c) => a + (c.charCodeAt(0) % 30 + 1), 0);
  const t1 = strokes(name1) % 81; // 0-80 (姓名判断の吉凶サイクル)
  const t2 = strokes(name2) % 81;
  const combined = (t1 + t2) % 81;
  // 伝統的な吉数: 1,3,5,6,7,8,11,13,15,16,17,18,21,23,24,25,29,31,32,33,35,37,39,41,45,47,48,52,57,61,63,65,67,68,81
  const lucky = new Set([1,3,5,6,7,8,11,13,15,16,17,18,21,23,24,25,29,31,32,33,35,37,39,41,45,47,48,52,57,61,63,65,67,68]);
  if (lucky.has(combined)) return 75 + (combined % 16); // 75-90
  return 45 + (combined % 25); // 45-69
}

// ── カバラ数秘術：生年月日ベースのカバラナンバー相性 ──
const KABBALAH_FAMILY = (n: number) => { const r = n > 9 ? (n % 9 || 9) : n; return r % 3 || 3; };
function kabbalahScore(k1: number, k2: number): number {
  const a = k1 > 9 ? (k1 % 9 || 9) : k1;
  const b = k2 > 9 ? (k2 % 9 || 9) : k2;
  if (a === b) return 75;
  if (a + b === 10) return 88; // 補完ペア
  if (a + b === 5 || a + b === 14) return 82;
  if (KABBALAH_FAMILY(a) === KABBALAH_FAMILY(b)) return 80; // 同族ナンバー
  return Math.min(85, 55 + (a * b % 20));
}

// ── 全スコアをまとめて返す ──
export interface CompatibilityScores {
  sunSign: number;
  fourPillars: number;
  lifePath: number;
  tarot: number;
  kyusei: number;
  blood: number;
  nameReading: number;
  kabbalah: number;
  total: number;
}

export function calcCompatibilityScores(
  d1: FortuneData, d2: FortuneData,
  blood1: string, blood2: string,
  name1: string, name2: string,
): CompatibilityScores {
  const sunSign    = sunSignScore(d1.sunSign, d2.sunSign);
  const fourPillars= fourPillarsScore(d1.dayPillar || d1.yearPillar, d2.dayPillar || d2.yearPillar);
  const lifePath   = lifePathScore(d1.lifePath, d2.lifePath);
  const tarot      = tarotScore(name1, name2);
  const kyusei     = kyuseiScore(d1.kyusei, d2.kyusei);
  const blood      = bloodScore(blood1, blood2);
  const nameReading= nameReadingScore(name1, name2);
  const kabbalah   = kabbalahScore(d1.kabbalahNumber, d2.kabbalahNumber);
  const total      = Math.round((sunSign + fourPillars + lifePath + tarot + kyusei + blood + nameReading + kabbalah) / 8);
  return { sunSign, fourPillars, lifePath, tarot, kyusei, blood, nameReading, kabbalah, total };
}

// ────────────────────────────────────────────
// まとめて計算して返す
// ────────────────────────────────────────────
export interface FortuneData {
  sunSign: string;
  kyusei: string;
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string | null; // 出生時刻が分かる場合のみ
  lifePath: number;
  soulNumber: number;
  destinyNumber: number;
  kabbalahNumber: number;
}

// timeKnown=true の場合、birth の時・分を出生時刻として使用し、
// 時柱の算出＋節入り・立春・星座カスプの時刻判定を行う
export function calcAll(birth: Date, name: string, timeKnown = false): FortuneData {
  return {
    sunSign: getSunSign(birth, timeKnown),
    kyusei: getKyusei(birth, timeKnown),
    yearPillar: getYearPillar(birth, timeKnown),
    monthPillar: getMonthPillar(birth, timeKnown),
    dayPillar: getDayPillar(birth),
    hourPillar: timeKnown ? getHourPillar(birth) : null,
    lifePath: getLifePathNumber(birth),
    soulNumber: getSoulNumber(name),
    destinyNumber: getDestinyNumber(birth),
    kabbalahNumber: getKabbalahNumber(birth),
  };
}
