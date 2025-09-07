// 临时节气数据（仅用于测试）
const solarTermsData = {
  "2024": {
    "小寒": "2024-01-06 04:49:00",
    "大寒": "2024-01-21 04:07:00",
    "立春": "2024-02-04 22:27:00",
    "雨水": "2024-02-19 14:13:00",
    "惊蛰": "2024-03-05 04:22:00",
    "春分": "2024-03-19 17:06:00",
    "清明": "2024-04-04 05:02:00",
    "谷雨": "2024-04-19 15:59:00",
    "立夏": "2024-05-05 02:10:00",
    "小满": "2024-05-20 11:59:00",
    "芒种": "2024-06-05 22:09:00",
    "夏至": "2024-06-21 08:51:00",
    "小暑": "2024-07-06 20:31:00",
    "大暑": "2024-07-22 09:44:00",
    "立秋": "2024-08-07 00:10:00",
    "处暑": "2024-08-22 16:25:00",
    "白露": "2024-09-07 10:11:00",
    "秋分": "2024-09-22 05:44:00",
    "寒露": "2024-10-08 01:49:00",
    "霜降": "2024-10-23 21:44:00",
    "立冬": "2024-11-07 16:20:00",
    "小雪": "2024-11-22 08:56:00",
    "大雪": "2024-12-07 23:17:00",
    "冬至": "2024-12-21 11:21:00"
  }
};

// 获取指定日期所在的节气
const getSolarTerm = (date) => {
  const year = date.getFullYear();
  const yearData = solarTermsData[year];
  
  if (!yearData) {
    return {
      current: { term: "立春", timestamp: date.getTime() },
      next: { term: "雨水", timestamp: date.getTime() + 86400000 },
      isNearChange: false
    };
  }

  const dateTime = date.getTime();
  let currentTerm = null;
  let nextTerm = null;

  // 将节气数据转换为时间戳进行比较
  const terms = Object.entries(yearData).map(([term, time]) => ({
    term,
    timestamp: new Date(time).getTime()
  }));

  // 按时间排序
  terms.sort((a, b) => a.timestamp - b.timestamp);

  // 查找当前日期所在的节气
  for (let i = 0; i < terms.length; i++) {
    if (dateTime >= terms[i].timestamp) {
      currentTerm = terms[i];
      nextTerm = terms[i + 1] || terms[0];
    }
  }

  // 如果没有找到，使用第一个节气
  if (!currentTerm) {
    currentTerm = terms[0];
    nextTerm = terms[1];
  }

  return {
    current: currentTerm,
    next: nextTerm,
    isNearChange: Math.abs(dateTime - nextTerm.timestamp) < 24 * 60 * 60 * 1000 // 是否在节气交接的24小时内
  };
};

export { solarTermsData, getSolarTerm };
