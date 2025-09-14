// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
})

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  console.log('=== 测试云函数开始执行 ===')
  console.log('执行时间:', new Date().toISOString())
  console.log('用户信息:', {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID
  })
  console.log('接收到的参数:', event)
  console.log('云函数上下文:', {
    requestId: context.requestId,
    functionName: context.functionName,
    functionVersion: context.functionVersion
  })
  console.log('=== 测试云函数执行完成 ===')
  
  return {
    success: true,
    message: '测试云函数执行成功！',
    timestamp: Date.now(),
    data: {
      openid: wxContext.OPENID,
      appid: wxContext.APPID,
      unionid: wxContext.UNIONID,
      receivedParams: event,
      executionTime: new Date().toISOString()
    }
  }
}

