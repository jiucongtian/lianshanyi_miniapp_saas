// 云函数入口文件
const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
});

const db = cloud.database();

// ==================== 基础数据模块 ====================
// 从 docs/tools/jiazi-card-generator/base-data.js 复制

// 天干数组
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

// 地支数组
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 60甲子名称到编号映射
const CARD_NAME_TO_NUMBER = {
  "甲子": 1, "乙丑": 2, "丙寅": 3, "丁卯": 4, "戊辰": 5, "己巳": 6,
  "庚午": 7, "辛未": 8, "壬申": 9, "癸酉": 10, "甲戌": 11, "乙亥": 12,
  "丙子": 13, "丁丑": 14, "戊寅": 15, "己卯": 16, "庚辰": 17, "辛巳": 18,
  "壬午": 19, "癸未": 20, "甲申": 21, "乙酉": 22, "丙戌": 23, "丁亥": 24,
  "戊子": 25, "己丑": 26, "庚寅": 27, "辛卯": 28, "壬辰": 29, "癸巳": 30,
  "甲午": 31, "乙未": 32, "丙申": 33, "丁酉": 34, "戊戌": 35, "己亥": 36,
  "庚子": 37, "辛丑": 38, "壬寅": 39, "癸卯": 40, "甲辰": 41, "乙巳": 42,
  "丙午": 43, "丁未": 44, "戊申": 45, "己酉": 46, "庚戌": 47, "辛亥": 48,
  "壬子": 49, "癸丑": 50, "甲寅": 51, "乙卯": 52, "丙辰": 53, "丁巳": 54,
  "戊午": 55, "己未": 56, "庚申": 57, "辛酉": 58, "壬戌": 59, "癸亥": 60
};

// 60甲子完整列表（按编号顺序）
const ALL_GANZHI_LIST = Object.keys(CARD_NAME_TO_NUMBER).sort((a, b) => {
  return CARD_NAME_TO_NUMBER[a] - CARD_NAME_TO_NUMBER[b];
});

function getCardNumber(ganZhi) {
  return CARD_NAME_TO_NUMBER[ganZhi] || null;
}

// ==================== 计算数据模块 ====================
// 从 docs/tools/jiazi-card-generator/calculated-data.js 复制

// 天干对应的季节
const GAN_SEASON = {
  '甲': '春', '乙': '春',
  '丙': '夏', '丁': '夏', '戊': '夏', '己': '夏',
  '庚': '秋', '辛': '秋',
  '壬': '冬', '癸': '冬'
};

// 地支对应的季节
const ZHI_SEASON = {
  '子': '冬', '丑': '冬',
  '寅': '春', '卯': '春', '辰': '春',
  '巳': '夏', '午': '夏', '未': '夏',
  '申': '秋', '酉': '秋', '戌': '秋',
  '亥': '冬'
};

function calculateSeasonMark(gan, zhi) {
  const ganSeason = GAN_SEASON[gan];
  const zhiSeason = ZHI_SEASON[zhi];
  
  if (!ganSeason || !zhiSeason) return '';
  
  return ganSeason + zhiSeason;
}

// ==================== 业务数据模块 ====================
// 从 docs/tools/jiazi-card-generator/business-data.js 复制

// 天干对应的天赋标记
const TALENT_MARK_MAP = {
  '甲': '领导力',
  '乙': '承载力',
  '丙': '号召力',
  '丁': '演说力',
  '戊': '学习力',
  '己': '战斗力',
  '庚': '变通力',
  '辛': '执行力',
  '壬': '拼搏力',
  '癸': '总结力'
};

// 能力标记映射表
const ABILITY_MARK_MAP = {
  '甲子': '1', '乙丑': '4', '丙寅': '6', '丁卯': '2', '戊辰': '2', '己巳': '6',
  '庚午': '4', '辛未': '4', '壬申': '5', '癸酉': '6', '甲戌': '6', '乙亥': '5',
  '丙子': '5', '丁丑': '3', '戊寅': '1', '己卯': '1', '庚辰': '3', '辛巳': '5',
  '壬午': '4', '癸未': '1', '甲申': '5', '乙酉': '6', '丙戌': '4', '丁亥': '4',
  '戊子': '6', '己丑': '2', '庚寅': '2', '辛卯': '6', '壬辰': '3', '癸巳': '2',
  '甲午': '4', '乙未': '1', '丙申': '3', '丁酉': '5', '戊戌': '5', '己亥': '3',
  '庚子': '1', '辛丑': '1', '壬寅': '2', '癸卯': '3', '甲辰': '3', '乙巳': '2',
  '丙午': '2', '丁未': '6', '戊申': '4', '己酉': '4', '庚戌': '6', '辛亥': '2',
  '壬子': '1', '癸丑': '4', '甲寅': '2', '乙卯': '3', '丙辰': '1', '丁巳': '1',
  '戊午': '3', '己未': '5', '庚申': '5', '辛酉': '3', '壬戌': '6', '癸亥': '5'
};

