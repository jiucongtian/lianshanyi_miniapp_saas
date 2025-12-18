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

// 60甲子 central 字段映射（从 docs/六十甲子卡牌完整数据.json 提取）
const CARD_CENTRAL_MAP = {
  "甲子": "我是一只有领导力的老鼠，天下第一敢想敢干，胆大心细，聪慧的我期望通过努力进取，勤练本领被世人看见",
  "乙丑": "我是一头俯首甘为孺子牛有承载力的牛，有德有才，任劳任怨，沉稳靠普，靠坚定的意念支持到达目标",
  "丙寅": "我是一只在山里自由有号召力的老虎，不怒自威，有号召力，战斗力强，喜欢结交朋友，我的地盘我做主",
  "丁卯": "我是一只公平公正有演说力的兔子，温润如玉，质朴且才华独特，管理能力强，讲规矩，独树一帜就是我",
  "戊辰": "我是一只稳重靠谱有学习力的龙，梦想星辰大海，落地质朴实在，靠清晰的逻辑和计划来实现",
  "己巳": "我是一条中正蓄藏爱面子具有战斗力蛇，致力于天下太平，靠灵活的出事和光明包容立足，喜欢被认可",
  "庚午": "我是一匹文采卓越，精力充沛，行事风格是电闪雷鸣式具有变通力的马，靠冷静和讲原则追求不断革新",
  "辛未": "我是一只温暖体贴，讲规矩懂感恩具有执行力的羊，性子急说干就干当然说不干也不干，勇往之前，风景是刮来的",
  "壬申": "我是一只名望贵气，重礼仪，懂人情世故具有拼搏力的猴子，凡事先谋胜再谋动，行必果",
  "癸酉": "我是一只外表高冷内心柔软，文艺范十足具有总结力的鸡，喜欢经典，古老的文化和物件，特别喜欢收藏",
  "甲戌": "我是一只目标明确，引领担当具有领导力的狗，靠梦想和自强不息来成就自我，正信正念",
  "乙亥": "我是一只抓核心，善于总结，辅佐有力具有承载力的猪，水生木的环境给予滋养，承载包容，以德名扬天下",
  "丙子": "我是一只灵活，有谋略且个性鲜明具有号召力的老鼠，立志靠自己努力打拼获得父辈和客户认可，我的地盘我做主",
  "丁丑": "我是一头爱吃爱玩爱自由具有演说力的牛，简单与严谨，热情与距离感，追求自由和浪漫的是我的标签",
  "戊寅": "我是一只敦厚靠谱，精益求精，不断创新具有学习力的老虎，靠化压力为动力执着于追求创新和知识真谛实现自我价值",
  "己卯": "我是一只能说会道，集体荣誉感强且公平公正具有战斗力的兔子，我靠自律，超强体能发挥自我价值，不断进步",
  "庚辰": "我是一条威严气场足，正能量传播者具有变通力的龙，我靠稳重获得信任，靠资源整合来促进事业和社会进步实现自我价值",
  "辛巳": "我是一条做事雷利风行，求快和完美具有执行力的蛇，靠规划和利用信息差来达成目标，爱自由和空间",
  "壬午": "我是一匹文韬武略，有谋略，敏感好战，讲究仁义礼智信的壬午，靠自我要求高和解决问题本领实现自我价值",
  "癸未": "我是一只温柔细腻，爱美食，也务实靠谱具有总结力的羊，我靠温柔包容，执行力，总结力来实现自我价值，厚德载物",
  "甲申": "我是一只神通广大具有领导力的猴子，正义凛然的，守承诺，敢担当，我靠强大的气场和战略谋划出人头地",
  "乙酉": "我是一只温柔善良，多才多金具有承载力的鸡，我靠虚怀若谷，传道授业解惑，厚德载物来实现天下无忧",
  "丙戌": "我是一只稳重得体，直言不讳，与世无争具有号召力的狗，我靠充满神秘感的文采，和强叙述能力获得认可，忠实可靠",
  "丁亥": "我是一只温火柔情，多才多艺，简单纯粹与自强不息结合具有演说力的猪，我靠持续精进，抓核心提升自我王者气质",
  "戊子": "我是一只学识渊博，公平公正，沉着冷静，风险管控意识强具有学习力的老鼠，我靠不断钻研创新突破行业创辉煌",
  "己丑": "我是一头内心火热，行事稳重，爱与人打交道，肯付出，讲规矩和原则的具有战斗力的牛，靠实际行动和周详的计划来赢得尊重",
  "庚寅": "我是一只胆大心细，推理能力强具有变通力的老虎，我靠公平有原则，言传身教来巩固管理，掌控平台",
  "辛卯": "我是一只风格独特，爱自由，重结果具有执行力的兔子，凡事讲究速度，靠信息收集分析，资源整合实现不停变化的目标",
  "壬辰": "我是一条权威大气，言传身教有感染力拼搏力的龙，我靠重仁义礼智信获得威望",
  "癸巳": "我是一只处事圆滑，后发致人，柔顺暗夺具有总结力的蛇，我发力不求速成而攻到自然圆满",
  "甲午": "我是一匹心性急燥，有爱心，不服输具有领导力的马，我靠超强文采创新，积极付出开拓未来，成就天下",
  "乙未": "我是一只温柔懂感恩，缺乏安全感，喜欢折腾具有承载力的羊，我靠顽强的韧劲，付出承载为了获得认可",
  "丙申": "我是一只机灵聪明，文艺浪漫，号召力强的猴子，我靠强目标感和沟通链接技能实现资源聚集，号令天下",
  "丁酉": "我是一只多才多艺，能说会道，与众不同具有演说力的鸡，我靠超强的敏锐和统筹能力，推成出新，顺势而为",
  "戊戌": "我是一只朴实专研，爱学习，公平正义的狗，我靠的是扎实的学术，充沛的精力，极致的谋略，好中求好",
  "己亥": "我是一只不怒自威，能屈能伸，双重性格具有战斗力的猪，我爱面子，我靠多变性，抓核心，解决问题泽佑天下",
  "庚子": "我是一只机智灵活，变化多样具有变通力的老鼠，我靠着超强技术革新，未雨绸缪，不断破旧立新，开拓未来",
  "辛丑": "我是一只心心念念赚钱存钱，是利三倍具有执行力的牛，情绪来去快，我靠细致的洞察力和执行力获得自己想要的结果",
  "壬寅": "我是一只讲规矩，有底线，威严有领地的壬寅，我敏感好战，靠坚守初心和实际行动证明自己",
  "癸卯": "我是一只处事圆滑但讲公平公正，不怒自威具有总结力的兔子，我靠包容承载，构思长远，潜移默化的坚韧耐力实现梦想",
  "甲辰": "我是一条春风满面爱笑的，信息收集应用能力强具有领导力的龙，我靠能吃苦，不断创新前行在星辰大海中旗帜鲜明引领一方",
  "乙巳": "我是一条心思缜密，讲规矩，抗压能力强具有承载力的蛇，我靠进退有度的韧劲，不大目的不罢休，终身得德双修",
  "丙午": "我是一匹聪明机智，文韬武略，做事有主见，张力十足具有号召力的马，我靠不服就战，火力聚集，逢战必胜",
  "丁未": "我是一只喜悦感强，带动力强，善言说做思想工作，具有演说力的羊，我靠气质型外交获得尊敬，追求与众不同",
  "戊申": "我是一只爱钻研学习，能动能静，务实，具有学习力的猴子，我靠慕强专研获得认可，出人头地",
  "己酉": "我是一只重内涵有修养，善于链接资源和危机公关，具有战斗力的鸡，我靠自身的战斗力，自带流量实现大家都有钱",
  "庚戌": "我是一只有范儿有学识，交友谨慎有选择，管控力强，有变通力的狗，我靠丰富的学识和变通力，解决所有问题，不断革新",
  "辛亥": "我是一头沉稳细腻，爱操心，凡事言简意赅，具有执行力的猪，我靠亲历亲为，结果为导向的执行力获得认可，梦想改革从新",
  "壬子": "我是一只韧劲十足，有经验有谋略，重情义，有拼搏力的老鼠，我靠谱，为了初心拼尽全力，按按证明自己",
  "癸丑": "我是一头冷静睿智，擅于总结计划，遇事喜欢反复思考，具有总结力的牛，时有语出惊人，我靠根基扎实，计划周详实现圆满人生",
  "甲寅": "我是一只身披荣誉与光环，敢挑战，拓新，具有领导力的老虎，我靠有人情味，接地气拓展人脉资源和新事物，日日新是我的夙愿",
  "乙卯": "我是一只纯洁无暇，掌控力强，大爱付出，具有承载力的兔子，我靠勤奋上进，公平公正，包容承载赢得认可，求天下祥和",
  "丙辰": "我是一条直言质朴，做事有主见，细致有体系，具有号召力的龙，我靠务实求真，神秘莫测获得认可，精益求精在自己的天地间",
  "丁巳": "我是一条心思细腻，简单直接，严控，具有演说力的蛇，我关注自己的点，往下深扎，追求有趣的灵魂和与众不同",
  "戊午": "我是一匹文武双全，精力旺盛，逻辑性强，具有学习力的马，我靠吃苦耐劳，朴实无华持续精进实现自我价值",
  "己未": "我是一只从容自若，顾全大局，超爱面子，具有战斗力的羊，我靠包容有爱，追随信仰，泽被天下实现自我价值",
  "庚申": "我是一只公平有原则，自带威严，荣誉感强，具有变通力的猴子，我靠超强管控能力，资源调配能力获得荣誉实现光宗耀祖",
  "辛酉": "我是一只气场强大，传播力强，爱自由，具有强执行力的鸡，我不喜欢被约束，喜欢平衡整合资源，目标清晰就是赚钱为了富甲一方",
  "壬戌": "我是一只冷静睿智，满腹经纶，追求思想高度，具有拼搏力的狗，我识大体重礼仪，忠孝两全，终身追求爱敬存心，舍财做福",
  "癸亥": "我是一只感知敏锐，外冷内热，感情细腻，具有总结力的猪，我靠站得远站得高固尔看得清，踏实承载甘做幕后，实现暗夺天下之计"
};

