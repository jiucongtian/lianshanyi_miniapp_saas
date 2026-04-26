/**
 * 系统管理页面
 * 普通管理员及以上权限可访问，当前支持用户类型修改功能
 */
const { SysManageController } = require('../../controllers/SysManageController');
const { createModuleLogger } = require('../../utils/logger/index');
const log = createModuleLogger('SysManagePage');

Page({
  data: {
    // 菜单列表
    menuList: [
      { id: 'updateUserType', title: '修改用户类型', icon: '👤', desc: '通过手机号或昵称查询用户并修改类型' }
    ],
    // 用户查询相关
    searchKeyword: '',
    searchType: 'phone',
    searchResults: [],
    searching: false,
    // 用户类型选择
    userTypeOptions: [
      { value: 'guest', label: '临时用户' },
      { value: 'normal', label: '探索者' },
      { value: 'student', label: '学员' },
      { value: 'premium', label: '高级用户' }
    ],
    // 当前激活的功能面板
    activePanel: ''
  },

  onLoad() {
    log.info('onLoad', '页面加载');
    this.controller = new SysManageController(this);
    this.controller.initialize();
  },

  onSearchTypeChange(e) {
    this.setData({ searchType: e.detail.value === '0' ? 'phone' : 'name', searchResults: [] });
  },

  onSearchKeywordInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  onSearch() {
    this.controller.searchUsers();
  },

  onSelectUserType(e) {
    const { userId, currentType } = e.currentTarget.dataset;
    this.controller.showUserTypeSelector(userId, currentType);
  },

  onMenuTap(e) {
    const menuId = e.currentTarget.dataset.id;
    this.setData({ activePanel: menuId, searchResults: [], searchKeyword: '' });
  }
});