// 天干对应的路径标记
const GAN_PATH_MARK_MAP = {
  '甲': '生与仁',
  '乙': '光与热',
  '丙': '光与热',
  '丁': '精与义',
  '戊': '光与热',
  '己': '精与义',
  '庚': '精与义',
  '辛': '智与动',
  '壬': '智与动',
  '癸': '生与仁'
};

function getTalentMark(gan) {
  return TALENT_MARK_MAP[gan] || '';
}

function getAbilityMark(ganZhi) {
  return ABILITY_MARK_MAP[ganZhi] || '';
}

function getPathMark(ganZhi) {
  const gan = ganZhi[0];
  return GAN_PATH_MARK_MAP[gan] || '';
}

// ==================== Coze API 配置 ====================

const COZE_CONFIG = {
  token: 'sat_JBr8tgHf8a8IkpwoFMpNWiioLFdqdAWj9O8HVRZ7DFmYqQf2wKzf92vRqKjQQMdv',
  baseURL: 'https://api.coze.cn',
  workflowId: '7583167143870382106' // GET_DAILY_INSIGHT 工作流ID
};

// ==================== 工具函数 ====================

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== 核心业务逻辑 ====================

/**
 * 生成卡牌基础信息
 */
function generateCardBaseInfo(ganZhiName) {
  const gan = ganZhiName[0];
  const zhi = ganZhiName[1];
  const cardNumber = getCardNumber(ganZhiName);
  
  if (!cardNumber) {
    throw new Error(`无效的干支名称: ${ganZhiName}`);
  }
  
  console.log('[generateCardBaseInfo] 生成卡牌基础信息:', ganZhiName);
  
  const seasonMark = calculateSeasonMark(gan, zhi);
  const talentMark = getTalentMark(gan);
  const abilityMark = getAbilityMark(ganZhiName);
  const pathMark = getPathMark(ganZhiName);
  
  const baseInfo = {
    cardName: ganZhiName,
    cardNumber: cardNumber,
    seasonMark: seasonMark,
    talentMark: talentMark,
    abilityMark: abilityMark,
    pathMark: pathMark
  };
  
  console.log('[generateCardBaseInfo] 生成的基础信息:', baseInfo);
  
  return baseInfo;
}

/**
 * 调用 Coze 工作流获取日报解读
 */
