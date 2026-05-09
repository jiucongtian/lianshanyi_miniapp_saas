/**
 * 值符计算工具
 * 查询表源自知识库 §10.3 六甲旬对照表
 */

const XUN_ORDER = ['甲子旬', '甲戌旬', '甲申旬', '甲午旬', '甲辰旬', '甲寅旬'];

// 72条记录，完全硬编码
const ZHIFU_LOOKUP = {
  '甲子旬': {
    '子': '值符', '丑': '太阳', '寅': '伤符', '卯': '太阴',
    '辰': '官符', '巳': '死符', '午': '破碎', '未': '福德',
    '申': '白虎', '酉': '龙德', '戌': '吊客', '亥': '病符',
  },
  '甲戌旬': {
    '戌': '值符', '亥': '太阳', '子': '伤符', '丑': '太阴',
    '寅': '官符', '卯': '死符', '辰': '破碎', '巳': '福德',
    '午': '白虎', '未': '龙德', '申': '吊客', '酉': '病符',
  },
  '甲申旬': {
    '申': '值符', '酉': '太阳', '戌': '伤符', '亥': '太阴',
    '子': '官符', '丑': '死符', '寅': '破碎', '卯': '福德',
    '辰': '白虎', '巳': '龙德', '午': '吊客', '未': '病符',
  },
  '甲午旬': {
    '午': '值符', '未': '太阳', '申': '伤符', '酉': '太阴',
    '戌': '官符', '亥': '死符', '子': '破碎', '丑': '福德',
    '寅': '白虎', '卯': '龙德', '辰': '吊客', '巳': '病符',
  },
  '甲辰旬': {
    '辰': '值符', '巳': '太阳', '午': '伤符', '未': '太阴',
    '申': '官符', '酉': '死符', '戌': '破碎', '亥': '福德',
    '子': '白虎', '丑': '龙德', '寅': '吊客', '卯': '病符',
  },
  '甲寅旬': {
    '寅': '值符', '卯': '太阳', '辰': '伤符', '巳': '太阴',
    '午': '官符', '未': '死符', '申': '破碎', '酉': '福德',
    '戌': '白虎', '亥': '龙德', '子': '吊客', '丑': '病符',
  },
};

const KONG_LOOKUP = {
  '甲子旬': ['戌', '亥'],
  '甲戌旬': ['申', '酉'],
  '甲申旬': ['午', '未'],
  '甲午旬': ['辰', '巳'],
  '甲辰旬': ['寅', '卯'],
  '甲寅旬': ['子', '丑'],
};

const ZHIFU_TYPE = {
  '值符': 'ji', '太阴': 'ji', '福德': 'ji', '龙德': 'ji',
  '太阳': 'zhong', '破碎': 'zhong', '官符': 'zhong', '吊客': 'zhong',
  '伤符': 'xiong', '死符': 'xiong', '白虎': 'xiong', '病符': 'xiong',
};

/**
 * 年柱干支序号 → 所在旬名
 * 云函数 localCalculateBazi 使用 1-indexed（甲子=1 ... 癸亥=60）
 * 先转换为 0-indexed 再计算旬：0-9甲子旬, 10-19甲戌旬, 20-29甲申旬,
 * 30-39甲午旬, 40-49甲辰旬, 50-59甲寅旬
 */
function ganzhiIndexToXun(ganzhiIndex) {
  // 兼容 1-indexed (1-60) 和 0-indexed (0-59)
  // 统一转为 0-indexed：(idx - 1 + 60) % 60 对两种情况都安全
  // 若传入 0-indexed 的 0，((0-1)+60)%60=59，效果等同 ganzhiIndex=0 → 甲子旬（因为 59 后会折回？）
  // 为避免歧义，使用最简单的兼容：若值在 1-60，减1；若值在 0-59，不变
  const idx = ganzhiIndex > 0 ? (ganzhiIndex - 1) % 60 : 0;
  return XUN_ORDER[Math.floor(idx / 10)];
}

/**
 * 计算值符盘数据
 * @param {number} ganzhiIndex 年柱干支序号（云函数为 1-indexed，1-60）
 * @param {number} birthYear 出生公历年（用于计算当前年龄）
 * @param {string} yearZhi 年柱地支
 * @param {string} monthZhi 月柱地支
 * @param {string} dayZhi 日柱地支
 * @param {string} hourZhi 时柱地支
 * @returns {{ rows: Array, startXun: string }}
 */
function calculateZhifuData(ganzhiIndex, birthYear, yearZhi, monthZhi, dayZhi, hourZhi) {
  const startXun = ganzhiIndexToXun(ganzhiIndex);
  // 安全守卫：若旬名无效（ganzhiIndex 超出范围），回退到甲子旬
  const startIdx = XUN_ORDER.indexOf(startXun) >= 0 ? XUN_ORDER.indexOf(startXun) : 0;

  const currentYear = new Date().getFullYear();
  const currentAge = Math.max(0, currentYear - birthYear);

  // 出生年在所在旬内的位置（0-indexed：0=旬首，9=旬末）
  const positionInBirthXun = (ganzhiIndex - 1) % 10;
  // 出生旬内剩余年数（从出生年到旬末，含出生年）
  const yearsInBirthXun = 10 - positionInBirthXun;

  // 高亮行：当前年龄落在哪一旬
  let highlightRowIdx;
  if (currentAge < yearsInBirthXun) {
    highlightRowIdx = 0;
  } else {
    highlightRowIdx = 1 + Math.floor((currentAge - yearsInBirthXun) / 10);
  }
  highlightRowIdx = highlightRowIdx % 6;

  const pillarsZhi = [yearZhi, monthZhi, dayZhi, hourZhi];

  const rows = [];
  for (let i = 0; i < 6; i++) {
    const xun = XUN_ORDER[(startIdx + i) % 6];
    // 第0行（出生旬）：0 ~ yearsInBirthXun-1 岁
    // 第i行（i>=1）：yearsInBirthXun + (i-1)*10 ~ yearsInBirthXun + i*10 - 1 岁
    const ageStart = i === 0 ? 0 : yearsInBirthXun + (i - 1) * 10;
    const ageEnd   = i === 0 ? yearsInBirthXun - 1 : ageStart + 9;
    const isCurrentRow = (i === highlightRowIdx);
    const kong = KONG_LOOKUP[xun];

    const makeCell = (dizhi) => {
      const name = ZHIFU_LOOKUP[xun][dizhi] || '';
      return {
        name,
        type: ZHIFU_TYPE[name] || 'zhong',
        isKong: kong.indexOf(dizhi) !== -1,
        isHighlighted: isCurrentRow,
      };
    };

    rows.push({
      xun: xun.replace('旬', ''),
      ageRange: ageStart + '~' + ageEnd + '岁',
      year: makeCell(yearZhi),
      month: makeCell(monthZhi),
      day: makeCell(dayZhi),
      hour: makeCell(hourZhi),
    });
  }

  return { rows, startXun };
}

module.exports = { calculateZhifuData, ganzhiIndexToXun };
