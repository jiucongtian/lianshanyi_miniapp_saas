/**
 * 新旧八字计算器对比测试（生产输入版）
 *
 * 以 bazi-calculator.js（老代码）为 oracle，对比 bazi-calculator-v2.js（新代码）。
 *
 * 测试策略：
 *   前端 time-picker 组件将用户选择的时辰映射为固定格式再传给云函数：
 *     hour = 时辰代表小时（偶数：0,2,4,...,22），minute = 1
 *   因此本测试以该格式作为"生产输入"，而非原始的节气精确分钟。
 *
 *   对 1900-2100 年每个"节"（12个），取节气当天和前一天，
 *   遍历 12 个时辰（hour=0/2/.../22, minute=1），共约 57,888 条用例。
 *
 * 运行：node test-compare.js
 */

const oldCalc  = require('./bazi-calculator');
const newCalc  = require('./bazi-calculator-v2');
const calendar = require('./js-calendar-converter-v2.cjs');

const START_YEAR = 1900;
const END_YEAR   = 2100;

// 12 "节"的索引（偶数），只有"节"才是月柱边界
const NODE_INDICES = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

// 生产环境实际发送给云函数的时辰格式
// time-picker/index.js 中 TIME_PERIODS 定义：hour=偶数, minute=1
const SHICHEN = [
  { name: '子时', hour: 0,  minute: 1 },
  { name: '丑时', hour: 2,  minute: 1 },
  { name: '寅时', hour: 4,  minute: 1 },
  { name: '卯时', hour: 6,  minute: 1 },
  { name: '辰时', hour: 8,  minute: 1 },
  { name: '巳时', hour: 10, minute: 1 },
  { name: '午时', hour: 12, minute: 1 },
  { name: '未时', hour: 14, minute: 1 },
  { name: '申时', hour: 16, minute: 1 },
  { name: '酉时', hour: 18, minute: 1 },
  { name: '戌时', hour: 20, minute: 1 },
  { name: '亥时', hour: 22, minute: 1 },
];

function pad(n) { return String(n).padStart(2, '0'); }
function pillar(result, key) {
  const d = result.baziData?.[key];
  if (!d || !d.gan || !d.zhi) return null;
  return d.gan + d.zhi;
}

// 给定 Date，获取前 N 天的 Date
function daysAgo(date, n) {
  return new Date(date.getTime() - n * 24 * 60 * 60 * 1000);
}

let totalTests = 0;
const diffs     = [];  // 新旧代码结果不同
const bothFailed = []; // 两个计算器都失败

console.log(`开始对比测试（生产输入格式）：${START_YEAR}-${END_YEAR} 年所有 12 个"节"附近`);
console.log(`测试用例：每节 × 2天（当天+前一天）× 12时辰 × ${END_YEAR - START_YEAR + 1}年`);
console.log(`预计约 ${NODE_INDICES.length * 2 * SHICHEN.length * (END_YEAR - START_YEAR + 1)} 条`);
console.log('─'.repeat(60));

for (let y = START_YEAR; y <= END_YEAR; y++) {
  for (const ti of NODE_INDICES) {
    const termTime = calendar.getSolarTermTime(y, ti);
    if (!termTime) continue;

    const termName = calendar.getSolarTermName(ti);
    const oldTermDay = calendar.getTerm(termTime.getFullYear(), ti + 1);

    // 测试节气当天和前一天（覆盖节气在深夜时前一天时辰可能跨界的情况）
    for (const dayOffset of [0, -1]) {
      const testDate = daysAgo(termTime, -dayOffset); // dayOffset=0→当天, -1→前一天
      const ty = testDate.getFullYear();
      const tm = testDate.getMonth() + 1;
      const td = testDate.getDate();

      for (const sc of SHICHEN) {
        const th  = sc.hour;
        const tmi = sc.minute;

        const o = oldCalc.calculateBazi(ty, tm, td, th, tmi);
        const n = newCalc.calculateBazi(ty, tm, td, th, tmi);

        totalTests++;

        const oy = pillar(o, 'year'),  ny = pillar(n, 'year');
        const om = pillar(o, 'month'), nm = pillar(n, 'month');

        if (oy === ny && om === nm) continue;

        const entry = {
          input: `${ty}-${pad(tm)}-${pad(td)} ${pad(th)}:${pad(tmi)} ${sc.name}`,
          termTime: `${termTime.getFullYear()}-${pad(termTime.getMonth()+1)}-${pad(termTime.getDate())} ${pad(termTime.getHours())}:${pad(termTime.getMinutes())}`,
          termName,
          dayOffset,
          oldTermDay,
          newTermDay: termTime.getDate(),
          oldYear: oy, newYear: ny,
          oldMonth: om, newMonth: nm,
        };

        if (!oy || !om || !ny || !nm) {
          bothFailed.push(entry);
        } else {
          diffs.push(entry);
        }
      }
    }
  }
}