async function callCozeWorkflow(caiNeng, ganZhi) {
  try {
    console.log('[callCozeWorkflow] 调用Coze工作流:', {
      cai_neng: caiNeng,
      gan_zhi: ganZhi,
      workflowId: COZE_CONFIG.workflowId
    });
    
    const response = await axios({
      url: `${COZE_CONFIG.baseURL}/v1/workflow/run`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${COZE_CONFIG.token}`
      },
      data: {
        workflow_id: COZE_CONFIG.workflowId,
        parameters: {
          cai_neng: caiNeng,
          gan_zhi: ganZhi
        }
      },
      timeout: 180000 // 3分钟超时（Coze接口可能需要1-2分钟）
    });
    
    console.log('[callCozeWorkflow] Coze API 响应:', JSON.stringify(response.data, null, 2));
    
    // 检查 Coze API 返回
    if (response.data.code !== 0) {
      throw new Error(`Coze API 返回错误: ${response.data.msg || '未知错误'}`);
    }
    
    // 解析返回数据（data字段可能是字符串或对象）
    let dataObj = response.data.data;
    
    // 如果data是字符串，先解析第一层
    if (typeof dataObj === 'string') {
      try {
        dataObj = JSON.parse(dataObj);
        console.log('[callCozeWorkflow] 第一层解析结果:', dataObj);
      } catch (parseError) {
        console.error('[callCozeWorkflow] 第一层JSON解析失败:', parseError);
        throw new Error('解析Coze返回数据失败：第一层JSON解析错误');
      }
    }
    
    // 提取output字段（可能是字符串或对象）
    let output = dataObj.output;
    
    if (!output) {
      throw new Error('Coze返回数据格式错误：缺少output字段');
    }
    
    // 如果output是字符串，需要再次解析
    if (typeof output === 'string') {
      try {
        const parsedOutput = JSON.parse(output);
        console.log('[callCozeWorkflow] 解析的output内容:', parsedOutput);
        return parsedOutput;
      } catch (parseError) {
        console.error('[callCozeWorkflow] output JSON解析失败:', parseError);
        console.error('[callCozeWorkflow] output原始内容:', output);
        throw new Error('解析Coze返回数据失败：output JSON解析错误');
      }
    } else {
      // output已经是对象，直接返回
      console.log('[callCozeWorkflow] output已经是对象:', output);
      return output;
    }
  } catch (error) {
    console.error('[callCozeWorkflow] 调用Coze工作流失败:', error);
    
    if (error.response) {
      throw new Error(`Coze API请求失败: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Coze API请求超时或网络错误');
    } else {
      throw error;
    }
  }
}

/**
 * 保存或更新日报数据到数据库
 */
async function saveDailyInsight(cardData) {
  try {
    console.log('[saveDailyInsight] 保存日报数据:', {
      cardNumber: cardData.cardNumber,
      cardName: cardData.cardName
    });
    
    // 使用 cardNumber 作为唯一标识（因为每个干支对应一个固定的卡牌编号）
    const existingResult = await db.collection('test_daily_insights')
      .where({ cardNumber: cardData.cardNumber })
      .get();
    
    const now = new Date();
    
    if (existingResult.data.length > 0) {
      // 更新现有记录
      const existingId = existingResult.data[0]._id;
      console.log('[saveDailyInsight] 更新现有记录:', existingId);
      
      await db.collection('test_daily_insights')
        .doc(existingId)
        .update({
          data: {
            ...cardData,
            updatedAt: now,
            isActive: true
          }
        });
      
      console.log('[saveDailyInsight] 更新成功');
      return { action: 'updated', id: existingId };
    } else {
      // 插入新记录
      console.log('[saveDailyInsight] 插入新记录');
      
      const addResult = await db.collection('test_daily_insights')
        .add({
          data: {
            ...cardData,
            createdAt: now,
            updatedAt: now,
            isActive: true
          }
        });
      
      console.log('[saveDailyInsight] 插入成功, _id:', addResult._id);
      return { action: 'created', id: addResult._id };
    }
  } catch (error) {
    console.error('[saveDailyInsight] 保存日报数据失败:', error);
    throw error;
  }
}

/**
 * 处理单个干支的日报数据（不包含延迟）
 */
async function processSingleGanZhi(ganZhiName, index, total) {
  try {
    console.log(`[${index + 1}/${total}] 开始处理: ${ganZhiName}`);
    
    // 1. 生成卡牌基础信息
    const baseInfo = generateCardBaseInfo(ganZhiName);
    
    // 2. 调用 Coze 工作流获取日报解读
    console.log(`[${index + 1}/${total}] 调用Coze工作流: ${ganZhiName}...`);
    const cozeResult = await callCozeWorkflow(
      baseInfo.abilityMark,
      baseInfo.cardName
    );
    
    // 3. 合并数据
    const completeCardData = {
      ...baseInfo,
      central: '', // central 字段暂时留空
      blessing: cozeResult.blessing || '',
      tip: cozeResult.tip || '',
      password: cozeResult.password || ''
    };
    
    // 4. 保存到数据库
    console.log(`[${index + 1}/${total}] 保存到数据库: ${ganZhiName}...`);
    const saveResult = await saveDailyInsight(completeCardData);
    
    console.log(`[${index + 1}/${total}] ✅ 完成: ${ganZhiName} (${saveResult.action})`);
    
    return {
      success: true,
      ganZhiName,
      cardNumber: baseInfo.cardNumber,
      action: saveResult.action
    };
  } catch (error) {
    console.error(`[${index + 1}/${total}] ❌ 失败: ${ganZhiName}`, error);
    return {
      success: false,
      ganZhiName,
      error: error.message || '处理失败'
    };
  }
}

/**
 * 并发处理多个干支（控制并发数量）
 */
async function processBatchConcurrent(ganZhiList, startIndex, concurrency = 5) {
  const batch = ganZhiList.slice(startIndex, startIndex + concurrency);
  const total = ganZhiList.length;
  
  console.log(`\n[批次处理] 处理 ${startIndex + 1}-${Math.min(startIndex + concurrency, total)}/${total}`);
  
  // 并发执行这一批
  const promises = batch.map((ganZhiName, batchIndex) => {
    const globalIndex = startIndex + batchIndex;
    return processSingleGanZhi(ganZhiName, globalIndex, total);
  });
  
  // 等待这一批全部完成
  const results = await Promise.all(promises);
  
  return results;
}

/**
 * 主函数：批量更新所有60甲子的日报数据（并发模式）
 */
async function updateAllDailyInsights(options = {}) {
  const startTime = Date.now();
  const concurrency = options.concurrency || 5; // 默认并发数5个
  
  try {
    console.log('========================================');
    console.log('[updateAllDailyInsights] 开始批量更新所有60甲子日报数据');
    console.log('[updateAllDailyInsights] 总数:', ALL_GANZHI_LIST.length);
    console.log('[updateAllDailyInsights] 并发数:', concurrency);
    console.log('[updateAllDailyInsights] 预计批次:', Math.ceil(ALL_GANZHI_LIST.length / concurrency));
    console.log('========================================');
    
    const allResults = [];
    const allErrors = [];
    
    // 分批并发处理
    for (let i = 0; i < ALL_GANZHI_LIST.length; i += concurrency) {
      const batchResults = await processBatchConcurrent(ALL_GANZHI_LIST, i, concurrency);
      
      // 分类结果
      batchResults.forEach(result => {
        if (result.success) {
          allResults.push(result);
        } else {
          allErrors.push(result);
        }
      });
      
      // 批次间延迟（避免过快触发频率限制）
      if (i + concurrency < ALL_GANZHI_LIST.length) {
        const delayMs = options.batchDelayMs || 1000; // 批次间延迟1秒
        console.log(`[批次完成] 等待 ${delayMs}ms 后继续下一批...`);
        await delay(delayMs);
      }
    }
    
    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n========================================');
    console.log('[updateAllDailyInsights] 批量更新完成');
    console.log('[updateAllDailyInsights] 总耗时:', totalTime, '秒');
    console.log('[updateAllDailyInsights] 成功:', allResults.length);
    console.log('[updateAllDailyInsights] 失败:', allErrors.length);
    console.log('========================================');
    
    return {
      success: allErrors.length === 0,
      message: `批量更新完成，成功${allResults.length}条，失败${allErrors.length}条`,
      data: {
        total: ALL_GANZHI_LIST.length,
        successCount: allResults.length,
        errorCount: allErrors.length,
        totalTime: totalTime,
        concurrency: concurrency,
        results: allResults,
        errors: allErrors
      },
      timestamp: new Date().getTime()
    };
  } catch (error) {
    console.error('\n========================================');
    console.error('[updateAllDailyInsights] 批量更新失败:', error);
    console.error('========================================');
    
    return {
      success: false,
      error: error.message || '批量更新失败',
      timestamp: new Date().getTime()
    };
  }
}

// ==================== 云函数入口 ====================

exports.main = async (event, context) => {
  console.log('[updateDailyInsight] 云函数被调用');
  console.log('[updateDailyInsight] 接收参数:', JSON.stringify(event, null, 2));
  
  try {
    // 支持传入并发参数（用于控制并发数量）
    // 格式: { concurrency: 5, batchDelayMs: 1000 }
    // - concurrency: 并发数量（默认5个）
    // - batchDelayMs: 批次间延迟（默认1秒）
    const result = await updateAllDailyInsights({
      concurrency: event.concurrency || 5,
      batchDelayMs: event.batchDelayMs || 1000
    });
    
    return result;
  } catch (error) {
    console.error('[updateDailyInsight] 云函数执行异常:', error);
    return {
      success: false,
      error: error.message || '云函数执行失败',
      timestamp: new Date().getTime()
    };
  }
};

