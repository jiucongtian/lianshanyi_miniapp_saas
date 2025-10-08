/**
 * Bean层使用示例
 * 展示如何在项目中使用Bean层处理云函数返回的数据
 */

const { ResponseBean, UserBean, ProfileBean, BaziBean } = require('./index');

/**
 * 示例：处理用户信息获取
 */
async function exampleGetUserInfo() {
  console.log('=== 示例：获取用户信息 ===');
  
  try {
    // 模拟云函数调用
    const cloudResult = await wx.cloud.callFunction({
      name: 'userManagement',
      data: { action: 'getUserInfo' }
    });
    
    // 使用ResponseBean处理响应
    const response = ResponseBean.fromCloudResult(cloudResult);
    
    if (response.isError()) {
      console.error('获取用户信息失败:', response.getError());
      wx.showToast({
        title: response.getError(),
        icon: 'error'
      });
      return;
    }
    
    // 使用UserBean处理用户数据
    const userBean = new UserBean(response.getData());
    
    // 使用Bean提供的业务方法
    console.log('用户昵称:', userBean.getNickName());
    console.log('用户类型:', userBean.getDisplayName());
    console.log('可以创建档案:', userBean.canCreateMore());
    console.log('剩余配额:', userBean.getRemainingQuota());
    
    // 检查权限
    if (userBean.canCreate()) {
      console.log('用户有创建档案的权限');
    }
    
    // 检查用户类型
    if (userBean.isGuest()) {
      console.log('这是临时用户，建议注册');
    } else if (userBean.isPremium()) {
      console.log('这是高级用户，享受全部功能');
    }
    
  } catch (error) {
    console.error('示例执行失败:', error);
  }
}

/**
 * 示例：处理档案列表获取
 */
async function exampleGetProfiles() {
  console.log('\n=== 示例：获取档案列表 ===');
  
  try {
    // 模拟云函数调用
    const cloudResult = await wx.cloud.callFunction({
      name: 'profileManagement',
      data: { action: 'getProfiles', data: { page: 1, limit: 10 } }
    });
    
    // 使用ResponseBean处理响应
    const response = ResponseBean.fromCloudResult(cloudResult);
    
    if (response.isError()) {
      console.error('获取档案列表失败:', response.getError());
      return;
    }
    
    const data = response.getData();
    const profiles = data.profiles || [];
    
    // 使用ProfileBean处理每个档案
    const profileBeans = profiles.map(profileData => new ProfileBean(profileData));
    
    console.log(`获取到 ${profileBeans.length} 个档案:`);
    
    profileBeans.forEach((profileBean, index) => {
      console.log(`\n档案 ${index + 1}:`);
      console.log('  名称:', profileBean.profileName);
      console.log('  出生时间:', profileBean.formatBirthTime());
      console.log('  八字:', profileBean.getBaziString());
      console.log('  性别:', profileBean.getGenderText());
      console.log('  时辰:', profileBean.getTimeInfo());
      
      // 转换为卡牌数据
      const cardData = profileBean.toCardData();
      console.log('  卡牌数据:', cardData);
    });
    
  } catch (error) {
    console.error('示例执行失败:', error);
  }
}

/**
 * 示例：处理八字计算
 */
async function exampleCalculateBazi() {
  console.log('\n=== 示例：计算八字 ===');
  
  try {
    const timestamp = new Date('1990-05-15 14:30:00').getTime();
    
    // 模拟云函数调用
    const cloudResult = await wx.cloud.callFunction({
      name: 'calculateBazi',
      data: { timestamp }
    });
    
    // 使用ResponseBean处理响应
    const response = ResponseBean.fromCloudResult(cloudResult);
    
    if (response.isError()) {
      console.error('八字计算失败:', response.getError());
      return;
    }
    
    // 使用BaziBean处理八字数据
    const baziBean = new BaziBean(response.getData());
    
    console.log('八字计算结果:');
    console.log('  八字字符串:', baziBean.getBaziString());
    console.log('  年柱:', baziBean.getYearPillar());
    console.log('  月柱:', baziBean.getMonthPillar());
    console.log('  日柱:', baziBean.getDayPillar());
    console.log('  时柱:', baziBean.getHourPillar());
    
    if (baziBean.hasLunarDate()) {
      console.log('  农历日期:', baziBean.getLunarDateString());
    }
    
    console.log('  数据完整性:', baziBean.isComplete());
    console.log('  数据有效性:', baziBean.isValid());
    
  } catch (error) {
    console.error('示例执行失败:', error);
  }
}

/**
 * 示例：错误处理最佳实践
 */
function exampleErrorHandling() {
  console.log('\n=== 示例：错误处理最佳实践 ===');
  
  // 模拟各种错误情况
  const errorCases = [
    null, // 云函数调用失败
    { result: null }, // 云函数返回null
    { result: { success: false, error: '用户不存在' } }, // 业务错误
    { result: { success: true, data: null } }, // 成功但无数据
  ];
  
  errorCases.forEach((cloudResult, index) => {
    console.log(`\n错误情况 ${index + 1}:`);
    
    const response = ResponseBean.fromCloudResult(cloudResult);
    
    if (response.isError()) {
      console.log('  错误类型:', response.getError());
      console.log('  错误码:', response.code);
      
      // 根据错误类型进行不同处理
      if (response.code === -1) {
        console.log('  处理: 网络错误，请重试');
      } else if (response.code === -2) {
        console.log('  处理: 数据格式错误，请联系客服');
      } else {
        console.log('  处理: 业务错误，显示错误信息');
      }
    } else {
      console.log('  成功，数据:', response.getData());
    }
  });
}

/**
 * 运行所有示例
 */
function runAllExamples() {
  console.log('开始Bean层使用示例...\n');
  
  // 注意：这些示例需要在小程序环境中运行
  // 在Node.js环境中，wx对象不存在，所以会报错
  console.log('注意：以下示例需要在小程序环境中运行');
  console.log('在Node.js环境中，wx对象不存在，所以会报错\n');
  
  // 运行错误处理示例（不依赖wx对象）
  exampleErrorHandling();
  
  console.log('\n✅ 示例演示完成！');
  console.log('\n在实际项目中使用Bean层的步骤：');
  console.log('1. 导入需要的Bean类');
  console.log('2. 使用ResponseBean处理云函数响应');
  console.log('3. 使用具体的Bean类处理业务数据');
  console.log('4. 使用Bean提供的业务方法进行逻辑判断');
  console.log('5. 统一使用Bean进行错误处理');
}

// 如果直接运行此文件，则执行示例
if (typeof module !== 'undefined' && require.main === module) {
  runAllExamples();
}

module.exports = {
  exampleGetUserInfo,
  exampleGetProfiles,
  exampleCalculateBazi,
  exampleErrorHandling,
  runAllExamples
};