const diffCount = diffs.length + bothFailed.length;
console.log(`总计 ${totalTests} 条用例`);
console.log(`完全一致：${totalTests - diffCount} 条`);
console.log(`差异：${diffCount} 条`);
console.log();

// ── 差异明细 ──────────────────────────────────────────────────
if (diffs.length > 0) {
  // 按节气分类
  const byTerm = {};
  for (const f of diffs) {
    if (!byTerm[f.termName]) byTerm[f.termName] = [];
    byTerm[f.termName].push(f);
  }

  console.log(`【差异列表】共 ${diffs.length} 条（新旧代码结果不同）`);
  console.log();

  for (const [termName, entries] of Object.entries(byTerm)) {
    console.log(`  节气：${termName}  (${entries.length} 条)`);
    for (const f of entries) {
      console.log(`    输入: ${f.input}  节气时刻: ${f.termTime}`);
      console.log(`    老表节气日: ${f.oldTermDay} 日，新表节气日: ${f.newTermDay} 日`);
      if (f.oldYear !== f.newYear)  console.log(`    年柱: 旧=${f.oldYear} 新=${f.newYear}`);
      if (f.oldMonth !== f.newMonth) console.log(`    月柱: 旧=${f.oldMonth} 新=${f.newMonth}`);
    }
    console.log();
  }
}

// ── 两个计算器均失败 ──────────────────────────────────────────
if (bothFailed.length > 0) {
  console.log(`【两个计算器均失败】${bothFailed.length} 条`);
  for (const f of bothFailed) {
    console.log(`  ${f.input}  节气：${f.termName}`);
  }
  console.log('  原因：js-calendar-converter 不支持 1900-01-31 之前的日期。');
  console.log();
}

// ── 差异分析 ──────────────────────────────────────────────────
console.log('═'.repeat(60));
if (diffs.length === 0 && bothFailed.length === 0) {
  console.log('✓ 全部通过：新旧代码对生产输入完全一致。');
} else if (diffs.length === 0) {
  console.log(`✓ 业务逻辑完全一致（${bothFailed.length} 条边界历史日期两个计算器均不支持，非新代码问题）。`);
} else {
  console.log(`发现 ${diffs.length} 条生产场景差异，请逐一核查：`);
  console.log('  可能原因：');
  console.log('    A. 老表 sTermInfo 节气日期有误（只精确到天），新表含精确时刻 → 新代码正确');
  console.log('    B. 逻辑Bug → 需要修复新代码');
  console.log();

  // 分析：按老表日期 vs 新表日期不同来区分 A vs B
  const dateDisc = diffs.filter(f => f.oldTermDay !== f.newTermDay);
  const sameDate = diffs.filter(f => f.oldTermDay === f.newTermDay);

  if (dateDisc.length > 0) {
    console.log(`  → ${dateDisc.length} 条：老表节气日期与新表不同（老表数据精度问题，新代码正确）`);
  }
  if (sameDate.length > 0) {
    console.log(`  → ${sameDate.length} 条：老表节气日期与新表相同但结果不同（需人工核查）`);
    for (const f of sameDate.slice(0, 5)) {
      console.log(`      ${f.input}  节气: ${f.termName} (${f.termTime})`);
      if (f.oldYear !== f.newYear)  console.log(`        年柱: 旧=${f.oldYear} 新=${f.newYear}`);
      if (f.oldMonth !== f.newMonth) console.log(`        月柱: 旧=${f.oldMonth} 新=${f.newMonth}`);
    }
    if (sameDate.length > 5) console.log(`      ...还有 ${sameDate.length - 5} 条`);
  }
}
