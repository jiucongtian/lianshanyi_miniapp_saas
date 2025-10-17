// 云函数入口文件
const cloud = require('wx-server-sdk')
const { calculateBazi } = require('./core-converter/bazi-calculator')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
})

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    console.log('=== localCalculateBazi_v1_2 云函数开始执行 ===');
    console.log('接收到的参数:', event);
    
    // 获取参数
    const { year, month, day, hour, minute = 0 } = event;
    
    // 验证参数
    if (!year || !month || !day || hour === undefined) {
      return {
        success: false,
        error: '缺少必要参数：year, month, day, hour'
      };
    }
    
    console.log('开始本地八字计算:', { year, month, day, hour, minute });
    
    // 调用本地计算逻辑
    const result = calculateBazi(year, month, day, hour, minute);
    
    console.log('本地计算完成，结果:', result);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || '本地计算失败'
      };
    }
    
    return {
      success: true,
      message: '本地八字计算成功',
      data: result,
      context: {
        openid: wxContext.OPENID,
        appid: wxContext.APPID,
        unionid: wxContext.UNIONID
      }
    };
  } catch (error) {
    console.error('localCalculateBazi_v1_2 执行失败:', error);
    console.error('错误堆栈:', error.stack);
    return {
      success: false,
      error: error.message || '执行失败'
    };
  }
}