function getCardNumber(ganZhi) {
  return CARD_NAME_TO_NUMBER[ganZhi] || null;
}

/**
 * 获取卡牌的 central 字段
 * @param {string} ganZhi - 干支名称
 * @returns {string} central 描述
 */
function getCardCentral(ganZhi) {
  return CARD_CENTRAL_MAP[ganZhi] || '';
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
    const existingResult = await db.collection('daily_insights')
      .where({ cardNumber: cardData.cardNumber })
      .get();
    
    const now = new Date();
    
    if (existingResult.data.length > 0) {
      // 更新现有记录
      const existingId = existingResult.data[0]._id;
      console.log('[saveDailyInsight] 更新现有记录:', existingId);
      
      await db.collection('daily_insights')
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
      
      const addResult = await db.collection('daily_insights')
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
      central: getCardCentral(ganZhiName), // 从映射表获取 central 字段
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
 * 查询数据库中已有的 cardNumber
 * @returns {Promise<Set<number>>} 已有的 cardNumber 集合
 */
async function getExistingCardNumbers() {
  try {
    console.log('[getExistingCardNumbers] 查询数据库中已有的 cardNumber...');
    
    // 查询所有有效的记录
    const result = await db.collection('daily_insights')
      .where({ isActive: true })
      .field({ cardNumber: true })
      .get();
    
    const existingNumbers = new Set();
    result.data.forEach(item => {
      if (item.cardNumber && item.cardNumber >= 1 && item.cardNumber <= 60) {
        existingNumbers.add(item.cardNumber);
      }
    });
    
    console.log('[getExistingCardNumbers] 查询完成，已有数量:', existingNumbers.size);
    console.log('[getExistingCardNumbers] 已有的 cardNumber:', Array.from(existingNumbers).sort((a, b) => a - b));
    
    return existingNumbers;
  } catch (error) {
    console.error('[getExistingCardNumbers] 查询失败:', error);
    throw error;
  }
}

/**
 * 找出缺失的 cardNumber，并转换为对应的干支名称列表
 * @param {Set<number>} existingNumbers - 已有的 cardNumber 集合
 * @param {number} maxGenerateCount - 最多生成的数量（默认3个）
 * @returns {Array<string>} 需要生成的干支名称列表
 */
function findMissingGanZhiList(existingNumbers, maxGenerateCount = 5) {
  const missingNumbers = [];
  
  // 找出所有缺失的编号（1-60）
  for (let i = 1; i <= 60; i++) {
    if (!existingNumbers.has(i)) {
      missingNumbers.push(i);
    }
  }
  
  console.log('[findMissingGanZhiList] 缺失的 cardNumber 总数:', missingNumbers.length);
  console.log('[findMissingGanZhiList] 缺失的 cardNumber:', missingNumbers);
  
  // 如果缺失数量为0，返回空数组
  if (missingNumbers.length === 0) {
    return [];
  }
  
  // 限制生成数量（最多生成 maxGenerateCount 个）
  const numbersToGenerate = missingNumbers.slice(0, maxGenerateCount);
  console.log('[findMissingGanZhiList] 本次需要生成的 cardNumber:', numbersToGenerate);
  
  // 将编号转换为对应的干支名称
  const ganZhiList = numbersToGenerate.map(cardNumber => {
    // 从编号反查干支名称
    const ganZhiName = Object.keys(CARD_NAME_TO_NUMBER).find(
      name => CARD_NAME_TO_NUMBER[name] === cardNumber
    );
    
    if (!ganZhiName) {
      console.error(`[findMissingGanZhiList] 未找到编号 ${cardNumber} 对应的干支名称`);
      return null;
    }
    
    return ganZhiName;
  }).filter(name => name !== null);
  
  console.log('[findMissingGanZhiList] 需要生成的干支列表:', ganZhiList);
  
  return ganZhiList;
}

/**
 * 并发处理多个干支（控制并发数量）
 */
async function processBatchConcurrent(ganZhiList, concurrency = 3) {
  const total = ganZhiList.length;
  const actualConcurrency = Math.min(concurrency, total);
  
  console.log(`\n[批次处理] 处理 ${total} 个干支，并发数: ${actualConcurrency}`);
  
  // 并发执行
  const promises = ganZhiList.map((ganZhiName, index) => {
    return processSingleGanZhi(ganZhiName, index, total);
  });
  
  // 等待全部完成
  const results = await Promise.all(promises);
  
  return results;
}

/**
 * 主函数：增量更新缺失的60甲子日报数据
 */
async function updateAllDailyInsights(options = {}) {
  const startTime = Date.now();
  const concurrency = options.concurrency || 3; // 默认并发数3个
  const maxGenerateCount = concurrency; // 每次最多生成的数量等于并发数
  
  try {
    console.log('========================================');
    console.log('[updateAllDailyInsights] 开始增量更新60甲子日报数据');
    console.log('[updateAllDailyInsights] 并发数:', concurrency);
    console.log('[updateAllDailyInsights] 每次最多生成数量:', maxGenerateCount);
    console.log('========================================');
    
    // 1. 查询数据库中已有的 cardNumber
    const existingNumbers = await getExistingCardNumbers();
    
    // 2. 找出缺失的编号，并转换为干支名称列表
    const ganZhiListToGenerate = findMissingGanZhiList(existingNumbers, maxGenerateCount);
    
    // 3. 如果所有数据都已存在，直接返回成功
    if (ganZhiListToGenerate.length === 0) {
      console.log('[updateAllDailyInsights] 所有60个甲子数据都已存在，无需生成');
      return {
        success: true,
        message: '所有数据都已存在，无需生成',
        data: {
          total: 60,
          existingCount: existingNumbers.size,
          missingCount: 0,
          generatedCount: 0,
          successCount: 0,
          errorCount: 0,
          totalTime: ((Date.now() - startTime) / 1000).toFixed(2),
          concurrency: concurrency,
          results: [],
          errors: []
        },
        timestamp: new Date().getTime()
      };
    }
    
    console.log(`[updateAllDailyInsights] 需要生成 ${ganZhiListToGenerate.length} 个干支数据`);
    
    // 4. 并发处理需要生成的干支
    const results = await processBatchConcurrent(ganZhiListToGenerate, concurrency);
    
    // 5. 分类结果
    const allResults = [];
    const allErrors = [];
    
    results.forEach(result => {
      if (result.success) {
        allResults.push(result);
      } else {
        allErrors.push(result);
      }
    });
    
    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n========================================');
    console.log('[updateAllDailyInsights] 增量更新完成');
    console.log('[updateAllDailyInsights] 总耗时:', totalTime, '秒');
    console.log('[updateAllDailyInsights] 成功:', allResults.length);
    console.log('[updateAllDailyInsights] 失败:', allErrors.length);
    console.log('========================================');
    
    return {
      success: allErrors.length === 0,
      message: `增量更新完成，成功${allResults.length}条，失败${allErrors.length}条`,
      data: {
        total: 60,
        existingCount: existingNumbers.size,
        missingCount: 60 - existingNumbers.size,
        generatedCount: ganZhiListToGenerate.length,
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
    console.error('[updateAllDailyInsights] 增量更新失败:', error);
    console.error('========================================');
    
    return {
      success: false,
      error: error.message || '增量更新失败',
      timestamp: new Date().getTime()
    };
  }
}

// ==================== 云函数入口 ====================

exports.main = async (event, context) => {
  console.log('[auto_updateDailyInsight] 云函数被调用');
  console.log('[auto_updateDailyInsight] 接收参数:', JSON.stringify(event, null, 2));
  
  try {
    // 支持传入并发参数（用于控制并发数量）
    // 格式: { concurrency: 3 }
    // - concurrency: 并发数量（默认3个），也是每次调用最多生成的数量
    // 
    // 执行逻辑：
    // 1. 查询数据库中已有的 cardNumber
    // 2. 找出缺失的编号（1-60中不在数据库中的）
    // 3. 如果缺失数量 > 0：
    //    - 如果缺失数量 <= concurrency：生成所有缺失的
    //    - 如果缺失数量 > concurrency：只生成前 concurrency 个缺失的
    // 4. 如果缺失数量 = 0：返回成功，不生成任何数据
    const result = await updateAllDailyInsights({
      concurrency: event.concurrency || 3
    });
    
    return result;
  } catch (error) {
    console.error('[auto_updateDailyInsight] 云函数执行异常:', error);
    return {
      success: false,
      error: error.message || '云函数执行失败',
      timestamp: new Date().getTime()
    };
  }
};

