/**
 * 系统管理页面控制器
 * 处理管理员系统管理相关业务逻辑
 */
const { BaseController } = require('./BaseController');
const { userService } = require('../services/UserService');

const USER_TYPE_LABEL_MAP = {
  guest: '临时用户',
  normal: '探索者',
  student: '学员',
  premium: '高级用户',
  admin: '管理员'
};

const USER_TYPE_OPTIONS = [
  { value: 'guest', label: '临时用户' },
  { value: 'normal', label: '探索者' },
  { value: 'student', label: '学员' },
  { value: 'premium', label: '高级用户' }
];

class SysManageController extends BaseController {
  constructor(page) {
    super(page);
  }

  /**
   * 初始化页面
   */
  async initialize() {
    this._log('initialize', '系统管理页面初始化');
    await this.loadUserInfo();

    if (!this.userInfo || !this.userInfo.isAdmin()) {
      this._showError('无权限访问系统管理');
      wx.navigateBack();
    }
  }

  /**
   * 搜索用户
   */
  async searchUsers() {
    const { searchKeyword, searchType } = this.page.data;

    if (!searchKeyword || !searchKeyword.trim()) {
      this._showError('请输入查询关键词');
      return;
    }

    this._setData({ searching: true, searchResults: [] });

    const response = await userService.adminSearchUsers(searchKeyword.trim(), searchType);

    this._setData({ searching: false });

    if (!response.success) {
      this._showError(response.error || '查询失败');
      return;
    }

    const users = (response.data.users || []).map(u => ({
      ...u,
      userTypeLabel: USER_TYPE_LABEL_MAP[u.userType] || u.userType
    }));

    this._setData({ searchResults: users });

    if (users.length === 0) {
      wx.showToast({ title: '未找到匹配用户', icon: 'none' });
    }
  }

  /**
   * 显示用户类型选择器并执行修改
   * @param {string} targetUserId - 目标用户 _id
   * @param {string} currentType - 当前用户类型
   */
  showUserTypeSelector(targetUserId, currentType) {
    const itemList = USER_TYPE_OPTIONS.map(opt =>
      opt.value === currentType ? `${opt.label}（当前）` : opt.label
    );

    wx.showActionSheet({
      itemList,
      success: async (res) => {
        const selected = USER_TYPE_OPTIONS[res.tapIndex];
        if (selected.value === currentType) {
          wx.showToast({ title: '用户类型未变化', icon: 'none' });
          return;
        }
        await this._confirmAndUpdateUserType(targetUserId, selected);
      }
    });
  }

  /**
   * 确认并执行用户类型更新
   * @param {string} targetUserId
   * @param {{ value: string, label: string }} selected
   * @private
   */
  async _confirmAndUpdateUserType(targetUserId, selected) {
    const confirmed = await this._confirm(
      '确认修改',
      `确定将该用户类型修改为「${selected.label}」吗？`,
      '确认',
      '取消'
    );

    if (!confirmed) return;

    this._showLoading('修改中...', true);
    const response = await userService.adminUpdateUserType(targetUserId, selected.value);
    this._hideLoading();

    if (response.success) {
      this._showSuccess('修改成功');
      this._refreshUserTypeInResults(targetUserId, selected.value);
    } else {
      this._showError(response.error || '修改失败');
    }
  }

  /**
   * 在搜索结果中刷新指定用户的类型显示
   * @param {string} targetUserId
   * @param {string} newUserType
   * @private
   */
  _refreshUserTypeInResults(targetUserId, newUserType) {
    const results = this.page.data.searchResults.map(u => {
      if (u._id === targetUserId) {
        return { ...u, userType: newUserType, userTypeLabel: USER_TYPE_LABEL_MAP[newUserType] || newUserType };
      }
      return u;
    });
    this._setData({ searchResults: results });
  }
}

module.exports = { SysManageController };
