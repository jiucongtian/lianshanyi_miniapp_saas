/**
 * Bean层测试文件
 * 用于测试所有Bean类的数据处理功能
 */

const { ResponseBean, UserBean, ProfileBean, BaziBean } = require('./index');

// 测试ResponseBean
function testResponseBean() {
  console.log('=== 测试ResponseBean ===');
  
  // 测试成功响应
  const successResult = {
    result: {
      success: true,
      data: { userId: '123', name: 'test' },
      message: '操作成功'
    }
  };
  
  const successResponse = ResponseBean.fromCloudResult(successResult);
  console.log('成功响应测试:', successResponse.isSuccess());
  console.log('数据:', successResponse.getData());
  
  // 测试错误响应
  const errorResult = {
    result: {
      success: false,
      error: '操作失败',
      code: -1
    }
  };
  
  const errorResponse = ResponseBean.fromCloudResult(errorResult);
  console.log('错误响应测试:', errorResponse.isError());
  console.log('错误信息:', errorResponse.getError());
  
  // 测试静态方法
  const staticSuccess = ResponseBean.success({ test: 'data' }, '测试成功');
  console.log('静态成功方法:', staticSuccess.isSuccess());
  
  const staticError = ResponseBean.error('测试失败', -999);
  console.log('静态错误方法:', staticError.isError());
}

// 测试UserBean
function testUserBean() {
  console.log('\n=== 测试UserBean ===');
  
  const userData = {
    _id: 'user123',
    openid: 'openid123',
    nickName: '测试用户',
    userType: 'normal',
    profileQuota: 50,
    usedProfiles: 5,
    permissions: ['view', 'create']
  };
  
  const userBean = new UserBean(userData);
  console.log('用户类型:', userBean.getDisplayName());
  console.log('可以创建更多:', userBean.canCreateMore());
  console.log('剩余配额:', userBean.getRemainingQuota());
  console.log('是否为普通用户:', userBean.isNormal());
  console.log('是否有创建权限:', userBean.canCreate());
}

// 测试ProfileBean
function testProfileBean() {
  console.log('\n=== 测试ProfileBean ===');
  
  const profileData = {
    _id: 'profile123',
    userId: 'user123',
    openid: 'openid123',
    profileName: '我的档案',
    birthDate: {
      year: 1990,
      month: 5,
      day: 15,
      hour: 14,
      minute: 30
    },
    baziData: {
      year: { gan: '庚', zhi: '午', ganzhiIndex: 7 },
      month: { gan: '辛', zhi: '巳', ganzhiIndex: 18 },
      day: { gan: '甲', zhi: '戌', ganzhiIndex: 11 },
      hour: { gan: '辛', zhi: '未', ganzhiIndex: 8 }
    },
    gender: 1,
    isUncertainTime: false
  };
  
  const profileBean = new ProfileBean(profileData);
  console.log('档案名称:', profileBean.profileName);
  console.log('出生时间:', profileBean.formatBirthTime());
  console.log('八字字符串:', profileBean.getBaziString());
  console.log('性别:', profileBean.getGenderText());
  console.log('时辰信息:', profileBean.getTimeInfo());
  
  // 测试卡牌数据转换
  const cardData = profileBean.toCardData();
  console.log('卡牌数据:', cardData);
}

// 测试BaziBean
function testBaziBean() {
  console.log('\n=== 测试BaziBean ===');
  
  const baziData = {
    year: { gan: '庚', zhi: '午', ganzhiIndex: 7 },
    month: { gan: '辛', zhi: '巳', ganzhiIndex: 18 },
    day: { gan: '甲', zhi: '戌', ganzhiIndex: 11 },
    hour: { gan: '辛', zhi: '未', ganzhiIndex: 8 },
    lunarDate: {
      year: 1990,
      month: 4,
      day: 22,
      isLeap: false
    }
  };
  
  const baziBean = new BaziBean(baziData);
  console.log('八字字符串:', baziBean.getBaziString());
  console.log('年柱:', baziBean.getYearPillar());
  console.log('月柱:', baziBean.getMonthPillar());
  console.log('日柱:', baziBean.getDayPillar());
  console.log('时柱:', baziBean.getHourPillar());
  console.log('农历日期:', baziBean.getLunarDateString());
  console.log('数据是否完整:', baziBean.isComplete());
  console.log('数据是否有效:', baziBean.isValid());
}

// 测试错误处理
function testErrorHandling() {
  console.log('\n=== 测试错误处理 ===');
  
  // 测试不完整的数据
  const incompleteUserData = {
    _id: 'user123'
    // 缺少其他字段
  };
  
  const incompleteUserBean = new UserBean(incompleteUserData);
  console.log('不完整用户数据测试:', incompleteUserBean.nickName); // 应该返回默认值
  
  // 测试无效的云函数结果
  const invalidCloudResult = null;
  const invalidResponse = ResponseBean.fromCloudResult(invalidCloudResult);
  console.log('无效云函数结果测试:', invalidResponse.isError());
  console.log('错误信息:', invalidResponse.getError());
}

// 运行所有测试
function runAllTests() {
  console.log('开始Bean层功能测试...\n');
  
  try {
    testResponseBean();
    testUserBean();
    testProfileBean();
    testBaziBean();
    testErrorHandling();
    
    console.log('\n✅ 所有测试完成！');
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  }
}

// 如果直接运行此文件，则执行测试
if (typeof module !== 'undefined' && require.main === module) {
  runAllTests();
}

module.exports = {
  testResponseBean,
  testUserBean,
  testProfileBean,
  testBaziBean,
  testErrorHandling,
  runAllTests
};
