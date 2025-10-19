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
    const { year, month, day, hour, minute = 0, isLunar = false, isLeapMonth = false } = event;
    
    // 验证参数
    if (!year || !month || !day || hour === undefined) {
      return {
        success: false,
        error: '缺少必要参数：year, month, day, hour'
      };
    }
    
    // 如果是农历日期，先转换为公历
    let solarYear = year;
    let solarMonth = month;
    let solarDay = day;
    
    if (isLunar) {
      console.log('检测到农历日期，开始转换为公历');
      console.log('农历日期:', { year, month, day, isLeapMonth });
      
      const calendar = require('./core-converter/js-calendar-converter.cjs');
      const lunarResult = calendar.lunar2solar(year, month, day, isLeapMonth);
      
      if (lunarResult === -1) {
        return {
          success: false,
          error: '农历日期无效或超出支持范围（1900-2100）'
        };
      }
      
      solarYear = lunarResult.cYear;
      solarMonth = lunarResult.cMonth;
      solarDay = lunarResult.cDay;
      
      console.log('农历转公历成功:', { solarYear, solarMonth, solarDay });
      console.log('转换详情:', lunarResult);
    }
    
    console.log('开始本地八字计算（使用公历日期）:', { 
      year: solarYear, 
      month: solarMonth, 
      day: solarDay, 
      hour, 
      minute 
    });
    
    // 调用本地计算逻辑（始终使用公历日期）
    const result = calculateBazi(solarYear, solarMonth, solarDay, hour, minute);
    
    console.log('本地计算完成，结果:', result);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || '本地计算失败'
      };
    }
    
    // 在返回结果中添加原始输入信息
    const response = {
      success: true,
      message: '本地八字计算成功',
      data: {
        ...result,
        inputDate: {
          isLunar,
          isLeapMonth,
          originalYear: year,
          originalMonth: month,
          originalDay: day,
          hour,
          minute
        }
      },
      context: {
        openid: wxContext.OPENID,
        appid: wxContext.APPID,
        unionid: wxContext.UNIONID
      }
    };
    
    // 如果进行了农历转公历，添加转换信息
    if (isLunar) {
      response.data.converted = {
        solarYear,
        solarMonth,
        solarDay
      };
    }
    
    return response;
  } catch (error) {
    console.error('localCalculateBazi_v1_2 执行失败:', error);
    console.error('错误堆栈:', error.stack);
    return {
      success: false,
      error: error.message || '执行失败'
    };
  }
}
